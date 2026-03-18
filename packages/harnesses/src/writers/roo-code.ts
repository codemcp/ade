import { join } from "node:path";
import type { LogicalConfig } from "@ade/core";
import type { HarnessWriter } from "../types.js";
import {
  writeMcpServers,
  alwaysAllowEntry,
  writeRulesFile,
  writeGitHooks
} from "../util.js";

export const rooCodeWriter: HarnessWriter = {
  id: "roo-code",
  label: "Roo Code",
  description: "AI coding agent — .roo/mcp.json + .roorules",
  async install(config: LogicalConfig, projectRoot: string) {
    await writeMcpServers(config.mcp_servers, {
      path: join(projectRoot, ".roo", "mcp.json"),
      transform: alwaysAllowEntry
    });

    await writeRulesFile(config.instructions, join(projectRoot, ".roorules"));
    await writeGitHooks(config.git_hooks, projectRoot);
  }
};
