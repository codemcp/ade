import { join } from "node:path";
import type { LogicalConfig } from "@ade/core";
import type { HarnessWriter } from "../types.js";
import { writeMcpServers, alwaysAllowEntry, writeRulesFile } from "../util.js";

export const clineWriter: HarnessWriter = {
  id: "cline",
  label: "Cline",
  description: "VS Code AI agent — .cline/mcp.json + .clinerules",
  async install(config: LogicalConfig, projectRoot: string) {
    await writeMcpServers(config.mcp_servers, {
      path: join(projectRoot, ".cline", "mcp.json"),
      transform: alwaysAllowEntry
    });

    await writeRulesFile(config.instructions, join(projectRoot, ".clinerules"));
  }
};
