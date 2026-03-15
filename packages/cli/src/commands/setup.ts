import * as clack from "@clack/prompts";
import {
  type Catalog,
  type UserConfig,
  type LockFile,
  writeUserConfig,
  writeLockFile,
  resolve,
  createDefaultRegistry,
  getAgentWriter
} from "@ade/core";

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

  const agentWriter = getAgentWriter(registry, "claude-code");
  if (agentWriter) {
    await agentWriter.install(logicalConfig, projectRoot);
  }

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
