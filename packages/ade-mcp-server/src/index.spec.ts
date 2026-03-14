import { describe, it, expect } from "vitest";
import { name } from "./index.js";

describe("ade-mcp-server", () => {
  it("should export a name", () => {
    expect(name).toBe("@ade/mcp-server");
  });
});
