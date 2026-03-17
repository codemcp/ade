export type { HarnessWriter } from "./types.js";

export { claudeCodeWriter } from "./writers/claude-code.js";
export { cursorWriter } from "./writers/cursor.js";
export { copilotWriter } from "./writers/copilot.js";
export { windsurfWriter } from "./writers/windsurf.js";
export { clineWriter } from "./writers/cline.js";
export { rooCodeWriter } from "./writers/roo-code.js";

import type { HarnessWriter } from "./types.js";
import { claudeCodeWriter } from "./writers/claude-code.js";
import { cursorWriter } from "./writers/cursor.js";
import { copilotWriter } from "./writers/copilot.js";
import { windsurfWriter } from "./writers/windsurf.js";
import { clineWriter } from "./writers/cline.js";
import { rooCodeWriter } from "./writers/roo-code.js";

/** All built-in harness writers, ordered for wizard display. */
export const allHarnessWriters: HarnessWriter[] = [
  claudeCodeWriter,
  cursorWriter,
  copilotWriter,
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
