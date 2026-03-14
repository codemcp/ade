import { describe, it, expect } from "vitest";
import { resolve } from "./resolver.js";
import { getDefaultCatalog } from "./catalog/index.js";
import { createRegistry, registerProvisionWriter } from "./registry.js";
import { instructionWriter } from "./writers/instruction.js";
import { workflowsWriter } from "./writers/workflows.js";
import type { UserConfig, WriterRegistry, Catalog } from "./types.js";

function buildRegistry(): WriterRegistry {
  const registry = createRegistry();
  registerProvisionWriter(registry, instructionWriter);
  registerProvisionWriter(registry, workflowsWriter);
  return registry;
}

describe("resolve", () => {
  let catalog: Catalog;
  let registry: WriterRegistry;

  beforeEach(() => {
    catalog = getDefaultCatalog();
    registry = buildRegistry();
  });

  describe("single-select resolution", () => {
    it("resolves codemcp-workflows to LogicalConfig with mcp_servers", async () => {
      const userConfig: UserConfig = {
        choices: { process: "codemcp-workflows" }
      };

      const result = await resolve(userConfig, catalog, registry);

      // workflows writer produces mcp_servers
      expect(result.mcp_servers).toBeDefined();
      expect(result.mcp_servers.length).toBeGreaterThanOrEqual(1);
      // Should have all LogicalConfig fields
      expect(result).toHaveProperty("instructions");
      expect(result).toHaveProperty("cli_actions");
      expect(result).toHaveProperty("knowledge_sources");
    });
  });

  describe("different option selection", () => {
    it("resolves native-agents-md to LogicalConfig with instructions but no mcp_servers", async () => {
      const userConfig: UserConfig = {
        choices: { process: "native-agents-md" }
      };

      const result = await resolve(userConfig, catalog, registry);

      // instruction writer produces instructions
      expect(result.instructions).toBeDefined();
      // native-agents-md has no workflows provision, so no mcp_servers
      expect(result.mcp_servers).toEqual([]);
    });
  });

  describe("empty choices", () => {
    it("returns an empty LogicalConfig when no choices are provided", async () => {
      const userConfig: UserConfig = {
        choices: {}
      };

      const result = await resolve(userConfig, catalog, registry);

      expect(result).toEqual({
        mcp_servers: [],
        instructions: [],
        cli_actions: [],
        knowledge_sources: []
      });
    });
  });

  describe("custom section merge", () => {
    it("merges custom instructions and mcp_servers into the output", async () => {
      const userConfig: UserConfig = {
        choices: {},
        custom: {
          instructions: ["Always use TypeScript strict mode"],
          mcp_servers: [
            {
              ref: "my-custom-server",
              command: "node",
              args: ["server.js"],
              env: {}
            }
          ]
        }
      };

      const result = await resolve(userConfig, catalog, registry);

      expect(result.instructions).toContain(
        "Always use TypeScript strict mode"
      );
      expect(result.mcp_servers).toContainEqual(
        expect.objectContaining({ ref: "my-custom-server" })
      );
    });

    it("merges custom section with recipe-produced config", async () => {
      const userConfig: UserConfig = {
        choices: { process: "codemcp-workflows" },
        custom: {
          instructions: ["Extra instruction"]
        }
      };

      const result = await resolve(userConfig, catalog, registry);

      // Should have both recipe mcp_servers and custom instructions
      expect(result.mcp_servers.length).toBeGreaterThanOrEqual(1);
      expect(result.instructions).toContain("Extra instruction");
    });
  });

  describe("unknown facet in choices", () => {
    it("ignores unknown facet ids without throwing", async () => {
      const userConfig: UserConfig = {
        choices: { "nonexistent-facet": "some-option" }
      };

      // Should not throw
      const result = await resolve(userConfig, catalog, registry);

      expect(result).toEqual({
        mcp_servers: [],
        instructions: [],
        cli_actions: [],
        knowledge_sources: []
      });
    });
  });

  describe("unknown option in choices", () => {
    it("throws when facet exists but option id does not", async () => {
      const userConfig: UserConfig = {
        choices: { process: "nonexistent-option" }
      };

      await expect(resolve(userConfig, catalog, registry)).rejects.toThrow();
    });
  });

  describe("MCP server dedup by ref", () => {
    it("deduplicates mcp_servers by ref, keeping the last one", async () => {
      // Create a custom registry with a writer that produces duplicate refs
      const dedupRegistry = createRegistry();
      registerProvisionWriter(dedupRegistry, {
        id: "workflows",
        async write() {
          return {
            mcp_servers: [
              {
                ref: "duplicate-server",
                command: "npx",
                args: ["-y", "pkg-a"],
                env: {}
              }
            ]
          };
        }
      });
      registerProvisionWriter(dedupRegistry, instructionWriter);

      // Also add a custom mcp_server with the same ref but different args
      const userConfig: UserConfig = {
        choices: { process: "codemcp-workflows" },
        custom: {
          mcp_servers: [
            {
              ref: "duplicate-server",
              command: "node",
              args: ["custom-server.js"],
              env: { CUSTOM: "true" }
            }
          ]
        }
      };

      const result = await resolve(userConfig, catalog, dedupRegistry);

      // Should only have one entry with ref "duplicate-server"
      const duplicates = result.mcp_servers.filter(
        (s) => s.ref === "duplicate-server"
      );
      expect(duplicates).toHaveLength(1);
      // Last one wins — the custom one should survive
      expect(duplicates[0].command).toBe("node");
      expect(duplicates[0].env).toEqual({ CUSTOM: "true" });
    });
  });
});
