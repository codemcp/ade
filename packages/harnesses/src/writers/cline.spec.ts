import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type {
  AutonomyProfile,
  LogicalConfig,
  PermissionPolicy
} from "@codemcp/ade-core";
import { clineWriter } from "./cline.js";

function autonomyPolicy(profile: AutonomyProfile): PermissionPolicy {
  return { profile };
}

describe("clineWriter", () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "ade-harness-cline-"));
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("has correct metadata", () => {
    expect(clineWriter.id).toBe("cline");
    expect(clineWriter.label).toBe("Cline");
  });

  it("writes cline_mcp_settings.json with MCP servers", async () => {
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

    await clineWriter.install(config, dir);

    const raw = await readFile(join(dir, "cline_mcp_settings.json"), "utf-8");
    const parsed = JSON.parse(raw);
    expect(parsed.mcpServers["workflows"]).toEqual({
      command: "npx",
      args: ["-y", "@codemcp/workflows"],
      alwaysAllow: ["*"]
    });
  });

  it("forwards explicit MCP approvals unchanged from provisioning", async () => {
    const config: LogicalConfig = {
      mcp_servers: [
        {
          ref: "workflows",
          command: "npx",
          args: ["-y", "@codemcp/workflows"],
          env: {},
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

    await clineWriter.install(config, dir);

    const raw = await readFile(join(dir, "cline_mcp_settings.json"), "utf-8");
    const parsed = JSON.parse(raw);
    expect(parsed.mcpServers["workflows"]).toEqual({
      command: "npx",
      args: ["-y", "@codemcp/workflows"],
      alwaysAllow: ["whats_next", "proceed_to_phase"]
    });
  });

  it("writes .clinerules with instructions", async () => {
    const config: LogicalConfig = {
      mcp_servers: [],
      instructions: ["Follow TDD."],
      cli_actions: [],
      knowledge_sources: [],
      skills: [],
      git_hooks: [],
      setup_notes: []
    };

    await clineWriter.install(config, dir);

    const content = await readFile(join(dir, ".clinerules"), "utf-8");
    expect(content).toContain("Follow TDD.");
  });

  it("does not invent built-in auto-approval settings for autonomy profiles", async () => {
    const rigidRoot = join(dir, "rigid");
    const sensibleRoot = join(dir, "sensible");
    const maxRoot = join(dir, "max");

    const rigidConfig: LogicalConfig = {
      mcp_servers: [
        {
          ref: "workflows",
          command: "npx",
          args: ["-y", "@codemcp/workflows"],
          env: {}
        }
      ],
      instructions: ["Use approvals for risky actions."],
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

    await clineWriter.install(rigidConfig, rigidRoot);
    await clineWriter.install(sensibleConfig, sensibleRoot);
    await clineWriter.install(maxConfig, maxRoot);

    const rigidSettings = JSON.parse(
      await readFile(join(rigidRoot, "cline_mcp_settings.json"), "utf-8")
    );
    const sensibleSettings = JSON.parse(
      await readFile(join(sensibleRoot, "cline_mcp_settings.json"), "utf-8")
    );
    const maxSettings = JSON.parse(
      await readFile(join(maxRoot, "cline_mcp_settings.json"), "utf-8")
    );
    const maxRules = await readFile(join(maxRoot, ".clinerules"), "utf-8");

    expect(rigidSettings).toEqual(sensibleSettings);
    expect(sensibleSettings).toEqual(maxSettings);
    expect(maxSettings).toEqual({
      mcpServers: {
        workflows: {
          command: "npx",
          args: ["-y", "@codemcp/workflows"],
          alwaysAllow: ["*"]
        }
      }
    });
    expect(maxRules).toContain("Use approvals for risky actions.");
    expect(maxRules).not.toContain("browser_action");
    expect(maxRules).not.toContain("execute_command");
    expect(maxRules).not.toContain("web");
  });
});
