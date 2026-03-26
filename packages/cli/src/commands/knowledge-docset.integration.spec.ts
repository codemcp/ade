import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

/**
 * E2E regression tests for two issues with docset / knowledge setup:
 *
 * Issue 1 — Design inconsistency (now fixed):
 *   The `knowledge` provision writer was a redundant second way to add
 *   knowledge sources alongside `option.docsets[]`. It has been removed.
 *   Docsets are now declared via `{ writer: "docset", config: {...} }` recipe
 *   entries (the `docset` provision writer), consistent with how skills work.
 *
 * Issue 2 — Knowledge init location (updated):
 *   Knowledge source initialisation (.knowledge/config.yaml) is handled by
 *   `ade configure` (ephemeral, developer-level) and `ade install`.
 *   `ade setup` only resolves and writes the lock file; it does not init knowledge.
 */

// Mock the TUI
vi.mock("@clack/prompts", () => ({
  intro: vi.fn(),
  outro: vi.fn(),
  note: vi.fn(),
  select: vi.fn(),
  multiselect: vi.fn(),
  confirm: vi.fn().mockResolvedValue(false),
  isCancel: vi.fn().mockReturnValue(false),
  cancel: vi.fn(),
  log: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), success: vi.fn() },
  spinner: vi.fn().mockReturnValue({ start: vi.fn(), stop: vi.fn() })
}));

// Mock configure so setup calls don't run the full configure flow
vi.mock("./configure.js", () => ({
  runConfigure: vi.fn().mockResolvedValue(undefined)
}));

// Mock the knowledge package to avoid real network I/O while still letting us
// assert that createDocset is called with the correct arguments.
import { writeFile, mkdir } from "node:fs/promises";
vi.mock("@codemcp/knowledge/packages/cli/dist/exports.js", () => ({
  createDocset: vi.fn(
    async (
      params: { id: string; name: string; url?: string },
      options: { cwd?: string }
    ) => {
      const dir = join(options?.cwd ?? process.cwd(), ".knowledge");
      await mkdir(dir, { recursive: true });
      const configPath = join(dir, "config.yaml");
      await writeFile(
        configPath,
        `version: "1.0"\ndocsets:\n  - id: ${params.id}\n`,
        { flag: "w" }
      );
      return { docset: {}, configPath, configCreated: true };
    }
  ),
  initDocset: vi.fn().mockResolvedValue({ alreadyInitialized: false })
}));

import * as clack from "@clack/prompts";
import { createDocset } from "@codemcp/knowledge/packages/cli/dist/exports.js";
import { runSetup } from "./setup.js";
import { runInstall } from "./install.js";
import { readLockFile, getDefaultCatalog } from "@codemcp/ade-core";

describe("knowledge docset regression tests", () => {
  let dir: string;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.mocked(clack.confirm).mockResolvedValue(false);
    dir = await mkdtemp(join(tmpdir(), "ade-knowledge-bug-"));
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  // -------------------------------------------------------------------------
  // setup writes lock with knowledge_sources but does NOT init .knowledge/
  // -------------------------------------------------------------------------

  it(
    "setup records knowledge_sources in lock file but does not init .knowledge/",
    { timeout: 30_000 },
    async () => {
      const catalog = getDefaultCatalog();

      vi.mocked(clack.select)
        .mockResolvedValueOnce("codemcp-workflows") // process
        .mockResolvedValueOnce("tanstack"); // architecture — has 4 docsets
      vi.mocked(clack.multiselect)
        .mockResolvedValueOnce([]) // practices: none
        .mockResolvedValueOnce([]); // backpressure: none

      await runSetup(dir, catalog);

      // knowledge_sources must be in the lock file
      const lock = await readLockFile(dir);
      expect(lock!.logical_config.knowledge_sources).toHaveLength(4);

      // createDocset must NOT have been called — knowledge init is in configure/install
      expect(createDocset).not.toHaveBeenCalled();
    }
  );

  // -------------------------------------------------------------------------
  // install writes .knowledge/config.yaml
  // -------------------------------------------------------------------------

  it(
    "install writes .knowledge/config.yaml when knowledge_sources exist in lock file",
    { timeout: 30_000 },
    async () => {
      const catalog = getDefaultCatalog();

      // First setup to produce a lock file with knowledge_sources
      vi.mocked(clack.select)
        .mockResolvedValueOnce("codemcp-workflows") // process
        .mockResolvedValueOnce("tanstack"); // architecture
      vi.mocked(clack.multiselect)
        .mockResolvedValueOnce([]) // practices: none
        .mockResolvedValueOnce([]); // backpressure: none

      await runSetup(dir, catalog);
      vi.clearAllMocks();

      // Wipe agent files so install has something to regenerate
      await rm(join(dir, ".mcp.json"), { force: true });
      await rm(join(dir, ".knowledge"), { recursive: true, force: true });

      // Now run install — should also write .knowledge/config.yaml
      await runInstall(dir, ["claude-code"]);

      // All 4 tanstack docsets are configured via the docset writer
      expect(createDocset).toHaveBeenCalledTimes(4);
      expect(createDocset).toHaveBeenCalledWith(
        expect.objectContaining({ id: "tanstack-router-docs" }),
        expect.objectContaining({ cwd: dir })
      );

      const configYaml = await readFile(
        join(dir, ".knowledge", "config.yaml"),
        "utf-8"
      );
      expect(configYaml).toBeTruthy();
    }
  );

  // -------------------------------------------------------------------------
  // Issue 1 fix: knowledge writer removed — docset provision writer is canonical
  // -------------------------------------------------------------------------

  it("ProvisionWriter type no longer includes 'knowledge'", async () => {
    const { createDefaultRegistry } = await import("@codemcp/ade-core");
    const registry = createDefaultRegistry();
    const { getProvisionWriter } = await import("@codemcp/ade-core");
    expect(getProvisionWriter(registry, "knowledge")).toBeUndefined();
  });
});
