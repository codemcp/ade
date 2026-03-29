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
  /**
   * Whether this harness writer has been verified against the actual tool.
   * Unverified harnesses were contributed without hands-on testing — both the
   * generated config and auto-detection heuristics may be inaccurate. Feedback
   * from users of those tools is welcome.
   */
  verified: boolean;
  /**
   * Returns true if this harness appears to be installed in the project by
   * checking for its characteristic top-level artifacts (config files, dirs).
   */
  detect(projectRoot: string): Promise<boolean>;
}
