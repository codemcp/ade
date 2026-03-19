import { join } from "node:path";
import type {
  AutonomyProfile,
  LogicalConfig,
  McpServerEntry
} from "@codemcp/ade-core";
import type { HarnessWriter } from "../types.js";
import {
  standardEntry,
  writeGitHooks,
  writeJson,
  writeMcpServers
} from "../util.js";
import { getAutonomyProfile } from "../permission-policy.js";

export const kiroWriter: HarnessWriter = {
  id: "kiro",
  label: "Kiro",
  description: "AWS AI IDE — .kiro/agents/ade.json + .kiro/settings/mcp.json",
  async install(config: LogicalConfig, projectRoot: string) {
    await writeMcpServers(config.mcp_servers, {
      path: join(projectRoot, ".kiro", "settings", "mcp.json"),
      transform: (server) => ({
        ...standardEntry(server),
        autoApprove: server.allowedTools ?? ["*"]
      })
    });

    const tools = getKiroTools(getAutonomyProfile(config), config.mcp_servers);
    await writeJson(join(projectRoot, ".kiro", "agents", "ade.json"), {
      name: "ade",
      description:
        "ADE — Agentic Development Environment agent with project conventions and tools.",
      prompt:
        config.instructions.join("\n\n") ||
        "ADE — Agentic Development Environment agent.",
      mcpServers: getKiroAgentMcpServers(config.mcp_servers),
      tools,
      allowedTools: tools,
      useLegacyMcpJson: true
    });

    await writeGitHooks(config.git_hooks, projectRoot);
  }
};

function getKiroTools(
  profile: AutonomyProfile | undefined,
  servers: McpServerEntry[]
): string[] {
  const mcpTools = getKiroForwardedMcpTools(servers);

  switch (profile) {
    case "rigid":
      return ["read", "shell", "spec", ...mcpTools];
    case "sensible-defaults":
      return ["read", "write", "shell", "spec", ...mcpTools];
    case "max-autonomy":
      return ["read", "write", "shell(*)", "spec", ...mcpTools];
    default:
      return ["read", "write", "shell", "spec", ...mcpTools];
  }
}

function getKiroForwardedMcpTools(servers: McpServerEntry[]): string[] {
  return servers.flatMap((server) => {
    const allowedTools = server.allowedTools ?? ["*"];
    if (allowedTools.includes("*")) {
      return [`@${server.ref}/*`];
    }

    return allowedTools.map((tool) => `@${server.ref}/${tool}`);
  });
}

function getKiroAgentMcpServers(
  servers: McpServerEntry[]
): Record<string, Record<string, unknown>> {
  return Object.fromEntries(
    servers.map((server) => [
      server.ref,
      {
        ...standardEntry(server),
        autoApprove: server.allowedTools ?? ["*"]
      }
    ])
  );
}
