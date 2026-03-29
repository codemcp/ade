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

  it("completes without error after setup", async () => {
    const catalog = getDefaultCatalog();

    vi.mocked(clack.select)
      .mockResolvedValueOnce("codemcp-workflows") // process
      .mockResolvedValueOnce("other"); // architecture
    vi.mocked(clack.multiselect).mockResolvedValueOnce([]); // practices: none
    await runSetup(dir, catalog);

    await runInstall(dir);
  });

  it("does not modify the lock file", async () => {
    const catalog = getDefaultCatalog();

    vi.mocked(clack.select)
      .mockResolvedValueOnce("codemcp-workflows") // process
      .mockResolvedValueOnce("other"); // architecture
    vi.mocked(clack.multiselect).mockResolvedValueOnce([]); // practices: none
    await runSetup(dir, catalog);

    const lockRawBefore = await readFile(
      join(dir, "config.lock.yaml"),
      "utf-8"
    );

    await runInstall(dir);

    const lockRawAfter = await readFile(join(dir, "config.lock.yaml"), "utf-8");
    expect(lockRawAfter).toBe(lockRawBefore);
  });

  it("fails when no config.lock.yaml exists", async () => {
    await expect(runInstall(dir)).rejects.toThrow(
      /config\.lock\.yaml not found/i
    );
  });
});
