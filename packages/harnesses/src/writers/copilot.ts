import { join } from "node:path";
import type {
  AutonomyProfile,
  LogicalConfig,
  McpServerEntry
} from "@codemcp/ade-core";
import type { HarnessWriter } from "../types.js";
import {
  writeMcpServers,
  stdioEntry,
  writeAgentMd,
  writeGitHooks
} from "../util.js";
import { getAutonomyProfile } from "../permission-policy.js";

export const copilotWriter: HarnessWriter = {
  id: "copilot",
  label: "GitHub Copilot",
  description: "VS Code + CLI — .vscode/mcp.json + .github/agents/ade.agent.md",
  async install(config: LogicalConfig, projectRoot: string) {
    await writeMcpServers(config.mcp_servers, {
      path: join(projectRoot, ".vscode", "mcp.json"),
      key: "servers",
      transform: stdioEntry
    });

    const tools = [
      ...getBuiltInTools(getAutonomyProfile(config)),
      ...getForwardedMcpTools(config.mcp_servers)
    ];

    await writeAgentMd(config, {
      path: join(projectRoot, ".github", "agents", "ade.agent.md"),
      extraFrontmatter: [
        "tools:",
        ...tools.map((t) => `  - ${t}`),
        ...renderCopilotAgentMcpServers(config.mcp_servers)
      ]
    });
    await writeGitHooks(config.git_hooks, projectRoot);
  }
};

function getBuiltInTools(profile: AutonomyProfile | undefined): string[] {
  switch (profile) {
    case "rigid":
      return ["read"];
    case "sensible-defaults":
      return ["read", "edit", "search", "agent"];
    case "max-autonomy":
      return ["read", "edit", "search", "execute", "agent", "todo"];
    default:
      return ["read", "edit", "search", "execute", "agent", "web"];
  }
}

function getForwardedMcpTools(servers: McpServerEntry[]): string[] {
  return servers.flatMap((server) => {
    const allowedTools = server.allowedTools ?? ["*"];
    if (allowedTools.includes("*")) {
      return [`${server.ref}/*`];
    }

    return allowedTools.map((tool) => `${server.ref}/${tool}`);
  });
}

function renderCopilotAgentMcpServers(servers: McpServerEntry[]): string[] {
  if (servers.length === 0) {
    return [];
  }

  const lines = ["mcp-servers:"];

  for (const server of servers) {
    lines.push(`  ${formatYamlKey(server.ref)}:`);
    lines.push("    type: stdio");
    lines.push(`    command: ${JSON.stringify(server.command)}`);
    lines.push(`    args: ${JSON.stringify(server.args)}`);
    lines.push(`    tools: ${JSON.stringify(server.allowedTools ?? ["*"])}`);

    if (Object.keys(server.env).length > 0) {
      lines.push("    env:");
      for (const [key, value] of Object.entries(server.env)) {
        lines.push(`      ${formatYamlKey(key)}: ${JSON.stringify(value)}`);
      }
    }
  }

  return lines;
}

function formatYamlKey(value: string): string {
  return /^[A-Za-z_][A-Za-z0-9_-]*$/.test(value)
    ? value
    : JSON.stringify(value);
}
