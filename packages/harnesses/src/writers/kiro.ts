import { join } from "node:path";
import type { LogicalConfig, McpServerEntry } from "@codemcp/ade-core";
import type { HarnessWriter } from "../types.js";
import {
  standardEntry,
  writeGitHooks,
  writeJson,
  writeMcpServers
} from "../util.js";
import {
  allowsCapability,
  getCapabilityDecision,
  hasPermissionPolicy
} from "../permission-policy.js";

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

    await writeJson(join(projectRoot, ".kiro", "agents", "ade.json"), {
      name: "ade",
      description:
        "ADE — Agentic Development Environment agent with project conventions and tools.",
      prompt:
        config.instructions.join("\n\n") ||
        "ADE — Agentic Development Environment agent.",
      mcpServers: getKiroAgentMcpServers(config.mcp_servers),
      tools: getKiroTools(config),
      allowedTools: getKiroAllowedTools(config),
      useLegacyMcpJson: true
    });

    await writeGitHooks(config.git_hooks, projectRoot);
  }
};

function getKiroTools(config: LogicalConfig): string[] {
  const mcpTools = getKiroForwardedMcpTools(config.mcp_servers);

  if (!hasPermissionPolicy(config)) {
    return ["read", "write", "shell", "spec", ...mcpTools];
  }

  return [
    ...(getCapabilityDecision(config, "read") !== "deny" ? ["read"] : []),
    ...(allowsCapability(config, "edit_write") ? ["write"] : []),
    ...(allowsCapability(config, "bash_unsafe") ? ["shell"] : []),
    "spec",
    ...mcpTools
  ];
}

function getKiroAllowedTools(config: LogicalConfig): string[] {
  return getKiroTools(config);
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
