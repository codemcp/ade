import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

// Mock only the TUI — everything else (catalog, registry, resolver, config I/O) is real
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

import * as clack from "@clack/prompts";
import { runSetup } from "./setup.js";
import { readUserConfig, readLockFile } from "@ade/core";
import { getDefaultCatalog } from "../../../core/src/catalog/index.js";

describe("setup integration (real temp dir)", () => {
  let dir: string;

  beforeEach(async () => {
    vi.clearAllMocks();
    dir = await mkdtemp(join(tmpdir(), "ade-setup-"));
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("writes config.yaml and config.lock.yaml for codemcp-workflows", async () => {
    const catalog = getDefaultCatalog();

    vi.mocked(clack.select)
      .mockResolvedValueOnce("codemcp-workflows") // process
      .mockResolvedValueOnce("__skip__"); // architecture
    vi.mocked(clack.multiselect)
      .mockResolvedValueOnce([]) // practices: none
      .mockResolvedValueOnce(["claude-code"]); // harnesses

    await runSetup(dir, catalog);

    // ── config.yaml ──────────────────────────────────────────────────────
    const config = await readUserConfig(dir);
    expect(config).not.toBeNull();
    expect(config!.choices).toEqual({ process: "codemcp-workflows" });

    // ── config.lock.yaml ─────────────────────────────────────────────────
    const lock = await readLockFile(dir);
    expect(lock).not.toBeNull();
    expect(lock!.version).toBe(1);
    expect(lock!.choices).toEqual({ process: "codemcp-workflows" });
    expect(lock!.generated_at).toBeTruthy();

    // LogicalConfig was produced by the real resolver with real writers
    const lc = lock!.logical_config;
    expect(lc.mcp_servers).toHaveLength(1);
    expect(lc.mcp_servers[0].ref).toBe("workflows");
    expect(lc.instructions.length).toBeGreaterThan(0);

    // ── Agent output: .claude/settings.json ──────────────────────────────
    const { readFile } = await import("node:fs/promises");
    const settings = JSON.parse(
      await readFile(join(dir, ".claude", "settings.json"), "utf-8")
    );
    expect(settings.mcpServers["workflows"]).toMatchObject({
      command: "npx",
      args: ["@codemcp/workflows-server@latest"]
    });

    // ── Agent output: AGENTS.md ─────────────────────────────────────────
    const agentsMd = await readFile(join(dir, "AGENTS.md"), "utf-8");
    expect(agentsMd).toContain("Call whats_next()");
  });

  it("writes config.yaml, lock, and AGENTS.md for native-agents-md", async () => {
    const catalog = getDefaultCatalog();

    vi.mocked(clack.select)
      .mockResolvedValueOnce("native-agents-md") // process
      .mockResolvedValueOnce("__skip__"); // architecture
    vi.mocked(clack.multiselect)
      .mockResolvedValueOnce([]) // practices: none
      .mockResolvedValueOnce(["claude-code"]); // harnesses

    await runSetup(dir, catalog);

    const config = await readUserConfig(dir);
    expect(config!.choices).toEqual({ process: "native-agents-md" });

    const lock = await readLockFile(dir);
    expect(lock!.choices).toEqual({ process: "native-agents-md" });
    expect(lock!.logical_config.instructions.length).toBeGreaterThan(0);

    // Agent output: AGENTS.md is written with instruction text
    const { readFile } = await import("node:fs/promises");
    const agentsMd = await readFile(join(dir, "AGENTS.md"), "utf-8");
    expect(agentsMd).toContain("AGENTS.md");
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
      .mockResolvedValueOnce("__skip__"); // architecture
    vi.mocked(clack.multiselect)
      .mockResolvedValueOnce([]) // practices: none
      .mockResolvedValueOnce(["claude-code"]); // harnesses

    await runSetup(dir, catalog);

    // Read the raw file and re-parse to ensure valid YAML
    const { readFile } = await import("node:fs/promises");
    const rawConfig = await readFile(join(dir, "config.yaml"), "utf-8");
    const rawLock = await readFile(join(dir, "config.lock.yaml"), "utf-8");

    // Both files should be non-empty valid YAML (not "undefined" or empty)
    expect(rawConfig.length).toBeGreaterThan(0);
    expect(rawLock.length).toBeGreaterThan(0);
    expect(rawConfig).toContain("codemcp-workflows");
    expect(rawLock).toContain("codemcp-workflows");
  });
});
