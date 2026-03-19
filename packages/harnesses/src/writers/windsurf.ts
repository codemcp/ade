import { join } from "node:path";
import type { AutonomyProfile, LogicalConfig } from "@codemcp/ade-core";
import type { HarnessWriter } from "../types.js";
import {
  writeMcpServers,
  alwaysAllowEntry,
  writeRulesFile,
  writeGitHooks
} from "../util.js";
import {
  getAutonomyProfile,
  hasPermissionPolicy
} from "../permission-policy.js";

export const windsurfWriter: HarnessWriter = {
  id: "windsurf",
  label: "Windsurf",
  description: "Codeium's AI IDE — .windsurf/mcp.json + .windsurfrules",
  async install(config: LogicalConfig, projectRoot: string) {
    await writeMcpServers(config.mcp_servers, {
      path: join(projectRoot, ".windsurf", "mcp.json"),
      transform: alwaysAllowEntry
    });

    await writeRulesFile(
      getWindsurfRules(config),
      join(projectRoot, ".windsurfrules")
    );
    await writeGitHooks(config.git_hooks, projectRoot);
  }
};

function getWindsurfRules(config: LogicalConfig): string[] {
  if (!hasPermissionPolicy(config)) {
    return config.instructions;
  }

  const autonomyGuidance = [
    "Windsurf limitation: ADE could not verify a stable committed project-local permission schema for Windsurf built-in tools, so this autonomy policy is advisory only and should be applied conservatively.",
    getWindsurfProfileGuidance(getAutonomyProfile(config))
  ];

  return [...autonomyGuidance, ...config.instructions];
}

function getWindsurfProfileGuidance(
  profile: AutonomyProfile | undefined
): string {
  switch (profile) {
    case "rigid":
      return [
        "Autonomy guidance for Windsurf built-in capabilities:",
        "- May proceed without extra approval: read files.",
        "- Ask before: edit and write files, search and list files, safe local shell commands, unsafe local shell commands, web and network access, task or agent delegation."
      ].join("\n");
    case "sensible-defaults":
      return [
        "Autonomy guidance for Windsurf built-in capabilities:",
        "- May proceed without extra approval: read files, edit and write files, search and list files, safe local shell commands, task or agent delegation.",
        "- Ask before: unsafe local shell commands, web and network access."
      ].join("\n");
    case "max-autonomy":
      return [
        "Autonomy guidance for Windsurf built-in capabilities:",
        "- May proceed without extra approval: read files, edit and write files, search and list files, safe local shell commands, unsafe local shell commands, task or agent delegation.",
        "- Ask before: web and network access."
      ].join("\n");
    default:
      return "Autonomy guidance for Windsurf built-in capabilities: follow project conventions.";
  }
}
