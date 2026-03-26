import * as clack from "@clack/prompts";
import { readLockFile } from "@codemcp/ade-core";
import {
  type HarnessWriter,
  allHarnessWriters,
  getHarnessWriter,
  getHarnessIds,
  installSkills,
  writeInlineSkills
} from "@codemcp/ade-harnesses";
import { installKnowledge } from "../knowledge-installer.js";

export async function runInstall(
  projectRoot: string,
  harnessIds?: string[],
  harnessWriters: HarnessWriter[] = allHarnessWriters
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

  const validIds = [...getHarnessIds(), ...harnessWriters.map((w) => w.id)];
  const uniqueValidIds = [...new Set(validIds)];
  for (const id of ids) {
    if (!uniqueValidIds.includes(id)) {
      throw new Error(
        `Unknown harness "${id}". Available: ${uniqueValidIds.join(", ")}`
      );
    }
  }

  const logicalConfig = lockFile.logical_config;

  for (const id of ids) {
    const writer =
      harnessWriters.find((w) => w.id === id) ?? getHarnessWriter(id);
    if (writer) {
      await writer.install(logicalConfig, projectRoot);
    }
  }

  const modifiedSkills = await writeInlineSkills(logicalConfig, projectRoot);
  if (modifiedSkills.length > 0) {
    clack.log.warn(
      `The following skills have been locally modified and will NOT be updated:\n` +
        modifiedSkills.map((s) => `  - ${s}`).join("\n") +
        `\n\nTo use the latest defaults, remove .ade/skills/ and re-run install.`
    );
  }

  if (logicalConfig.skills.length > 0) {
    const confirmInstall = await clack.confirm({
      message: `Install ${logicalConfig.skills.length} skill(s) now?`,
      initialValue: true
    });

    if (typeof confirmInstall === "symbol") {
      clack.cancel("Install cancelled.");
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
    await installKnowledge(logicalConfig.knowledge_sources, projectRoot);
    clack.log.info(
      "Knowledge sources configured. Initialize them separately:\n  npx @codemcp/knowledge init"
    );
  }

  clack.outro(
    "Install complete! Run `ade configure` to set your autonomy profile and harness preferences."
  );
}
