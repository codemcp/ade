import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type {
  AutonomyProfile,
  LogicalConfig,
  PermissionPolicy
} from "@codemcp/ade-core";
import { cursorWriter } from "./cursor.js";

function autonomyPolicy(profile: AutonomyProfile): PermissionPolicy {
  return { profile };
}

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
      skills: [],
      git_hooks: [],
      setup_notes: []
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
      skills: [],
      git_hooks: [],
      setup_notes: []
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

  it("documents autonomy limits in Cursor rules without inventing built-in permission config", async () => {
    const config: LogicalConfig = {
      mcp_servers: [
        {
          ref: "workflows",
          command: "npx",
          args: ["-y", "@codemcp/workflows"],
          env: {},
          allowedTools: ["whats_next"]
        }
      ],
      instructions: [],
      cli_actions: [],
      knowledge_sources: [],
      skills: [],
      git_hooks: [],
      setup_notes: [],
      permission_policy: autonomyPolicy("sensible-defaults")
    };

    await cursorWriter.install(config, dir);

    const content = await readFile(
      join(dir, ".cursor", "rules", "ade.mdc"),
      "utf-8"
    );
    expect(content).toContain(
      "Cursor autonomy note (documented, not enforced): sensible-defaults."
    );
    expect(content).toContain(
      "Cursor has no verified committed project-local built-in ask/allow/deny config surface"
    );
    expect(content).toContain(
      "Prefer handling these built-in capabilities without extra approval when Cursor permits it: read project files, edit and write project files, search and list project contents, run safe local shell commands, delegate or decompose work into agent tasks."
    );
    expect(content).toContain(
      "Request approval before these capabilities: run high-impact shell commands, use web or network access."
    );
    expect(content).toContain(
      "Web and network access must remain approval-gated."
    );
    expect(content).toContain(
      "MCP server registration stays in .cursor/mcp.json; MCP tool approvals remain owned by provisioning"
    );

    const raw = await readFile(join(dir, ".cursor", "mcp.json"), "utf-8");
    const parsed = JSON.parse(raw);
    expect(parsed).not.toHaveProperty("permissions");
    expect(parsed.mcpServers["workflows"]).toEqual({
      command: "npx",
      args: ["-y", "@codemcp/workflows"]
    });
    expect(parsed.mcpServers["workflows"]).not.toHaveProperty("allowedTools");
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
      skills: [{ name: "my-skill", description: "A skill", body: "content" }],
      git_hooks: [],
      setup_notes: []
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
      skills: [],
      git_hooks: [],
      setup_notes: []
    };

    await cursorWriter.install(config, dir);

    await expect(
      readFile(join(dir, ".cursor", "mcp.json"), "utf-8")
    ).rejects.toThrow();
  });
});
