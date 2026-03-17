import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { LogicalConfig } from "@ade/core";
import type { HarnessWriter } from "../types.js";
import { writeMcpServers } from "../util.js";

export const cursorWriter: HarnessWriter = {
  id: "cursor",
  label: "Cursor",
  description: "AI code editor — .cursor/mcp.json + .cursor/rules/",
  async install(config: LogicalConfig, projectRoot: string) {
    await writeMcpServers(config.mcp_servers, {
      path: join(projectRoot, ".cursor", "mcp.json")
    });

    if (config.instructions.length > 0) {
      const rulesDir = join(projectRoot, ".cursor", "rules");
      await mkdir(rulesDir, { recursive: true });

      const content = [
        "---",
        "description: ADE project conventions",
        "globs: *",
        "---",
        "",
        ...config.instructions.flatMap((i) => [i, ""])
      ].join("\n");

      await writeFile(join(rulesDir, "ade.mdc"), content, "utf-8");
    }
  }
};
