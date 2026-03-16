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

describe("architecture and practices facets integration", () => {
  let dir: string;

  beforeEach(async () => {
    vi.clearAllMocks();
    dir = await mkdtemp(join(tmpdir(), "ade-conventions-"));
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it(
    "writes SKILL.md files and installs inline skills for tanstack architecture",
    { timeout: 60_000 },
    async () => {
      const catalog = getDefaultCatalog();

      // Facet order: process (select), architecture (select), practices (multiselect)
      vi.mocked(clack.select)
        .mockResolvedValueOnce("codemcp-workflows") // process
        .mockResolvedValueOnce("tanstack"); // architecture
      vi.mocked(clack.multiselect).mockResolvedValueOnce([]); // practices: none

      await runSetup(dir, catalog);

      // Inline skills should have SKILL.md in .ade/skills/ (staging area)
      for (const skill of [
        "tanstack-architecture",
        "tanstack-design",
        "tanstack-code",
        "tanstack-testing"
      ]) {
        const skillMd = await readFile(
          join(dir, ".ade", "skills", skill, "SKILL.md"),
          "utf-8"
        );
        expect(skillMd).toContain(`name: ${skill}`);
        expect(skillMd).toContain("---");
      }

      // Inline skills should also be installed to .agentskills/skills/ by runAdd
      for (const skill of [
        "tanstack-architecture",
        "tanstack-design",
        "tanstack-code",
        "tanstack-testing"
      ]) {
        const installed = await readFile(
          join(dir, ".agentskills", "skills", skill, "SKILL.md"),
          "utf-8"
        );
        expect(installed).toContain(`name: ${skill}`);
      }

      // skills-lock.json should be created by runAdd
      const lockRaw = await readFile(join(dir, "skills-lock.json"), "utf-8");
      const skillsLock = JSON.parse(lockRaw);
      expect(skillsLock.skills).toBeDefined();

      // skills-server MCP server should be in settings.json
      const settings = JSON.parse(
        await readFile(join(dir, ".claude", "settings.json"), "utf-8")
      );
      expect(settings.mcpServers["agentskills"]).toMatchObject({
        command: "npx",
        args: ["-y", "@codemcp/skills-server"]
      });
    }
  );

  it("writes skills for multiple selected practices", async () => {
    const catalog = getDefaultCatalog();

    // Facet order: process (select), architecture (select), practices (multiselect)
    vi.mocked(clack.select)
      .mockResolvedValueOnce("native-agents-md") // process
      .mockResolvedValueOnce("__skip__"); // architecture: skip
    vi.mocked(clack.multiselect).mockResolvedValueOnce([
      "conventional-commits",
      "tdd-london"
    ]);

    await runSetup(dir, catalog);

    // Both inline skills should exist in .ade/skills/ (staging)
    const commits = await readFile(
      join(dir, ".ade", "skills", "conventional-commits", "SKILL.md"),
      "utf-8"
    );
    expect(commits).toContain("name: conventional-commits");
    expect(commits).toContain("Conventional Commits");

    const tdd = await readFile(
      join(dir, ".ade", "skills", "tdd-london", "SKILL.md"),
      "utf-8"
    );
    expect(tdd).toContain("name: tdd-london");
    expect(tdd).toContain("London");

    // Both should be installed to .agentskills/skills/
    await expect(
      access(join(dir, ".agentskills", "skills", "conventional-commits"))
    ).resolves.toBeUndefined();
    await expect(
      access(join(dir, ".agentskills", "skills", "tdd-london"))
    ).resolves.toBeUndefined();

    // config.yaml should have array of choices under practices
    const config = await readUserConfig(dir);
    expect(config!.choices.practices).toEqual([
      "conventional-commits",
      "tdd-london"
    ]);

    // Lock file should reflect both
    const lock = await readLockFile(dir);
    expect(lock!.logical_config.skills.length).toBeGreaterThanOrEqual(2);
  });

  it("writes ADR skill with template content", async () => {
    const catalog = getDefaultCatalog();

    // Facet order: process (select), architecture (select), practices (multiselect)
    vi.mocked(clack.select)
      .mockResolvedValueOnce("native-agents-md") // process
      .mockResolvedValueOnce("__skip__"); // architecture: skip
    vi.mocked(clack.multiselect).mockResolvedValueOnce(["adr-nygard"]);

    await runSetup(dir, catalog);

    const adr = await readFile(
      join(dir, ".ade", "skills", "adr-nygard", "SKILL.md"),
      "utf-8"
    );
    expect(adr).toContain("name: adr-nygard");
    expect(adr).toContain("## Context");
    expect(adr).toContain("## Decision");
    expect(adr).toContain("## Consequences");
  });

  it("skips both architecture and practices when none selected", async () => {
    const catalog = getDefaultCatalog();

    // Facet order: process (select), architecture (select), practices (multiselect)
    vi.mocked(clack.select)
      .mockResolvedValueOnce("native-agents-md") // process
      .mockResolvedValueOnce("__skip__"); // architecture: skip
    vi.mocked(clack.multiselect).mockResolvedValueOnce([]); // practices: none

    await runSetup(dir, catalog);

    // No .ade directory should exist
    await expect(access(join(dir, ".ade"))).rejects.toThrow();

    // config.yaml should not have architecture or practices keys
    const config = await readUserConfig(dir);
    expect(config!.choices).not.toHaveProperty("architecture");
    expect(config!.choices).not.toHaveProperty("practices");
  });

  it("includes practice instructions in AGENTS.md", async () => {
    const catalog = getDefaultCatalog();

    // Facet order: process (select), architecture (select), practices (multiselect)
    vi.mocked(clack.select)
      .mockResolvedValueOnce("native-agents-md") // process
      .mockResolvedValueOnce("__skip__"); // architecture: skip
    vi.mocked(clack.multiselect).mockResolvedValueOnce(["tdd-london"]);

    await runSetup(dir, catalog);

    const agentsMd = await readFile(join(dir, "AGENTS.md"), "utf-8");
    expect(agentsMd).toContain("tdd-london");
    expect(agentsMd).toContain("use_skill()");
  });

  it(
    "combines architecture and practices selections",
    { timeout: 60_000 },
    async () => {
      const catalog = getDefaultCatalog();

      // Facet order: process (select), architecture (select), practices (multiselect)
      vi.mocked(clack.select)
        .mockResolvedValueOnce("codemcp-workflows") // process
        .mockResolvedValueOnce("tanstack"); // architecture
      vi.mocked(clack.multiselect).mockResolvedValueOnce([
        "tdd-london",
        "conventional-commits"
      ]);

      await runSetup(dir, catalog);

      // Architecture skills should exist
      const archSkill = await readFile(
        join(dir, ".ade", "skills", "tanstack-architecture", "SKILL.md"),
        "utf-8"
      );
      expect(archSkill).toContain("name: tanstack-architecture");

      // Practice skills should exist
      const tddSkill = await readFile(
        join(dir, ".ade", "skills", "tdd-london", "SKILL.md"),
        "utf-8"
      );
      expect(tddSkill).toContain("name: tdd-london");

      const commitsSkill = await readFile(
        join(dir, ".ade", "skills", "conventional-commits", "SKILL.md"),
        "utf-8"
      );
      expect(commitsSkill).toContain("name: conventional-commits");

      // config.yaml should have both architecture and practices
      const config = await readUserConfig(dir);
      expect(config!.choices.architecture).toBe("tanstack");
      expect(config!.choices.practices).toEqual([
        "tdd-london",
        "conventional-commits"
      ]);
    }
  );
});
