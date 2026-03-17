import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { LogicalConfig, McpServerEntry } from "@ade/core";
import type { HarnessWriter } from "../types.js";

/**
 * Universal harness — generates the cross-tool standard files:
 *   AGENTS.md  (instructions readable by all agents)
 *   .mcp.json  (MCP server config readable by Claude Code and others)
 */
export const universalWriter: HarnessWriter = {
  id: "universal",
  label: "Universal (AGENTS.md + .mcp.json)",
  description:
    "Cross-tool standard — AGENTS.md + .mcp.json (works with any agent)",
  async install(config: LogicalConfig, projectRoot: string) {
    await writeAgentsMd(config, projectRoot);
    await writeMcpJson(config, projectRoot);
  }
};

async function writeAgentsMd(
  config: LogicalConfig,
  projectRoot: string
): Promise<void> {
  if (config.instructions.length === 0) return;

  const lines = ["# AGENTS", ""];
  for (const instruction of config.instructions) {
    lines.push(instruction, "");
  }

  await writeFile(join(projectRoot, "AGENTS.md"), lines.join("\n"), "utf-8");
}

async function writeMcpJson(
  config: LogicalConfig,
  projectRoot: string
): Promise<void> {
  const allServers: McpServerEntry[] = config.mcp_servers;

  if (allServers.length === 0) return;

  const mcpPath = join(projectRoot, ".mcp.json");

  let existing: Record<string, unknown> = {};
  try {
    const raw = await readFile(mcpPath, "utf-8");
    existing = JSON.parse(raw);
  } catch {
    // Start fresh
  }

  const mcpServers: Record<
    string,
    { command: string; args: string[]; env?: Record<string, string> }
  > = (existing.mcpServers as typeof mcpServers) ?? {};

  for (const server of allServers) {
    mcpServers[server.ref] = {
      command: server.command,
      args: server.args,
      ...(Object.keys(server.env).length > 0 ? { env: server.env } : {})
    };
  }

  const result = { ...existing, mcpServers };
  await writeFile(mcpPath, JSON.stringify(result, null, 2) + "\n", "utf-8");
}
