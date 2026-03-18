import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { AutonomyCapability, LogicalConfig } from "@codemcp/ade-core";
import type { HarnessWriter } from "../types.js";
import { writeMcpServers, writeGitHooks } from "../util.js";
import {
  getAutonomyProfile,
  getCapabilityDecision,
  hasPermissionPolicy
} from "../permission-policy.js";

const CURSOR_CAPABILITY_ORDER: AutonomyCapability[] = [
  "read",
  "edit_write",
  "search_list",
  "bash_safe",
  "bash_unsafe",
  "web",
  "task_agent"
];

const CURSOR_CAPABILITY_LABELS: Record<AutonomyCapability, string> = {
  read: "read project files",
  edit_write: "edit and write project files",
  search_list: "search and list project contents",
  bash_safe: "run safe local shell commands",
  bash_unsafe: "run high-impact shell commands",
  web: "use web or network access",
  task_agent: "delegate or decompose work into agent tasks"
};

export const cursorWriter: HarnessWriter = {
  id: "cursor",
  label: "Cursor",
  description: "AI code editor — .cursor/mcp.json + .cursor/rules/",
  async install(config: LogicalConfig, projectRoot: string) {
    await writeMcpServers(config.mcp_servers, {
      path: join(projectRoot, ".cursor", "mcp.json")
    });

    const rulesBody = getCursorRulesBody(config);

    if (rulesBody.length > 0) {
      const rulesDir = join(projectRoot, ".cursor", "rules");
      await mkdir(rulesDir, { recursive: true });

      const content = [
        "---",
        "description: ADE project conventions",
        "globs: *",
        "---",
        "",
        ...rulesBody.flatMap((line) => [line, ""])
      ].join("\n");

      await writeFile(join(rulesDir, "ade.mdc"), content, "utf-8");
    }
    await writeGitHooks(config.git_hooks, projectRoot);
  }
};

function getCursorRulesBody(config: LogicalConfig): string[] {
  return [...config.instructions, ...getCursorAutonomyNotes(config)];
}

function getCursorAutonomyNotes(config: LogicalConfig): string[] {
  if (!hasPermissionPolicy(config)) {
    return [];
  }

  const allowedCapabilities = CURSOR_CAPABILITY_ORDER.filter(
    (capability) => getCapabilityDecision(config, capability) === "allow"
  ).map((capability) => CURSOR_CAPABILITY_LABELS[capability]);

  const approvalGatedCapabilities = CURSOR_CAPABILITY_ORDER.filter(
    (capability) => getCapabilityDecision(config, capability) === "ask"
  ).map((capability) => CURSOR_CAPABILITY_LABELS[capability]);

  return [
    `Cursor autonomy note (documented, not enforced): ${getAutonomyProfile(config) ?? "custom"}.`,
    "Cursor has no verified committed project-local built-in ask/allow/deny config surface, so ADE documents autonomy intent here instead of writing unsupported permission config.",
    ...(allowedCapabilities.length > 0
      ? [
          `Prefer handling these built-in capabilities without extra approval when Cursor permits it: ${allowedCapabilities.join(", ")}.`
        ]
      : []),
    ...(approvalGatedCapabilities.length > 0
      ? [
          `Request approval before these capabilities: ${approvalGatedCapabilities.join(", ")}.`
        ]
      : []),
    "Web and network access must remain approval-gated.",
    "MCP server registration stays in .cursor/mcp.json; MCP tool approvals remain owned by provisioning and are not enforced or re-modeled in this rules file."
  ];
}
