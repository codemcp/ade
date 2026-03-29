import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { AutonomyProfile, LogicalConfig } from "@codemcp/ade-core";
import type { HarnessWriter } from "../types.js";
import { writeMcpServers, writeGitHooks, pathExists } from "../util.js";
import {
  getAutonomyProfile,
  hasPermissionPolicy
} from "../permission-policy.js";

export const cursorWriter: HarnessWriter = {
  id: "cursor",
  label: "Cursor",
  description: "AI code editor — .cursor/mcp.json + .cursor/rules/",
  verified: false,
  async detect(projectRoot: string) {
    return pathExists(join(projectRoot, ".cursor"));
  },
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

  const profile = getAutonomyProfile(config);

  return [
    `Cursor autonomy note (documented, not enforced): ${profile ?? "custom"}.`,
    "Cursor has no verified committed project-local built-in ask/allow/deny config surface, so ADE documents autonomy intent here instead of writing unsupported permission config.",
    ...getCursorProfileGuidance(profile),
    "Web and network access must remain approval-gated.",
    "MCP server registration stays in .cursor/mcp.json; MCP tool approvals remain owned by provisioning and are not enforced or re-modeled in this rules file."
  ];
}

function getCursorProfileGuidance(
  profile: AutonomyProfile | undefined
): string[] {
  switch (profile) {
    case "rigid":
      return [
        "Prefer handling these built-in capabilities without extra approval when Cursor permits it: read project files.",
        "Request approval before these capabilities: edit and write project files, search and list project contents, run safe local shell commands, run high-impact shell commands, use web or network access, delegate or decompose work into agent tasks."
      ];
    case "sensible-defaults":
      return [
        "Prefer handling these built-in capabilities without extra approval when Cursor permits it: read project files, edit and write project files, search and list project contents, run safe local shell commands, delegate or decompose work into agent tasks.",
        "Request approval before these capabilities: run high-impact shell commands, use web or network access."
      ];
    case "max-autonomy":
      return [
        "Prefer handling these built-in capabilities without extra approval when Cursor permits it: read project files, edit and write project files, search and list project contents, run safe local shell commands, run high-impact shell commands, delegate or decompose work into agent tasks.",
        "Request approval before these capabilities: use web or network access."
      ];
    default:
      return [];
  }
}
