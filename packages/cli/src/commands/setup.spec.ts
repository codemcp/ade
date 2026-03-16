import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Catalog, LogicalConfig } from "@ade/core";

// ── Mocks ────────────────────────────────────────────────────────────────────

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

vi.mock("@codemcp/skills/api", () => ({
  runAdd: vi.fn()
}));

vi.mock("@ade/core", async (importOriginal) => {
  const actual = (await importOriginal()) as typeof import("@ade/core");
  return {
    ...actual,
    writeUserConfig: vi.fn().mockResolvedValue(undefined),
    writeLockFile: vi.fn().mockResolvedValue(undefined),
    resolve: vi.fn().mockResolvedValue({
      mcp_servers: [],
      instructions: [],
      cli_actions: [],
      knowledge_sources: [],
      skills: []
    } satisfies LogicalConfig),
    getAgentWriter: vi.fn().mockReturnValue({
      id: "claude-code",
      install: vi.fn().mockResolvedValue(undefined)
    }),
    collectDocsets: actual.collectDocsets
  };
});

import * as clack from "@clack/prompts";
import { writeUserConfig, writeLockFile, resolve } from "@ade/core";
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
      skills: []
    };
    vi.mocked(resolve).mockResolvedValueOnce(mockLogical);
    vi.mocked(clack.select)
      .mockResolvedValueOnce("workflow-a")
      .mockResolvedValueOnce("vitest");

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
      // User accepts all docsets (returns all ids)
      vi.mocked(clack.multiselect).mockResolvedValueOnce([
        "react-docs",
        "react-tutorial"
      ]);

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
      // User deselects react-tutorial, keeps only react-docs
      vi.mocked(clack.multiselect).mockResolvedValueOnce(["react-docs"]);

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
      vi.mocked(clack.multiselect).mockResolvedValueOnce([
        "react-docs",
        "react-tutorial"
      ]);

      await runSetup("/tmp/test-project", docsetCatalog);

      const configArg = vi.mocked(writeUserConfig).mock.calls[0][1];
      expect(configArg.excluded_docsets).toBeUndefined();
    });

    it("skips docset prompt when no options have docsets", async () => {
      vi.mocked(clack.select)
        .mockResolvedValueOnce("workflow-a")
        .mockResolvedValueOnce("vitest");

      await runSetup("/tmp/test-project", testCatalog);

      // multiselect should NOT have been called (no docsets in testCatalog)
      expect(clack.multiselect).not.toHaveBeenCalled();
    });
  });

  it("calls intro and outro from @clack/prompts", async () => {
    vi.mocked(clack.select)
      .mockResolvedValueOnce("workflow-a")
      .mockResolvedValueOnce("vitest");

    await runSetup("/tmp/test-project", testCatalog);

    expect(clack.intro).toHaveBeenCalled();
    expect(clack.outro).toHaveBeenCalled();
  });
});
