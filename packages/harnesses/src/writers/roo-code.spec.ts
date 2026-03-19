import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type {
  AutonomyProfile,
  LogicalConfig,
  PermissionPolicy
} from "@codemcp/ade-core";
import { rooCodeWriter } from "./roo-code.js";

function autonomyPolicy(profile: AutonomyProfile): PermissionPolicy {
  return { profile };
}

describe("rooCodeWriter", () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "ade-harness-roo-"));
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("has correct metadata", () => {
    expect(rooCodeWriter.id).toBe("roo-code");
    expect(rooCodeWriter.label).toBe("Roo Code");
    expect(rooCodeWriter.description).toContain(".roomodes");
  });

  it("writes .roo/mcp.json with MCP servers", async () => {
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

    await rooCodeWriter.install(config, dir);

    const raw = await readFile(join(dir, ".roo", "mcp.json"), "utf-8");
    const parsed = JSON.parse(raw);
    expect(parsed.mcpServers["workflows"]).toEqual({
      command: "npx",
      args: ["-y", "@codemcp/workflows"],
      alwaysAllow: ["*"]
    });
  });

  it("writes .roorules with instructions", async () => {
    const config: LogicalConfig = {
      mcp_servers: [],
      instructions: ["Follow TDD."],
      cli_actions: [],
      knowledge_sources: [],
      skills: [],
      git_hooks: [],
      setup_notes: []
    };

    await rooCodeWriter.install(config, dir);

    const content = await readFile(join(dir, ".roorules"), "utf-8");
    expect(content).toContain("Follow TDD.");
  });

  it("maps autonomy to Roo mode groups conservatively while forwarding MCP approvals separately", async () => {
    const rigidRoot = join(dir, "rigid");
    const defaultsRoot = join(dir, "defaults");
    const maxRoot = join(dir, "max");

    const baseConfig = {
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
      setup_notes: []
    } satisfies LogicalConfig;

    await rooCodeWriter.install(
      {
        ...baseConfig,
        permission_policy: autonomyPolicy("rigid")
      },
      rigidRoot
    );
    await rooCodeWriter.install(
      {
        ...baseConfig,
        permission_policy: autonomyPolicy("sensible-defaults")
      },
      defaultsRoot
    );
    await rooCodeWriter.install(
      {
        ...baseConfig,
        permission_policy: autonomyPolicy("max-autonomy")
      },
      maxRoot
    );

    const rigidModes = JSON.parse(
      await readFile(join(rigidRoot, ".roomodes"), "utf-8")
    );
    const defaultsModes = JSON.parse(
      await readFile(join(defaultsRoot, ".roomodes"), "utf-8")
    );
    const maxModes = JSON.parse(
      await readFile(join(maxRoot, ".roomodes"), "utf-8")
    );
    const rigidMcp = JSON.parse(
      await readFile(join(rigidRoot, ".roo", "mcp.json"), "utf-8")
    );

    expect(rigidModes.customModes.ade.groups).toEqual(["read", "mcp"]);
    expect(defaultsModes.customModes.ade.groups).toEqual([
      "read",
      "edit",
      "mcp"
    ]);
    expect(maxModes.customModes.ade.groups).toEqual([
      "read",
      "edit",
      "command",
      "mcp"
    ]);

    expect(defaultsModes.customModes.ade.groups).not.toContain("command");
    expect(rigidModes.customModes.ade.groups).not.toContain("web");
    expect(defaultsModes.customModes.ade.groups).not.toContain("web");
    expect(maxModes.customModes.ade.groups).not.toContain("web");

    expect(rigidMcp.mcpServers.workflows.alwaysAllow).toEqual(["whats_next"]);
  });
});
