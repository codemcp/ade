import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Catalog, LogicalConfig } from "@codemcp/ade-core";

// ── Mocks ────────────────────────────────────────────────────────────────────

vi.mock("@clack/prompts", () => ({
  intro: vi.fn(),
  outro: vi.fn(),
  note: vi.fn(),
  select: vi.fn(),
  multiselect: vi.fn(),
  confirm: vi.fn(),
  isCancel: vi.fn().mockReturnValue(false),
  cancel: vi.fn(),
  log: { warn: vi.fn(), info: vi.fn() },
  spinner: vi.fn().mockReturnValue({ start: vi.fn(), stop: vi.fn() })
}));

vi.mock("@codemcp/ade-core", async (importOriginal) => {
  const actual = (await importOriginal()) as typeof import("@codemcp/ade-core");
  return {
    ...actual,
    readUserConfig: vi.fn().mockResolvedValue(null),
    writeUserConfig: vi.fn().mockResolvedValue(undefined),
    writeLockFile: vi.fn().mockResolvedValue(undefined),
    resolve: vi.fn().mockResolvedValue({
      mcp_servers: [],
      instructions: [],
      cli_actions: [],
      knowledge_sources: [],
      skills: [],
      git_hooks: [],
      setup_notes: []
    } satisfies LogicalConfig),
    collectDocsets: actual.collectDocsets
  };
});

vi.mock("@codemcp/ade-harnesses", () => ({
  allHarnessWriters: [
    {
      id: "claude-code",
      label: "Claude Code",
      description: "test",
      install: vi.fn().mockResolvedValue(undefined)
    }
  ],
  getHarnessWriter: vi.fn().mockReturnValue({
    id: "claude-code",
    label: "Claude Code",
    description: "test",
    install: vi.fn().mockResolvedValue(undefined)
  }),
  getHarnessIds: vi.fn().mockReturnValue(["claude-code"]),
  installSkills: vi.fn().mockResolvedValue(undefined),
  writeInlineSkills: vi.fn().mockResolvedValue([])
}));

import * as clack from "@clack/prompts";
import {
  readUserConfig,
  writeUserConfig,
  writeLockFile,
  resolve
} from "@codemcp/ade-core";
import { runSetup } from "./setup.js";

// ── Test catalog fixture ─────────────────────────────────────────────────────

const testCatalog: Catalog = {
  facets: [
    {
      id: "process",
      label: "Process",
      description: "How your agent works",
      required: true,
      options: [
        {
          id: "workflow-a",
          label: "Workflow A",
          description: "First workflow option",
          recipe: []
        },
        {
          id: "workflow-b",
          label: "Workflow B",
          description: "Second workflow option",
          recipe: []
        }
      ]
    },
    {
      id: "testing",
      label: "Testing",
      description: "Testing strategy",
      required: false,
      options: [
        {
          id: "vitest",
          label: "Vitest",
          description: "Use vitest",
          recipe: []
        },
        {
          id: "jest",
          label: "Jest",
          description: "Use jest",
          recipe: []
        }
      ]
    }
  ]
};

const docsetCatalog: Catalog = {
  facets: [
    {
      id: "arch",
      label: "Architecture",
      description: "Stack",
      required: true,
      options: [
        {
          id: "react",
          label: "React",
          description: "React framework",
          recipe: [],
          docsets: [
            {
              id: "react-docs",
              label: "React Reference",
              origin: "https://github.com/facebook/react.git",
              description: "Official React docs"
            },
            {
              id: "react-tutorial",
              label: "React Tutorial",
              origin: "https://github.com/reactjs/react.dev.git",
              description: "React learn guide"
            }
          ]
        }
      ]
    }
  ]
};

// ── Tests ────────────────────────────────────────────────────────────────────

describe("runSetup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("prompts for each catalog facet and writes user config", async () => {
    // User selects "workflow-a" for process, "vitest" for testing
    vi.mocked(clack.select)
      .mockResolvedValueOnce("workflow-a")
      .mockResolvedValueOnce("vitest");
    // Harness multiselect
    vi.mocked(clack.multiselect).mockResolvedValueOnce(["claude-code"]);

    await runSetup("/tmp/test-project", testCatalog);

    // select() called once per facet
    expect(clack.select).toHaveBeenCalledTimes(2);

    // writeUserConfig called with collected choices
    expect(writeUserConfig).toHaveBeenCalledWith(
      "/tmp/test-project",
      expect.objectContaining({
        choices: { process: "workflow-a", testing: "vitest" }
      })
    );
  });

  it("resolves the config and writes the lock file", async () => {
    const mockLogical: LogicalConfig = {
      mcp_servers: [],
      instructions: ["do stuff"],
      cli_actions: [],
      knowledge_sources: [],
      skills: [],
      git_hooks: [],
      setup_notes: []
    };
    vi.mocked(resolve).mockResolvedValueOnce(mockLogical);
    vi.mocked(clack.select)
      .mockResolvedValueOnce("workflow-a")
      .mockResolvedValueOnce("vitest");
    vi.mocked(clack.multiselect).mockResolvedValueOnce(["claude-code"]);

    await runSetup("/tmp/test-project", testCatalog);

    // resolve() called with the user config, catalog, and a registry
    expect(resolve).toHaveBeenCalledOnce();
    const resolveArgs = vi.mocked(resolve).mock.calls[0];
    expect(resolveArgs[0]).toMatchObject({
      choices: { process: "workflow-a", testing: "vitest" }
    });

    // writeLockFile called with the resolved logical config
    expect(writeLockFile).toHaveBeenCalledWith(
      "/tmp/test-project",
      expect.objectContaining({
        version: 1,
        logical_config: mockLogical
      })
    );
  });

  it("excludes skipped facets from choices", async () => {
    // User selects workflow-a for process, skips testing (returns null sentinel)
    vi.mocked(clack.select)
      .mockResolvedValueOnce("workflow-a")
      .mockResolvedValueOnce("__skip__");
    vi.mocked(clack.multiselect).mockResolvedValueOnce(["claude-code"]);

    await runSetup("/tmp/test-project", testCatalog);

    expect(writeUserConfig).toHaveBeenCalledWith(
      "/tmp/test-project",
      expect.objectContaining({
        choices: { process: "workflow-a" }
      })
    );
  });

  it("aborts without writing files when user cancels", async () => {
    // First select returns a cancel symbol
    const cancelSymbol = Symbol("cancel");
    vi.mocked(clack.select).mockResolvedValueOnce(cancelSymbol);
    vi.mocked(clack.isCancel).mockReturnValue(true);

    await runSetup("/tmp/test-project", testCatalog);

    expect(writeUserConfig).not.toHaveBeenCalled();
    expect(writeLockFile).not.toHaveBeenCalled();
    expect(clack.cancel).toHaveBeenCalled();
  });

  describe("docset confirmation step", () => {
    it("presents implied docsets as a multiselect after facet selection", async () => {
      vi.mocked(clack.select).mockResolvedValueOnce("react");
      // User accepts all docsets (returns all ids), then harness selection
      vi.mocked(clack.multiselect)
        .mockResolvedValueOnce(["react-docs", "react-tutorial"])
        .mockResolvedValueOnce(["claude-code"]);

      await runSetup("/tmp/test-project", docsetCatalog);

      // multiselect should have been called for docsets
      expect(clack.multiselect).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining("Documentation")
        })
      );
    });

    it("stores deselected docsets as excluded_docsets in user config", async () => {
      vi.mocked(clack.select).mockResolvedValueOnce("react");
      // User deselects react-tutorial, keeps only react-docs; then harness
      vi.mocked(clack.multiselect)
        .mockResolvedValueOnce(["react-docs"])
        .mockResolvedValueOnce(["claude-code"]);

      await runSetup("/tmp/test-project", docsetCatalog);

      expect(writeUserConfig).toHaveBeenCalledWith(
        "/tmp/test-project",
        expect.objectContaining({
          excluded_docsets: ["react-tutorial"]
        })
      );
    });

    it("does not set excluded_docsets when all docsets are accepted", async () => {
      vi.mocked(clack.select).mockResolvedValueOnce("react");
      vi.mocked(clack.multiselect)
        .mockResolvedValueOnce(["react-docs", "react-tutorial"])
        .mockResolvedValueOnce(["claude-code"]);

      await runSetup("/tmp/test-project", docsetCatalog);

      const configArg = vi.mocked(writeUserConfig).mock.calls[0][1];
      expect(configArg.excluded_docsets).toBeUndefined();
    });

    it("skips docset prompt when no options have docsets", async () => {
      vi.mocked(clack.select)
        .mockResolvedValueOnce("workflow-a")
        .mockResolvedValueOnce("vitest");
      // Only the harness multiselect should be called (no docsets in testCatalog)
      vi.mocked(clack.multiselect).mockResolvedValueOnce(["claude-code"]);

      await runSetup("/tmp/test-project", testCatalog);

      // multiselect should have been called exactly once (for harnesses only)
      expect(clack.multiselect).toHaveBeenCalledTimes(1);
      expect(clack.multiselect).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining("coding agents")
        })
      );
    });
  });

  it("calls intro and outro from @clack/prompts", async () => {
    vi.mocked(clack.select)
      .mockResolvedValueOnce("workflow-a")
      .mockResolvedValueOnce("vitest");
    vi.mocked(clack.multiselect).mockResolvedValueOnce(["claude-code"]);

    await runSetup("/tmp/test-project", testCatalog);

    expect(clack.intro).toHaveBeenCalled();
    expect(clack.outro).toHaveBeenCalled();
  });

  it("displays each setup note via clack.log.info", async () => {
    const mockLogical: LogicalConfig = {
      mcp_servers: [],
      instructions: [],
      cli_actions: [],
      knowledge_sources: [],
      skills: [],
      git_hooks: [],
      setup_notes: ["Add lint script to package.json", "Run npm install"]
    };
    vi.mocked(resolve).mockResolvedValueOnce(mockLogical);
    vi.mocked(clack.select)
      .mockResolvedValueOnce("workflow-a")
      .mockResolvedValueOnce("vitest");
    vi.mocked(clack.multiselect).mockResolvedValueOnce(["claude-code"]);

    await runSetup("/tmp/test-project", testCatalog);

    expect(clack.log.info).toHaveBeenCalledWith(
      "Add lint script to package.json"
    );
    expect(clack.log.info).toHaveBeenCalledWith("Run npm install");
  });

  describe("re-run with existing config", () => {
    it("passes existing single-select choice as initialValue", async () => {
      vi.mocked(readUserConfig).mockResolvedValueOnce({
        choices: { process: "workflow-b", testing: "jest" }
      });

      vi.mocked(clack.select)
        .mockResolvedValueOnce("workflow-b")
        .mockResolvedValueOnce("jest");
      vi.mocked(clack.multiselect).mockResolvedValueOnce(["claude-code"]);

      await runSetup("/tmp/test-project", testCatalog);

      // First select (process) should receive initialValue "workflow-b"
      expect(clack.select).toHaveBeenCalledWith(
        expect.objectContaining({ initialValue: "workflow-b" })
      );
      // Second select (testing) should receive initialValue "jest"
      expect(clack.select).toHaveBeenCalledWith(
        expect.objectContaining({ initialValue: "jest" })
      );
    });

    it("passes existing multi-select choices as initialValues", async () => {
      const multiCatalog: Catalog = {
        facets: [
          {
            id: "practices",
            label: "Practices",
            description: "Dev practices",
            required: false,
            multiSelect: true,
            options: [
              {
                id: "tdd",
                label: "TDD",
                description: "Test-driven dev",
                recipe: []
              },
              {
                id: "adr",
                label: "ADR",
                description: "Architecture decisions",
                recipe: []
              }
            ]
          }
        ]
      };

      vi.mocked(readUserConfig).mockResolvedValueOnce({
        choices: { practices: ["tdd", "adr"] }
      });

      vi.mocked(clack.multiselect)
        .mockResolvedValueOnce(["tdd", "adr"])
        .mockResolvedValueOnce(["claude-code"]);

      await runSetup("/tmp/test-project", multiCatalog);

      expect(clack.multiselect).toHaveBeenCalledWith(
        expect.objectContaining({ initialValues: ["tdd", "adr"] })
      );
    });

    it("warns when existing choice references a stale option", async () => {
      vi.mocked(readUserConfig).mockResolvedValueOnce({
        choices: { process: "workflow-a", testing: "mocha" } // "mocha" doesn't exist
      });

      vi.mocked(clack.select)
        .mockResolvedValueOnce("workflow-a")
        .mockResolvedValueOnce("vitest");
      vi.mocked(clack.multiselect).mockResolvedValueOnce(["claude-code"]);

      await runSetup("/tmp/test-project", testCatalog);

      expect(clack.log.warn).toHaveBeenCalledWith(
        expect.stringContaining("mocha")
      );
    });

    it("does not set initialValue for stale option", async () => {
      vi.mocked(readUserConfig).mockResolvedValueOnce({
        choices: { process: "deleted-option" }
      });

      vi.mocked(clack.select)
        .mockResolvedValueOnce("workflow-a")
        .mockResolvedValueOnce("vitest");
      vi.mocked(clack.multiselect).mockResolvedValueOnce(["claude-code"]);

      await runSetup("/tmp/test-project", testCatalog);

      // First select (process) should NOT have initialValue set
      const firstCall = vi.mocked(clack.select).mock.calls[0][0];
      expect(firstCall).not.toHaveProperty("initialValue");
    });
  });
});
