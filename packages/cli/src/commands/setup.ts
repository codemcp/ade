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
  collectDocsets,
  createDefaultRegistry,
  getFacet,
  getOption
} from "@ade/core";
import { allHarnessWriters, getHarnessWriter } from "@ade/harnesses";
import { installSkills } from "../skills-installer.js";
import { installKnowledge } from "../knowledge-installer.js";

export async function runSetup(
  projectRoot: string,
  catalog: Catalog
): Promise<void> {
  clack.intro("ade setup");

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

  for (const facet of catalog.facets) {
    if (facet.multiSelect) {
      const selected = await promptMultiSelect(facet, existingChoices);
      if (typeof selected === "symbol") {
        clack.cancel("Setup cancelled.");
        return;
      }
      if (selected.length > 0) {
        choices[facet.id] = selected;
      }
    } else {
      const selected = await promptSelect(facet, existingChoices);
      if (typeof selected === "symbol") {
        clack.cancel("Setup cancelled.");
        return;
      }
      if (selected !== "__skip__") {
        choices[facet.id] = selected as string;
      }
    }
  }

  // Docset confirmation step: collect implied docsets, let user deselect
  const impliedDocsets = collectDocsets(choices, catalog);
  let excludedDocsets: string[] | undefined;

  if (impliedDocsets.length > 0) {
    const selected = await clack.multiselect({
      message: "Documentation — deselect any you don't need",
      options: impliedDocsets.map((d) => ({
        value: d.id,
        label: d.label,
        hint: d.description
      })),
      initialValues: impliedDocsets.map((d) => d.id),
      required: false
    });

    if (typeof selected === "symbol") {
      clack.cancel("Setup cancelled.");
      return;
    }

    const selectedSet = new Set(selected as string[]);
    const excluded = impliedDocsets
      .filter((d) => !selectedSet.has(d.id))
      .map((d) => d.id);
    if (excluded.length > 0) {
      excludedDocsets = excluded;
    }
  }

  // Harness selection — multi-select from all available harnesses
  const existingHarnesses = existingConfig?.harnesses;
  const harnessOptions = allHarnessWriters.map((w) => ({
    value: w.id,
    label: w.label,
    hint: w.description
  }));

  const validExistingHarnesses = existingHarnesses?.filter((h) =>
    allHarnessWriters.some((w) => w.id === h)
  );

  const selectedHarnesses = await clack.multiselect({
    message: "Harnesses — which coding agents should receive config?",
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
    ...(excludedDocsets && { excluded_docsets: excludedDocsets }),
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
    const writer = getHarnessWriter(harnessId);
    if (writer) {
      await writer.install(logicalConfig, projectRoot);
    }
  }

  await installSkills(logicalConfig.skills, projectRoot);
  await installKnowledge(logicalConfig.knowledge_sources, projectRoot);

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
    message: facet.label,
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
    message: facet.label,
    options,
    required: false,
    ...(initialValues !== undefined && { initialValues })
  });
}
