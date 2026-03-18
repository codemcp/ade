import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { LogicalConfig } from "@ade/core";
import { rooCodeWriter } from "./roo-code.js";

describe("rooCodeWriter", () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "ade-harness-roo-"));
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("has correct metadata", () => {
    expect(rooCodeWriter.id).toBe("roo-code");
    expect(rooCodeWriter.label).toBe("Roo Code");
  });

  it("writes .roo/mcp.json with MCP servers", async () => {
    const config: LogicalConfig = {
      mcp_servers: [
        {
          ref: "workflows",
          command: "npx",
          args: ["-y", "@codemcp/workflows"],
          env: {}
        }
      ],
      instructions: [],
      cli_actions: [],
      knowledge_sources: [],
      skills: [],
      git_hooks: [],
      setup_notes: []
    };

    await rooCodeWriter.install(config, dir);

    const raw = await readFile(join(dir, ".roo", "mcp.json"), "utf-8");
    const parsed = JSON.parse(raw);
    expect(parsed.mcpServers["workflows"]).toEqual({
      command: "npx",
      args: ["-y", "@codemcp/workflows"],
      alwaysAllow: ["*"]
    });
  });

  it("writes .roorules with instructions", async () => {
    const config: LogicalConfig = {
      mcp_servers: [],
      instructions: ["Follow TDD."],
      cli_actions: [],
      knowledge_sources: [],
      skills: [],
      git_hooks: [],
      setup_notes: []
    };

    await rooCodeWriter.install(config, dir);

    const content = await readFile(join(dir, ".roorules"), "utf-8");
    expect(content).toContain("Follow TDD.");
  });
});
