import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { LogicalConfig } from "@ade/core";
import { clineWriter } from "./cline.js";

describe("clineWriter", () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "ade-harness-cline-"));
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("has correct metadata", () => {
    expect(clineWriter.id).toBe("cline");
    expect(clineWriter.label).toBe("Cline");
  });

  it("writes .cline/mcp.json with MCP servers", async () => {
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

    await clineWriter.install(config, dir);

    const raw = await readFile(join(dir, ".cline", "mcp.json"), "utf-8");
    const parsed = JSON.parse(raw);
    expect(parsed.mcpServers["workflows"]).toEqual({
      command: "npx",
      args: ["-y", "@codemcp/workflows"],
      alwaysAllow: ["*"]
    });
  });

  it("writes .clinerules with instructions", async () => {
    const config: LogicalConfig = {
      mcp_servers: [],
      instructions: ["Follow TDD."],
      cli_actions: [],
      knowledge_sources: [],
      skills: [],
      git_hooks: [],
      setup_notes: []
    };

    await clineWriter.install(config, dir);

    const content = await readFile(join(dir, ".clinerules"), "utf-8");
    expect(content).toContain("Follow TDD.");
  });
});
