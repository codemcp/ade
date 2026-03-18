import { join } from "node:path";
import { writeFile } from "node:fs/promises";
import type { LogicalConfig } from "@codemcp/ade-core";
import type { HarnessWriter } from "../types.js";
import { writeMcpServers, writeGitHooks } from "../util.js";

export const universalWriter: HarnessWriter = {
  id: "universal",
  label: "Universal (AGENTS.md + .mcp.json)",
  description:
    "Cross-tool standard — AGENTS.md + .mcp.json (works with any agent)",
  async install(config: LogicalConfig, projectRoot: string) {
    if (config.instructions.length > 0) {
      const lines = [
        "# AGENTS",
        "",
        ...config.instructions.flatMap((i) => [i, ""])
      ];
      await writeFile(
        join(projectRoot, "AGENTS.md"),
        lines.join("\n"),
        "utf-8"
      );
    }

    await writeMcpServers(config.mcp_servers, {
      path: join(projectRoot, ".mcp.json")
    });
    await writeGitHooks(config.git_hooks, projectRoot);
  }
};
