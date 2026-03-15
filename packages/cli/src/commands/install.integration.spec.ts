import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

// Mock only the TUI — everything else is real
vi.mock("@clack/prompts", () => ({
  intro: vi.fn(),
  outro: vi.fn(),
  log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
  select: vi.fn(),
  multiselect: vi.fn().mockResolvedValue([]),
  isCancel: vi.fn().mockReturnValue(false),
  cancel: vi.fn(),
  spinner: vi.fn().mockReturnValue({ start: vi.fn(), stop: vi.fn() })
}));

import * as clack from "@clack/prompts";
import { runSetup } from "./setup.js";
import { runInstall } from "./install.js";
import { readUserConfig, readLockFile } from "@ade/core";
import { getDefaultCatalog } from "../../../core/src/catalog/index.js";

describe("install integration (real temp dir)", () => {
  let dir: string;

  beforeEach(async () => {
    vi.clearAllMocks();
    dir = await mkdtemp(join(tmpdir(), "ade-install-"));
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("re-resolves from existing config.yaml and regenerates agent files", async () => {
    const catalog = getDefaultCatalog();

    // Step 1: Run setup to create config.yaml
    vi.mocked(clack.select).mockResolvedValueOnce("codemcp-workflows");
    await runSetup(dir, catalog);

    // Step 2: Delete agent output files to simulate a fresh clone
    await rm(join(dir, "AGENTS.md"));
    await rm(join(dir, ".claude"), { recursive: true, force: true });

    // Step 3: Run install — should regenerate from config.yaml
    await runInstall(dir, "claude-code");

    // Agent files should be back
    const agentsMd = await readFile(join(dir, "AGENTS.md"), "utf-8");
    expect(agentsMd).toContain("Call whats_next()");

    const settings = JSON.parse(
      await readFile(join(dir, ".claude", "settings.json"), "utf-8")
    );
    expect(settings.mcpServers["workflows"]).toMatchObject({
      command: "npx",
      args: ["@codemcp/workflows-server@latest"]
    });
  });

  it("updates lock file on install", async () => {
    const catalog = getDefaultCatalog();

    // Setup first
    vi.mocked(clack.select).mockResolvedValueOnce("codemcp-workflows");
    await runSetup(dir, catalog);

    const lockBefore = await readLockFile(dir);

    // Small delay so timestamp differs
    await new Promise((r) => setTimeout(r, 10));

    // Re-install
    await runInstall(dir, "claude-code");

    const lockAfter = await readLockFile(dir);
    expect(lockAfter).not.toBeNull();
    expect(lockAfter!.generated_at).not.toBe(lockBefore!.generated_at);
    expect(lockAfter!.logical_config).toEqual(lockBefore!.logical_config);
  });

  it("fails when no config.yaml exists", async () => {
    await expect(runInstall(dir, "claude-code")).rejects.toThrow(
      /config\.yaml not found/i
    );
  });

  it("works with native-agents-md option", async () => {
    const catalog = getDefaultCatalog();

    // Setup with native-agents-md
    vi.mocked(clack.select).mockResolvedValueOnce("native-agents-md");
    await runSetup(dir, catalog);

    // Delete agent output
    await rm(join(dir, "AGENTS.md"));

    // Re-install
    await runInstall(dir, "claude-code");

    const agentsMd = await readFile(join(dir, "AGENTS.md"), "utf-8");
    expect(agentsMd).toContain("AGENTS.md");
  });
});
