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

/** All built-in harness writers, ordered for wizard display. */
export const allHarnessWriters: HarnessWriter[] = [
  universalWriter,
  claudeCodeWriter,
  cursorWriter,
  copilotWriter,
  windsurfWriter,
  clineWriter,
  rooCodeWriter,
  kiroWriter,
  opencodeWriter
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
