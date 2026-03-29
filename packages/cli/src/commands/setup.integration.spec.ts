import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

// Mock only the TUI — everything else (catalog, registry, resolver, config I/O) is real
vi.mock("@clack/prompts", () => ({
  intro: vi.fn(),
  outro: vi.fn(),
  note: vi.fn(),
  select: vi.fn(),
  multiselect: vi.fn(),
  confirm: vi.fn().mockResolvedValue(false), // default: decline "configure now?"
  isCancel: vi.fn().mockReturnValue(false),
  cancel: vi.fn(),
  log: { info: vi.fn(), warn: vi.fn() },
  spinner: vi.fn().mockReturnValue({ start: vi.fn(), stop: vi.fn() })
}));

// Mock configure so setup integration tests don't run the full configure flow
vi.mock("./configure.js", () => ({
  runConfigure: vi.fn().mockResolvedValue(undefined)
}));

import * as clack from "@clack/prompts";
import { runSetup } from "./setup.js";
import { readUserConfig, readLockFile } from "@codemcp/ade-core";
import { getDefaultCatalog } from "../../../core/src/catalog/index.js";

describe("setup integration (real temp dir)", () => {
  let dir: string;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.mocked(clack.confirm).mockResolvedValue(false);
    dir = await mkdtemp(join(tmpdir(), "ade-setup-"));
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("writes config.yaml and config.lock.yaml for codemcp-workflows", async () => {
    const catalog = getDefaultCatalog();

    vi.mocked(clack.select)
      .mockResolvedValueOnce("codemcp-workflows") // process
      .mockResolvedValueOnce("other"); // architecture
    vi.mocked(clack.multiselect).mockResolvedValueOnce([]); // practices: none

    await runSetup(dir, catalog);

    // ── config.yaml ──────────────────────────────────────────────────────
    const config = await readUserConfig(dir);
    expect(config).not.toBeNull();
    expect(config!.choices).toEqual({
      process: "codemcp-workflows",
      architecture: "other"
    });
    // harnesses must NOT be in config.yaml — setup no longer selects them
    expect(config).not.toHaveProperty("harnesses");

    // ── config.lock.yaml ─────────────────────────────────────────────────
    const lock = await readLockFile(dir);
    expect(lock).not.toBeNull();
    expect(lock!.version).toBe(1);
    expect(lock!.choices).toEqual({
      process: "codemcp-workflows",
      architecture: "other"
    });
    expect(lock!.generated_at).toBeTruthy();
    // harnesses must NOT be in the lock file
    expect(lock).not.toHaveProperty("harnesses");

    // LogicalConfig was produced by the real resolver with real writers
    const lc = lock!.logical_config;
    expect(lc.mcp_servers).toHaveLength(1);
    expect(lc.mcp_servers[0].ref).toBe("workflows");
    expect(lc.instructions.length).toBeGreaterThan(0);
  });

  it("writes config.yaml and lock for native-agents-md", async () => {
    const catalog = getDefaultCatalog();

    vi.mocked(clack.select)
      .mockResolvedValueOnce("native-agents-md") // process
      .mockResolvedValueOnce("other"); // architecture
    vi.mocked(clack.multiselect).mockResolvedValueOnce([]); // practices: none

    await runSetup(dir, catalog);

    const config = await readUserConfig(dir);
    expect(config!.choices).toEqual({
      process: "native-agents-md",
      architecture: "other"
    });

    const lock = await readLockFile(dir);
    expect(lock!.choices).toEqual({
      process: "native-agents-md",
      architecture: "other"
    });
    expect(lock!.logical_config.instructions.length).toBeGreaterThan(0);
  });

  it("does not write any files when user cancels", async () => {
    const catalog = getDefaultCatalog();
    const cancelSymbol = Symbol("cancel");

    vi.mocked(clack.select).mockResolvedValueOnce(cancelSymbol);
    vi.mocked(clack.isCancel).mockReturnValue(true);

    await runSetup(dir, catalog);

    const config = await readUserConfig(dir);
    expect(config).toBeNull();

    const lock = await readLockFile(dir);
    expect(lock).toBeNull();
  });

  it("produces valid YAML that roundtrips through read", async () => {
    const catalog = getDefaultCatalog();

    vi.mocked(clack.select)
      .mockResolvedValueOnce("codemcp-workflows") // process
      .mockResolvedValueOnce("other"); // architecture
    vi.mocked(clack.multiselect).mockResolvedValueOnce([]); // practices: none

    await runSetup(dir, catalog);

    const { readFile } = await import("node:fs/promises");
    const rawConfig = await readFile(join(dir, "config.yaml"), "utf-8");
    const rawLock = await readFile(join(dir, "config.lock.yaml"), "utf-8");

    expect(rawConfig.length).toBeGreaterThan(0);
    expect(rawLock.length).toBeGreaterThan(0);
    expect(rawConfig).toContain("codemcp-workflows");
    expect(rawLock).toContain("codemcp-workflows");
  });
});
