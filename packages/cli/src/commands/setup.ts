import * as clack from "@clack/prompts";
import {
  type Catalog,
  type UserConfig,
  type LockFile,
  writeUserConfig,
  writeLockFile,
  resolve,
  collectDocsets,
  createDefaultRegistry,
  getAgentWriter
} from "@ade/core";
import { installSkills } from "../skills-installer.js";

export async function runSetup(
  projectRoot: string,
  catalog: Catalog
): Promise<void> {
  clack.intro("ade setup");

  const choices: Record<string, string | string[]> = {};

  for (const facet of catalog.facets) {
    if (facet.multiSelect) {
      const selected = await promptMultiSelect(facet);
      if (typeof selected === "symbol") {
        clack.cancel("Setup cancelled.");
        return;
      }
      if (selected.length > 0) {
        choices[facet.id] = selected;
      }
    } else {
      const selected = await promptSelect(facet);
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

  const userConfig: UserConfig = {
    choices,
    ...(excludedDocsets && { excluded_docsets: excludedDocsets })
  };
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

  const agentWriter = getAgentWriter(registry, "claude-code");
  if (agentWriter) {
    await agentWriter.install(logicalConfig, projectRoot);
  }

  await installSkills(logicalConfig.skills, projectRoot);

  clack.outro("Setup complete!");
}

function promptSelect(facet: {
  label: string;
  required: boolean;
  options: { id: string; label: string; description: string }[];
}) {
  const options = facet.options.map((o) => ({
    value: o.id,
    label: o.label,
    hint: o.description
  }));

  if (!facet.required) {
    options.push({ value: "__skip__", label: "Skip", hint: "" });
  }

  return clack.select({
    message: facet.label,
    options
  });
}

function promptMultiSelect(facet: {
  label: string;
  options: { id: string; label: string; description: string }[];
}) {
  const options = facet.options.map((o) => ({
    value: o.id,
    label: o.label,
    hint: o.description
  }));

  return clack.multiselect({
    message: facet.label,
    options,
    required: false
  });
}
