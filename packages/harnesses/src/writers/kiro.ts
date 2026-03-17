import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { LogicalConfig, McpServerEntry } from "@ade/core";
import type { HarnessWriter } from "../types.js";

export const kiroWriter: HarnessWriter = {
  id: "kiro",
  label: "Kiro",
  description: "AWS AI IDE — .kiro/agents/ade.json",
  async install(config: LogicalConfig, projectRoot: string) {
    await writeAgentJson(config, projectRoot);
  }
};

async function writeAgentJson(
  config: LogicalConfig,
  projectRoot: string
): Promise<void> {
  const allServers: McpServerEntry[] = [...config.mcp_servers];

  if (config.skills.length > 0) {
    allServers.push({
      ref: "agentskills",
      command: "npx",
      args: ["-y", "@codemcp/skills-server"],
      env: {}
    });
  }

  if (allServers.length === 0 && config.instructions.length === 0) return;

  const agentsDir = join(projectRoot, ".kiro", "agents");
  await mkdir(agentsDir, { recursive: true });

  const agentPath = join(agentsDir, "ade.json");

  const mcpServers: Record<
    string,
    { command: string; args: string[]; env?: Record<string, string> }
  > = {};

  for (const server of allServers) {
    mcpServers[server.ref] = {
      command: server.command,
      args: server.args,
      ...(Object.keys(server.env).length > 0 ? { env: server.env } : {})
    };
  }

  // Kiro tools: built-in tools + @server references
  const tools: string[] = [
    "execute_bash",
    "fs_read",
    "fs_write",
    "knowledge",
    "thinking"
  ];
  for (const name of Object.keys(mcpServers)) {
    tools.push(`@${name}`);
  }

  // Kiro allowedTools: grant wildcard access to each MCP server
  const allowedTools: string[] = [];
  for (const server of allServers) {
    const explicit = server.allowedTools;
    if (explicit && !explicit.includes("*")) {
      for (const tool of explicit) {
        allowedTools.push(`@${server.ref}/${tool}`);
      }
    } else {
      allowedTools.push(`@${server.ref}/*`);
    }
  }

  const prompt =
    config.instructions.length > 0
      ? config.instructions.join("\n\n")
      : "ADE — Agentic Development Environment agent";

  const agentConfig = {
    name: "ade",
    prompt,
    mcpServers,
    tools,
    allowedTools
  };

  await writeFile(
    agentPath,
    JSON.stringify(agentConfig, null, 2) + "\n",
    "utf-8"
  );
}
