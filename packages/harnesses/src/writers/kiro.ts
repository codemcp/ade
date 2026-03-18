import { join } from "node:path";
import type { LogicalConfig } from "@codemcp/ade-core";
import type { HarnessWriter } from "../types.js";
import { standardEntry, writeJson, writeGitHooks } from "../util.js";

export const kiroWriter: HarnessWriter = {
  id: "kiro",
  label: "Kiro",
  description: "AWS AI IDE — .kiro/agents/ade.json",
  async install(config: LogicalConfig, projectRoot: string) {
    const servers = config.mcp_servers;
    if (servers.length > 0 || config.instructions.length > 0) {
      const mcpServers: Record<string, unknown> = {};
      for (const s of servers) {
        mcpServers[s.ref] = standardEntry(s);
      }

      const tools: string[] = [
        "execute_bash",
        "fs_read",
        "fs_write",
        "knowledge",
        "thinking",
        ...Object.keys(mcpServers).map((n) => `@${n}`)
      ];

      const allowedTools: string[] = [];
      for (const s of servers) {
        const explicit = s.allowedTools;
        if (explicit && !explicit.includes("*")) {
          for (const tool of explicit) {
            allowedTools.push(`@${s.ref}/${tool}`);
          }
        } else {
          allowedTools.push(`@${s.ref}/*`);
        }
      }

      await writeJson(join(projectRoot, ".kiro", "agents", "ade.json"), {
        name: "ade",
        prompt:
          config.instructions.length > 0
            ? config.instructions.join("\n\n")
            : "ADE — Agentic Development Environment agent",
        mcpServers,
        tools,
        allowedTools
      });
    }
    await writeGitHooks(config.git_hooks, projectRoot);
  }
};
