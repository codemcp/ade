import { describe, it, expect } from "vitest";
import { allHarnessWriters, getHarnessWriter, getHarnessIds } from "./index.js";

describe("harness registry", () => {
  it("exports all harness writers", () => {
    expect(allHarnessWriters).toHaveLength(6);
    const ids = allHarnessWriters.map((w) => w.id);
    expect(ids).toContain("claude-code");
    expect(ids).toContain("cursor");
    expect(ids).toContain("copilot");
    expect(ids).toContain("windsurf");
    expect(ids).toContain("cline");
    expect(ids).toContain("roo-code");
  });

  it("looks up harness by id", () => {
    expect(getHarnessWriter("cursor")?.label).toBe("Cursor");
    expect(getHarnessWriter("nonexistent")).toBeUndefined();
  });

  it("returns all harness ids", () => {
    const ids = getHarnessIds();
    expect(ids).toEqual([
      "claude-code",
      "cursor",
      "copilot",
      "windsurf",
      "cline",
      "roo-code"
    ]);
  });

  it("all writers have label and description", () => {
    for (const w of allHarnessWriters) {
      expect(w.label).toBeTruthy();
      expect(w.description).toBeTruthy();
    }
  });
});
