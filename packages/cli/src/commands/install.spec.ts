import { describe, it, expect, vi, beforeEach } from "vitest";
import type { LogicalConfig } from "@codemcp/ade-core";

// ── Mocks ────────────────────────────────────────────────────────────────────

vi.mock("@clack/prompts", () => ({
  intro: vi.fn(),
  outro: vi.fn(),
  confirm: vi.fn().mockResolvedValue(true),
  cancel: vi.fn(),
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

vi.mock("@codemcp/ade-core", async (importOriginal) => {
  const actual = (await importOriginal()) as typeof import("@codemcp/ade-core");
  return {
    ...actual,
    readLockFile: vi.fn()
  };
});

vi.mock("@codemcp/ade-harnesses", () => ({
  installSkills: vi.fn().mockResolvedValue(undefined),
  writeInlineSkills: vi.fn().mockResolvedValue([])
}));

vi.mock("../knowledge-installer.js", () => ({
  installKnowledge: vi.fn().mockResolvedValue(undefined)
}));

import * as clack from "@clack/prompts";
import { readLockFile } from "@codemcp/ade-core";
import { runInstall } from "./install.js";

// ── Tests ────────────────────────────────────────────────────────────────────

const baseLockFile = {
  version: 1 as const,
  generated_at: "2024-01-01T00:00:00.000Z",
  choices: { process: "codemcp-workflows" },
  logical_config: mockLogical
};

describe("runInstall", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(clack.confirm).mockResolvedValue(true);
  });

  it("reads config.lock.yaml", async () => {
    vi.mocked(readLockFile).mockResolvedValueOnce(baseLockFile);

    await runInstall("/tmp/project");

    expect(readLockFile).toHaveBeenCalledWith("/tmp/project");
  });

  it("throws when config.lock.yaml is missing", async () => {
    vi.mocked(readLockFile).mockResolvedValueOnce(null);

    await expect(runInstall("/tmp/project")).rejects.toThrow(
      /config\.lock\.yaml not found/i
    );
  });

  it("shows intro and outro messages", async () => {
    vi.mocked(readLockFile).mockResolvedValueOnce(baseLockFile);

    await runInstall("/tmp/project");

    expect(clack.intro).toHaveBeenCalled();
    expect(clack.outro).toHaveBeenCalled();
  });
});
