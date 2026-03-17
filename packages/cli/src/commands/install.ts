import * as clack from "@clack/prompts";
import { readLockFile } from "@ade/core";
import { getHarnessWriter, getHarnessIds } from "@ade/harnesses";
import { installSkills } from "../skills-installer.js";

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
  // 3. default: universal
  const ids = harnessIds ?? lockFile.harnesses ?? ["universal"];

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

  if (logicalConfig.knowledge_sources.length > 0) {
    clack.log.info(
      "Knowledge sources configured. Initialize them separately:\n  npx @codemcp/knowledge init"
    );
  }

  clack.outro("Install complete!");
}
