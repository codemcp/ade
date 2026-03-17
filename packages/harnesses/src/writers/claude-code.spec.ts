import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { LogicalConfig } from "@ade/core";
import { claudeCodeWriter } from "./claude-code.js";

describe("claudeCodeWriter", () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "ade-harness-cc-"));
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("has correct metadata", () => {
    expect(claudeCodeWriter.id).toBe("claude-code");
    expect(claudeCodeWriter.label).toBe("Claude Code");
    expect(claudeCodeWriter.description).toBeTruthy();
  });

  it("writes .claude/agents/ade.md custom agent", async () => {
    const config: LogicalConfig = {
      mcp_servers: [
        {
          ref: "workflows",
          command: "npx",
          args: ["-y", "@codemcp/workflows"],
          env: {}
        }
      ],
      instructions: ["Use workflow files.", "Follow conventions."],
      cli_actions: [],
      knowledge_sources: [],
      skills: []
    };

    await claudeCodeWriter.install(config, dir);

    const content = await readFile(
      join(dir, ".claude", "agents", "ade.md"),
      "utf-8"
    );
    expect(content).toContain("name: ade");
    expect(content).toContain("description:");
    expect(content).toContain("Use workflow files.");
    expect(content).toContain("Follow conventions.");
  });

  it("writes .mcp.json with MCP servers", async () => {
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
      knowledge_sources: [],
      skills: []
    };

    await claudeCodeWriter.install(config, dir);

    const raw = await readFile(join(dir, ".mcp.json"), "utf-8");
    const parsed = JSON.parse(raw);
    expect(parsed.mcpServers["@codemcp/workflows"]).toEqual({
      command: "npx",
      args: ["-y", "@codemcp/workflows"]
    });
  });

  it("writes .claude/settings.json with MCP tool permissions", async () => {
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

    await claudeCodeWriter.install(config, dir);

    const raw = await readFile(join(dir, ".claude", "settings.json"), "utf-8");
    const settings = JSON.parse(raw);
    expect(settings.permissions.allow).toContain("MCP(workflows:*)");
  });

  it("adds skills-server when skills are present", async () => {
    const config: LogicalConfig = {
      mcp_servers: [],
      instructions: [],
      cli_actions: [],
      knowledge_sources: [],
      skills: [{ name: "my-skill", description: "A skill", body: "Do stuff." }]
    };

    await claudeCodeWriter.install(config, dir);

    const raw = await readFile(join(dir, ".mcp.json"), "utf-8");
    const parsed = JSON.parse(raw);
    expect(parsed.mcpServers["agentskills"]).toEqual({
      command: "npx",
      args: ["-y", "@codemcp/skills-server"]
    });
  });

  it("writes inline SKILL.md files", async () => {
    const config: LogicalConfig = {
      mcp_servers: [],
      instructions: [],
      cli_actions: [],
      knowledge_sources: [],
      skills: [
        {
          name: "tanstack-architecture",
          description: "TanStack architecture conventions",
          body: "# Architecture\n\nUse file-based routing."
        }
      ]
    };

    await claudeCodeWriter.install(config, dir);

    const skillMd = await readFile(
      join(dir, ".ade", "skills", "tanstack-architecture", "SKILL.md"),
      "utf-8"
    );
    expect(skillMd).toContain("name: tanstack-architecture");
    expect(skillMd).toContain("# Architecture");
  });
});
