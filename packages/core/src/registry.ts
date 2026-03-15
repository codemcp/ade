import type {
  WriterRegistry,
  ProvisionWriterDef,
  AgentWriterDef
} from "./types.js";
import { instructionWriter } from "./writers/instruction.js";
import { workflowsWriter } from "./writers/workflows.js";
import { claudeCodeWriter } from "./agents/claude-code.js";

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

  registerProvisionWriter(registry, instructionWriter);
  registerProvisionWriter(registry, workflowsWriter);

  // Stub writers for types not yet implemented
  for (const id of ["skills", "knowledge", "mcp-server", "installable"]) {
    registerProvisionWriter(registry, {
      id,
      write: async () => ({})
    });
  }

  registerAgentWriter(registry, claudeCodeWriter);

  return registry;
}
