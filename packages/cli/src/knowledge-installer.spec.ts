import { describe, it, expect, vi, beforeEach } from "vitest";
import type { KnowledgeSource } from "@ade/core";

vi.mock("@codemcp/knowledge/packages/cli/dist/exports.js", () => ({
  createDocset: vi.fn().mockResolvedValue({
    docset: {},
    configPath: ".knowledge/config.yaml",
    configCreated: false
  }),
  initDocset: vi.fn().mockResolvedValue({ alreadyInitialized: false })
}));

import {
  createDocset,
  initDocset
} from "@codemcp/knowledge/packages/cli/dist/exports.js";
import { installKnowledge } from "./knowledge-installer.js";

describe("installKnowledge", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does nothing when knowledge_sources is empty", async () => {
    await installKnowledge([], "/tmp/project");

    expect(createDocset).not.toHaveBeenCalled();
    expect(initDocset).not.toHaveBeenCalled();
  });

  it("calls createDocset for each knowledge source", async () => {
    const sources: KnowledgeSource[] = [
      {
        name: "react-docs",
        origin: "https://github.com/facebook/react.git",
        description: "React documentation"
      },
      {
        name: "tanstack-query-docs",
        origin: "https://github.com/TanStack/query.git",
        description: "TanStack Query docs"
      }
    ];

    await installKnowledge(sources, "/tmp/project");

    expect(createDocset).toHaveBeenCalledTimes(2);
    expect(createDocset).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "react-docs",
        name: "React documentation",
        preset: "git-repo",
        url: "https://github.com/facebook/react.git"
      }),
      expect.objectContaining({ cwd: "/tmp/project" })
    );
  });

  it("calls initDocset for each knowledge source after creation", async () => {
    const sources: KnowledgeSource[] = [
      {
        name: "react-docs",
        origin: "https://github.com/facebook/react.git",
        description: "React documentation"
      }
    ];

    await installKnowledge(sources, "/tmp/project");

    expect(initDocset).toHaveBeenCalledTimes(1);
    expect(initDocset).toHaveBeenCalledWith(
      expect.objectContaining({
        docsetId: "react-docs",
        cwd: "/tmp/project"
      })
    );
  });

  it("continues with remaining sources when one fails", async () => {
    vi.mocked(createDocset)
      .mockRejectedValueOnce(new Error("already exists"))
      .mockResolvedValueOnce({
        docset: {},
        configPath: ".knowledge/config.yaml",
        configCreated: false
      });

    const sources: KnowledgeSource[] = [
      {
        name: "failing",
        origin: "https://github.com/fail/fail.git",
        description: "Will fail"
      },
      {
        name: "succeeding",
        origin: "https://github.com/ok/ok.git",
        description: "Will succeed"
      }
    ];

    await installKnowledge(sources, "/tmp/project");

    // Should have attempted both
    expect(createDocset).toHaveBeenCalledTimes(2);
    // initDocset only called for the successful one
    expect(initDocset).toHaveBeenCalledTimes(1);
    expect(initDocset).toHaveBeenCalledWith(
      expect.objectContaining({ docsetId: "succeeding" })
    );
  });
});
