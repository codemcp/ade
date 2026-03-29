import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  mkdtemp,
  rm,
  readFile,
  access,
  writeFile,
  mkdir
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

vi.mock("@clack/prompts", () => ({
  intro: vi.fn(),
  outro: vi.fn(),
  note: vi.fn(),
  select: vi.fn(),
  multiselect: vi.fn(),
  confirm: vi.fn().mockResolvedValue(true),
  isCancel: vi.fn().mockReturnValue(false),
  cancel: vi.fn(),
  log: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    success: vi.fn()
  },
  spinner: vi.fn().mockReturnValue({ start: vi.fn(), stop: vi.fn() })
}));

// Mock the knowledge package to avoid real network I/O
vi.mock("@codemcp/knowledge/packages/cli/dist/exports.js", () => ({
  createDocset: vi.fn(
    async (
      params: { id: string; name: string; url?: string },
      options: { cwd?: string }
    ) => {
      const dir = join(options?.cwd ?? process.cwd(), ".knowledge");
      await mkdir(dir, { recursive: true });
      const configPath = join(dir, "config.yaml");
      await writeFile(
        configPath,
        `version: "1.0"\ndocsets:\n  - id: ${params.id}\n`,
        { flag: "w" }
      );
      return { docset: {}, configPath, configCreated: true };
    }
  ),
  initDocset: vi.fn().mockResolvedValue({ alreadyInitialized: false })
}));

import * as clack from "@clack/prompts";
import { runSetup } from "./setup.js";
import { readUserConfig, readLockFile } from "@codemcp/ade-core";
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
      vi.mocked(clack.multiselect)
        .mockResolvedValueOnce([]) // practices: none
        .mockResolvedValueOnce([]) // backpressure: none
        .mockResolvedValueOnce(["claude-code"]); // harnesses

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

      // skills-server MCP server should be in .mcp.json
      const mcpJson = JSON.parse(
        await readFile(join(dir, ".mcp.json"), "utf-8")
      );
      expect(mcpJson.mcpServers["agentskills"]).toMatchObject({
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
      .mockResolvedValueOnce("other"); // architecture: other
    vi.mocked(clack.multiselect)
      .mockResolvedValueOnce(["conventional-commits", "tdd-london"]) // practices
      .mockResolvedValueOnce(["claude-code"]); // harnesses

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
      .mockResolvedValueOnce("other"); // architecture: other
    vi.mocked(clack.multiselect)
      .mockResolvedValueOnce(["adr-nygard"])
      .mockResolvedValueOnce(["claude-code"]); // harnesses

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

  it("writes no .ade directory when architecture is other and no practices selected", async () => {
    const catalog = getDefaultCatalog();

    // Facet order: process (select), architecture (select), practices (multiselect)
    vi.mocked(clack.select)
      .mockResolvedValueOnce("native-agents-md") // process
      .mockResolvedValueOnce("other"); // architecture: other
    vi.mocked(clack.multiselect)
      .mockResolvedValueOnce([]) // practices: none
      .mockResolvedValueOnce(["claude-code"]); // harnesses

    await runSetup(dir, catalog);

    // No .ade directory should exist
    await expect(access(join(dir, ".ade"))).rejects.toThrow();

    // config.yaml should have architecture: "other" but no practices key
    const config = await readUserConfig(dir);
    expect(config!.choices).toHaveProperty("architecture", "other");
    expect(config!.choices).not.toHaveProperty("practices");
  });

  it("exposes practices as skills, not instructions", async () => {
    const catalog = getDefaultCatalog();

    // Facet order: process (select), architecture (select), practices (multiselect)
    vi.mocked(clack.select)
      .mockResolvedValueOnce("native-agents-md") // process
      .mockResolvedValueOnce("other"); // architecture: other
    vi.mocked(clack.multiselect)
      .mockResolvedValueOnce(["tdd-london"])
      .mockResolvedValueOnce(["claude-code"]); // harnesses

    await runSetup(dir, catalog);

    // Practice produces a skill, not an instruction
    const skillMd = await readFile(
      join(dir, ".ade", "skills", "tdd-london", "SKILL.md"),
      "utf-8"
    );
    expect(skillMd).toContain("name: tdd-london");

    // Lock file should have skill but no practice-specific instructions
    const lock = await readLockFile(dir);
    expect(lock!.logical_config.skills.length).toBeGreaterThanOrEqual(1);
    // Only process-facet instructions should be present (from native-agents-md)
    for (const instruction of lock!.logical_config.instructions) {
      expect(instruction).not.toContain("tdd-london");
    }
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
      vi.mocked(clack.multiselect)
        .mockResolvedValueOnce(["tdd-london", "conventional-commits"]) // practices
        .mockResolvedValueOnce([]) // backpressure: none
        .mockResolvedValueOnce(["claude-code"]); // harnesses

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
