import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

// Mock only the TUI — everything else is real
vi.mock("@clack/prompts", () => ({
  intro: vi.fn(),
  outro: vi.fn(),
  note: vi.fn(),
  log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
  select: vi.fn(),
  multiselect: vi.fn(),
  confirm: vi.fn().mockResolvedValue(false), // decline "configure now?" in setup
  isCancel: vi.fn().mockReturnValue(false),
  cancel: vi.fn(),
  spinner: vi.fn().mockReturnValue({ start: vi.fn(), stop: vi.fn() })
}));

// Mock configure so setup calls inside tests don't run the full configure flow
vi.mock("./configure.js", () => ({
  runConfigure: vi.fn().mockResolvedValue(undefined)
}));

import * as clack from "@clack/prompts";
import { runSetup } from "./setup.js";
import { runInstall } from "./install.js";
import { getDefaultCatalog } from "../../../core/src/catalog/index.js";

describe("install integration (real temp dir)", () => {
  let dir: string;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.mocked(clack.confirm).mockResolvedValue(false);
    dir = await mkdtemp(join(tmpdir(), "ade-install-"));
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("applies lock file to regenerate agent files without re-resolving", async () => {
    const catalog = getDefaultCatalog();

    // Step 1: Run setup to create config.yaml + config.lock.yaml
    vi.mocked(clack.select)
      .mockResolvedValueOnce("codemcp-workflows") // process
      .mockResolvedValueOnce("__skip__"); // architecture
    vi.mocked(clack.multiselect).mockResolvedValueOnce([]); // practices: none
    await runSetup(dir, catalog);

    // Step 2: Run install — writes agent files from lock file
    await runInstall(dir, ["claude-code"]);

    // Agent files should be written by install
    const agentMd = await readFile(
      join(dir, ".claude", "agents", "ade.md"),
      "utf-8"
    );
    expect(agentMd).toContain("Call whats_next()");

    const mcpJson = JSON.parse(await readFile(join(dir, ".mcp.json"), "utf-8"));
    expect(mcpJson.mcpServers["workflows"]).toMatchObject({
      command: "npx",
      args: ["@codemcp/workflows-server@latest"]
    });
  });

  it("does not modify the lock file", async () => {
    const catalog = getDefaultCatalog();

    // Setup first
    vi.mocked(clack.select)
      .mockResolvedValueOnce("codemcp-workflows") // process
      .mockResolvedValueOnce("__skip__"); // architecture
    vi.mocked(clack.multiselect).mockResolvedValueOnce([]); // practices: none
    await runSetup(dir, catalog);

    const lockRawBefore = await readFile(
      join(dir, "config.lock.yaml"),
      "utf-8"
    );

    // Re-install
    await runInstall(dir, ["claude-code"]);

    const lockRawAfter = await readFile(join(dir, "config.lock.yaml"), "utf-8");
    // Lock file should be byte-identical (install doesn't rewrite it)
    expect(lockRawAfter).toBe(lockRawBefore);
  });

  it("fails when no config.lock.yaml exists", async () => {
    await expect(runInstall(dir, ["claude-code"])).rejects.toThrow(
      /config\.lock\.yaml not found/i
    );
  });

  it("works with native-agents-md option", async () => {
    const catalog = getDefaultCatalog();

    // Setup with native-agents-md
    vi.mocked(clack.select)
      .mockResolvedValueOnce("native-agents-md") // process
      .mockResolvedValueOnce("__skip__"); // architecture
    vi.mocked(clack.multiselect).mockResolvedValueOnce([]); // practices: none
    await runSetup(dir, catalog);

    // Run install
    await runInstall(dir, ["claude-code"]);

    const agentMd = await readFile(
      join(dir, ".claude", "agents", "ade.md"),
      "utf-8"
    );
    expect(agentMd).toContain("AGENTS.md");
  });
});
