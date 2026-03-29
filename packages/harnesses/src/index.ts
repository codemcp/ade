export type { HarnessWriter } from "./types.js";
export { installSkills } from "./skills-installer.js";
export { writeInlineSkills } from "./util.js";

export { universalWriter } from "./writers/universal.js";
export { claudeCodeWriter } from "./writers/claude-code.js";
export { cursorWriter } from "./writers/cursor.js";
export { copilotWriter } from "./writers/copilot.js";
export { windsurfWriter } from "./writers/windsurf.js";
export { clineWriter } from "./writers/cline.js";
export { rooCodeWriter } from "./writers/roo-code.js";
export { kiroWriter } from "./writers/kiro.js";
export { opencodeWriter } from "./writers/opencode.js";

import type { HarnessWriter } from "./types.js";
import { universalWriter } from "./writers/universal.js";
import { claudeCodeWriter } from "./writers/claude-code.js";
import { cursorWriter } from "./writers/cursor.js";
import { copilotWriter } from "./writers/copilot.js";
import { windsurfWriter } from "./writers/windsurf.js";
import { clineWriter } from "./writers/cline.js";
import { rooCodeWriter } from "./writers/roo-code.js";
import { kiroWriter } from "./writers/kiro.js";
import { opencodeWriter } from "./writers/opencode.js";

/** All built-in harness writers, verified ones first, then unverified. */
export const allHarnessWriters: HarnessWriter[] = [
  // verified
  universalWriter,
  copilotWriter,
  kiroWriter,
  opencodeWriter,
  // unverified — config generation may be inaccurate; feedback welcome
  claudeCodeWriter,
  cursorWriter,
  windsurfWriter,
  clineWriter,
  rooCodeWriter
];

/** Look up a harness writer by id. */
export function getHarnessWriter(id: string): HarnessWriter | undefined {
  return allHarnessWriters.find((w) => w.id === id);
}

/** All valid harness IDs. */
export function getHarnessIds(): string[] {
  return allHarnessWriters.map((w) => w.id);
}

/**
 * Returns the full list of harness writers: built-ins first, then any
 * additional writers contributed via extensions. Does not mutate allHarnessWriters.
 */
export function buildHarnessWriters(extensions: {
  harnessWriters?: HarnessWriter[];
}): HarnessWriter[] {
  return [...allHarnessWriters, ...(extensions.harnessWriters ?? [])];
}

/**
 * Auto-detects which harnesses are installed in the project by checking each
 * writer's characteristic top-level artifacts. Returns an array of detected
 * harness IDs, or an empty array if none are found.
 */
export async function detectHarnesses(
  projectRoot: string,
  writers: HarnessWriter[] = allHarnessWriters
): Promise<string[]> {
  const results = await Promise.all(
    writers.map(async (w) => ((await w.detect(projectRoot)) ? w.id : null))
  );
  return results.filter((id): id is string => id !== null);
}
