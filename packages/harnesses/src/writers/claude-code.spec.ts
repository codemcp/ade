import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, readFile, access } from "node:fs/promises";
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

  it("writes AGENTS.md with instructions", async () => {
    const config: LogicalConfig = {
      mcp_servers: [],
      instructions: ["Use workflow files.", "Follow conventions."],
      cli_actions: [],
      knowledge_sources: [],
      skills: []
    };

    await claudeCodeWriter.install(config, dir);

    const content = await readFile(join(dir, "AGENTS.md"), "utf-8");
    expect(content).toContain("# AGENTS");
    expect(content).toContain("Use workflow files.");
    expect(content).toContain("Follow conventions.");
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
      knowledge_sources: [],
      skills: []
    };

    await claudeCodeWriter.install(config, dir);

    const raw = await readFile(join(dir, ".claude", "settings.json"), "utf-8");
    const settings = JSON.parse(raw);
    expect(settings.mcpServers["@codemcp/workflows"]).toEqual({
      command: "npx",
      args: ["-y", "@codemcp/workflows"]
    });
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

    const raw = await readFile(join(dir, ".claude", "settings.json"), "utf-8");
    const settings = JSON.parse(raw);
    expect(settings.mcpServers["agentskills"]).toEqual({
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

  it("skips AGENTS.md when no instructions", async () => {
    const config: LogicalConfig = {
      mcp_servers: [],
      instructions: [],
      cli_actions: [],
      knowledge_sources: [],
      skills: []
    };

    await claudeCodeWriter.install(config, dir);

    await expect(readFile(join(dir, "AGENTS.md"), "utf-8")).rejects.toThrow();
  });
});
