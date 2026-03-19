import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { LogicalConfig } from "@codemcp/ade-core";
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

  it("writes .windsurf/mcp.json with forwarded MCP approvals", async () => {
    const config: LogicalConfig = {
      mcp_servers: [
        {
          ref: "workflows",
          command: "npx",
          args: ["-y", "@codemcp/workflows"],
          env: { API_KEY: "test" },
          allowedTools: ["whats_next", "proceed_to_phase"]
        }
      ],
      instructions: [],
      cli_actions: [],
      knowledge_sources: [],
      skills: [],
      git_hooks: [],
      setup_notes: []
    };

    await windsurfWriter.install(config, dir);

    const raw = await readFile(join(dir, ".windsurf", "mcp.json"), "utf-8");
    const parsed = JSON.parse(raw);
    expect(parsed.mcpServers["workflows"]).toEqual({
      command: "npx",
      args: ["-y", "@codemcp/workflows"],
      env: { API_KEY: "test" },
      alwaysAllow: ["whats_next", "proceed_to_phase"]
    });
  });

  it("records autonomy as advisory guidance because Windsurf has no verified committed built-in permission schema", async () => {
    const rigidRoot = join(dir, "rigid");
    const sensibleRoot = join(dir, "sensible");
    const maxRoot = join(dir, "max");

    const rigidConfig: LogicalConfig = {
      mcp_servers: [],
      instructions: [],
      cli_actions: [],
      knowledge_sources: [],
      skills: [],
      git_hooks: [],
      setup_notes: [],
      permission_policy: autonomyPolicy("rigid")
    };

    const sensibleConfig: LogicalConfig = {
      ...rigidConfig,
      permission_policy: autonomyPolicy("sensible-defaults")
    };

    const maxConfig: LogicalConfig = {
      ...rigidConfig,
      permission_policy: autonomyPolicy("max-autonomy")
    };

    await windsurfWriter.install(rigidConfig, rigidRoot);
    await windsurfWriter.install(sensibleConfig, sensibleRoot);
    await windsurfWriter.install(maxConfig, maxRoot);

    const rigidRules = await readFile(
      join(rigidRoot, ".windsurfrules"),
      "utf-8"
    );
    const sensibleRules = await readFile(
      join(sensibleRoot, ".windsurfrules"),
      "utf-8"
    );
    const maxRules = await readFile(join(maxRoot, ".windsurfrules"), "utf-8");

    expect(rigidRules).toContain("Windsurf limitation:");
    expect(rigidRules).toContain("advisory only");
    expect(rigidRules).toContain(
      "May proceed without extra approval: read files."
    );
    expect(rigidRules).toContain(
      "Ask before: edit and write files, search and list files, safe local shell commands, unsafe local shell commands, web and network access, task or agent delegation."
    );

    expect(sensibleRules).toContain("Windsurf limitation:");
    expect(sensibleRules).toContain(
      "May proceed without extra approval: read files, edit and write files, search and list files, safe local shell commands, task or agent delegation."
    );
    expect(sensibleRules).toContain(
      "Ask before: unsafe local shell commands, web and network access."
    );

    expect(maxRules).toContain("Windsurf limitation:");
    expect(maxRules).toContain(
      "May proceed without extra approval: read files, edit and write files, search and list files, safe local shell commands, unsafe local shell commands, task or agent delegation."
    );
    expect(maxRules).toContain("Ask before: web and network access.");
  });

  it("writes .windsurfrules with instructions", async () => {
    const config: LogicalConfig = {
      mcp_servers: [],
      instructions: ["Follow TDD."],
      cli_actions: [],
      knowledge_sources: [],
      skills: [],
      git_hooks: [],
      setup_notes: []
    };

    await windsurfWriter.install(config, dir);

    const content = await readFile(join(dir, ".windsurfrules"), "utf-8");
    expect(content).toContain("Follow TDD.");
  });
});

function autonomyPolicy(
  profile: "rigid" | "sensible-defaults" | "max-autonomy"
): LogicalConfig["permission_policy"] {
  return { profile };
}
