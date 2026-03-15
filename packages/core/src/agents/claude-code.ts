import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type {
  AgentWriterDef,
  LogicalConfig,
  McpServerEntry
} from "../types.js";

export const claudeCodeWriter: AgentWriterDef = {
  id: "claude-code",
  async install(config: LogicalConfig, projectRoot: string) {
    await writeAgentsMd(config, projectRoot);
    await writeSkills(config, projectRoot);
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

async function writeSkills(
  config: LogicalConfig,
  projectRoot: string
): Promise<void> {
  if (config.skills.length === 0) return;

  for (const skill of config.skills) {
    const skillDir = join(projectRoot, ".agentskills", "skills", skill.name);
    await mkdir(skillDir, { recursive: true });

    const frontmatter = [
      "---",
      `name: ${skill.name}`,
      `description: ${skill.description}`,
      "---"
    ].join("\n");

    const content = `${frontmatter}\n\n${skill.body}\n`;
    await writeFile(join(skillDir, "SKILL.md"), content, "utf-8");
  }
}

async function writeClaudeSettings(
  config: LogicalConfig,
  projectRoot: string
): Promise<void> {
  // Collect all MCP servers: explicit ones + agentskills if skills exist
  const allServers: McpServerEntry[] = [...config.mcp_servers];

  if (config.skills.length > 0) {
    allServers.push({
      ref: "agentskills",
      command: "npx",
      args: ["-y", "@anthropic-ai/agentskills-mcp-server"],
      env: {}
    });
  }

  if (allServers.length === 0) return;

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

  for (const server of allServers) {
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
