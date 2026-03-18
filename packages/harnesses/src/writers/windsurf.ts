import { join } from "node:path";
import type { AutonomyCapability, LogicalConfig } from "@codemcp/ade-core";
import type { HarnessWriter } from "../types.js";
import {
  writeMcpServers,
  alwaysAllowEntry,
  writeRulesFile,
  writeGitHooks
} from "../util.js";
import { hasPermissionPolicy } from "../permission-policy.js";

export const windsurfWriter: HarnessWriter = {
  id: "windsurf",
  label: "Windsurf",
  description: "Codeium's AI IDE — .windsurf/mcp.json + .windsurfrules",
  async install(config: LogicalConfig, projectRoot: string) {
    await writeMcpServers(config.mcp_servers, {
      path: join(projectRoot, ".windsurf", "mcp.json"),
      transform: alwaysAllowEntry
    });

    await writeRulesFile(getWindsurfRules(config), join(projectRoot, ".windsurfrules"));
    await writeGitHooks(config.git_hooks, projectRoot);
  }
};

function getWindsurfRules(config: LogicalConfig): string[] {
  if (!hasPermissionPolicy(config)) {
    return config.instructions;
  }

  const { capabilities } = config.permission_policy!;
  const allow = listCapabilities(capabilities, "allow");
  const ask = listCapabilities(capabilities, "ask");
  const deny = listCapabilities(capabilities, "deny");

  const autonomyGuidance = [
    "Windsurf limitation: ADE could not verify a stable committed project-local permission schema for Windsurf built-in tools, so this autonomy policy is advisory only and should be applied conservatively.",
    formatGuidance(allow, ask, deny)
  ];

  return [...autonomyGuidance, ...config.instructions];
}

function listCapabilities(
  capabilities: NonNullable<LogicalConfig["permission_policy"]>["capabilities"],
  decision: "ask" | "allow" | "deny"
): string[] {
  return (Object.entries(capabilities) as Array<[AutonomyCapability, string]>)
    .filter(([, value]) => value === decision)
    .map(([capability]) => CAPABILITY_LABELS[capability]);
}

function formatGuidance(
  allow: string[],
  ask: string[],
  deny: string[]
): string {
  const lines = ["Autonomy guidance for Windsurf built-in capabilities:"];

  if (allow.length > 0) {
    lines.push(`- May proceed without extra approval: ${allow.join(", ")}.`);
  }

  if (ask.length > 0) {
    lines.push(`- Ask before: ${ask.join(", ")}.`);
  }

  if (deny.length > 0) {
    lines.push(
      `- Do not use unless the user explicitly overrides: ${deny.join(", ")}.`
    );
  }

  return lines.join("\n");
}

const CAPABILITY_LABELS: Record<AutonomyCapability, string> = {
  read: "read files",
  edit_write: "edit and write files",
  search_list: "search and list files",
  bash_safe: "safe local shell commands",
  bash_unsafe: "unsafe local shell commands",
  web: "web and network access",
  task_agent: "task or agent delegation"
};
