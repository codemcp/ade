import { join } from "node:path";
import type { LogicalConfig } from "@codemcp/ade-core";
import type { HarnessWriter } from "../types.js";
import {
  writeMcpServers,
  alwaysAllowEntry,
  writeRulesFile,
  writeGitHooks
} from "../util.js";

export const clineWriter: HarnessWriter = {
  id: "cline",
  label: "Cline",
  description: "VS Code AI agent — cline_mcp_settings.json + .clinerules",
  async install(config: LogicalConfig, projectRoot: string) {
    await writeMcpServers(config.mcp_servers, {
      path: join(projectRoot, "cline_mcp_settings.json"),
      transform: alwaysAllowEntry
    });

    await writeRulesFile(config.instructions, join(projectRoot, ".clinerules"));
    await writeGitHooks(config.git_hooks, projectRoot);
  }
};
