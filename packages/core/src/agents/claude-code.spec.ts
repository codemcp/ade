import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { LogicalConfig } from "../types.js";
import { claudeCodeWriter } from "./claude-code.js";

describe("claudeCodeWriter", () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "ade-agent-"));
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("writes AGENTS.md with instructions", async () => {
    const config: LogicalConfig = {
      mcp_servers: [],
      instructions: ["Use workflow files.", "Follow conventions."],
      cli_actions: [],
      knowledge_sources: []
    };

    await claudeCodeWriter.install(config, dir);

    const content = await readFile(join(dir, "AGENTS.md"), "utf-8");
    expect(content).toContain("# AGENTS");
    expect(content).toContain("- Use workflow files.");
    expect(content).toContain("- Follow conventions.");
  });

  it("writes .claude/settings.json with MCP servers", async () => {
    const config: LogicalConfig = {
      mcp_servers: [
        {
          ref: "@codemcp/workflows",
          command: "npx",
          args: ["-y", "@codemcp/workflows"],
          env: {}
        }
      ],
      instructions: [],
      cli_actions: [],
      knowledge_sources: []
    };

    await claudeCodeWriter.install(config, dir);

    const raw = await readFile(join(dir, ".claude", "settings.json"), "utf-8");
    const settings = JSON.parse(raw);
    expect(settings.mcpServers["@codemcp/workflows"]).toEqual({
      command: "npx",
      args: ["-y", "@codemcp/workflows"]
    });
  });

  it("preserves existing settings.json keys", async () => {
    const { mkdir, writeFile } = await import("node:fs/promises");
    await mkdir(join(dir, ".claude"), { recursive: true });
    await writeFile(
      join(dir, ".claude", "settings.json"),
      JSON.stringify({ customKey: true }),
      "utf-8"
    );

    const config: LogicalConfig = {
      mcp_servers: [
        {
          ref: "my-server",
          command: "node",
          args: ["server.js"],
          env: { API_KEY: "secret" }
        }
      ],
      instructions: [],
      cli_actions: [],
      knowledge_sources: []
    };

    await claudeCodeWriter.install(config, dir);

    const raw = await readFile(join(dir, ".claude", "settings.json"), "utf-8");
    const settings = JSON.parse(raw);
    expect(settings.customKey).toBe(true);
    expect(settings.mcpServers["my-server"]).toEqual({
      command: "node",
      args: ["server.js"],
      env: { API_KEY: "secret" }
    });
  });

  it("skips AGENTS.md when no instructions", async () => {
    const config: LogicalConfig = {
      mcp_servers: [],
      instructions: [],
      cli_actions: [],
      knowledge_sources: []
    };

    await claudeCodeWriter.install(config, dir);

    await expect(readFile(join(dir, "AGENTS.md"), "utf-8")).rejects.toThrow();
  });

  it("skips settings.json when no MCP servers", async () => {
    const config: LogicalConfig = {
      mcp_servers: [],
      instructions: ["hello"],
      cli_actions: [],
      knowledge_sources: []
    };

    await claudeCodeWriter.install(config, dir);

    await expect(
      readFile(join(dir, ".claude", "settings.json"), "utf-8")
    ).rejects.toThrow();
  });
});
