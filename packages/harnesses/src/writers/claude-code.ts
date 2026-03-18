import { join } from "node:path";
import type { LogicalConfig } from "@ade/core";
import type { HarnessWriter } from "../types.js";
import {
  readJsonOrEmpty,
  writeJson,
  writeMcpServers,
  writeAgentMd,
  writeInlineSkills,
  writeGitHooks
} from "../util.js";

export const claudeCodeWriter: HarnessWriter = {
  id: "claude-code",
  label: "Claude Code",
  description:
    "Anthropic's CLI agent — .claude/agents/ade.md + .mcp.json + .claude/settings.json",
  async install(config: LogicalConfig, projectRoot: string) {
    await writeAgentMd(config, {
      path: join(projectRoot, ".claude", "agents", "ade.md"),
      fallbackBody: "ADE — Agentic Development Environment agent."
    });

    await writeMcpServers(config.mcp_servers, {
      path: join(projectRoot, ".mcp.json")
    });

    await writeClaudeSettings(config, projectRoot);
    await writeInlineSkills(config, projectRoot);
    await writeGitHooks(config.git_hooks, projectRoot);
  }
};

async function writeClaudeSettings(
  config: LogicalConfig,
  projectRoot: string
): Promise<void> {
  const servers = config.mcp_servers;
  if (servers.length === 0) return;

  const settingsPath = join(projectRoot, ".claude", "settings.json");
  const existing = await readJsonOrEmpty(settingsPath);

  const allowRules: string[] = [];
  for (const server of servers) {
    const allowed = server.allowedTools ?? ["*"];
    if (allowed.includes("*")) {
      allowRules.push(`MCP(${server.ref}:*)`);
    } else {
      for (const tool of allowed) {
        allowRules.push(`MCP(${server.ref}:${tool})`);
      }
    }
  }

  const existingPerms = (existing.permissions as Record<string, unknown>) ?? {};
  const existingAllow = (existingPerms.allow as string[]) ?? [];
  const mergedAllow = [...new Set([...existingAllow, ...allowRules])];

  await writeJson(settingsPath, {
    ...existing,
    permissions: { ...existingPerms, allow: mergedAllow }
  });
}
