import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { LogicalConfig } from "@ade/core";
import { copilotWriter } from "./copilot.js";

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
      git_hooks: []
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
      git_hooks: []
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
      git_hooks: []
    };

    await copilotWriter.install(config, dir);

    const content = await readFile(
      join(dir, ".github", "agents", "ade.agent.md"),
      "utf-8"
    );
    expect(content).toContain("name: ade");
    expect(content).toContain("tools:");
    expect(content).toContain("  - workflows/*");
    expect(content).toContain("  - edit");
    expect(content).toContain("Follow TDD.");
  });
});
