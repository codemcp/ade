import { describe, it, expect } from "vitest";
import {
  allHarnessWriters,
  getHarnessWriter,
  getHarnessIds,
  buildHarnessWriters
} from "./index.js";
import type { HarnessWriter } from "./types.js";

describe("harness registry", () => {
  it("exports all harness writers", () => {
    expect(allHarnessWriters).toHaveLength(9);
    const ids = allHarnessWriters.map((w) => w.id);
    expect(ids).toContain("universal");
    expect(ids).toContain("claude-code");
    expect(ids).toContain("cursor");
    expect(ids).toContain("copilot");
    expect(ids).toContain("windsurf");
    expect(ids).toContain("cline");
    expect(ids).toContain("roo-code");
    expect(ids).toContain("kiro");
    expect(ids).toContain("opencode");
  });

  it("looks up harness by id", () => {
    expect(getHarnessWriter("cursor")?.label).toBe("Cursor");
    expect(getHarnessWriter("nonexistent")).toBeUndefined();
  });

  it("returns all harness ids, verified ones first", () => {
    const ids = getHarnessIds();
    expect(ids).toEqual([
      "universal",
      "copilot",
      "kiro",
      "opencode",
      "claude-code",
      "cursor",
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

describe("buildHarnessWriters", () => {
  it("returns all built-in writers when no extensions provided", () => {
    const writers = buildHarnessWriters({});
    expect(writers).toHaveLength(allHarnessWriters.length);
    expect(writers.map((w) => w.id)).toEqual(
      allHarnessWriters.map((w) => w.id)
    );
  });

  it("appends extension harness writers after built-ins", () => {
    const customWriter: HarnessWriter = {
      id: "sap-copilot",
      label: "SAP Copilot",
      description: "SAP internal Copilot harness",
      verified: false,
      detect: async () => false,
      install: async () => {}
    };

    const writers = buildHarnessWriters({ harnessWriters: [customWriter] });
    expect(writers).toHaveLength(allHarnessWriters.length + 1);
    expect(writers.map((w) => w.id)).toContain("sap-copilot");
    // built-ins come first
    expect(writers[0].id).toBe("universal");
    expect(writers[writers.length - 1].id).toBe("sap-copilot");
  });

  it("does not mutate allHarnessWriters", () => {
    const originalLength = allHarnessWriters.length;
    buildHarnessWriters({
      harnessWriters: [
        {
          id: "ephemeral",
          label: "Ephemeral",
          description: "Should not persist",
          verified: false,
          detect: async () => false,
          install: async () => {}
        }
      ]
    });
    expect(allHarnessWriters).toHaveLength(originalLength);
  });
});
