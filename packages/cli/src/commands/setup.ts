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
  getHarnessWriter,
  installSkills,
  writeInlineSkills
} from "@codemcp/ade-harnesses";
import { installKnowledge } from "../knowledge-installer.js";

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

  const sortedFacets = sortFacets(catalog);

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

  // Harness selection — multi-select from all available harnesses
  const existingHarnesses = existingConfig?.harnesses;
  const harnessOptions = harnessWriters.map((w) => ({
    value: w.id,
    label: w.label,
    hint: w.description
  }));

  const validExistingHarnesses = existingHarnesses?.filter((h) =>
    harnessWriters.some((w) => w.id === h)
  );

  const selectedHarnesses = await clack.multiselect({
    message:
      "Which coding agents should receive config?\n" +
      "ADE generates config files for each agent you select.\n",
    options: harnessOptions,
    initialValues:
      validExistingHarnesses && validExistingHarnesses.length > 0
        ? validExistingHarnesses
        : ["universal"],
    required: false
  });

  if (typeof selectedHarnesses === "symbol") {
    clack.cancel("Setup cancelled.");
    return;
  }

  const harnesses = selectedHarnesses as string[];

  const userConfig: UserConfig = {
    choices,
    ...(harnesses.length > 0 && { harnesses })
  };
  const registry = createDefaultRegistry();
  const logicalConfig = await resolve(userConfig, catalog, registry);

  await writeUserConfig(projectRoot, userConfig);

  const lockFile: LockFile = {
    version: 1,
    generated_at: new Date().toISOString(),
    choices: userConfig.choices,
    ...(harnesses.length > 0 && { harnesses }),
    logical_config: logicalConfig
  };
  await writeLockFile(projectRoot, lockFile);

  // Install to all selected harnesses
  for (const harnessId of harnesses) {
    const writer =
      harnessWriters.find((w) => w.id === harnessId) ??
      getHarnessWriter(harnessId);
    if (writer) {
      await writer.install(logicalConfig, projectRoot);
    }
  }

  const modifiedSkills = await writeInlineSkills(logicalConfig, projectRoot);
  if (modifiedSkills.length > 0) {
    clack.log.warn(
      `The following skills have been locally modified and will NOT be updated:\n` +
        modifiedSkills.map((s) => `  - ${s}`).join("\n") +
        `\n\nTo use the latest defaults, remove .ade/skills/ and re-run setup.`
    );
  }

  if (logicalConfig.skills.length > 0) {
    const skillNames = logicalConfig.skills
      .map((s) => `  • ${s.name}`)
      .join("\n");
    const confirmInstall = await clack.confirm({
      message:
        `Install ${logicalConfig.skills.length} skill(s) now?\n` +
        skillNames +
        `\nYou can also install them later with:\n  npx @codemcp/skills experimental_install`,
      initialValue: true
    });

    if (typeof confirmInstall === "symbol") {
      clack.cancel("Setup cancelled.");
      return;
    }

    if (confirmInstall) {
      await installSkills(logicalConfig.skills, projectRoot);
    } else {
      clack.log.info(
        "Skills not installed. Run manually when ready:\n  npx @codemcp/skills experimental_install"
      );
    }
  }

  if (logicalConfig.knowledge_sources.length > 0) {
    const sourceNames = logicalConfig.knowledge_sources
      .map((s) => `  • ${s.name}`)
      .join("\n");
    const confirmInit = await clack.confirm({
      message:
        `Initialize ${logicalConfig.knowledge_sources.length} knowledge source(s) now?\n` +
        sourceNames +
        `\nYou can also initialize them later with:\n  npx @codemcp/knowledge init`,
      initialValue: false
    });

    if (typeof confirmInit === "symbol") {
      clack.cancel("Setup cancelled.");
      return;
    }

    if (confirmInit) {
      await installKnowledge(logicalConfig.knowledge_sources, projectRoot);
    } else {
      clack.log.info(
        "Knowledge sources configured. Initialize them when ready:\n  npx @codemcp/knowledge init"
      );
    }
  }

  for (const note of logicalConfig.setup_notes) {
    clack.log.info(note);
  }

  clack.outro("Setup complete!");
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

  if (!facet.required) {
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
