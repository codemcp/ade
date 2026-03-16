import * as clack from "@clack/prompts";
import {
  readUserConfig,
  writeLockFile,
  resolve,
  createDefaultRegistry,
  getAgentWriter,
  getDefaultCatalog,
  type LockFile
} from "@ade/core";
import { installSkills } from "../skills-installer.js";

export async function runInstall(
  projectRoot: string,
  agent: string
): Promise<void> {
  clack.intro("ade install");

  const userConfig = await readUserConfig(projectRoot);
  if (!userConfig) {
    throw new Error(
      "config.yaml not found. Run `ade setup` first to create one."
    );
  }

  const registry = createDefaultRegistry();
  const catalog = getDefaultCatalog();

  const agentWriter = getAgentWriter(registry, agent);
  if (!agentWriter) {
    throw new Error(`Unknown agent "${agent}". Available: claude-code`);
  }

  const logicalConfig = await resolve(userConfig, catalog, registry);

  const lockFile: LockFile = {
    version: 1,
    generated_at: new Date().toISOString(),
    choices: userConfig.choices,
    logical_config: logicalConfig
  };
  await writeLockFile(projectRoot, lockFile);

  await agentWriter.install(logicalConfig, projectRoot);

  await installSkills(logicalConfig.skills, projectRoot);

  clack.outro("Install complete!");
}
