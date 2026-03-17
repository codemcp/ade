import { join } from "node:path";
import type { LogicalConfig } from "@ade/core";
import type { HarnessWriter } from "../types.js";
import { writeMcpServers, alwaysAllowEntry, writeRulesFile } from "../util.js";

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
  }
};
