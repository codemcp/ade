import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, readFile, access } from "node:fs/promises";
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

import * as clack from "@clack/prompts";
import { runSetup } from "./setup.js";
import { readUserConfig, readLockFile } from "@ade/core";
import { getDefaultCatalog } from "../../../core/src/catalog/index.js";

describe("conventions facet integration", () => {
  let dir: string;

  beforeEach(async () => {
    vi.clearAllMocks();
    dir = await mkdtemp(join(tmpdir(), "ade-conventions-"));
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("writes inline SKILL.md files and registers all skills in package.json for tanstack", async () => {
    const catalog = getDefaultCatalog();

    vi.mocked(clack.select).mockResolvedValueOnce("codemcp-workflows");
    vi.mocked(clack.multiselect).mockResolvedValueOnce(["tanstack"]);

    await runSetup(dir, catalog);

    // Inline skills should have SKILL.md in .ade/catalog/skills/
    for (const skill of [
      "tanstack-architecture",
      "tanstack-design",
      "tanstack-code",
      "tanstack-testing"
    ]) {
      const skillMd = await readFile(
        join(dir, ".ade", "catalog", "skills", skill, "SKILL.md"),
        "utf-8"
      );
      expect(skillMd).toContain(`name: ${skill}`);
      expect(skillMd).toContain("---");
    }

    // External skill (playwright) should NOT have a local SKILL.md
    await expect(
      access(join(dir, ".ade", "catalog", "skills", "playwright-cli"))
    ).rejects.toThrow();

    // All skills should be registered in package.json
    const pkg = JSON.parse(await readFile(join(dir, "package.json"), "utf-8"));
    expect(pkg.agentskills["tanstack-architecture"]).toBe(
      "file:./.ade/catalog/skills/tanstack-architecture"
    );
    expect(pkg.agentskills["playwright-cli"]).toBe(
      "microsoft/playwright-cli/skills/playwright-cli"
    );

    // skills-server MCP server should be in settings.json
    const settings = JSON.parse(
      await readFile(join(dir, ".claude", "settings.json"), "utf-8")
    );
    expect(settings.mcpServers["agentskills"]).toMatchObject({
      command: "npx",
      args: ["-y", "@codemcp/skills-server"]
    });
  });

  it("writes skills for multiple selected conventions", async () => {
    const catalog = getDefaultCatalog();

    vi.mocked(clack.select).mockResolvedValueOnce("native-agents-md");
    vi.mocked(clack.multiselect).mockResolvedValueOnce([
      "conventional-commits",
      "tdd-london"
    ]);

    await runSetup(dir, catalog);

    // Both inline skills should exist in .ade/catalog/skills/
    const commits = await readFile(
      join(
        dir,
        ".ade",
        "catalog",
        "skills",
        "conventional-commits",
        "SKILL.md"
      ),
      "utf-8"
    );
    expect(commits).toContain("name: conventional-commits");
    expect(commits).toContain("Conventional Commits");

    const tdd = await readFile(
      join(dir, ".ade", "catalog", "skills", "tdd-london", "SKILL.md"),
      "utf-8"
    );
    expect(tdd).toContain("name: tdd-london");
    expect(tdd).toContain("London");

    // Both registered in package.json
    const pkg = JSON.parse(await readFile(join(dir, "package.json"), "utf-8"));
    expect(pkg.agentskills["conventional-commits"]).toContain("file:");
    expect(pkg.agentskills["tdd-london"]).toContain("file:");

    // config.yaml should have array of choices
    const config = await readUserConfig(dir);
    expect(config!.choices.conventions).toEqual([
      "conventional-commits",
      "tdd-london"
    ]);

    // Lock file should reflect both
    const lock = await readLockFile(dir);
    expect(lock!.logical_config.skills.length).toBeGreaterThanOrEqual(2);
  });

  it("writes ADR skill with template content", async () => {
    const catalog = getDefaultCatalog();

    vi.mocked(clack.select).mockResolvedValueOnce("native-agents-md");
    vi.mocked(clack.multiselect).mockResolvedValueOnce(["adr-nygard"]);

    await runSetup(dir, catalog);

    const adr = await readFile(
      join(dir, ".ade", "catalog", "skills", "adr-nygard", "SKILL.md"),
      "utf-8"
    );
    expect(adr).toContain("name: adr-nygard");
    expect(adr).toContain("## Context");
    expect(adr).toContain("## Decision");
    expect(adr).toContain("## Consequences");
  });

  it("skips conventions when none selected", async () => {
    const catalog = getDefaultCatalog();

    vi.mocked(clack.select).mockResolvedValueOnce("native-agents-md");
    vi.mocked(clack.multiselect).mockResolvedValueOnce([]);

    await runSetup(dir, catalog);

    // No .ade directory should exist
    await expect(access(join(dir, ".ade"))).rejects.toThrow();

    // config.yaml should not have conventions key
    const config = await readUserConfig(dir);
    expect(config!.choices).not.toHaveProperty("conventions");
  });

  it("includes convention instructions in AGENTS.md", async () => {
    const catalog = getDefaultCatalog();

    vi.mocked(clack.select).mockResolvedValueOnce("native-agents-md");
    vi.mocked(clack.multiselect).mockResolvedValueOnce(["tdd-london"]);

    await runSetup(dir, catalog);

    const agentsMd = await readFile(join(dir, "AGENTS.md"), "utf-8");
    expect(agentsMd).toContain("tdd-london");
    expect(agentsMd).toContain("use_skill()");
  });
});
