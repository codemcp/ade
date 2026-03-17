import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { LogicalConfig, McpServerEntry, InlineSkill } from "@ade/core";
import type { HarnessWriter } from "../types.js";

function isInlineSkill(
  skill: LogicalConfig["skills"][number]
): skill is InlineSkill {
  return "body" in skill;
}

export const claudeCodeWriter: HarnessWriter = {
  id: "claude-code",
  label: "Claude Code",
  description:
    "Anthropic's CLI agent — .claude/agents/ade.md + .mcp.json + .claude/settings.json",
  async install(config: LogicalConfig, projectRoot: string) {
    await writeCustomAgent(config, projectRoot);
    await writeMcpJson(config, projectRoot);
    await writeClaudeSettings(config, projectRoot);
    await writeSkills(config, projectRoot);
  }
};

/**
 * Write .claude/agents/ade.md — the preferred custom agent definition
 * that combines instructions and MCP tool references.
 */
async function writeCustomAgent(
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

  if (config.instructions.length === 0 && allServers.length === 0) return;

  const agentsDir = join(projectRoot, ".claude", "agents");
  await mkdir(agentsDir, { recursive: true });

  const frontmatter: string[] = [
    "---",
    "name: ade",
    "description: ADE — Agentic Development Environment agent with project conventions and tools"
  ];

  frontmatter.push("---");

  const body =
    config.instructions.length > 0
      ? config.instructions.join("\n\n")
      : "ADE — Agentic Development Environment agent.";

  const content = frontmatter.join("\n") + "\n\n" + body + "\n";
  await writeFile(join(agentsDir, "ade.md"), content, "utf-8");
}

/**
 * Write .mcp.json — the standard MCP config at project root.
 * Claude Code reads this natively.
 */
async function writeMcpJson(
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

/**
 * Write .claude/settings.json — permissions for MCP tools.
 */
async function writeClaudeSettings(
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

  if (allServers.length === 0) return;

  const claudeDir = join(projectRoot, ".claude");
  await mkdir(claudeDir, { recursive: true });

  const settingsPath = join(claudeDir, "settings.json");

  let existing: Record<string, unknown> = {};
  try {
    const raw = await readFile(settingsPath, "utf-8");
    existing = JSON.parse(raw);
  } catch {
    // No existing file — start fresh
  }

  // Build permission allow-list for MCP tools
  const allowRules: string[] = [];
  for (const server of allServers) {
    const allowed = server.allowedTools ?? ["*"];
    if (allowed.includes("*")) {
      allowRules.push(`MCP(${server.ref}:*)`);
    } else {
      for (const tool of allowed) {
        allowRules.push(`MCP(${server.ref}:${tool})`);
      }
    }
  }

  const existingPermissions =
    (existing.permissions as Record<string, unknown>) ?? {};
  const existingAllow = (existingPermissions.allow as string[]) ?? [];

  // Merge: keep existing rules, add new ones
  const mergedAllow = [...new Set([...existingAllow, ...allowRules])];

  const settings = {
    ...existing,
    permissions: {
      ...existingPermissions,
      allow: mergedAllow
    }
  };

  await writeFile(
    settingsPath,
    JSON.stringify(settings, null, 2) + "\n",
    "utf-8"
  );
}

async function writeSkills(
  config: LogicalConfig,
  projectRoot: string
): Promise<void> {
  if (config.skills.length === 0) return;

  for (const skill of config.skills) {
    if (!isInlineSkill(skill)) continue;

    const skillDir = join(projectRoot, ".ade", "skills", skill.name);
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
