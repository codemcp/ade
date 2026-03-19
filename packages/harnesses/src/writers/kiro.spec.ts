import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type {
  AutonomyProfile,
  LogicalConfig,
  PermissionPolicy
} from "@codemcp/ade-core";
import { kiroWriter } from "./kiro.js";

function autonomyPolicy(profile: AutonomyProfile): PermissionPolicy {
  return { profile };
}

describe("kiroWriter", () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "ade-harness-kiro-"));
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("has correct metadata", () => {
    expect(kiroWriter.id).toBe("kiro");
    expect(kiroWriter.label).toBe("Kiro");
    expect(kiroWriter.description).toContain(".kiro/agents/ade.json");
  });

  it("writes a JSON Kiro agent with documented built-in tool selectors", async () => {
    const config: LogicalConfig = {
      mcp_servers: [
        {
          ref: "workflows",
          command: "npx",
          args: ["-y", "@codemcp/workflows"],
          env: {}
        }
      ],
      instructions: ["Use project workflows."],
      cli_actions: [],
      knowledge_sources: [],
      skills: [],
      git_hooks: [],
      setup_notes: []
    };

    await kiroWriter.install(config, dir);

    const raw = await readFile(
      join(dir, ".kiro", "agents", "ade.json"),
      "utf-8"
    );
    const content = JSON.parse(raw);

    expect(content.name).toBe("ade");
    expect(content.mcpServers.workflows).toEqual({
      command: "npx",
      args: ["-y", "@codemcp/workflows"],
      autoApprove: ["*"]
    });
    expect(content.tools).toEqual([
      "read",
      "write",
      "shell",
      "spec",
      "@workflows/*"
    ]);
    expect(content.allowedTools).toEqual([
      "read",
      "write",
      "shell",
      "spec",
      "@workflows/*"
    ]);
    expect(content.useLegacyMcpJson).toBe(true);
    expect(content.tools).not.toContain("@workflows");
    expect(content.prompt).toContain("Use project workflows.");
  });

  it("writes Kiro MCP settings and forwards provisioning trust via autoApprove", async () => {
    const config: LogicalConfig = {
      mcp_servers: [
        {
          ref: "workflows",
          command: "npx",
          args: ["-y", "@codemcp/workflows"],
          env: { NODE_ENV: "test" },
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

    await kiroWriter.install(config, dir);

    const raw = await readFile(
      join(dir, ".kiro", "settings", "mcp.json"),
      "utf-8"
    );
    const parsed = JSON.parse(raw);

    expect(parsed.mcpServers.workflows).toEqual({
      command: "npx",
      args: ["-y", "@codemcp/workflows"],
      env: { NODE_ENV: "test" },
      autoApprove: ["use_skill", "whats_next"]
    });
  });

  it("maps autonomy only to built-in selectors and keeps web approval-gated", async () => {
    const rigidRoot = join(dir, "rigid");
    const maxRoot = join(dir, "max");

    const baseConfig = {
      mcp_servers: [
        {
          ref: "workflows",
          command: "npx",
          args: ["-y", "@codemcp/workflows"],
          env: {},
          allowedTools: ["*"]
        }
      ],
      instructions: [],
      cli_actions: [],
      knowledge_sources: [],
      skills: [],
      git_hooks: [],
      setup_notes: []
    } satisfies LogicalConfig;

    const rigidConfig: LogicalConfig = {
      ...baseConfig,
      permission_policy: autonomyPolicy("rigid")
    };

    const maxConfig: LogicalConfig = {
      ...baseConfig,
      permission_policy: autonomyPolicy("max-autonomy")
    };

    await kiroWriter.install(rigidConfig, rigidRoot);
    await kiroWriter.install(maxConfig, maxRoot);

    const rigidAgent = JSON.parse(
      await readFile(join(rigidRoot, ".kiro", "agents", "ade.json"), "utf-8")
    );
    const maxAgent = JSON.parse(
      await readFile(join(maxRoot, ".kiro", "agents", "ade.json"), "utf-8")
    );
    const rigidMcp = JSON.parse(
      await readFile(join(rigidRoot, ".kiro", "settings", "mcp.json"), "utf-8")
    );
    const maxMcp = JSON.parse(
      await readFile(join(maxRoot, ".kiro", "settings", "mcp.json"), "utf-8")
    );

    expect(rigidAgent.tools).toContain("read");
    expect(rigidAgent.tools).toContain("spec");
    expect(rigidAgent.tools).toContain("shell");
    expect(rigidAgent.tools).toContain("@workflows/*");
    expect(rigidAgent.allowedTools).toContain("@workflows/*");
    expect(rigidAgent.mcpServers.workflows.autoApprove).toEqual(["*"]);
    expect(rigidAgent.tools).not.toContain("write");
    expect(rigidAgent.tools).not.toContain("shell(*)");
    expect(rigidAgent.tools).not.toContain("web");

    expect(maxAgent.tools).toContain("read");
    expect(maxAgent.tools).toContain("write");
    expect(maxAgent.tools).toContain("shell(*)");
    expect(maxAgent.tools).toContain("spec");
    expect(maxAgent.tools).toContain("@workflows/*");
    expect(maxAgent.allowedTools).toContain("@workflows/*");
    expect(maxAgent.mcpServers.workflows.autoApprove).toEqual(["*"]);
    expect(maxAgent.tools).not.toContain("web");

    expect(rigidMcp.mcpServers.workflows.autoApprove).toEqual(["*"]);
    expect(maxMcp.mcpServers.workflows.autoApprove).toEqual(["*"]);
  });

  it("uses wildcard in tools but restricted names in allowedTools when allowedTools is set", async () => {
    const config: LogicalConfig = {
      mcp_servers: [
        {
          ref: "workflows",
          command: "npx",
          args: ["-y", "@codemcp/workflows"],
          env: {},
          allowedTools: ["whats_next", "conduct_review"]
        }
      ],
      instructions: [],
      cli_actions: [],
      knowledge_sources: [],
      skills: [],
      git_hooks: [],
      setup_notes: []
    };

    await kiroWriter.install(config, dir);

    const agent = JSON.parse(
      await readFile(join(dir, ".kiro", "agents", "ade.json"), "utf-8")
    );

    expect(agent.tools).toContain("@workflows/*");
    expect(agent.tools).not.toContain("@workflows/whats_next");
    expect(agent.allowedTools).toContain("@workflows/whats_next");
    expect(agent.allowedTools).toContain("@workflows/conduct_review");
    expect(agent.allowedTools).not.toContain("@workflows/*");
  });
});
