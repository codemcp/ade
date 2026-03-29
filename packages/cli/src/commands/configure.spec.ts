import { describe, it, expect, vi, beforeEach } from "vitest";
import type { LogicalConfig, LockFile } from "@codemcp/ade-core";

// ── Mocks ────────────────────────────────────────────────────────────────────

vi.mock("@clack/prompts", () => ({
  intro: vi.fn(),
  outro: vi.fn(),
  select: vi.fn(),
  multiselect: vi.fn(),
  confirm: vi.fn().mockResolvedValue(false), // default: decline skills/knowledge
  cancel: vi.fn(),
  log: { warn: vi.fn(), info: vi.fn(), error: vi.fn() }
}));

const mockInstall = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const mockInstallSkills = vi.hoisted(() =>
  vi.fn().mockResolvedValue(undefined)
);
const mockWriteInlineSkills = vi.hoisted(() => vi.fn().mockResolvedValue([]));

vi.mock("@codemcp/ade-harnesses", () => ({
  allHarnessWriters: [
    {
      id: "universal",
      label: "Universal",
      description: "Cross-tool standard",
      install: mockInstall
    },
    {
      id: "cursor",
      label: "Cursor",
      description: "AI code editor",
      install: mockInstall
    }
  ],
  getHarnessWriter: vi.fn().mockImplementation((id: string) => {
    if (id === "universal" || id === "cursor") {
      return { id, label: id, description: "test", install: mockInstall };
    }
    return undefined;
  }),
  detectHarnesses: vi.fn().mockResolvedValue([]),
  installSkills: mockInstallSkills,
  writeInlineSkills: mockWriteInlineSkills
}));

vi.mock("@codemcp/ade-core", async (importOriginal) => {
  const actual = (await importOriginal()) as typeof import("@codemcp/ade-core");
  return {
    ...actual,
    readLockFile: vi.fn(),
    writeUserConfig: vi.fn().mockResolvedValue(undefined),
    writeLockFile: vi.fn().mockResolvedValue(undefined)
  };
});

vi.mock("../knowledge-installer.js", () => ({
  installKnowledge: vi.fn().mockResolvedValue(undefined)
}));

import * as clack from "@clack/prompts";
import { readLockFile } from "@codemcp/ade-core";
import { installKnowledge } from "../knowledge-installer.js";
import { runConfigure } from "./configure.js";

// ── Fixtures ─────────────────────────────────────────────────────────────────

const baseLockFile: LockFile = {
  version: 1,
  generated_at: "2024-01-01T00:00:00.000Z",
  choices: { process: "codemcp-workflows" },
  logical_config: {
    mcp_servers: [],
    instructions: ["do stuff"],
    cli_actions: [],
    knowledge_sources: [],
    skills: [],
    git_hooks: [],
    setup_notes: []
  } satisfies LogicalConfig
};

// ── Tests ────────────────────────────────────────────────────────────────────

describe("runConfigure", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: decline skills/knowledge prompts
    vi.mocked(clack.confirm).mockResolvedValue(false);
  });

  it("aborts with error message when no lock file exists", async () => {
    vi.mocked(readLockFile).mockResolvedValueOnce(null);

    await runConfigure("/tmp/project");

    expect(clack.log.error).toHaveBeenCalledWith(
      expect.stringContaining("config.lock.yaml not found")
    );
    expect(mockInstall).not.toHaveBeenCalled();
  });

  it("installs with selected autonomy profile merged onto locked config", async () => {
    vi.mocked(readLockFile).mockResolvedValueOnce(baseLockFile);
    vi.mocked(clack.select).mockResolvedValueOnce("sensible-defaults");
    vi.mocked(clack.multiselect).mockResolvedValueOnce(["universal"]);

    await runConfigure("/tmp/project");

    expect(mockInstall).toHaveBeenCalledOnce();
    const [installedConfig] = mockInstall.mock.calls[0] as [
      LogicalConfig,
      string
    ];
    expect(installedConfig.permission_policy).toEqual({
      profile: "sensible-defaults"
    });
    // Base instructions preserved
    expect(installedConfig.instructions).toEqual(["do stuff"]);
  });

  it("installs without permission_policy when autonomy is skipped", async () => {
    vi.mocked(readLockFile).mockResolvedValueOnce(baseLockFile);
    vi.mocked(clack.select).mockResolvedValueOnce("__skip__");
    vi.mocked(clack.multiselect).mockResolvedValueOnce(["universal"]);

    await runConfigure("/tmp/project");

    expect(mockInstall).toHaveBeenCalledOnce();
    const [installedConfig] = mockInstall.mock.calls[0] as [
      LogicalConfig,
      string
    ];
    expect(installedConfig.permission_policy).toBeUndefined();
  });

  it("installs to all selected harnesses", async () => {
    vi.mocked(readLockFile).mockResolvedValueOnce(baseLockFile);
    vi.mocked(clack.select).mockResolvedValueOnce("max-autonomy");
    vi.mocked(clack.multiselect).mockResolvedValueOnce(["universal", "cursor"]);

    await runConfigure("/tmp/project");

    expect(mockInstall).toHaveBeenCalledTimes(2);
  });

  it("does not write config.yaml or config.lock.yaml", async () => {
    const { writeUserConfig, writeLockFile } =
      await import("@codemcp/ade-core");
    vi.mocked(readLockFile).mockResolvedValueOnce(baseLockFile);
    vi.mocked(clack.select).mockResolvedValueOnce("sensible-defaults");
    vi.mocked(clack.multiselect).mockResolvedValueOnce(["universal"]);

    await runConfigure("/tmp/project");

    expect(vi.mocked(writeUserConfig)).not.toHaveBeenCalled();
    expect(vi.mocked(writeLockFile)).not.toHaveBeenCalled();
  });

  it("cancels cleanly when autonomy prompt is cancelled", async () => {
    vi.mocked(readLockFile).mockResolvedValueOnce(baseLockFile);
    const cancelSymbol = Symbol("cancel");
    vi.mocked(clack.select).mockResolvedValueOnce(cancelSymbol);

    await runConfigure("/tmp/project");

    expect(clack.cancel).toHaveBeenCalled();
    expect(mockInstall).not.toHaveBeenCalled();
  });

  it("cancels cleanly when harness prompt is cancelled", async () => {
    vi.mocked(readLockFile).mockResolvedValueOnce(baseLockFile);
    vi.mocked(clack.select).mockResolvedValueOnce("sensible-defaults");
    const cancelSymbol = Symbol("cancel");
    vi.mocked(clack.multiselect).mockResolvedValueOnce(cancelSymbol);

    await runConfigure("/tmp/project");

    expect(clack.cancel).toHaveBeenCalled();
    expect(mockInstall).not.toHaveBeenCalled();
  });

  it("uses auto-detected harnesses as initial selection for harness prompt", async () => {
    const { detectHarnesses } = await import("@codemcp/ade-harnesses");
    vi.mocked(detectHarnesses).mockResolvedValueOnce(["cursor"]);
    vi.mocked(readLockFile).mockResolvedValueOnce(baseLockFile);
    vi.mocked(clack.select).mockResolvedValueOnce("sensible-defaults");
    vi.mocked(clack.multiselect).mockResolvedValueOnce(["cursor"]);

    await runConfigure("/tmp/project");

    expect(clack.multiselect).toHaveBeenCalledWith(
      expect.objectContaining({ initialValues: ["cursor"] })
    );
  });

  it("shows intro and outro", async () => {
    vi.mocked(readLockFile).mockResolvedValueOnce(baseLockFile);
    vi.mocked(clack.select).mockResolvedValueOnce("sensible-defaults");
    vi.mocked(clack.multiselect).mockResolvedValueOnce(["universal"]);

    await runConfigure("/tmp/project");

    expect(clack.intro).toHaveBeenCalled();
    expect(clack.outro).toHaveBeenCalled();
  });

  describe("skills", () => {
    it("always installs skills without prompting", async () => {
      vi.mocked(readLockFile).mockResolvedValueOnce({
        ...baseLockFile,
        logical_config: {
          ...baseLockFile.logical_config,
          skills: [{ name: "tdd", description: "TDD skill", body: "# TDD" }]
        }
      });
      vi.mocked(clack.select).mockResolvedValueOnce("sensible-defaults");
      vi.mocked(clack.multiselect).mockResolvedValueOnce(["universal"]);

      await runConfigure("/tmp/project");

      // No confirm prompt for skills
      expect(clack.confirm).not.toHaveBeenCalledWith(
        expect.objectContaining({ message: expect.stringContaining("skill") })
      );
      expect(mockInstallSkills).toHaveBeenCalled();
    });

    it("does not call installSkills when there are no skills", async () => {
      vi.mocked(readLockFile).mockResolvedValueOnce(baseLockFile); // skills: []
      vi.mocked(clack.select).mockResolvedValueOnce("sensible-defaults");
      vi.mocked(clack.multiselect).mockResolvedValueOnce(["universal"]);

      await runConfigure("/tmp/project");

      expect(mockInstallSkills).not.toHaveBeenCalled();
    });

    it("warns about locally modified skills but still installs all skills", async () => {
      mockWriteInlineSkills.mockResolvedValueOnce(["my-skill"]);
      vi.mocked(readLockFile).mockResolvedValueOnce({
        ...baseLockFile,
        logical_config: {
          ...baseLockFile.logical_config,
          skills: [
            { name: "my-skill", description: "A skill", body: "# Skill" }
          ]
        }
      });
      vi.mocked(clack.select).mockResolvedValueOnce("sensible-defaults");
      vi.mocked(clack.multiselect).mockResolvedValueOnce(["universal"]);

      await runConfigure("/tmp/project");

      expect(clack.log.warn).toHaveBeenCalledWith(
        expect.stringContaining("my-skill")
      );
      // Still installs — uses whatever is in .ade/skills/ (the user's local version)
      expect(mockInstallSkills).toHaveBeenCalled();
    });
  });

  describe("knowledge sources", () => {
    it("prompts to initialize knowledge sources when present", async () => {
      vi.mocked(readLockFile).mockResolvedValueOnce({
        ...baseLockFile,
        logical_config: {
          ...baseLockFile.logical_config,
          knowledge_sources: [
            {
              name: "conventional-commits-spec",
              origin: "https://github.com/example/repo.git",
              description: "Spec"
            }
          ]
        }
      });
      vi.mocked(clack.select).mockResolvedValueOnce("sensible-defaults");
      vi.mocked(clack.multiselect).mockResolvedValueOnce(["universal"]);
      vi.mocked(clack.confirm).mockResolvedValueOnce(true); // confirm init

      await runConfigure("/tmp/project");

      expect(clack.confirm).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining("knowledge source")
        })
      );
      expect(installKnowledge).toHaveBeenCalled();
    });

    it("skips knowledge init when user declines", async () => {
      vi.mocked(readLockFile).mockResolvedValueOnce({
        ...baseLockFile,
        logical_config: {
          ...baseLockFile.logical_config,
          knowledge_sources: [
            {
              name: "my-docs",
              origin: "https://github.com/example/docs.git",
              description: "Docs"
            }
          ]
        }
      });
      vi.mocked(clack.select).mockResolvedValueOnce("sensible-defaults");
      vi.mocked(clack.multiselect).mockResolvedValueOnce(["universal"]);
      vi.mocked(clack.confirm).mockResolvedValueOnce(false);

      await runConfigure("/tmp/project");

      expect(installKnowledge).not.toHaveBeenCalled();
      expect(clack.log.info).toHaveBeenCalledWith(
        expect.stringContaining("Initialize them when ready")
      );
    });
  });
});
