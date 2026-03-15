import type {
  UserConfig,
  Catalog,
  WriterRegistry,
  LogicalConfig,
  McpServerEntry,
  ResolutionContext
} from "./types.js";
import { getFacet, getOption } from "./catalog/index.js";
import { getProvisionWriter } from "./registry.js";

export async function resolve(
  userConfig: UserConfig,
  catalog: Catalog,
  registry: WriterRegistry
): Promise<LogicalConfig> {
  const result: LogicalConfig = {
    mcp_servers: [],
    instructions: [],
    cli_actions: [],
    knowledge_sources: [],
    skills: []
  };

  const context: ResolutionContext = { resolved: {} };

  for (const [facetId, optionId] of Object.entries(userConfig.choices)) {
    const facet = getFacet(catalog, facetId);
    if (!facet) {
      continue;
    }

    const selectedId = Array.isArray(optionId) ? optionId[0] : optionId;
    const option = getOption(facet, selectedId);
    if (!option) {
      throw new Error(`Unknown option "${selectedId}" for facet "${facetId}"`);
    }

    context.resolved[facetId] = { optionId: selectedId, option };

    for (const provision of option.recipe) {
      const writer = getProvisionWriter(registry, provision.writer);
      if (!writer) {
        continue;
      }
      const partial = await writer.write(provision.config, context);
      if (partial.mcp_servers) {
        result.mcp_servers.push(...partial.mcp_servers);
      }
      if (partial.instructions) {
        result.instructions.push(...partial.instructions);
      }
      if (partial.cli_actions) {
        result.cli_actions.push(...partial.cli_actions);
      }
      if (partial.knowledge_sources) {
        result.knowledge_sources.push(...partial.knowledge_sources);
      }
      if (partial.skills) {
        result.skills.push(...partial.skills);
      }
    }
  }

  // Merge custom section
  if (userConfig.custom) {
    if (userConfig.custom.instructions) {
      result.instructions.push(...userConfig.custom.instructions);
    }
    if (userConfig.custom.mcp_servers) {
      result.mcp_servers.push(...userConfig.custom.mcp_servers);
    }
  }

  // Dedup mcp_servers by ref (last wins)
  const serversByRef = new Map<string, McpServerEntry>();
  for (const server of result.mcp_servers) {
    serversByRef.set(server.ref, server);
  }
  result.mcp_servers = Array.from(serversByRef.values());

  return result;
}
