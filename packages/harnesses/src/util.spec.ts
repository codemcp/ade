import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  mkdtemp,
  rm,
  mkdir,
  readFile,
  stat,
  writeFile
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import * as clack from "@clack/prompts";
import type { GitHook, LogicalConfig } from "@codemcp/ade-core";
import { writeGitHooks, writeInlineSkills, formatYamlValue } from "./util.js";

const emptyConfig = (): LogicalConfig => ({
  mcp_servers: [],
  instructions: [],
  cli_actions: [],
  knowledge_sources: [],
  skills: [],
  git_hooks: [],
  setup_notes: []
});

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

describe("writeInlineSkills", () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "ade-util-inline-skills-"));
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("returns empty array when there are no skills", async () => {
    const config = emptyConfig();
    const result = await writeInlineSkills(config, dir);
    expect(result).toEqual([]);
  });

  it("skips external skills (no body)", async () => {
    const config = emptyConfig();
    config.skills = [{ name: "ext-skill", source: "org/repo/skills/ext" }];
    const result = await writeInlineSkills(config, dir);
    expect(result).toEqual([]);
  });

  it("writes SKILL.md for a new inline skill", async () => {
    const config = emptyConfig();
    config.skills = [
      { name: "my-skill", description: "A test skill", body: "Do the thing." }
    ];

    const result = await writeInlineSkills(config, dir);

    expect(result).toEqual(["my-skill"]);

    const content = await readFile(
      join(dir, ".ade", "skills", "my-skill", "SKILL.md"),
      "utf-8"
    );
    expect(content).toBe(
      "---\nname: my-skill\ndescription: A test skill\n---\n\nDo the thing.\n"
    );
  });

  it("does not re-write SKILL.md when content is unchanged (idempotent)", async () => {
    const config = emptyConfig();
    config.skills = [
      { name: "my-skill", description: "A skill", body: "Body." }
    ];

    // First write
    await writeInlineSkills(config, dir);

    // Second write — should be a no-op, returning empty modified list
    const result = await writeInlineSkills(config, dir);
    expect(result).toEqual([]);
  });

  it("tracks skill as modified when SKILL.md content changes", async () => {
    const skillDir = join(dir, ".ade", "skills", "my-skill");
    await mkdir(skillDir, { recursive: true });
    await writeFile(
      join(skillDir, "SKILL.md"),
      "---\nname: my-skill\ndescription: Old\n---\n\nOld body.\n",
      "utf-8"
    );

    const config = emptyConfig();
    config.skills = [
      { name: "my-skill", description: "New", body: "New body." }
    ];

    const result = await writeInlineSkills(config, dir);
    expect(result).toContain("my-skill");
  });

  it("writes asset files alongside SKILL.md", async () => {
    const config = emptyConfig();
    config.skills = [
      {
        name: "arch-skill",
        description: "Architecture skill",
        body: "See [details](references/details.md).",
        assets: {
          "references/details.md": "## Details\n\nMore info."
        }
      }
    ];

    await writeInlineSkills(config, dir);

    const assetContent = await readFile(
      join(dir, ".ade", "skills", "arch-skill", "references", "details.md"),
      "utf-8"
    );
    expect(assetContent).toBe("## Details\n\nMore info.");
  });

  it("creates subdirectories for asset files", async () => {
    const config = emptyConfig();
    config.skills = [
      {
        name: "arch-skill",
        description: "Arch",
        body: "Body.",
        assets: {
          "references/nested/deep.md": "Deep content.",
          "scripts/setup.sh": "#!/bin/bash\n"
        }
      }
    ];

    await writeInlineSkills(config, dir);

    const skillBase = join(dir, ".ade", "skills", "arch-skill");

    const deep = await readFile(
      join(skillBase, "references", "nested", "deep.md"),
      "utf-8"
    );
    expect(deep).toBe("Deep content.");

    const script = await readFile(
      join(skillBase, "scripts", "setup.sh"),
      "utf-8"
    );
    expect(script).toBe("#!/bin/bash\n");
  });

  it("does not re-write unchanged assets (idempotent)", async () => {
    const config = emptyConfig();
    config.skills = [
      {
        name: "arch-skill",
        description: "Arch",
        body: "Body.",
        assets: { "references/foo.md": "Foo content." }
      }
    ];

    // First write
    await writeInlineSkills(config, dir);

    // Second write — nothing changed
    const result = await writeInlineSkills(config, dir);
    expect(result).toEqual([]);
  });

  it("tracks skill as modified when an asset changes", async () => {
    const skillDir = join(dir, ".ade", "skills", "arch-skill");
    const refsDir = join(skillDir, "references");
    await mkdir(refsDir, { recursive: true });

    const expected = "---\nname: arch-skill\ndescription: Arch\n---\n\nBody.\n";
    await writeFile(join(skillDir, "SKILL.md"), expected, "utf-8");
    await writeFile(join(refsDir, "foo.md"), "Old content.", "utf-8");

    const config = emptyConfig();
    config.skills = [
      {
        name: "arch-skill",
        description: "Arch",
        body: "Body.",
        assets: { "references/foo.md": "New content." }
      }
    ];

    const result = await writeInlineSkills(config, dir);
    expect(result).toContain("arch-skill");

    const written = await readFile(join(refsDir, "foo.md"), "utf-8");
    expect(written).toBe("New content.");
  });

  it("does not duplicate skill name in modified when both SKILL.md and asset change", async () => {
    const config = emptyConfig();
    config.skills = [
      {
        name: "new-skill",
        description: "New",
        body: "Body.",
        assets: { "references/foo.md": "Foo." }
      }
    ];

    const result = await writeInlineSkills(config, dir);
    // skill name should appear only once
    expect(result.filter((n) => n === "new-skill")).toHaveLength(1);
  });

  it("quotes description containing colon-space in YAML frontmatter", async () => {
    const config = emptyConfig();
    config.skills = [
      {
        name: "sabdx-arch",
        description:
          "Explains the topology of @sabdx projects: folder layout, file naming.",
        body: "Body."
      }
    ];

    await writeInlineSkills(config, dir);

    const content = await readFile(
      join(dir, ".ade", "skills", "sabdx-arch", "SKILL.md"),
      "utf-8"
    );
    // description must be double-quoted so YAML parsers don't choke on ': '
    expect(content).toContain(
      'description: "Explains the topology of @sabdx projects: folder layout, file naming."'
    );
  });
});

describe("formatYamlValue", () => {
  it("returns value unchanged when no special chars", () => {
    expect(formatYamlValue("Simple description")).toBe("Simple description");
  });

  it("quotes when value contains colon-space", () => {
    expect(formatYamlValue("Key: value pair here")).toBe(
      '"Key: value pair here"'
    );
  });

  it("quotes when value contains a hash", () => {
    expect(formatYamlValue("Use # for comments")).toBe('"Use # for comments"');
  });

  it("quotes when value starts with @", () => {
    expect(formatYamlValue("@sabdx project")).toBe('"@sabdx project"');
  });

  it("quotes when value starts with {", () => {
    expect(formatYamlValue("{key: val}")).toBe('"{key: val}"');
  });

  it("escapes internal double-quotes when quoting", () => {
    expect(formatYamlValue('Say "hello": world')).toBe(
      '"Say \\"hello\\": world"'
    );
  });

  it("does not quote em-dashes or other safe unicode", () => {
    expect(formatYamlValue("Use this — not that")).toBe("Use this — not that");
  });
});
