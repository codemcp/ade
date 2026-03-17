import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { LogicalConfig, McpServerEntry } from "@ade/core";
import type { HarnessWriter } from "../types.js";

export const copilotWriter: HarnessWriter = {
  id: "copilot",
  label: "GitHub Copilot",
  description:
    "VS Code Copilot — .vscode/mcp.json + .github/copilot-instructions.md",
  async install(config: LogicalConfig, projectRoot: string) {
    await writeVsCodeMcp(config, projectRoot);
    await writeCopilotInstructions(config, projectRoot);
    await writeCopilotAgent(config, projectRoot);
  }
};

async function writeVsCodeMcp(
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

  const vscodeDir = join(projectRoot, ".vscode");
  await mkdir(vscodeDir, { recursive: true });

  const mcpPath = join(vscodeDir, "mcp.json");

  let existing: Record<string, unknown> = {};
  try {
    const raw = await readFile(mcpPath, "utf-8");
    existing = JSON.parse(raw);
  } catch {
    // Start fresh
  }

  // Copilot uses "servers" key, not "mcpServers"
  const servers: Record<
    string,
    {
      type: string;
      command: string;
      args: string[];
      env?: Record<string, string>;
    }
  > = (existing.servers as typeof servers) ?? {};

  for (const server of allServers) {
    servers[server.ref] = {
      type: "stdio",
      command: server.command,
      args: server.args,
      ...(Object.keys(server.env).length > 0 ? { env: server.env } : {})
    };
  }

  const result = { ...existing, servers };
  await writeFile(mcpPath, JSON.stringify(result, null, 2) + "\n", "utf-8");
}

async function writeCopilotInstructions(
  config: LogicalConfig,
  projectRoot: string
): Promise<void> {
  if (config.instructions.length === 0) return;

  const githubDir = join(projectRoot, ".github");
  await mkdir(githubDir, { recursive: true });

  const lines = config.instructions.flatMap((i) => [i, ""]);
  await writeFile(
    join(githubDir, "copilot-instructions.md"),
    lines.join("\n"),
    "utf-8"
  );
}

/**
 * Write a dedicated ADE agent definition that combines instructions and
 * references configured MCP servers.
 */
async function writeCopilotAgent(
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

  const agentsDir = join(projectRoot, ".github", "agents");
  await mkdir(agentsDir, { recursive: true });

  const frontmatter: string[] = [
    "---",
    "name: ade",
    "description: ADE — Agentic Development Environment agent with project conventions and tools"
  ];

  if (allServers.length > 0) {
    frontmatter.push("tools:", ...allServers.map((s) => `  - ${s.ref}`));
  }

  frontmatter.push("---");

  const body =
    config.instructions.length > 0 ? config.instructions.join("\n\n") : "";

  const content = frontmatter.join("\n") + "\n\n" + body + "\n";
  await writeFile(join(agentsDir, "ade.agent.md"), content, "utf-8");
}
