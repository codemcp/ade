import type { AgentWriterDef } from "@codemcp/ade-core";

/**
 * A harness writer extends AgentWriterDef with metadata for display in the
 * setup wizard and CLI help.
 */
export interface HarnessWriter extends AgentWriterDef {
  /** Human-readable label for the wizard (e.g. "Claude Code") */
  label: string;
  /** Short description shown as hint in the wizard */
  description: string;
}
