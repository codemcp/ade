import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, writeFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

vi.mock("@clack/prompts", () => ({
  intro: vi.fn(),
  outro: vi.fn(),
  note: vi.fn(),
  select: vi.fn(),
  multiselect: vi.fn(),
  confirm: vi.fn().mockResolvedValue(false),
  isCancel: vi.fn().mockReturnValue(false),
  cancel: vi.fn(),
  log: { info: vi.fn(), warn: vi.fn() },
  spinner: vi.fn().mockReturnValue({ start: vi.fn(), stop: vi.fn() })
}));

// Mock configure so setup calls don't run the full configure flow
vi.mock("./configure.js", () => ({
  runConfigure: vi.fn().mockResolvedValue(undefined)
}));

// Mock the knowledge package to avoid real network I/O
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
import { runSetup } from "./setup.js";
import { readLockFile } from "@codemcp/ade-core";
import { getDefaultCatalog } from "../../../core/src/catalog/index.js";

describe("knowledge integration", () => {
  let dir: string;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.mocked(clack.confirm).mockResolvedValue(false);
    dir = await mkdtemp(join(tmpdir(), "ade-knowledge-"));
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it(
    "records knowledge sources in lock file when tanstack is selected",
    { timeout: 60_000 },
    async () => {
      const catalog = getDefaultCatalog();

      vi.mocked(clack.select)
        .mockResolvedValueOnce("codemcp-workflows") // process
        .mockResolvedValueOnce("tanstack"); // architecture

      vi.mocked(clack.multiselect)
        .mockResolvedValueOnce([]) // practices: none
        .mockResolvedValueOnce([]); // backpressure: none

      await runSetup(dir, catalog);

      // Lock file should contain all 4 knowledge_sources from tanstack docset entries
      const lock = await readLockFile(dir);
      expect(lock!.logical_config.knowledge_sources).toHaveLength(4);
      expect(lock!.logical_config.knowledge_sources.map((s) => s.name)).toEqual(
        expect.arrayContaining([
          "tanstack-router-docs",
          "tanstack-query-docs",
          "tanstack-form-docs",
          "tanstack-table-docs"
        ])
      );
    }
  );

  it("does not record knowledge sources in lock file when no docsets are implied", async () => {
    const catalog = getDefaultCatalog();

    vi.mocked(clack.select)
      .mockResolvedValueOnce("native-agents-md") // process
      .mockResolvedValueOnce("__skip__"); // architecture: skip
    vi.mocked(clack.multiselect).mockResolvedValueOnce(["tdd-london"]); // practices: tdd-london has no docsets

    await runSetup(dir, catalog);

    const lock = await readLockFile(dir);
    expect(lock!.logical_config.knowledge_sources).toHaveLength(0);
  });
});
