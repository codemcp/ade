import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { LogicalConfig, McpServerEntry } from "@ade/core";
import type { HarnessWriter } from "../types.js";

export const rooCodeWriter: HarnessWriter = {
  id: "roo-code",
  label: "Roo Code",
  description: "AI coding agent — .roo/mcp.json + .roorules",
  async install(config: LogicalConfig, projectRoot: string) {
    await writeMcpJson(config, projectRoot);
    await writeRules(config, projectRoot);
  }
};

async function writeMcpJson(
  config: LogicalConfig,
  projectRoot: string
): Promise<void> {
  const allServers: McpServerEntry[] = config.mcp_servers;

  if (allServers.length === 0) return;

  const rooDir = join(projectRoot, ".roo");
  await mkdir(rooDir, { recursive: true });

  const mcpPath = join(rooDir, "mcp.json");

  let existing: Record<string, unknown> = {};
  try {
    const raw = await readFile(mcpPath, "utf-8");
    existing = JSON.parse(raw);
  } catch {
    // Start fresh
  }

  const mcpServers: Record<
    string,
    {
      command: string;
      args: string[];
      env?: Record<string, string>;
      alwaysAllow?: string[];
    }
  > = (existing.mcpServers as typeof mcpServers) ?? {};

  for (const server of allServers) {
    const allowed = server.allowedTools ?? ["*"];
    mcpServers[server.ref] = {
      command: server.command,
      args: server.args,
      ...(Object.keys(server.env).length > 0 ? { env: server.env } : {}),
      alwaysAllow: allowed
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
  await writeFile(join(projectRoot, ".roorules"), lines.join("\n"), "utf-8");
}
