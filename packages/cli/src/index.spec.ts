import { describe, it, expect } from "vitest";
import { version } from "./version.js";

describe("ade cli", () => {
  it("should export a version", () => {
    expect(version).toBeDefined();
  });
});
