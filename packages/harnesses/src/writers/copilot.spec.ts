import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type {
  AutonomyProfile,
  LogicalConfig,
  PermissionPolicy
} from "@codemcp/ade-core";
import { copilotWriter } from "./copilot.js";

function autonomyPolicy(profile: AutonomyProfile): PermissionPolicy {
  return { profile };
}

describe("copilotWriter", () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "ade-harness-copilot-"));
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("has correct metadata", () => {
    expect(copilotWriter.id).toBe("copilot");
    expect(copilotWriter.label).toBe("GitHub Copilot");
  });

  it("writes .vscode/mcp.json with 'servers' key and type field", async () => {
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

    await copilotWriter.install(config, dir);

    const raw = await readFile(join(dir, ".vscode", "mcp.json"), "utf-8");
    const parsed = JSON.parse(raw);
    // Copilot uses "servers", not "mcpServers"
    expect(parsed.servers["workflows"]).toEqual({
      type: "stdio",
      command: "npx",
      args: ["-y", "@codemcp/workflows"]
    });
  });

  it("does not write copilot-instructions.md (prefers agent definition)", async () => {
    const config: LogicalConfig = {
      mcp_servers: [],
      instructions: ["Follow TDD."],
      cli_actions: [],
      knowledge_sources: [],
      skills: [],
      git_hooks: [],
      setup_notes: []
    };

    await copilotWriter.install(config, dir);

    await expect(
      readFile(join(dir, ".github", "copilot-instructions.md"), "utf-8")
    ).rejects.toThrow();
  });

  it("writes dedicated .github/agents/ade.agent.md with agent definition", async () => {
    const config: LogicalConfig = {
      mcp_servers: [
        {
          ref: "workflows",
          command: "npx",
          args: ["-y", "@codemcp/workflows"],
          env: {}
        }
      ],
      instructions: ["Follow TDD."],
      cli_actions: [],
      knowledge_sources: [],
      skills: [],
      git_hooks: [],
      setup_notes: []
    };

    await copilotWriter.install(config, dir);

    const content = await readFile(
      join(dir, ".github", "agents", "ade.agent.md"),
      "utf-8"
    );
    expect(content).toContain("name: ade");
    expect(content).toContain("tools:");
    expect(content).toContain("  - workflows/*");
    expect(content).toContain("mcp-servers:");
    expect(content).toContain("  workflows:");
    expect(content).toContain("    type: stdio");
    expect(content).toContain('    command: "npx"');
    expect(content).toContain('    args: ["-y","@codemcp/workflows"]');
    expect(content).toContain('    tools: ["*"]');
    expect(content).toContain("  - read");
    expect(content).toContain("  - edit");
    expect(content).toContain("  - search");
    expect(content).toContain("  - execute");
    expect(content).toContain("  - agent");
    expect(content).toContain("  - web");
    expect(content).not.toContain("runCommands");
    expect(content).not.toContain("runTasks");
    expect(content).not.toContain("fetch");
    expect(content).not.toContain("githubRepo");
    expect(content).toContain("Follow TDD.");
  });

  it("derives the tools allowlist from autonomy while keeping web access approval-gated", async () => {
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
      mcp_servers: [
        {
          ref: "workflows",
          command: "npx",
          args: ["-y", "@codemcp/workflows"],
          env: {},
          allowedTools: ["whats_next", "proceed_to_phase"]
        }
      ],
      permission_policy: autonomyPolicy("sensible-defaults")
    };

    const maxConfig: LogicalConfig = {
      ...rigidConfig,
      permission_policy: autonomyPolicy("max-autonomy")
    };

    await copilotWriter.install(rigidConfig, rigidRoot);
    await copilotWriter.install(sensibleConfig, sensibleRoot);
    await copilotWriter.install(maxConfig, maxRoot);

    const rigidAgent = await readFile(
      join(rigidRoot, ".github", "agents", "ade.agent.md"),
      "utf-8"
    );
    const sensibleAgent = await readFile(
      join(sensibleRoot, ".github", "agents", "ade.agent.md"),
      "utf-8"
    );
    const maxAgent = await readFile(
      join(maxRoot, ".github", "agents", "ade.agent.md"),
      "utf-8"
    );

    expect(rigidAgent).not.toContain("  - server/workflows/*");
    expect(rigidAgent).toContain("  - workflows/*");
    expect(rigidAgent).toContain("  - read");
    expect(rigidAgent).not.toContain("  - edit");
    expect(rigidAgent).not.toContain("  - search");
    expect(rigidAgent).not.toContain("  - execute");
    expect(rigidAgent).not.toContain("  - agent");
    expect(rigidAgent).not.toContain("  - web");

    expect(sensibleAgent).toContain("  - read");
    expect(sensibleAgent).toContain("  - edit");
    expect(sensibleAgent).toContain("  - search");
    expect(sensibleAgent).toContain("  - agent");
    expect(sensibleAgent).not.toContain("  - execute");
    expect(sensibleAgent).not.toContain("  - todo");
    expect(sensibleAgent).not.toContain("  - web");
    expect(sensibleAgent).toContain("  - workflows/whats_next");
    expect(sensibleAgent).toContain("  - workflows/proceed_to_phase");
    expect(sensibleAgent).not.toContain("  - workflows/*");
    expect(sensibleAgent).toContain(
      '    tools: ["whats_next","proceed_to_phase"]'
    );

    expect(maxAgent).toContain("  - read");
    expect(maxAgent).toContain("  - edit");
    expect(maxAgent).toContain("  - search");
    expect(maxAgent).toContain("  - execute");
    expect(maxAgent).toContain("  - agent");
    expect(maxAgent).toContain("  - todo");
    expect(maxAgent).not.toContain("  - web");
    expect(maxAgent).toContain("  - workflows/*");
    expect(maxAgent).toContain("mcp-servers:");
  });
});
