import { describe, it, expect, vi, beforeEach } from "vitest";
import type { LogicalConfig } from "@ade/core";

// ── Mocks ────────────────────────────────────────────────────────────────────

vi.mock("@clack/prompts", () => ({
  intro: vi.fn(),
  outro: vi.fn(),
  log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() }
}));

const mockLogical: LogicalConfig = {
  mcp_servers: [],
  instructions: ["test instruction"],
  cli_actions: [],
  knowledge_sources: [],
  skills: [],
  git_hooks: [],
  setup_notes: []
};

vi.mock("@ade/core", async (importOriginal) => {
  const actual = (await importOriginal()) as typeof import("@ade/core");
  return {
    ...actual,
    readLockFile: vi.fn()
  };
});

const mockInstall = vi.fn().mockResolvedValue(undefined);

vi.mock("@ade/harnesses", () => ({
  getHarnessWriter: vi.fn().mockImplementation((id: string) => {
    if (id === "universal" || id === "claude-code" || id === "cursor") {
      return { id, install: mockInstall };
    }
    return undefined;
  }),
  getHarnessIds: vi
    .fn()
    .mockReturnValue([
      "universal",
      "claude-code",
      "cursor",
      "copilot",
      "windsurf",
      "cline",
      "roo-code",
      "kiro",
      "opencode"
    ]),
  installSkills: vi.fn().mockResolvedValue(undefined)
}));

import * as clack from "@clack/prompts";
import { readLockFile } from "@ade/core";
import { runInstall } from "./install.js";

// ── Tests ────────────────────────────────────────────────────────────────────

describe("runInstall", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    // Re-set the default implementation after clearAllMocks
    const { getHarnessWriter } = await import("@ade/harnesses");
    vi.mocked(getHarnessWriter).mockImplementation((id: string) => {
      if (id === "universal" || id === "claude-code" || id === "cursor") {
        return {
          id,
          label: id,
          description: "test",
          install: mockInstall
        };
      }
      return undefined;
    });
  });

  it("reads config.lock.yaml and applies logical config", async () => {
    vi.mocked(readLockFile).mockResolvedValueOnce({
      version: 1,
      generated_at: "2024-01-01T00:00:00.000Z",
      choices: { process: "codemcp-workflows" },
      logical_config: mockLogical
    });

    await runInstall("/tmp/project");

    expect(readLockFile).toHaveBeenCalledWith("/tmp/project");
  });

  it("defaults to universal harness when none specified", async () => {
    vi.mocked(readLockFile).mockResolvedValueOnce({
      version: 1,
      generated_at: "2024-01-01T00:00:00.000Z",
      choices: { process: "codemcp-workflows" },
      logical_config: mockLogical
    });

    await runInstall("/tmp/project");

    expect(mockInstall).toHaveBeenCalledWith(mockLogical, "/tmp/project");
  });

  it("uses harnesses from lock file when present", async () => {
    vi.mocked(readLockFile).mockResolvedValueOnce({
      version: 1,
      generated_at: "2024-01-01T00:00:00.000Z",
      choices: { process: "codemcp-workflows" },
      harnesses: ["claude-code", "cursor"],
      logical_config: mockLogical
    });

    await runInstall("/tmp/project");

    expect(mockInstall).toHaveBeenCalledTimes(2);
  });

  it("uses explicit harness ids when provided", async () => {
    vi.mocked(readLockFile).mockResolvedValueOnce({
      version: 1,
      generated_at: "2024-01-01T00:00:00.000Z",
      choices: { process: "codemcp-workflows" },
      harnesses: ["claude-code"],
      logical_config: mockLogical
    });

    await runInstall("/tmp/project", ["cursor"]);

    // Explicit takes priority over lock file
    expect(mockInstall).toHaveBeenCalledTimes(1);
  });

  it("throws when config.lock.yaml is missing", async () => {
    vi.mocked(readLockFile).mockResolvedValueOnce(null);

    await expect(runInstall("/tmp/project")).rejects.toThrow(
      /config\.lock\.yaml not found/i
    );
  });

  it("throws when harness id is unknown", async () => {
    vi.mocked(readLockFile).mockResolvedValueOnce({
      version: 1,
      generated_at: "2024-01-01T00:00:00.000Z",
      choices: { process: "codemcp-workflows" },
      logical_config: mockLogical
    });

    await expect(runInstall("/tmp/project", ["unknown-agent"])).rejects.toThrow(
      /unknown harness/i
    );
  });

  it("shows intro and outro messages", async () => {
    vi.mocked(readLockFile).mockResolvedValueOnce({
      version: 1,
      generated_at: "2024-01-01T00:00:00.000Z",
      choices: { process: "codemcp-workflows" },
      logical_config: mockLogical
    });

    await runInstall("/tmp/project");

    expect(clack.intro).toHaveBeenCalled();
    expect(clack.outro).toHaveBeenCalled();
  });
});
