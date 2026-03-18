import { join } from "node:path";
import type { LogicalConfig } from "@codemcp/ade-core";
import type { HarnessWriter } from "../types.js";
import {
  writeMcpServers,
  alwaysAllowEntry,
  writeRulesFile,
  writeGitHooks
} from "../util.js";

export const windsurfWriter: HarnessWriter = {
  id: "windsurf",
  label: "Windsurf",
  description: "Codeium's AI IDE — .windsurf/mcp.json + .windsurfrules",
  async install(config: LogicalConfig, projectRoot: string) {
    await writeMcpServers(config.mcp_servers, {
      path: join(projectRoot, ".windsurf", "mcp.json"),
      transform: alwaysAllowEntry
    });

    await writeRulesFile(
      config.instructions,
      join(projectRoot, ".windsurfrules")
    );
    await writeGitHooks(config.git_hooks, projectRoot);
  }
};
