import { describe, it, expect } from "vitest";
import { knowledgeWriter } from "./knowledge.js";

describe("knowledgeWriter", () => {
  it("has id 'knowledge'", () => {
    expect(knowledgeWriter.id).toBe("knowledge");
  });

  it("produces a knowledge_sources entry from config", async () => {
    const result = await knowledgeWriter.write(
      {
        name: "react-docs",
        origin: "https://react.dev/reference",
        description: "Official React documentation"
      },
      { resolved: {} }
    );

    expect(result.knowledge_sources).toHaveLength(1);
    expect(result.knowledge_sources![0]).toEqual({
      name: "react-docs",
      origin: "https://react.dev/reference",
      description: "Official React documentation"
    });
  });
});
