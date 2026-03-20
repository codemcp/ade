import { describe, it, expect } from "vitest";
import { docsetWriter } from "./docset.js";

describe("docsetWriter", () => {
  it("has id 'docset'", () => {
    expect(docsetWriter.id).toBe("docset");
  });

  it("produces a knowledge_sources entry from config", async () => {
    const result = await docsetWriter.write(
      {
        id: "tanstack-router-docs",
        label: "TanStack Router",
        origin: "https://github.com/TanStack/router.git",
        description: "File-based routing, loaders, and search params"
      },
      { resolved: {} }
    );

    expect(result.knowledge_sources).toHaveLength(1);
    expect(result.knowledge_sources![0]).toEqual({
      name: "tanstack-router-docs",
      origin: "https://github.com/TanStack/router.git",
      description: "File-based routing, loaders, and search params"
    });
  });

  it("uses label as fallback when description is absent", async () => {
    const result = await docsetWriter.write(
      {
        id: "some-docs",
        label: "Some Docs",
        origin: "https://github.com/example/some-docs.git"
      },
      { resolved: {} }
    );

    expect(result.knowledge_sources![0].description).toBe("Some Docs");
  });
});
