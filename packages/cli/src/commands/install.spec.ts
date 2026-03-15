import { describe, it, expect, vi, beforeEach } from "vitest";
import type { LogicalConfig } from "@ade/core";

// ── Mocks ────────────────────────────────────────────────────────────────────

vi.mock("@clack/prompts", () => ({
  intro: vi.fn(),
  outro: vi.fn(),
  log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() }
}));

vi.mock("@ade/core", async (importOriginal) => {
  const actual = (await importOriginal()) as typeof import("@ade/core");
  return {
    ...actual,
    readUserConfig: vi.fn(),
    writeLockFile: vi.fn().mockResolvedValue(undefined),
    resolve: vi.fn().mockResolvedValue({
      mcp_servers: [],
      instructions: ["test instruction"],
      cli_actions: [],
      knowledge_sources: []
    } satisfies LogicalConfig),
    getAgentWriter: vi.fn().mockReturnValue({
      id: "claude-code",
      install: vi.fn().mockResolvedValue(undefined)
    })
  };
});

import * as clack from "@clack/prompts";
import {
  readUserConfig,
  writeLockFile,
  resolve,
  getAgentWriter
} from "@ade/core";
import { runInstall } from "./install.js";

// ── Tests ────────────────────────────────────────────────────────────────────

describe("runInstall", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("reads config.yaml and resolves to logical config", async () => {
    vi.mocked(readUserConfig).mockResolvedValueOnce({
      choices: { process: "codemcp-workflows" }
    });

    await runInstall("/tmp/project", "claude-code");

    expect(readUserConfig).toHaveBeenCalledWith("/tmp/project");
    expect(resolve).toHaveBeenCalledOnce();
    const resolveArgs = vi.mocked(resolve).mock.calls[0];
    expect(resolveArgs[0]).toMatchObject({
      choices: { process: "codemcp-workflows" }
    });
  });

  it("writes lock file with resolved config", async () => {
    const mockLogical: LogicalConfig = {
      mcp_servers: [
        {
          ref: "workflows",
          command: "npx",
          args: ["@codemcp/workflows-server@latest"],
          env: {}
        }
      ],
      instructions: ["do stuff"],
      cli_actions: [],
      knowledge_sources: []
    };
    vi.mocked(readUserConfig).mockResolvedValueOnce({
      choices: { process: "codemcp-workflows" }
    });
    vi.mocked(resolve).mockResolvedValueOnce(mockLogical);

    await runInstall("/tmp/project", "claude-code");

    expect(writeLockFile).toHaveBeenCalledWith(
      "/tmp/project",
      expect.objectContaining({
        version: 1,
        choices: { process: "codemcp-workflows" },
        logical_config: mockLogical
      })
    );
  });

  it("calls agent writer install with resolved config", async () => {
    const mockInstall = vi.fn().mockResolvedValue(undefined);
    vi.mocked(getAgentWriter).mockReturnValueOnce({
      id: "claude-code",
      install: mockInstall
    });
    vi.mocked(readUserConfig).mockResolvedValueOnce({
      choices: { process: "codemcp-workflows" }
    });

    await runInstall("/tmp/project", "claude-code");

    expect(getAgentWriter).toHaveBeenCalledWith(
      expect.anything(),
      "claude-code"
    );
    expect(mockInstall).toHaveBeenCalledWith(
      expect.objectContaining({ instructions: expect.any(Array) }),
      "/tmp/project"
    );
  });

  it("throws when config.yaml is missing", async () => {
    vi.mocked(readUserConfig).mockResolvedValueOnce(null);

    await expect(runInstall("/tmp/project", "claude-code")).rejects.toThrow(
      /config\.yaml not found/i
    );
  });

  it("throws when agent writer is unknown", async () => {
    vi.mocked(readUserConfig).mockResolvedValueOnce({
      choices: { process: "codemcp-workflows" }
    });
    vi.mocked(getAgentWriter).mockReturnValueOnce(undefined);

    await expect(runInstall("/tmp/project", "unknown-agent")).rejects.toThrow(
      /unknown agent/i
    );
  });

  it("shows intro and outro messages", async () => {
    vi.mocked(readUserConfig).mockResolvedValueOnce({
      choices: { process: "codemcp-workflows" }
    });

    await runInstall("/tmp/project", "claude-code");

    expect(clack.intro).toHaveBeenCalled();
    expect(clack.outro).toHaveBeenCalled();
  });
});
