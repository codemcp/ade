import { join } from "node:path";
import type { LogicalConfig } from "@ade/core";
import type { HarnessWriter } from "../types.js";
import { writeMcpServers, writeAgentMd } from "../util.js";

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
        ...(Object.keys(s.env).length > 0 ? { env: s.env } : {})
      }),
      defaults: { $schema: "https://opencode.ai/config.json" }
    });

    const servers = config.mcp_servers;
    const extraFm: string[] = [
      "tools:",
      "  read: true",
      "  edit: approve",
      "  bash: approve"
    ];

    if (servers.length > 0) {
      extraFm.push("mcp_servers:");
      for (const s of servers) {
        extraFm.push(`  ${s.ref}:`);
        extraFm.push(
          `    command: [${[s.command, ...s.args].map((a) => `"${a}"`).join(", ")}]`
        );
        if (Object.keys(s.env).length > 0) {
          extraFm.push("    env:");
          for (const [k, v] of Object.entries(s.env)) {
            extraFm.push(`      ${k}: "${v}"`);
          }
        }
      }
    }

    await writeAgentMd(config, {
      path: join(projectRoot, ".opencode", "agents", "ade.md"),
      extraFrontmatter: extraFm,
      fallbackBody:
        "ADE — Agentic Development Environment agent with project conventions and tools."
    });
  }
};
