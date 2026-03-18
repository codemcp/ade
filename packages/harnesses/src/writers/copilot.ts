import { join } from "node:path";
import type { LogicalConfig } from "@codemcp/ade-core";
import type { HarnessWriter } from "../types.js";
import {
  writeMcpServers,
  stdioEntry,
  writeAgentMd,
  writeGitHooks
} from "../util.js";

export const copilotWriter: HarnessWriter = {
  id: "copilot",
  label: "GitHub Copilot",
  description: "VS Code + CLI — .vscode/mcp.json + .github/agents/ade.agent.md",
  async install(config: LogicalConfig, projectRoot: string) {
    await writeMcpServers(config.mcp_servers, {
      path: join(projectRoot, ".vscode", "mcp.json"),
      key: "servers",
      transform: stdioEntry
    });

    const tools = [
      "edit",
      "search",
      "runCommands",
      "runTasks",
      "fetch",
      "githubRepo",
      ...config.mcp_servers.map((s) => `${s.ref}/*`)
    ];

    await writeAgentMd(config, {
      path: join(projectRoot, ".github", "agents", "ade.agent.md"),
      extraFrontmatter: ["tools:", ...tools.map((t) => `  - ${t}`)]
    });
    await writeGitHooks(config.git_hooks, projectRoot);
  }
};
