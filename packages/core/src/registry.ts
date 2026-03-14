import type {
  WriterRegistry,
  ProvisionWriterDef,
  AgentWriterDef
} from "./types.js";

export function createRegistry(): WriterRegistry {
  return {
    provisions: new Map(),
    agents: new Map()
  };
}

export function registerProvisionWriter(
  registry: WriterRegistry,
  writer: ProvisionWriterDef
): void {
  registry.provisions.set(writer.id, writer);
}

export function getProvisionWriter(
  registry: WriterRegistry,
  id: string
): ProvisionWriterDef | undefined {
  return registry.provisions.get(id);
}

export function registerAgentWriter(
  registry: WriterRegistry,
  agent: AgentWriterDef
): void {
  registry.agents.set(agent.id, agent);
}

export function getAgentWriter(
  registry: WriterRegistry,
  id: string
): AgentWriterDef | undefined {
  return registry.agents.get(id);
}

export function createDefaultRegistry(): WriterRegistry {
  const registry = createRegistry();

  const provisionIds = [
    "workflows",
    "skills",
    "knowledge",
    "mcp-server",
    "instruction",
    "installable"
  ] as const;

  for (const id of provisionIds) {
    registerProvisionWriter(registry, {
      id,
      write: async () => ({})
    });
  }

  registerAgentWriter(registry, {
    id: "opencode",
    install: async () => {}
  });

  return registry;
}
