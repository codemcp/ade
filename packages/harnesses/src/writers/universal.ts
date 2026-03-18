import { join } from "node:path";
import { writeFile } from "node:fs/promises";
import type {
  AutonomyCapability,
  LogicalConfig,
  PermissionDecision
} from "@codemcp/ade-core";
import type { HarnessWriter } from "../types.js";
import { writeMcpServers, writeGitHooks } from "../util.js";

const CAPABILITY_ORDER: AutonomyCapability[] = [
  "read",
  "edit_write",
  "search_list",
  "bash_safe",
  "bash_unsafe",
  "web",
  "task_agent"
];

function formatCapabilityGuidance(
  capability: AutonomyCapability,
  decision: PermissionDecision
): string {
  return `- \`${capability}\`: ${decision}`;
}

function renderAutonomyGuidance(config: LogicalConfig): string | undefined {
  const policy = config.permission_policy;
  if (!policy) {
    return undefined;
  }

  const capabilityLines = CAPABILITY_ORDER.map((capability) =>
    formatCapabilityGuidance(capability, policy.capabilities[capability])
  );

  return [
    "## Autonomy",
    "",
    "Universal harness limitation: `AGENTS.md` + `.mcp.json` provide documentation and server registration only; there is no enforceable harness-level permission schema here.",
    "",
    "Treat this autonomy profile as documentation-only guidance for built-in/basic operations.",
    "",
    `Profile: \`${policy.profile}\``,
    "",
    "Built-in/basic capability guidance:",
    ...capabilityLines,
    "",
    "MCP permissions are not re-modeled by autonomy here; any MCP approvals must come from provisioning-aware consuming harnesses rather than the Universal writer."
  ].join("\n");
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
