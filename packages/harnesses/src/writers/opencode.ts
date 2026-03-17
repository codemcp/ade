import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { LogicalConfig, McpServerEntry } from "@ade/core";
import type { HarnessWriter } from "../types.js";

export const opencodeWriter: HarnessWriter = {
  id: "opencode",
  label: "OpenCode",
  description: "Terminal AI agent — opencode.json + .opencode/agents/",
  async install(config: LogicalConfig, projectRoot: string) {
    await writeOpenCodeJson(config, projectRoot);
    await writeAgentMd(config, projectRoot);
  }
};

async function writeOpenCodeJson(
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

  const configPath = join(projectRoot, "opencode.json");

  let existing: Record<string, unknown> = {};
  try {
    const raw = await readFile(configPath, "utf-8");
    existing = JSON.parse(raw);
  } catch {
    // Start fresh
  }

  const mcp: Record<
    string,
    { type: string; command: string[]; env?: Record<string, string> }
  > = (existing.mcp as typeof mcp) ?? {};

  for (const server of allServers) {
    mcp[server.ref] = {
      type: "local",
      command: [server.command, ...server.args],
      ...(Object.keys(server.env).length > 0 ? { env: server.env } : {})
    };
  }

  const result = {
    $schema: "https://opencode.ai/config.json",
    ...existing,
    mcp
  };

  await writeFile(configPath, JSON.stringify(result, null, 2) + "\n", "utf-8");
}

async function writeAgentMd(
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

  const agentsDir = join(projectRoot, ".opencode", "agents");
  await mkdir(agentsDir, { recursive: true });

  const frontmatter: string[] = [
    "---",
    "name: ade",
    "description: ADE — Agentic Development Environment agent"
  ];

  // Tool permissions
  frontmatter.push("tools:");
  frontmatter.push("  read: true");
  frontmatter.push("  edit: approve");
  frontmatter.push("  bash: approve");

  // MCP server references
  if (allServers.length > 0) {
    frontmatter.push("mcp_servers:");
    for (const server of allServers) {
      frontmatter.push(`  ${server.ref}:`);
      frontmatter.push(
        `    command: [${[server.command, ...server.args].map((a) => `"${a}"`).join(", ")}]`
      );
      if (Object.keys(server.env).length > 0) {
        frontmatter.push("    env:");
        for (const [k, v] of Object.entries(server.env)) {
          frontmatter.push(`      ${k}: "${v}"`);
        }
      }
    }
  }

  frontmatter.push("---");

  const body =
    config.instructions.length > 0
      ? config.instructions.join("\n\n")
      : "ADE — Agentic Development Environment agent with project conventions and tools.";

  const content = frontmatter.join("\n") + "\n\n" + body + "\n";
  await writeFile(join(agentsDir, "ade.md"), content, "utf-8");
}
