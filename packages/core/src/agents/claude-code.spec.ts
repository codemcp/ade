import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, readFile, access } from "node:fs/promises";
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
      knowledge_sources: [],
      skills: []
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
      knowledge_sources: [],
      skills: []
    };

    await claudeCodeWriter.install(config, dir);

    await expect(readFile(join(dir, "AGENTS.md"), "utf-8")).rejects.toThrow();
  });

  it("skips settings.json when no MCP servers and no skills", async () => {
    const config: LogicalConfig = {
      mcp_servers: [],
      instructions: ["hello"],
      cli_actions: [],
      knowledge_sources: [],
      skills: []
    };

    await claudeCodeWriter.install(config, dir);

    await expect(
      readFile(join(dir, ".claude", "settings.json"), "utf-8")
    ).rejects.toThrow();
  });

  // ── Skills: inline ────────────────────────────────────────────────────

  it("writes inline SKILL.md files to .ade/catalog/skills/<name>/", async () => {
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
      join(
        dir,
        ".ade",
        "catalog",
        "skills",
        "tanstack-architecture",
        "SKILL.md"
      ),
      "utf-8"
    );
    expect(skillMd).toContain("name: tanstack-architecture");
    expect(skillMd).toContain("description: TanStack architecture conventions");
    expect(skillMd).toContain("# Architecture");
    expect(skillMd).toContain("Use file-based routing.");
  });

  it("registers inline skills in package.json as file: refs", async () => {
    const config: LogicalConfig = {
      mcp_servers: [],
      instructions: [],
      cli_actions: [],
      knowledge_sources: [],
      skills: [
        {
          name: "tanstack-code",
          description: "Code conventions",
          body: "# Code\nStuff."
        }
      ]
    };

    await claudeCodeWriter.install(config, dir);

    const pkg = JSON.parse(await readFile(join(dir, "package.json"), "utf-8"));
    expect(pkg.agentskills["tanstack-code"]).toBe(
      "file:./.ade/catalog/skills/tanstack-code"
    );
  });

  // ── Skills: external ──────────────────────────────────────────────────

  it("registers external skills in package.json by source", async () => {
    const config: LogicalConfig = {
      mcp_servers: [],
      instructions: [],
      cli_actions: [],
      knowledge_sources: [],
      skills: [
        {
          name: "playwright-cli",
          source: "microsoft/playwright-cli/skills/playwright-cli"
        }
      ]
    };

    await claudeCodeWriter.install(config, dir);

    const pkg = JSON.parse(await readFile(join(dir, "package.json"), "utf-8"));
    expect(pkg.agentskills["playwright-cli"]).toBe(
      "microsoft/playwright-cli/skills/playwright-cli"
    );
  });

  it("does not write SKILL.md for external skills", async () => {
    const config: LogicalConfig = {
      mcp_servers: [],
      instructions: [],
      cli_actions: [],
      knowledge_sources: [],
      skills: [
        {
          name: "playwright-cli",
          source: "microsoft/playwright-cli/skills/playwright-cli"
        }
      ]
    };

    await claudeCodeWriter.install(config, dir);

    await expect(
      access(join(dir, ".ade", "catalog", "skills", "playwright-cli"))
    ).rejects.toThrow();
  });

  // ── Skills: mixed ─────────────────────────────────────────────────────

  it("handles mixed inline and external skills", async () => {
    const config: LogicalConfig = {
      mcp_servers: [],
      instructions: [],
      cli_actions: [],
      knowledge_sources: [],
      skills: [
        { name: "my-conv", description: "Inline", body: "Do stuff." },
        { name: "ext-skill", source: "org/repo/skills/ext" }
      ]
    };

    await claudeCodeWriter.install(config, dir);

    // Inline skill has SKILL.md
    const skillMd = await readFile(
      join(dir, ".ade", "catalog", "skills", "my-conv", "SKILL.md"),
      "utf-8"
    );
    expect(skillMd).toContain("name: my-conv");

    // Both registered in package.json
    const pkg = JSON.parse(await readFile(join(dir, "package.json"), "utf-8"));
    expect(pkg.agentskills["my-conv"]).toBe(
      "file:./.ade/catalog/skills/my-conv"
    );
    expect(pkg.agentskills["ext-skill"]).toBe("org/repo/skills/ext");
  });

  // ── Skills: MCP server ────────────────────────────────────────────────

  it("adds skills-server MCP server when skills are present", async () => {
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

  it("skips skills when none present", async () => {
    const config: LogicalConfig = {
      mcp_servers: [],
      instructions: ["hello"],
      cli_actions: [],
      knowledge_sources: [],
      skills: []
    };

    await claudeCodeWriter.install(config, dir);

    await expect(access(join(dir, ".ade"))).rejects.toThrow();
  });

  it("preserves existing package.json fields when adding skills", async () => {
    const { writeFile } = await import("node:fs/promises");
    await writeFile(
      join(dir, "package.json"),
      JSON.stringify({ name: "my-project", version: "1.0.0" }),
      "utf-8"
    );

    const config: LogicalConfig = {
      mcp_servers: [],
      instructions: [],
      cli_actions: [],
      knowledge_sources: [],
      skills: [{ name: "my-skill", description: "A skill", body: "Body." }]
    };

    await claudeCodeWriter.install(config, dir);

    const pkg = JSON.parse(await readFile(join(dir, "package.json"), "utf-8"));
    expect(pkg.name).toBe("my-project");
    expect(pkg.version).toBe("1.0.0");
    expect(pkg.agentskills["my-skill"]).toBe(
      "file:./.ade/catalog/skills/my-skill"
    );
  });
});
