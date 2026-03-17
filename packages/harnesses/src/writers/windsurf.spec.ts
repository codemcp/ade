import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { LogicalConfig } from "@ade/core";
import { windsurfWriter } from "./windsurf.js";

describe("windsurfWriter", () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "ade-harness-windsurf-"));
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("has correct metadata", () => {
    expect(windsurfWriter.id).toBe("windsurf");
    expect(windsurfWriter.label).toBe("Windsurf");
  });

  it("writes .windsurf/mcp.json with MCP servers", async () => {
    const config: LogicalConfig = {
      mcp_servers: [
        {
          ref: "workflows",
          command: "npx",
          args: ["-y", "@codemcp/workflows"],
          env: { API_KEY: "test" }
        }
      ],
      instructions: [],
      cli_actions: [],
      knowledge_sources: [],
      skills: []
    };

    await windsurfWriter.install(config, dir);

    const raw = await readFile(join(dir, ".windsurf", "mcp.json"), "utf-8");
    const parsed = JSON.parse(raw);
    expect(parsed.mcpServers["workflows"]).toEqual({
      command: "npx",
      args: ["-y", "@codemcp/workflows"],
      env: { API_KEY: "test" }
    });
  });

  it("writes .windsurfrules with instructions", async () => {
    const config: LogicalConfig = {
      mcp_servers: [],
      instructions: ["Follow TDD."],
      cli_actions: [],
      knowledge_sources: [],
      skills: []
    };

    await windsurfWriter.install(config, dir);

    const content = await readFile(join(dir, ".windsurfrules"), "utf-8");
    expect(content).toContain("Follow TDD.");
  });
});
