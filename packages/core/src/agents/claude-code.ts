import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { AgentWriterDef, LogicalConfig } from "../types.js";

export const claudeCodeWriter: AgentWriterDef = {
  id: "claude-code",
  async install(config: LogicalConfig, projectRoot: string) {
    await writeAgentsMd(config, projectRoot);
    await writeClaudeSettings(config, projectRoot);
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

async function writeClaudeSettings(
  config: LogicalConfig,
  projectRoot: string
): Promise<void> {
  if (config.mcp_servers.length === 0) return;

  const claudeDir = join(projectRoot, ".claude");
  await mkdir(claudeDir, { recursive: true });

  const settingsPath = join(claudeDir, "settings.json");

  // Read existing settings to avoid clobbering user data
  let existing: Record<string, unknown> = {};
  try {
    const raw = await readFile(settingsPath, "utf-8");
    existing = JSON.parse(raw);
  } catch {
    // No existing file — start fresh
  }

  const mcpServers: Record<
    string,
    { command: string; args: string[]; env?: Record<string, string> }
  > = (existing.mcpServers as typeof mcpServers) ?? {};

  for (const server of config.mcp_servers) {
    mcpServers[server.ref] = {
      command: server.command,
      args: server.args,
      ...(Object.keys(server.env).length > 0 ? { env: server.env } : {})
    };
  }

  const settings = { ...existing, mcpServers };
  await writeFile(
    settingsPath,
    JSON.stringify(settings, null, 2) + "\n",
    "utf-8"
  );
}
