import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type {
  AutonomyProfile,
  LogicalConfig,
  PermissionPolicy
} from "@codemcp/ade-core";
import { claudeCodeWriter } from "./claude-code.js";
import { writeInlineSkills } from "../util.js";

function autonomyPolicy(profile: AutonomyProfile): PermissionPolicy {
  switch (profile) {
    case "rigid":
      return {
        profile,
        capabilities: {
          read: "ask",
          edit_write: "ask",
          search_list: "ask",
          bash_safe: "ask",
          bash_unsafe: "ask",
          web: "ask",
          task_agent: "ask"
        }
      };
    case "sensible-defaults":
      return {
        profile,
        capabilities: {
          read: "allow",
          edit_write: "allow",
          search_list: "allow",
          bash_safe: "allow",
          bash_unsafe: "ask",
          web: "ask",
          task_agent: "allow"
        }
      };
    case "max-autonomy":
      return {
        profile,
        capabilities: {
          read: "allow",
          edit_write: "allow",
          search_list: "allow",
          bash_safe: "allow",
          bash_unsafe: "allow",
          web: "ask",
          task_agent: "allow"
        }
      };
  }
}

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
      skills: [],
      git_hooks: [],
      setup_notes: []
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
      skills: [],
      git_hooks: [],
      setup_notes: []
    };

    await claudeCodeWriter.install(config, dir);

    const raw = await readFile(join(dir, ".mcp.json"), "utf-8");
    const parsed = JSON.parse(raw);
    expect(parsed.mcpServers["@codemcp/workflows"]).toEqual({
      command: "npx",
      args: ["-y", "@codemcp/workflows"]
    });
  });

  it("forwards explicit MCP tool permissions using Claude rule names", async () => {
    const config: LogicalConfig = {
      mcp_servers: [
        {
          ref: "workflows",
          command: "npx",
          args: ["-y", "@codemcp/workflows"],
          env: {},
          allowedTools: ["use_skill", "whats_next"]
        }
      ],
      instructions: [],
      cli_actions: [],
      knowledge_sources: [],
      skills: [],
      git_hooks: [],
      setup_notes: []
    };

    await claudeCodeWriter.install(config, dir);

    const raw = await readFile(join(dir, ".claude", "settings.json"), "utf-8");
    const settings = JSON.parse(raw);
    expect(settings.permissions.allow).toEqual(
      expect.arrayContaining([
        "mcp__workflows__use_skill",
        "mcp__workflows__whats_next"
      ])
    );
  });

  it("does not invent wildcard MCP permission rules", async () => {
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

    await claudeCodeWriter.install(config, dir);

    const raw = await readFile(join(dir, ".claude", "settings.json"), "utf-8");
    const settings = JSON.parse(raw);
    expect(settings.permissions.allow ?? []).toEqual([]);
  });

  it("keeps web on ask for rigid autonomy without broad built-in allows", async () => {
    const config: LogicalConfig = {
      mcp_servers: [],
      instructions: [],
      cli_actions: [],
      knowledge_sources: [],
      skills: [],
      git_hooks: [],
      setup_notes: [],
      permission_policy: autonomyPolicy("rigid")
    };

    await claudeCodeWriter.install(config, dir);

    const raw = await readFile(join(dir, ".claude", "settings.json"), "utf-8");
    const settings = JSON.parse(raw);
    expect(settings.permissions.allow ?? []).toEqual([]);
    expect(settings.permissions.ask).toEqual(
      expect.arrayContaining(["WebFetch", "WebSearch"])
    );
  });

  it("maps sensible-defaults to Claude built-in permission rules", async () => {
    const config: LogicalConfig = {
      mcp_servers: [],
      instructions: [],
      cli_actions: [],
      knowledge_sources: [],
      skills: [],
      git_hooks: [],
      setup_notes: [],
      permission_policy: autonomyPolicy("sensible-defaults")
    };

    await claudeCodeWriter.install(config, dir);

    const raw = await readFile(join(dir, ".claude", "settings.json"), "utf-8");
    const settings = JSON.parse(raw);
    expect(settings.permissions.allow).toEqual(
      expect.arrayContaining(["Read", "Edit", "Glob", "Grep", "TodoWrite"])
    );
    expect(settings.permissions.allow).not.toContain("Bash");
    expect(settings.permissions.ask).toEqual(
      expect.arrayContaining(["WebFetch", "WebSearch"])
    );
  });

  it("maps max-autonomy to broad Claude built-in permission rules while preserving web ask", async () => {
    const config: LogicalConfig = {
      mcp_servers: [],
      instructions: [],
      cli_actions: [],
      knowledge_sources: [],
      skills: [],
      git_hooks: [],
      setup_notes: [],
      permission_policy: autonomyPolicy("max-autonomy")
    };

    await claudeCodeWriter.install(config, dir);

    const raw = await readFile(join(dir, ".claude", "settings.json"), "utf-8");
    const settings = JSON.parse(raw);
    expect(settings.permissions.allow).toEqual(
      expect.arrayContaining([
        "Read",
        "Edit",
        "Bash",
        "Glob",
        "Grep",
        "TodoWrite"
      ])
    );
    expect(settings.permissions.ask).toEqual(
      expect.arrayContaining(["WebFetch", "WebSearch"])
    );
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
      skills: [{ name: "my-skill", description: "A skill", body: "Do stuff." }],
      git_hooks: [],
      setup_notes: []
    };

    await claudeCodeWriter.install(config, dir);

    const raw = await readFile(join(dir, ".mcp.json"), "utf-8");
    const parsed = JSON.parse(raw);
    expect(parsed.mcpServers["agentskills"]).toEqual({
      command: "npx",
      args: ["-y", "@codemcp/skills-server"]
    });
  });

  it("writes inline SKILL.md files via writeInlineSkills", async () => {
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
      ],
      git_hooks: [],
      setup_notes: []
    };

    await writeInlineSkills(config, dir);

    const skillMd = await readFile(
      join(dir, ".ade", "skills", "tanstack-architecture", "SKILL.md"),
      "utf-8"
    );
    expect(skillMd).toContain("name: tanstack-architecture");
    expect(skillMd).toContain("# Architecture");
  });
});
