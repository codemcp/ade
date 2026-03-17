import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

vi.mock("@clack/prompts", () => ({
  intro: vi.fn(),
  outro: vi.fn(),
  select: vi.fn(),
  multiselect: vi.fn(),
  confirm: vi.fn(),
  isCancel: vi.fn().mockReturnValue(false),
  cancel: vi.fn(),
  spinner: vi.fn().mockReturnValue({ start: vi.fn(), stop: vi.fn() })
}));

vi.mock("@codemcp/knowledge/packages/cli/dist/exports.js", () => ({
  createDocset: vi.fn().mockResolvedValue({
    docset: {},
    configPath: ".knowledge/config.yaml",
    configCreated: false
  }),
  initDocset: vi.fn().mockResolvedValue({ alreadyInitialized: false })
}));

import * as clack from "@clack/prompts";
import {
  createDocset,
  initDocset
} from "@codemcp/knowledge/packages/cli/dist/exports.js";
import { runSetup } from "./setup.js";
import { readLockFile } from "@ade/core";
import { getDefaultCatalog } from "../../../core/src/catalog/index.js";

describe("knowledge integration", () => {
  let dir: string;

  beforeEach(async () => {
    vi.clearAllMocks();
    dir = await mkdtemp(join(tmpdir(), "ade-knowledge-"));
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it(
    "creates and initializes docsets when tanstack is selected",
    { timeout: 60_000 },
    async () => {
      const catalog = getDefaultCatalog();

      // Facet order: process (select), architecture (select)
      vi.mocked(clack.select)
        .mockResolvedValueOnce("codemcp-workflows") // process
        .mockResolvedValueOnce("tanstack"); // architecture

      // multiselect order: practices, then docsets confirmation
      vi.mocked(clack.multiselect)
        .mockResolvedValueOnce([]) // practices: none
        .mockResolvedValueOnce([
          // docsets: accept all 4
          "tanstack-router-docs",
          "tanstack-query-docs",
          "tanstack-form-docs",
          "tanstack-table-docs"
        ])
        .mockResolvedValueOnce(["claude-code"]); // harnesses

      await runSetup(dir, catalog);

      // createDocset should be called for each of the 4 TanStack docsets
      expect(createDocset).toHaveBeenCalledTimes(4);

      expect(createDocset).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "tanstack-router-docs",
          preset: "git-repo",
          url: "https://github.com/TanStack/router.git"
        }),
        expect.objectContaining({ cwd: dir })
      );

      expect(createDocset).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "tanstack-query-docs",
          preset: "git-repo",
          url: "https://github.com/TanStack/query.git"
        }),
        expect.objectContaining({ cwd: dir })
      );

      // initDocset should be called for each docset after creation
      expect(initDocset).toHaveBeenCalledTimes(4);
      expect(initDocset).toHaveBeenCalledWith(
        expect.objectContaining({
          docsetId: "tanstack-router-docs",
          cwd: dir
        })
      );

      // Lock file should contain knowledge_sources
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

      // MCP server entry for knowledge-server should be in .mcp.json
      const mcpJson = JSON.parse(
        await readFile(join(dir, ".mcp.json"), "utf-8")
      );
      expect(mcpJson.mcpServers["@codemcp/knowledge-server"]).toMatchObject({
        command: "npx",
        args: ["-y", "@codemcp/knowledge-server"]
      });
    }
  );

  it(
    "excludes deselected docsets from knowledge installation",
    { timeout: 60_000 },
    async () => {
      const catalog = getDefaultCatalog();

      vi.mocked(clack.select)
        .mockResolvedValueOnce("codemcp-workflows") // process
        .mockResolvedValueOnce("tanstack"); // architecture

      // multiselect order: practices, then docsets (only keep router + query)
      vi.mocked(clack.multiselect)
        .mockResolvedValueOnce([]) // practices: none
        .mockResolvedValueOnce(["tanstack-router-docs", "tanstack-query-docs"])
        .mockResolvedValueOnce(["claude-code"]); // harnesses

      await runSetup(dir, catalog);

      // Only 2 docsets should be created
      expect(createDocset).toHaveBeenCalledTimes(2);
      expect(initDocset).toHaveBeenCalledTimes(2);

      // Lock file should only have the 2 selected sources
      const lock = await readLockFile(dir);
      expect(lock!.logical_config.knowledge_sources).toHaveLength(2);
      expect(lock!.logical_config.knowledge_sources.map((s) => s.name)).toEqual(
        expect.arrayContaining(["tanstack-router-docs", "tanstack-query-docs"])
      );
    }
  );

  it("skips knowledge installation when no docsets are implied", async () => {
    const catalog = getDefaultCatalog();

    vi.mocked(clack.select)
      .mockResolvedValueOnce("native-agents-md") // process
      .mockResolvedValueOnce("__skip__"); // architecture: skip
    vi.mocked(clack.multiselect)
      .mockResolvedValueOnce(["tdd-london"]) // practices: no docsets
      .mockResolvedValueOnce(["claude-code"]); // harnesses

    await runSetup(dir, catalog);

    expect(createDocset).not.toHaveBeenCalled();
    expect(initDocset).not.toHaveBeenCalled();
  });
});
