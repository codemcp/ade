import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdtemp, rm, mkdir, readFile, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import * as clack from "@clack/prompts";
import type { GitHook } from "@codemcp/ade-core";
import { writeGitHooks } from "./util.js";

describe("writeGitHooks", () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "ade-util-git-hooks-"));
    vi.spyOn(clack.log, "warn").mockImplementation(() => undefined);
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  it("is a no-op when hooks is undefined", async () => {
    await expect(writeGitHooks(undefined, dir)).resolves.toBeUndefined();
    expect(clack.log.warn).not.toHaveBeenCalled();
  });

  it("is a no-op when hooks array is empty", async () => {
    await expect(writeGitHooks([], dir)).resolves.toBeUndefined();
    expect(clack.log.warn).not.toHaveBeenCalled();
  });

  it("warns and skips gracefully when .git directory does not exist", async () => {
    const hooks: GitHook[] = [
      { phase: "pre-commit", script: "#!/bin/sh\nnpx lint-staged" }
    ];

    await expect(writeGitHooks(hooks, dir)).resolves.toBeUndefined();

    expect(clack.log.warn).toHaveBeenCalledOnce();
    expect(clack.log.warn).toHaveBeenCalledWith(
      expect.stringContaining("not a git repository")
    );

    // No .git/hooks directory should have been created
    await expect(stat(join(dir, ".git"))).rejects.toThrow();
  });

  it("writes hook files when .git exists", async () => {
    await mkdir(join(dir, ".git"), { recursive: true });

    const script = "#!/bin/sh\nnpx lint-staged\n";
    const hooks: GitHook[] = [{ phase: "pre-commit", script }];

    await writeGitHooks(hooks, dir);

    expect(clack.log.warn).not.toHaveBeenCalled();

    const written = await readFile(
      join(dir, ".git", "hooks", "pre-commit"),
      "utf-8"
    );
    expect(written).toBe(script);
  });

  it("creates .git/hooks directory if it does not exist yet", async () => {
    // .git exists but no hooks subdir
    await mkdir(join(dir, ".git"), { recursive: true });

    const hooks: GitHook[] = [{ phase: "pre-commit", script: "#!/bin/sh\n" }];
    await writeGitHooks(hooks, dir);

    const hookStat = await stat(join(dir, ".git", "hooks"));
    expect(hookStat.isDirectory()).toBe(true);
  });

  it("writes multiple hooks", async () => {
    await mkdir(join(dir, ".git"), { recursive: true });

    const hooks: GitHook[] = [
      { phase: "pre-commit", script: "#!/bin/sh\necho pre-commit\n" },
      { phase: "pre-push", script: "#!/bin/sh\necho pre-push\n" }
    ];

    await writeGitHooks(hooks, dir);

    const preCommit = await readFile(
      join(dir, ".git", "hooks", "pre-commit"),
      "utf-8"
    );
    const prePush = await readFile(
      join(dir, ".git", "hooks", "pre-push"),
      "utf-8"
    );
    expect(preCommit).toBe(hooks[0].script);
    expect(prePush).toBe(hooks[1].script);
  });
});
