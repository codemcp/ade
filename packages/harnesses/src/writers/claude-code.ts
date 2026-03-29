import { join } from "node:path";
import type { AutonomyProfile, LogicalConfig } from "@codemcp/ade-core";
import type { HarnessWriter } from "../types.js";
import {
  readJsonOrEmpty,
  writeJson,
  writeMcpServers,
  writeAgentMd,
  writeGitHooks,
  pathExists
} from "../util.js";
import { getAutonomyProfile } from "../permission-policy.js";

export const claudeCodeWriter: HarnessWriter = {
  id: "claude-code",
  label: "Claude Code",
  description:
    "Anthropic's CLI agent — .claude/agents/ade.md + .mcp.json + .claude/settings.json",
  verified: false,
  async detect(projectRoot: string) {
    return pathExists(join(projectRoot, ".claude"));
  },
  async install(config: LogicalConfig, projectRoot: string) {
    await writeAgentMd(config, {
      path: join(projectRoot, ".claude", "agents", "ade.md"),
      fallbackBody: "ADE — Agentic Development Environment agent."
    });

    await writeMcpServers(config.mcp_servers, {
      path: join(projectRoot, ".mcp.json")
    });

    await writeClaudeSettings(config, projectRoot);
    await writeGitHooks(config.git_hooks, projectRoot);
  }
};

async function writeClaudeSettings(
  config: LogicalConfig,
  projectRoot: string
): Promise<void> {
  const settingsPath = join(projectRoot, ".claude", "settings.json");
  const existing = await readJsonOrEmpty(settingsPath);
  const existingPerms = (existing.permissions as Record<string, unknown>) ?? {};
  const existingAllow = asStringArray(existingPerms.allow);
  const existingAsk = asStringArray(existingPerms.ask);

  const autonomyRules = getClaudeAutonomyRules(getAutonomyProfile(config));
  const mcpRules = getClaudeMcpAllowRules(config);
  const allowRules = [
    ...new Set([...existingAllow, ...autonomyRules.allow, ...mcpRules])
  ];
  const askRules = [...new Set([...existingAsk, ...autonomyRules.ask])];

  if (
    allowRules.length === 0 &&
    askRules.length === 0 &&
    config.mcp_servers.length === 0
  ) {
    return;
  }

  await writeJson(settingsPath, {
    ...existing,
    permissions: {
      ...existingPerms,
      ...(allowRules.length > 0 ? { allow: allowRules } : {}),
      ...(askRules.length > 0 ? { ask: askRules } : {})
    }
  });
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === "string")
    : [];
}

function getClaudeMcpAllowRules(config: LogicalConfig): string[] {
  const allowRules: string[] = [];

  for (const server of config.mcp_servers) {
    const allowedTools = server.allowedTools;
    if (!allowedTools || allowedTools.includes("*")) {
      allowRules.push(`mcp__${server.ref}__*`);
      continue;
    }

    for (const tool of allowedTools) {
      allowRules.push(`mcp__${server.ref}__${tool}`);
    }
  }

  return allowRules;
}

function getClaudeAutonomyRules(profile: AutonomyProfile | undefined): {
  allow: string[];
  ask: string[];
} {
  switch (profile) {
    case "rigid":
      return {
        allow: ["Read"],
        ask: [
          "Edit",
          "Write",
          "Glob",
          "Grep",
          "Bash",
          "WebFetch",
          "WebSearch",
          "TodoWrite"
        ]
      };
    case "sensible-defaults":
      return {
        allow: ["Read", "Edit", "Write", "Glob", "Grep", "TodoWrite"],
        ask: ["WebFetch", "WebSearch"]
      };
    case "max-autonomy":
      return {
        allow: ["Read", "Edit", "Write", "Glob", "Grep", "Bash", "TodoWrite"],
        ask: ["WebFetch", "WebSearch"]
      };
    default:
      return { allow: [], ask: [] };
  }
}
