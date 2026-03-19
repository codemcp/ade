import { join } from "node:path";
import { writeFile } from "node:fs/promises";
import type { AutonomyProfile, LogicalConfig } from "@codemcp/ade-core";
import type { HarnessWriter } from "../types.js";
import { writeMcpServers, writeGitHooks } from "../util.js";
import { getAutonomyProfile } from "../permission-policy.js";

function renderAutonomyGuidance(config: LogicalConfig): string | undefined {
  const profile = getAutonomyProfile(config);
  if (!profile) {
    return undefined;
  }

  return [
    "## Autonomy",
    "",
    "Universal harness limitation: `AGENTS.md` + `.mcp.json` provide documentation and server registration only; there is no enforceable harness-level permission schema here.",
    "",
    "Treat this autonomy profile as documentation-only guidance for built-in/basic operations.",
    "",
    `Profile: \`${profile}\``,
    "",
    ...getUniversalProfileGuidance(profile),
    "",
    "MCP permissions are not re-modeled by autonomy here; any MCP approvals must come from provisioning-aware consuming harnesses rather than the Universal writer."
  ].join("\n");
}

function getUniversalProfileGuidance(profile: AutonomyProfile): string[] {
  switch (profile) {
    case "rigid":
      return [
        "Built-in/basic capability guidance:",
        "- `read`: allow",
        "- `edit_write`: ask",
        "- `search_list`: ask",
        "- `bash_safe`: ask",
        "- `bash_unsafe`: ask",
        "- `web`: ask",
        "- `task_agent`: ask"
      ];
    case "sensible-defaults":
      return [
        "Built-in/basic capability guidance:",
        "- `read`: allow",
        "- `edit_write`: allow",
        "- `search_list`: allow",
        "- `bash_safe`: allow",
        "- `bash_unsafe`: ask",
        "- `web`: ask",
        "- `task_agent`: allow"
      ];
    case "max-autonomy":
      return [
        "Built-in/basic capability guidance:",
        "- `read`: allow",
        "- `edit_write`: allow",
        "- `search_list`: allow",
        "- `bash_safe`: allow",
        "- `bash_unsafe`: allow",
        "- `web`: ask",
        "- `task_agent`: allow"
      ];
  }
}

export const universalWriter: HarnessWriter = {
  id: "universal",
  label: "Universal (AGENTS.md + .mcp.json)",
  description:
    "Cross-tool standard — AGENTS.md + .mcp.json (portable instructions and MCP registration, not enforceable permissions)",
  async install(config: LogicalConfig, projectRoot: string) {
    const autonomyGuidance = renderAutonomyGuidance(config);
    const instructionSections = [...config.instructions];
    if (autonomyGuidance) {
      instructionSections.push(autonomyGuidance);
    }

    if (instructionSections.length > 0) {
      const lines = [
        "# AGENTS",
        "",
        ...instructionSections.flatMap((instruction) => [instruction, ""])
      ];
      await writeFile(
        join(projectRoot, "AGENTS.md"),
        lines.join("\n"),
        "utf-8"
      );
    }

    await writeMcpServers(config.mcp_servers, {
      path: join(projectRoot, ".mcp.json")
    });
    await writeGitHooks(config.git_hooks, projectRoot);
  }
};
