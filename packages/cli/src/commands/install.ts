import * as clack from "@clack/prompts";
import { readLockFile } from "@ade/core";
import { getHarnessWriter, getHarnessIds } from "@ade/harnesses";
import { installSkills } from "../skills-installer.js";
import { installKnowledge } from "../knowledge-installer.js";

export async function runInstall(
  projectRoot: string,
  harnessIds?: string[]
): Promise<void> {
  clack.intro("ade install");

  const lockFile = await readLockFile(projectRoot);
  if (!lockFile) {
    throw new Error("config.lock.yaml not found. Run `ade setup` first.");
  }

  // Determine which harnesses to install for:
  // 1. --harness flag (comma-separated)
  // 2. harnesses saved in the lock file
  // 3. legacy --agent flag (mapped to harness)
  // 4. default: claude-code
  const ids = harnessIds ?? lockFile.harnesses ?? ["claude-code"];

  const validIds = getHarnessIds();
  for (const id of ids) {
    if (!validIds.includes(id)) {
      throw new Error(
        `Unknown harness "${id}". Available: ${validIds.join(", ")}`
      );
    }
  }

  const logicalConfig = lockFile.logical_config;

  for (const id of ids) {
    const writer = getHarnessWriter(id);
    if (writer) {
      await writer.install(logicalConfig, projectRoot);
    }
  }

  await installSkills(logicalConfig.skills, projectRoot);
  await installKnowledge(logicalConfig.knowledge_sources, projectRoot);

  clack.outro("Install complete!");
}
