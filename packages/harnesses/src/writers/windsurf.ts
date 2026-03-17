import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { LogicalConfig, McpServerEntry } from "@ade/core";
import type { HarnessWriter } from "../types.js";

export const windsurfWriter: HarnessWriter = {
  id: "windsurf",
  label: "Windsurf",
  description: "Codeium's AI IDE — .windsurf/mcp.json + .windsurfrules",
  async install(config: LogicalConfig, projectRoot: string) {
    await writeMcpJson(config, projectRoot);
    await writeRules(config, projectRoot);
  }
};

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

  const windsurfDir = join(projectRoot, ".windsurf");
  await mkdir(windsurfDir, { recursive: true });

  const mcpPath = join(windsurfDir, "mcp.json");

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

async function writeRules(
  config: LogicalConfig,
  projectRoot: string
): Promise<void> {
  if (config.instructions.length === 0) return;

  const lines = config.instructions.flatMap((i) => [i, ""]);
  await writeFile(
    join(projectRoot, ".windsurfrules"),
    lines.join("\n"),
    "utf-8"
  );
}
