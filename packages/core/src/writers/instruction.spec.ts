import { describe, it, expect } from "vitest";
import { instructionWriter } from "./instruction.js";
import type { ResolutionContext } from "../types.js";

describe("instructionWriter", () => {
  const context: ResolutionContext = { resolved: {} };

  it("has id 'instruction'", () => {
    expect(instructionWriter.id).toBe("instruction");
  });

  it("returns the text wrapped in an instructions array", async () => {
    const result = await instructionWriter.write(
      { text: "Always use strict mode" },
      context
    );
    expect(result).toEqual({ instructions: ["Always use strict mode"] });
  });

  it("passes through the exact text without modification", async () => {
    const verbatim = "  leading spaces and trailing spaces  ";
    const result = await instructionWriter.write({ text: verbatim }, context);
    expect(result).toEqual({ instructions: [verbatim] });
  });

  it("only returns instructions, not other LogicalConfig keys", async () => {
    const result = await instructionWriter.write(
      { text: "some instruction" },
      context
    );
    expect(Object.keys(result)).toEqual(["instructions"]);
    expect(result).not.toHaveProperty("mcp_servers");
    expect(result).not.toHaveProperty("cli_actions");
    expect(result).not.toHaveProperty("knowledge_sources");
  });

  it("handles multi-line text correctly", async () => {
    const multiLine = "Line one\nLine two\nLine three";
    const result = await instructionWriter.write({ text: multiLine }, context);
    expect(result).toEqual({ instructions: [multiLine] });
  });
});
