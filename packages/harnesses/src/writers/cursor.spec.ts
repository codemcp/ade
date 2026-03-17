import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { LogicalConfig } from "@ade/core";
import { cursorWriter } from "./cursor.js";

describe("cursorWriter", () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "ade-harness-cursor-"));
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("has correct metadata", () => {
    expect(cursorWriter.id).toBe("cursor");
    expect(cursorWriter.label).toBe("Cursor");
  });

  it("writes .cursor/mcp.json with MCP servers", async () => {
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
      skills: []
    };

    await cursorWriter.install(config, dir);

    const raw = await readFile(join(dir, ".cursor", "mcp.json"), "utf-8");
    const parsed = JSON.parse(raw);
    expect(parsed.mcpServers["workflows"]).toEqual({
      command: "npx",
      args: ["-y", "@codemcp/workflows"]
    });
  });

  it("writes .cursor/rules/ade.mdc with instructions", async () => {
    const config: LogicalConfig = {
      mcp_servers: [],
      instructions: ["Follow TDD.", "Use conventional commits."],
      cli_actions: [],
      knowledge_sources: [],
      skills: []
    };

    await cursorWriter.install(config, dir);

    const content = await readFile(
      join(dir, ".cursor", "rules", "ade.mdc"),
      "utf-8"
    );
    expect(content).toContain("description: ADE project conventions");
    expect(content).toContain("Follow TDD.");
    expect(content).toContain("Use conventional commits.");
  });

  it("includes agentskills server from mcp_servers", async () => {
    const config: LogicalConfig = {
      mcp_servers: [
        {
          ref: "agentskills",
          command: "npx",
          args: ["-y", "@codemcp/skills-server"],
          env: {}
        }
      ],
      instructions: [],
      cli_actions: [],
      knowledge_sources: [],
      skills: [{ name: "my-skill", description: "A skill", body: "content" }]
    };

    await cursorWriter.install(config, dir);

    const raw = await readFile(join(dir, ".cursor", "mcp.json"), "utf-8");
    const parsed = JSON.parse(raw);
    expect(parsed.mcpServers["agentskills"]).toBeDefined();
  });

  it("skips mcp.json when no servers and no skills", async () => {
    const config: LogicalConfig = {
      mcp_servers: [],
      instructions: ["hello"],
      cli_actions: [],
      knowledge_sources: [],
      skills: []
    };

    await cursorWriter.install(config, dir);

    await expect(
      readFile(join(dir, ".cursor", "mcp.json"), "utf-8")
    ).rejects.toThrow();
  });
});
