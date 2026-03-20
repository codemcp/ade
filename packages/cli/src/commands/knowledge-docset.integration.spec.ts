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
 * Issue 2 — Missing .knowledge/config.yaml (now fixed):
 *   `installKnowledge` was never called from `setup` or `install`, so
 *   `createDocset` was never invoked and `.knowledge/config.yaml` was
 *   never written. Both commands now call `installKnowledge`.
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

// Mock the knowledge package to avoid real network I/O while still letting us
// assert that createDocset is called with the correct arguments.
// The mock writes a real .knowledge/config.yaml so file-existence assertions work.
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
      // Append a minimal docset entry so the file is created/updated
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
  // Issue 2 fix: setup writes .knowledge/config.yaml
  // -------------------------------------------------------------------------

  it(
    "setup writes .knowledge/config.yaml when knowledge_sources are configured",
    { timeout: 30_000 },
    async () => {
      const catalog = getDefaultCatalog();

      vi.mocked(clack.select)
        .mockResolvedValueOnce("codemcp-workflows") // process
        .mockResolvedValueOnce("tanstack"); // architecture — has 4 docsets
      vi.mocked(clack.multiselect)
        .mockResolvedValueOnce([]) // practices: none
        .mockResolvedValueOnce([]) // backpressure: none
        .mockResolvedValueOnce(["claude-code"]); // harnesses

      await runSetup(dir, catalog);

      // Sanity: knowledge_sources in lock file
      const lock = await readLockFile(dir);
      expect(lock!.logical_config.knowledge_sources).toHaveLength(4);

      // createDocset must have been called once per source
      expect(createDocset).toHaveBeenCalledTimes(4);
      expect(createDocset).toHaveBeenCalledWith(
        expect.objectContaining({ id: "tanstack-router-docs" }),
        expect.objectContaining({ cwd: dir })
      );

      // .knowledge/config.yaml must exist
      const configYaml = await readFile(
        join(dir, ".knowledge", "config.yaml"),
        "utf-8"
      );
      expect(configYaml).toBeTruthy();
    }
  );

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
        .mockResolvedValueOnce([]) // backpressure: none
        .mockResolvedValueOnce(["claude-code"]); // harnesses

      await runSetup(dir, catalog);
      vi.clearAllMocks();

      // Wipe agent files so install has something to regenerate
      await rm(join(dir, ".mcp.json"), { force: true });
      await rm(join(dir, ".knowledge"), { recursive: true, force: true });

      // Now run install — should also write .knowledge/config.yaml
      await runInstall(dir, ["claude-code"]);

      // All 4 tanstack docsets are configured via the docset writer (no per-item selection)
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
    // Import the type-level check: if 'knowledge' were still in ProvisionWriter,
    // this runtime check would catch the registry accepting it silently.
    const { createDefaultRegistry } = await import("@codemcp/ade-core");
    const registry = createDefaultRegistry();
    // The knowledge writer must not be registered
    const { getProvisionWriter } = await import("@codemcp/ade-core");
    expect(getProvisionWriter(registry, "knowledge")).toBeUndefined();
  });
});
