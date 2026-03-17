import { describe, it, expect } from "vitest";
import { resolve, collectDocsets } from "./resolver.js";
import { getDefaultCatalog } from "./catalog/index.js";
import { createRegistry, registerProvisionWriter } from "./registry.js";
import { instructionWriter } from "./writers/instruction.js";
import { workflowsWriter } from "./writers/workflows.js";
import { skillsWriter } from "./writers/skills.js";
import type { UserConfig, WriterRegistry, Catalog } from "./types.js";

function buildRegistry(): WriterRegistry {
  const registry = createRegistry();
  registerProvisionWriter(registry, instructionWriter);
  registerProvisionWriter(registry, workflowsWriter);
  registerProvisionWriter(registry, skillsWriter);
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
        knowledge_sources: [],
        skills: []
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
        knowledge_sources: [],
        skills: []
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

  describe("skills merging", () => {
    it("merges skills from provision writers into the output", async () => {
      // Use a custom catalog with a facet that produces skills
      const skillsCatalog: Catalog = {
        facets: [
          {
            id: "conventions",
            label: "Conventions",
            description: "Team conventions",
            required: false,
            options: [
              {
                id: "test-conv",
                label: "Test Convention",
                description: "A test convention with skills",
                recipe: [
                  {
                    writer: "skills",
                    config: {
                      skills: [
                        {
                          name: "test-skill",
                          description: "A test skill",
                          body: "Do the thing."
                        }
                      ]
                    }
                  }
                ]
              }
            ]
          }
        ]
      };

      const userConfig: UserConfig = {
        choices: { conventions: "test-conv" }
      };

      const result = await resolve(userConfig, skillsCatalog, registry);

      expect(result.skills).toHaveLength(1);
      expect(result.skills[0].name).toBe("test-skill");
    });
  });

  describe("docset collection", () => {
    it("collects docsets from selected options into knowledge_sources", async () => {
      const docsetCatalog: Catalog = {
        facets: [
          {
            id: "arch",
            label: "Architecture",
            description: "Stack",
            required: false,
            options: [
              {
                id: "react",
                label: "React",
                description: "React framework",
                recipe: [],
                docsets: [
                  {
                    id: "react-docs",
                    label: "React Reference",
                    origin: "https://github.com/facebook/react.git",
                    description: "Official React documentation"
                  }
                ]
              }
            ]
          }
        ]
      };

      const userConfig: UserConfig = { choices: { arch: "react" } };
      const result = await resolve(userConfig, docsetCatalog, registry);

      expect(result.knowledge_sources).toHaveLength(1);
      expect(result.knowledge_sources[0]).toEqual({
        name: "react-docs",
        origin: "https://github.com/facebook/react.git",
        description: "Official React documentation"
      });
    });

    it("deduplicates docsets by id across multiple options", async () => {
      const docsetCatalog: Catalog = {
        facets: [
          {
            id: "stack",
            label: "Stack",
            description: "Tech stack",
            required: false,
            multiSelect: true,
            options: [
              {
                id: "react",
                label: "React",
                description: "React",
                recipe: [],
                docsets: [
                  {
                    id: "react-docs",
                    label: "React Reference",
                    origin: "https://github.com/facebook/react.git",
                    description: "React docs"
                  }
                ]
              },
              {
                id: "nextjs",
                label: "Next.js",
                description: "Next.js",
                recipe: [],
                docsets: [
                  {
                    id: "react-docs",
                    label: "React Reference",
                    origin: "https://github.com/facebook/react.git",
                    description: "React docs"
                  },
                  {
                    id: "nextjs-docs",
                    label: "Next.js Docs",
                    origin: "https://nextjs.org/docs",
                    description: "Next.js docs"
                  }
                ]
              }
            ]
          }
        ]
      };

      const userConfig: UserConfig = {
        choices: { stack: ["react", "nextjs"] }
      };
      const result = await resolve(userConfig, docsetCatalog, registry);

      expect(result.knowledge_sources).toHaveLength(2);
      const ids = result.knowledge_sources.map((ks) => ks.name);
      expect(ids).toContain("react-docs");
      expect(ids).toContain("nextjs-docs");
    });

    it("filters out excluded_docsets", async () => {
      const docsetCatalog: Catalog = {
        facets: [
          {
            id: "arch",
            label: "Architecture",
            description: "Stack",
            required: false,
            options: [
              {
                id: "react",
                label: "React",
                description: "React",
                recipe: [],
                docsets: [
                  {
                    id: "react-docs",
                    label: "React Reference",
                    origin: "https://github.com/facebook/react.git",
                    description: "React docs"
                  },
                  {
                    id: "react-tutorial",
                    label: "React Tutorial",
                    origin: "https://github.com/reactjs/react.dev.git",
                    description: "React tutorial"
                  }
                ]
              }
            ]
          }
        ]
      };

      const userConfig: UserConfig = {
        choices: { arch: "react" },
        excluded_docsets: ["react-tutorial"]
      };
      const result = await resolve(userConfig, docsetCatalog, registry);

      expect(result.knowledge_sources).toHaveLength(1);
      expect(result.knowledge_sources[0].name).toBe("react-docs");
    });

    it("adds knowledge-server MCP entry when knowledge_sources are present", async () => {
      const docsetCatalog: Catalog = {
        facets: [
          {
            id: "arch",
            label: "Architecture",
            description: "Stack",
            required: false,
            options: [
              {
                id: "react",
                label: "React",
                description: "React",
                recipe: [],
                docsets: [
                  {
                    id: "react-docs",
                    label: "React Reference",
                    origin: "https://github.com/facebook/react.git",
                    description: "React docs"
                  }
                ]
              }
            ]
          }
        ]
      };

      const userConfig: UserConfig = { choices: { arch: "react" } };
      const result = await resolve(userConfig, docsetCatalog, registry);

      const knowledgeServer = result.mcp_servers.find(
        (s) => s.ref === "knowledge"
      );
      expect(knowledgeServer).toBeDefined();
      expect(knowledgeServer!.command).toBe("npx");
      expect(knowledgeServer!.args).toContain("@codemcp/knowledge-server");
    });

    it("does not add knowledge-server MCP entry when no knowledge_sources", async () => {
      const userConfig: UserConfig = {
        choices: { process: "native-agents-md" }
      };
      const result = await resolve(userConfig, catalog, registry);

      const knowledgeServer = result.mcp_servers.find(
        (s) => s.ref === "knowledge"
      );
      expect(knowledgeServer).toBeUndefined();
    });

    it("produces no knowledge_sources when option has no docsets", async () => {
      const userConfig: UserConfig = {
        choices: { process: "native-agents-md" }
      };
      const result = await resolve(userConfig, catalog, registry);

      expect(result.knowledge_sources).toEqual([]);
    });
  });

  describe("collectDocsets", () => {
    it("returns deduplicated docsets for given choices", () => {
      const docsetCatalog: Catalog = {
        facets: [
          {
            id: "stack",
            label: "Stack",
            description: "Stack",
            required: false,
            multiSelect: true,
            options: [
              {
                id: "a",
                label: "A",
                description: "A",
                recipe: [],
                docsets: [
                  {
                    id: "shared",
                    label: "Shared",
                    origin: "https://x",
                    description: "shared"
                  },
                  {
                    id: "a-only",
                    label: "A Only",
                    origin: "https://a",
                    description: "a"
                  }
                ]
              },
              {
                id: "b",
                label: "B",
                description: "B",
                recipe: [],
                docsets: [
                  {
                    id: "shared",
                    label: "Shared",
                    origin: "https://x",
                    description: "shared"
                  },
                  {
                    id: "b-only",
                    label: "B Only",
                    origin: "https://b",
                    description: "b"
                  }
                ]
              }
            ]
          }
        ]
      };

      const result = collectDocsets({ stack: ["a", "b"] }, docsetCatalog);

      expect(result).toHaveLength(3);
      const ids = result.map((d) => d.id);
      expect(ids).toContain("shared");
      expect(ids).toContain("a-only");
      expect(ids).toContain("b-only");
    });

    it("returns empty array when no options have docsets", () => {
      const result = collectDocsets({ process: "native-agents-md" }, catalog);
      expect(result).toEqual([]);
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
