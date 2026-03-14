import { describe, it, expect } from "vitest";
import type { Facet, LogicalConfig } from "./types.js";

describe("types", () => {
  it("should allow creating a facet with multi-select", () => {
    const facet: Facet = {
      id: "frameworks",
      label: "Development Frameworks",
      description: "Which tech stacks the project uses",
      required: false,
      multiSelect: true,
      options: []
    };
    expect(facet.multiSelect).toBe(true);
  });

  it("should allow creating an empty logical config", () => {
    const config: LogicalConfig = {
      mcp_servers: [],
      instructions: [],
      cli_actions: [],
      knowledge_sources: []
    };
    expect(config.mcp_servers).toHaveLength(0);
  });
});
