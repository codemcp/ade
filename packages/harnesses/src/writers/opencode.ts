import { join } from "node:path";
import type { LogicalConfig, PermissionRule } from "@codemcp/ade-core";
import type { HarnessWriter } from "../types.js";
import {
  writeAgentMd,
  writeGitHooks,
  writeMcpServers
} from "../util.js";
import { getHarnessPermissionRules } from "../permission-policy.js";

export const opencodeWriter: HarnessWriter = {
  id: "opencode",
  label: "OpenCode",
  description: "Terminal AI agent — opencode.json + .opencode/agents/",
  async install(config: LogicalConfig, projectRoot: string) {
    await writeMcpServers(config.mcp_servers, {
      path: join(projectRoot, "opencode.json"),
      key: "mcp",
      transform: (s) => ({
        type: "local",
        command: [s.command, ...s.args],
        ...(Object.keys(s.env).length > 0 ? { environment: s.env } : {})
      }),
      defaults: { $schema: "https://opencode.ai/config.json" }
    });

    const permission = getHarnessPermissionRules(config);

    await writeAgentMd(config, {
      path: join(projectRoot, ".opencode", "agents", "ade.md"),
      extraFrontmatter: permission
        ? renderYamlMapping("permission", permission)
        : undefined,
      fallbackBody:
        "ADE — Agentic Development Environment agent with project conventions and tools."
    });
    await writeGitHooks(config.git_hooks, projectRoot);
  }
};

function renderYamlMapping(
  key: string,
  value: Record<string, PermissionRule>,
  indent = 0
): string[] {
  const prefix = " ".repeat(indent);
  const lines = [`${prefix}${formatYamlKey(key)}:`];

  for (const [childKey, childValue] of Object.entries(value)) {
    if (
      typeof childValue === "object" &&
      childValue !== null &&
      !Array.isArray(childValue)
    ) {
      lines.push(...renderYamlMapping(childKey, childValue, indent + 2));
      continue;
    }

    lines.push(
      `${" ".repeat(indent + 2)}${formatYamlKey(childKey)}: ${JSON.stringify(childValue)}`
    );
  }

  return lines;
}

function formatYamlKey(value: string): string {
  return /^[A-Za-z_][A-Za-z0-9_-]*$/.test(value) ? value : JSON.stringify(value);
}
