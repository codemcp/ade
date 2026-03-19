import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, mkdir, rm, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type {
  AutonomyProfile,
  LogicalConfig,
  PermissionPolicy
} from "@codemcp/ade-core";
import { parse as parseYaml } from "yaml";
import { opencodeWriter } from "./opencode.js";

function autonomyPolicy(profile: AutonomyProfile): PermissionPolicy {
  return { profile };
}

describe("opencodeWriter", () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "ade-harness-opencode-"));
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("writes OpenCode permissions to the ADE agent frontmatter using the documented schema", async () => {
    const rigidRoot = join(dir, "rigid");
    const defaultsRoot = join(dir, "defaults");
    const maxRoot = join(dir, "max");

    const baseConfig = {
      mcp_servers: [],
      instructions: ["Follow project rules."],
      cli_actions: [],
      knowledge_sources: [],
      skills: [],
      git_hooks: [],
      setup_notes: []
    } satisfies LogicalConfig;

    const rigidConfig = {
      ...baseConfig,
      permission_policy: autonomyPolicy("rigid")
    } as LogicalConfig;

    const maxConfig = {
      ...baseConfig,
      permission_policy: autonomyPolicy("max-autonomy")
    } as LogicalConfig;

    const defaultsConfig = {
      ...baseConfig,
      permission_policy: autonomyPolicy("sensible-defaults")
    } as LogicalConfig;

    await opencodeWriter.install(rigidConfig, rigidRoot);
    await opencodeWriter.install(defaultsConfig, defaultsRoot);
    await opencodeWriter.install(maxConfig, maxRoot);

    const rigidAgent = await readFile(
      join(rigidRoot, ".opencode", "agents", "ade.md"),
      "utf-8"
    );
    const defaultsAgent = await readFile(
      join(defaultsRoot, ".opencode", "agents", "ade.md"),
      "utf-8"
    );
    const maxAgent = await readFile(
      join(maxRoot, ".opencode", "agents", "ade.md"),
      "utf-8"
    );
    const rigidFrontmatter = parseFrontmatter(rigidAgent);
    const defaultsFrontmatter = parseFrontmatter(defaultsAgent);
    const maxFrontmatter = parseFrontmatter(maxAgent);

    await expect(
      readFile(join(rigidRoot, "opencode.json"), "utf-8")
    ).rejects.toThrow();
    await expect(
      readFile(join(defaultsRoot, "opencode.json"), "utf-8")
    ).rejects.toThrow();
    await expect(
      readFile(join(maxRoot, "opencode.json"), "utf-8")
    ).rejects.toThrow();

    expect(rigidAgent).toContain("permission:");
    expect(rigidAgent).toContain('"*": "ask"');
    expect(rigidAgent).toContain('webfetch: "ask"');
    expect(rigidAgent).toContain('websearch: "ask"');
    expect(rigidAgent).toContain('codesearch: "ask"');
    expect(rigidFrontmatter.permission).toMatchObject({
      "*": "ask",
      webfetch: "ask",
      websearch: "ask",
      codesearch: "ask"
    });

    expect(defaultsAgent).toContain('edit: "allow"');
    expect(defaultsAgent).toContain('glob: "allow"');
    expect(defaultsAgent).toContain('grep: "allow"');
    expect(defaultsAgent).toContain('list: "allow"');
    expect(defaultsAgent).toContain('lsp: "allow"');
    expect(defaultsAgent).toContain('task: "allow"');
    expect(defaultsAgent).toContain('skill: "deny"');
    expect(defaultsAgent).toContain('todoread: "deny"');
    expect(defaultsAgent).toContain('todowrite: "deny"');
    expect(defaultsAgent).toContain('webfetch: "ask"');
    expect(defaultsAgent).toContain('websearch: "ask"');
    expect(defaultsAgent).toContain('codesearch: "ask"');
    expect(defaultsAgent).toContain('external_directory: "deny"');
    expect(defaultsAgent).toContain('doom_loop: "deny"');
    expect(defaultsAgent).toContain('"grep *": "allow"');
    expect(defaultsAgent).toContain('"cp *": "ask"');
    expect(defaultsAgent).toContain('"rm *": "deny"');
    expect(defaultsFrontmatter.permission).toMatchObject({
      edit: "allow",
      glob: "allow",
      grep: "allow",
      list: "allow",
      lsp: "allow",
      task: "allow",
      skill: "deny",
      todoread: "deny",
      todowrite: "deny",
      webfetch: "ask",
      websearch: "ask",
      codesearch: "ask",
      external_directory: "deny",
      doom_loop: "deny"
    });
    const defaultsPermission = defaultsFrontmatter.permission as {
      bash: Record<string, string>;
    };
    expect(defaultsPermission.bash["grep *"]).toBe("allow");
    expect(defaultsPermission.bash["cp *"]).toBe("ask");
    expect(defaultsPermission.bash["rm *"]).toBe("deny");

    expect(maxAgent).toContain('"*": "allow"');
    expect(maxAgent).toContain('webfetch: "ask"');
    expect(maxAgent).toContain('websearch: "ask"');
    expect(maxAgent).toContain('codesearch: "ask"');
    expect(maxFrontmatter.permission).toMatchObject({
      "*": "allow",
      webfetch: "ask",
      websearch: "ask",
      codesearch: "ask"
    });
    expect(rigidAgent).not.toContain("tools:");
  });

  it("keeps MCP servers in project config and writes documented environment fields", async () => {
    const projectRoot = join(dir, "mcp");
    const config = {
      mcp_servers: [
        {
          ref: "workflows",
          command: "npx",
          args: ["@codemcp/workflows-server@latest"],
          env: { FOO: "bar" },
          allowedTools: ["whats_next"]
        }
      ],
      instructions: ["Follow project rules."],
      cli_actions: [],
      knowledge_sources: [],
      skills: [],
      git_hooks: [],
      setup_notes: [],
      permission_policy: autonomyPolicy("rigid")
    } as LogicalConfig;

    await mkdir(projectRoot, { recursive: true });
    await writeFile(
      join(projectRoot, "opencode.json"),
      JSON.stringify(
        {
          $schema: "https://opencode.ai/config.json",
          permission: { read: "allow" }
        },
        null,
        2
      ) + "\n",
      "utf-8"
    );

    await opencodeWriter.install(config, projectRoot);

    const projectJson = JSON.parse(
      await readFile(join(projectRoot, "opencode.json"), "utf-8")
    );
    const agent = await readFile(
      join(projectRoot, ".opencode", "agents", "ade.md"),
      "utf-8"
    );

    expect(projectJson.permission).toEqual({ read: "allow" });
    expect(projectJson.mcp).toEqual({
      workflows: {
        type: "local",
        command: ["npx", "@codemcp/workflows-server@latest"],
        environment: { FOO: "bar" }
      }
    });
    expect(agent).toContain("permission:");
    expect(agent).not.toContain("mcp_servers:");
  });
});

function parseFrontmatter(content: string) {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) {
    throw new Error("Expected frontmatter in agent markdown");
  }

  return parseYaml(match[1]) as Record<string, unknown>;
}
