import type {
  UserConfig,
  Catalog,
  WriterRegistry,
  LogicalConfig,
  McpServerEntry,
  ResolutionContext,
  DocsetDef,
  Provision,
  PermissionPolicy
} from "./types.js";
import { getFacet, getOption } from "./catalog/index.js";
import { getProvisionWriter } from "./registry.js";
import { permissionPolicyWriter } from "./writers/permission-policy.js";

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
    skills: [],
    git_hooks: [],
    setup_notes: []
  };

  const context: ResolutionContext = { resolved: {} };

  for (const [facetId, optionId] of Object.entries(userConfig.choices)) {
    const facet = getFacet(catalog, facetId);
    if (!facet) {
      continue;
    }

    const selectedIds = Array.isArray(optionId) ? optionId : [optionId];

    for (const selectedId of selectedIds) {
      const option = getOption(facet, selectedId);
      if (!option) {
        throw new Error(
          `Unknown option "${selectedId}" for facet "${facetId}"`
        );
      }

      context.resolved[facetId] = { optionId: selectedId, option };

      for (const provision of option.recipe) {
        const writer =
          getProvisionWriter(registry, provision.writer) ??
          getBuiltInProvisionWriter(provision);
        if (!writer) {
          continue;
        }
        const partial = await writer.write(provision.config, context);
        mergeLogicalConfig(result, partial);
      }
    }
  }

  // Collect docsets from all selected options, dedup by id, filter exclusions
  const seenDocsets = new Map<string, DocsetDef>();
  for (const [facetId, optionId] of Object.entries(userConfig.choices)) {
    const facet = getFacet(catalog, facetId);
    if (!facet) continue;
    const selectedIds = Array.isArray(optionId) ? optionId : [optionId];
    for (const selectedId of selectedIds) {
      const option = getOption(facet, selectedId);
      if (!option?.docsets) continue;
      for (const docset of option.docsets) {
        if (!seenDocsets.has(docset.id)) {
          seenDocsets.set(docset.id, docset);
        }
      }
    }
  }

  const excludedSet = new Set(userConfig.excluded_docsets ?? []);
  for (const [id, docset] of seenDocsets) {
    if (excludedSet.has(id)) continue;
    result.knowledge_sources.push({
      name: docset.id,
      origin: docset.origin,
      description: docset.description
    });
  }

  // Add knowledge-server MCP entry if any knowledge_sources were collected
  if (result.knowledge_sources.length > 0) {
    result.mcp_servers.push({
      ref: "knowledge",
      command: "npx",
      args: ["-y", "@codemcp/knowledge-server"],
      env: {}
    });
  }

  // Add skills-server MCP entry if any skills were collected
  if (result.skills.length > 0) {
    result.mcp_servers.push({
      ref: "agentskills",
      command: "npx",
      args: ["-y", "@codemcp/skills-server"],
      env: {}
    });
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

  // Dedup skills: collect all names declared as replaced, dedup by name
  // (last-writer-wins), then filter out replaced ones.
  const replacedNames = new Set<string>();
  for (const skill of result.skills) {
    for (const r of skill.replaces ?? []) {
      replacedNames.add(r);
    }
  }
  const skillsByName = new Map<string, (typeof result.skills)[number]>();
  for (const skill of result.skills) {
    skillsByName.set(skill.name, skill);
  }
  result.skills = Array.from(skillsByName.values()).filter(
    (skill) => !replacedNames.has(skill.name)
  );

  return result;
}

function getBuiltInProvisionWriter(provision: Provision) {
  if (provision.writer === "permission-policy") {
    return permissionPolicyWriter;
  }

  return undefined;
}

function mergeLogicalConfig(
  result: LogicalConfig,
  partial: Partial<LogicalConfig>
): void {
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
  if (partial.git_hooks) {
    result.git_hooks.push(...partial.git_hooks);
  }
  if (partial.setup_notes) {
    result.setup_notes.push(...partial.setup_notes);
  }
  if (partial.permission_policy) {
    result.permission_policy = mergePermissionPolicy(
      result.permission_policy,
      partial.permission_policy
    );
  }
}

function mergePermissionPolicy(
  existing: PermissionPolicy | undefined,
  incoming: PermissionPolicy
): PermissionPolicy {
  if (!existing) {
    return incoming;
  }

  return {
    ...existing,
    ...incoming
  };
}

/**
 * Collect all unique docsets implied by the given choices.
 * Used by the TUI to present docsets for confirmation before resolution.
 */
export function collectDocsets(
  choices: Record<string, string | string[]>,
  catalog: Catalog
): DocsetDef[] {
  const seen = new Map<string, DocsetDef>();
  for (const [facetId, optionId] of Object.entries(choices)) {
    const facet = getFacet(catalog, facetId);
    if (!facet) continue;
    const selectedIds = Array.isArray(optionId) ? optionId : [optionId];
    for (const selectedId of selectedIds) {
      const option = getOption(facet, selectedId);
      if (!option?.docsets) continue;
      for (const docset of option.docsets) {
        if (!seen.has(docset.id)) {
          seen.set(docset.id, docset);
        }
      }
    }
  }
  return Array.from(seen.values());
}
