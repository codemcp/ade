import * as clack from "@clack/prompts";
import { readLockFile, createDefaultRegistry, getAgentWriter } from "@ade/core";
import { installSkills } from "../skills-installer.js";
import { installKnowledge } from "../knowledge-installer.js";

export async function runInstall(
  projectRoot: string,
  agent: string
): Promise<void> {
  clack.intro("ade install");

  const lockFile = await readLockFile(projectRoot);
  if (!lockFile) {
    throw new Error("config.lock.yaml not found. Run `ade setup` first.");
  }

  const registry = createDefaultRegistry();

  const agentWriter = getAgentWriter(registry, agent);
  if (!agentWriter) {
    throw new Error(`Unknown agent "${agent}". Available: claude-code`);
  }

  const logicalConfig = lockFile.logical_config;

  await agentWriter.install(logicalConfig, projectRoot);

  await installSkills(logicalConfig.skills, projectRoot);
  await installKnowledge(logicalConfig.knowledge_sources, projectRoot);

  clack.outro("Install complete!");
}
