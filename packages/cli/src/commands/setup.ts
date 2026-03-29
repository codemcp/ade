import * as clack from "@clack/prompts";
import {
  type Catalog,
  type Facet,
  type UserConfig,
  type LockFile,
  readUserConfig,
  writeUserConfig,
  writeLockFile,
  resolve,
  createDefaultRegistry,
  getFacet,
  getOption,
  sortFacets,
  getVisibleOptions
} from "@codemcp/ade-core";
import {
  type HarnessWriter,
  allHarnessWriters,
  writeInlineSkills
} from "@codemcp/ade-harnesses";
import { runConfigure } from "./configure.js";

// Facets that are agent/harness concerns — excluded from setup, handled by `ade configure`.
const HARNESS_FACETS = new Set(["autonomy"]);

export async function runSetup(
  projectRoot: string,
  catalog: Catalog,
  harnessWriters: HarnessWriter[] = allHarnessWriters
): Promise<void> {
  let lineIndex = 0;
  const LOGO_LINES = [
    "\n",
    " █████╗ ██████╗ ███████╗    ███████╗███████╗████████╗██╗   ██╗██████╗ ",
    "██╔══██╗██╔══██╗██╔════╝    ██╔════╝██╔════╝╚══██╔══╝██║   ██║██╔══██╗",
    "███████║██║  ██║█████╗      ███████╗█████╗     ██║   ██║   ██║██████╔╝",
    "██╔══██║██║  ██║██╔══╝      ╚════██║██╔══╝     ██║   ██║   ██║██╔═══╝ ",
    "██║  ██║██████╔╝███████╗    ███████║███████╗   ██║   ╚██████╔╝██║     ",
    "╚═╝  ╚═╝╚═════╝ ╚══════╝    ╚══════╝╚══════╝   ╚═╝    ╚═════╝ ╚═╝     ",
    "\n"
  ];
  for (const line of LOGO_LINES) {
    lineIndex++;
    if (lineIndex === 1) {
      clack.intro(line);
    } else {
      console.log(`│  ${line}`);
    }
  }
  clack.note(
    [
      "You're about to define how your team works with coding agents.",
      "",
      "Pick your facets — architecture, practices, process — and ADE",
      "translates them into a shared information hierarchy your agents",
      "read from the repo. One setup, consistent across the whole team."
    ].join("\n"),
    "ADE — Agentic Development Environment"
  );

  const existingConfig = await readUserConfig(projectRoot);
  const existingChoices = existingConfig?.choices ?? {};

  // Warn about stale choices that reference options no longer in the catalog
  for (const [facetId, value] of Object.entries(existingChoices)) {
    const facet = getFacet(catalog, facetId);
    if (!facet) continue;

    const ids = Array.isArray(value) ? value : [value];
    for (const optionId of ids) {
      if (!getOption(facet, optionId)) {
        clack.log.warn(
          `Previously selected option "${optionId}" is no longer available in facet "${facet.label}".`
        );
      }
    }
  }

  const choices: Record<string, string | string[]> = {};

  // Only show dev-choice facets — harness/autonomy facets are handled by `ade configure`.
  const sortedFacets = sortFacets(catalog).filter(
    (f) => !HARNESS_FACETS.has(f.id)
  );

  for (const facet of sortedFacets) {
    const visibleOptions = getVisibleOptions(facet, choices, catalog);
    if (visibleOptions.length === 0) continue;

    const visibleFacet = { ...facet, options: visibleOptions };

    if (facet.multiSelect) {
      const selected = await promptMultiSelect(visibleFacet, existingChoices);
      if (typeof selected === "symbol") {
        clack.cancel("Setup cancelled.");
        return;
      }
      if (selected.length > 0) {
        choices[facet.id] = selected;
      }
    } else {
      const selected = await promptSelect(visibleFacet, existingChoices);
      if (typeof selected === "symbol") {
        clack.cancel("Setup cancelled.");
        return;
      }
      if (typeof selected === "string" && selected !== "__skip__") {
        choices[facet.id] = selected;
      }
    }
  }

  // Resolve and persist dev-choice config only
  const userConfig: UserConfig = { choices };
  const registry = createDefaultRegistry();
  const logicalConfig = await resolve(userConfig, catalog, registry);

  await writeUserConfig(projectRoot, userConfig);

  const lockFile: LockFile = {
    version: 1,
    generated_at: new Date().toISOString(),
    choices: userConfig.choices,
    logical_config: logicalConfig
  };
  await writeLockFile(projectRoot, lockFile);

  // Stage inline skill files to .ade/skills/ — this is project-level (not agent-specific).
  // installSkills (agent server install) is handled by `ade configure`.
  const modifiedSkills = await writeInlineSkills(logicalConfig, projectRoot);
  if (modifiedSkills.length > 0) {
    clack.log.warn(
      `The following skills have been locally modified and will NOT be updated:\n` +
        modifiedSkills.map((s) => `  - ${s}`).join("\n") +
        `\n\nTo use the latest defaults, remove .ade/skills/ and re-run setup.`
    );
  }

  for (const note of logicalConfig.setup_notes) {
    clack.log.info(note);
  }

  clack.outro("Setup complete!");

  // Offer to run agent configuration immediately
  const configureNow = await clack.confirm({
    message:
      "Would you like to configure your coding agent now?\n" +
      "This sets your autonomy profile, target harnesses, and installs skills.",
    initialValue: true
  });

  if (typeof configureNow === "symbol" || !configureNow) {
    if (typeof configureNow !== "symbol") {
      clack.log.info(
        "Run `ade configure` any time to set up your coding agent."
      );
    }
    return;
  }

  await runConfigure(projectRoot, harnessWriters);
}

function getValidInitialValue(
  facet: Facet,
  existingChoices: Record<string, string | string[]>
): string | undefined {
  const value = existingChoices[facet.id];
  if (typeof value !== "string") return undefined;
  // Only set initialValue if the option still exists in the catalog
  return facet.options.some((o) => o.id === value) ? value : undefined;
}

function getValidInitialValues(
  facet: Facet,
  existingChoices: Record<string, string | string[]>
): string[] | undefined {
  const value = existingChoices[facet.id];
  if (!Array.isArray(value)) return undefined;
  // Only include options that still exist in the catalog
  const valid = value.filter((v) => facet.options.some((o) => o.id === v));
  return valid.length > 0 ? valid : undefined;
}

function promptSelect(
  facet: Facet,
  existingChoices: Record<string, string | string[]>
) {
  const options = facet.options.map((o) => ({
    value: o.id,
    label: o.label,
    hint: o.description
  }));

  if (!facet.required && !facet.options.some((o) => o.id === "other")) {
    options.push({ value: "__skip__", label: "Skip", hint: "" });
  }

  const initialValue = getValidInitialValue(facet, existingChoices);

  return clack.select({
    message: `${facet.label} — ${facet.description}`,
    options,
    ...(initialValue !== undefined && { initialValue })
  });
}

function promptMultiSelect(
  facet: Facet,
  existingChoices: Record<string, string | string[]>
) {
  const options = facet.options.map((o) => ({
    value: o.id,
    label: o.label,
    hint: o.description
  }));

  const initialValues = getValidInitialValues(facet, existingChoices);

  return clack.multiselect({
    message: `${facet.label} — ${facet.description}`,
    options,
    required: false,
    ...(initialValues !== undefined && { initialValues })
  });
}
