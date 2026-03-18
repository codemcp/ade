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
  log: { info: vi.fn(), warn: vi.fn() },
  spinner: vi.fn().mockReturnValue({ start: vi.fn(), stop: vi.fn() })
}));

import * as clack from "@clack/prompts";
import { runSetup } from "./setup.js";
import { readLockFile } from "@codemcp/ade-core";
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
    "records knowledge sources in lock file when tanstack is selected",
    { timeout: 60_000 },
    async () => {
      const catalog = getDefaultCatalog();

      vi.mocked(clack.select)
        .mockResolvedValueOnce("codemcp-workflows") // process
        .mockResolvedValueOnce("tanstack"); // architecture

      vi.mocked(clack.multiselect)
        .mockResolvedValueOnce([]) // practices: none
        .mockResolvedValueOnce([]) // backpressure: none
        .mockResolvedValueOnce([
          "tanstack-router-docs",
          "tanstack-query-docs",
          "tanstack-form-docs",
          "tanstack-table-docs"
        ])
        .mockResolvedValueOnce(["claude-code"]); // harnesses

      await runSetup(dir, catalog);

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

      // MCP server entry for knowledge should be in .mcp.json
      const mcpJson = JSON.parse(
        await readFile(join(dir, ".mcp.json"), "utf-8")
      );
      expect(mcpJson.mcpServers["knowledge"]).toMatchObject({
        command: "npx",
        args: ["-y", "@codemcp/knowledge-server"]
      });

      // Knowledge init is deferred — user should see a hint
      expect(clack.log.info).toHaveBeenCalledWith(
        expect.stringContaining("npx @codemcp/knowledge init")
      );
    }
  );

  it(
    "excludes deselected docsets from lock file",
    { timeout: 60_000 },
    async () => {
      const catalog = getDefaultCatalog();

      vi.mocked(clack.select)
        .mockResolvedValueOnce("codemcp-workflows") // process
        .mockResolvedValueOnce("tanstack"); // architecture

      vi.mocked(clack.multiselect)
        .mockResolvedValueOnce([]) // practices: none
        .mockResolvedValueOnce([]) // backpressure: none
        .mockResolvedValueOnce(["tanstack-router-docs", "tanstack-query-docs"])
        .mockResolvedValueOnce(["claude-code"]); // harnesses

      await runSetup(dir, catalog);

      // Lock file should only have the 2 selected sources
      const lock = await readLockFile(dir);
      expect(lock!.logical_config.knowledge_sources).toHaveLength(2);
      expect(lock!.logical_config.knowledge_sources.map((s) => s.name)).toEqual(
        expect.arrayContaining(["tanstack-router-docs", "tanstack-query-docs"])
      );
    }
  );

  it("does not show knowledge hint when no docsets are implied", async () => {
    const catalog = getDefaultCatalog();

    vi.mocked(clack.select)
      .mockResolvedValueOnce("native-agents-md") // process
      .mockResolvedValueOnce("__skip__"); // architecture: skip
    vi.mocked(clack.multiselect)
      .mockResolvedValueOnce(["tdd-london"]) // practices: no docsets
      .mockResolvedValueOnce(["claude-code"]); // harnesses

    await runSetup(dir, catalog);

    expect(clack.log.info).not.toHaveBeenCalledWith(
      expect.stringContaining("npx @codemcp/knowledge init")
    );
  });
});
