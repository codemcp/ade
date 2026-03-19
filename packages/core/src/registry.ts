import type {
  WriterRegistry,
  ProvisionWriterDef,
  AgentWriterDef
} from "./types.js";
import { instructionWriter } from "./writers/instruction.js";
import { workflowsWriter } from "./writers/workflows.js";
import { mcpServerWriter } from "./writers/mcp-server.js";
import { skillsWriter } from "./writers/skills.js";
import { knowledgeWriter } from "./writers/knowledge.js";
import { gitHooksWriter } from "./writers/git-hooks.js";
import { setupNoteWriter } from "./writers/setup-note.js";
import { permissionPolicyWriter } from "./writers/permission-policy.js";

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
  registerProvisionWriter(registry, mcpServerWriter);
  registerProvisionWriter(registry, skillsWriter);
  registerProvisionWriter(registry, knowledgeWriter);
  registerProvisionWriter(registry, gitHooksWriter);
  registerProvisionWriter(registry, setupNoteWriter);
  registerProvisionWriter(registry, permissionPolicyWriter);

  // Stub writers for types not yet implemented
  for (const id of ["installable"]) {
    registerProvisionWriter(registry, {
      id,
      write: async () => ({})
    });
  }

  return registry;
}
