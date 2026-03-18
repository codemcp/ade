import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type {
  AutonomyProfile,
  LogicalConfig,
  PermissionPolicy
} from "@codemcp/ade-core";
import { universalWriter } from "./universal.js";

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

describe("universalWriter", () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "ade-harness-universal-"));
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("has correct metadata", () => {
    expect(universalWriter.id).toBe("universal");
    expect(universalWriter.label).toBe("Universal (AGENTS.md + .mcp.json)");
    expect(universalWriter.description).toContain("AGENTS.md");
  });

  it("writes AGENTS.md instructions when provided", async () => {
    const config: LogicalConfig = {
      mcp_servers: [],
      instructions: ["Follow the workflow.", "Keep changes focused."],
      cli_actions: [],
      knowledge_sources: [],
      skills: [],
      git_hooks: [],
      setup_notes: []
    };

    await universalWriter.install(config, dir);

    const content = await readFile(join(dir, "AGENTS.md"), "utf-8");
    expect(content).toContain("# AGENTS");
    expect(content).toContain("Follow the workflow.");
    expect(content).toContain("Keep changes focused.");
  });

  it("documents autonomy as guidance only because Universal has no enforceable permission schema", async () => {
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

    await universalWriter.install(config, dir);

    const agents = await readFile(join(dir, "AGENTS.md"), "utf-8");
    expect(agents).toContain("## Autonomy");
    expect(agents).toContain("documentation-only guidance");
    expect(agents).toContain("no enforceable harness-level permission schema");
    expect(agents).toContain("Profile: `sensible-defaults`");
    expect(agents).toContain("- `read`: allow");
    expect(agents).toContain("- `bash_unsafe`: ask");
    expect(agents).toContain("- `web`: ask");
    expect(agents).toContain(
      "MCP permissions are not re-modeled by autonomy here"
    );

    const mcpRaw = await readFile(join(dir, ".mcp.json"), "utf-8");
    const mcp = JSON.parse(mcpRaw);
    expect(mcp.mcpServers.workflows).toEqual({
      command: "npx",
      args: ["-y", "@codemcp/workflows"]
    });
    expect(mcp.mcpServers.workflows).not.toHaveProperty("allowedTools");
  });
});
