import { describe, it, expect, vi } from "vitest";
import {
  createRegistry,
  registerProvisionWriter,
  registerAgentWriter,
  getProvisionWriter,
  getAgentWriter,
  createDefaultRegistry
} from "./registry.js";
import type {
  ProvisionWriterDef,
  AgentWriterDef,
  LogicalConfig,
  ResolutionContext
} from "./types.js";

describe("registry", () => {
  describe("createRegistry", () => {
    it("returns a registry with empty provisions and agents maps", () => {
      const registry = createRegistry();
      expect(registry.provisions.size).toBe(0);
      expect(registry.agents.size).toBe(0);
    });
  });

  describe("registerProvisionWriter / getProvisionWriter", () => {
    it("registers a provision writer and retrieves it by id", async () => {
      const registry = createRegistry();

      const mockFragment: Partial<LogicalConfig> = {
        instructions: ["use typescript strict mode"]
      };

      const writer: ProvisionWriterDef = {
        id: "skills",
        write: vi.fn().mockResolvedValue(mockFragment)
      };

      registerProvisionWriter(registry, writer);

      const found = getProvisionWriter(registry, "skills");
      expect(found).toBeDefined();
      expect(found!.id).toBe("skills");

      // Behavioral: actually call write() and verify the result
      const context: ResolutionContext = { resolved: {} };
      const result = await found!.write({ lang: "ts" }, context);
      expect(result).toEqual(mockFragment);
      expect(writer.write).toHaveBeenCalledWith({ lang: "ts" }, context);
    });

    it("overwrites a writer when registering with the same id", async () => {
      const registry = createRegistry();

      const first: ProvisionWriterDef = {
        id: "workflows",
        write: vi.fn().mockResolvedValue({ instructions: ["first"] })
      };
      const second: ProvisionWriterDef = {
        id: "workflows",
        write: vi.fn().mockResolvedValue({ instructions: ["second"] })
      };

      registerProvisionWriter(registry, first);
      registerProvisionWriter(registry, second);

      const found = getProvisionWriter(registry, "workflows");
      const result = await found!.write({}, { resolved: {} });
      expect(result).toEqual({ instructions: ["second"] });
      expect(first.write).not.toHaveBeenCalled();
    });

    it("returns undefined for a non-existent provision writer", () => {
      const registry = createRegistry();
      const found = getProvisionWriter(registry, "does-not-exist");
      expect(found).toBeUndefined();
    });
  });

  describe("registerAgentWriter / getAgentWriter", () => {
    it("registers an agent writer and can call install()", async () => {
      const registry = createRegistry();

      const mockInstall = vi.fn().mockResolvedValue(undefined);
      const agent: AgentWriterDef = {
        id: "opencode",
        install: mockInstall
      };

      registerAgentWriter(registry, agent);

      const found = getAgentWriter(registry, "opencode");
      expect(found).toBeDefined();
      expect(found!.id).toBe("opencode");

      // Behavioral: call install() and verify it was invoked correctly
      const config: LogicalConfig = {
        mcp_servers: [],
        instructions: ["be helpful"],
        cli_actions: [],
        knowledge_sources: [],
        skills: [],
        git_hooks: []
      };
      await found!.install(config, "/tmp/my-project");
      expect(mockInstall).toHaveBeenCalledWith(config, "/tmp/my-project");
    });

    it("returns undefined for a non-existent agent writer", () => {
      const registry = createRegistry();
      const found = getAgentWriter(registry, "nope");
      expect(found).toBeUndefined();
    });
  });

  describe("createDefaultRegistry", () => {
    it("has all 7 built-in provision writer IDs registered", () => {
      const registry = createDefaultRegistry();
      const expectedIds = [
        "workflows",
        "skills",
        "knowledge",
        "mcp-server",
        "instruction",
        "installable",
        "git-hooks"
      ];
      for (const id of expectedIds) {
        expect(
          getProvisionWriter(registry, id),
          `expected provision writer "${id}" to be registered`
        ).toBeDefined();
      }
      expect(registry.provisions.size).toBe(7);
    });

    it("has no agent writers by default (moved to @ade/harnesses)", () => {
      const registry = createDefaultRegistry();
      expect(registry.agents.size).toBe(0);
    });
  });
});
