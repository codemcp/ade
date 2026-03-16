import { describe, it, expect, vi, beforeEach } from "vitest";
import type { LogicalConfig } from "@ade/core";

// ── Mocks ────────────────────────────────────────────────────────────────────

vi.mock("@clack/prompts", () => ({
  intro: vi.fn(),
  outro: vi.fn(),
  log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() }
}));

vi.mock("@codemcp/skills/api", () => ({
  runAdd: vi.fn()
}));

const mockLogical: LogicalConfig = {
  mcp_servers: [],
  instructions: ["test instruction"],
  cli_actions: [],
  knowledge_sources: [],
  skills: []
};

vi.mock("@ade/core", async (importOriginal) => {
  const actual = (await importOriginal()) as typeof import("@ade/core");
  return {
    ...actual,
    readLockFile: vi.fn(),
    getAgentWriter: vi.fn().mockReturnValue({
      id: "claude-code",
      install: vi.fn().mockResolvedValue(undefined)
    })
  };
});

import * as clack from "@clack/prompts";
import { readLockFile, getAgentWriter } from "@ade/core";
import { runInstall } from "./install.js";

// ── Tests ────────────────────────────────────────────────────────────────────

describe("runInstall", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("reads config.lock.yaml and applies logical config", async () => {
    vi.mocked(readLockFile).mockResolvedValueOnce({
      version: 1,
      generated_at: "2024-01-01T00:00:00.000Z",
      choices: { process: "codemcp-workflows" },
      logical_config: mockLogical
    });

    await runInstall("/tmp/project", "claude-code");

    expect(readLockFile).toHaveBeenCalledWith("/tmp/project");
  });

  it("does not re-resolve — uses lock file logical_config directly", async () => {
    const lockedConfig: LogicalConfig = {
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
      skills: [],
      knowledge_sources: []
    };
    vi.mocked(readLockFile).mockResolvedValueOnce({
      version: 1,
      generated_at: "2024-01-01T00:00:00.000Z",
      choices: { process: "codemcp-workflows" },
      logical_config: lockedConfig
    });

    const mockInstall = vi.fn().mockResolvedValue(undefined);
    vi.mocked(getAgentWriter).mockReturnValueOnce({
      id: "claude-code",
      install: mockInstall
    });

    await runInstall("/tmp/project", "claude-code");

    expect(mockInstall).toHaveBeenCalledWith(lockedConfig, "/tmp/project");
  });

  it("calls agent writer install with lock file config", async () => {
    const mockInstall = vi.fn().mockResolvedValue(undefined);
    vi.mocked(getAgentWriter).mockReturnValueOnce({
      id: "claude-code",
      install: mockInstall
    });
    vi.mocked(readLockFile).mockResolvedValueOnce({
      version: 1,
      generated_at: "2024-01-01T00:00:00.000Z",
      choices: { process: "codemcp-workflows" },
      logical_config: mockLogical
    });

    await runInstall("/tmp/project", "claude-code");

    expect(getAgentWriter).toHaveBeenCalledWith(
      expect.anything(),
      "claude-code"
    );
    expect(mockInstall).toHaveBeenCalledWith(mockLogical, "/tmp/project");
  });

  it("throws when config.lock.yaml is missing", async () => {
    vi.mocked(readLockFile).mockResolvedValueOnce(null);

    await expect(runInstall("/tmp/project", "claude-code")).rejects.toThrow(
      /config\.lock\.yaml not found/i
    );
  });

  it("throws when agent writer is unknown", async () => {
    vi.mocked(readLockFile).mockResolvedValueOnce({
      version: 1,
      generated_at: "2024-01-01T00:00:00.000Z",
      choices: { process: "codemcp-workflows" },
      logical_config: mockLogical
    });
    vi.mocked(getAgentWriter).mockReturnValueOnce(undefined);

    await expect(runInstall("/tmp/project", "unknown-agent")).rejects.toThrow(
      /unknown agent/i
    );
  });

  it("shows intro and outro messages", async () => {
    vi.mocked(readLockFile).mockResolvedValueOnce({
      version: 1,
      generated_at: "2024-01-01T00:00:00.000Z",
      choices: { process: "codemcp-workflows" },
      logical_config: mockLogical
    });

    await runInstall("/tmp/project", "claude-code");

    expect(clack.intro).toHaveBeenCalled();
    expect(clack.outro).toHaveBeenCalled();
  });
});
