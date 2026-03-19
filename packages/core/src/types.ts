import { z } from "zod";

// --- Catalog types ---

export interface Catalog {
  facets: Facet[];
}

export interface Facet {
  id: string;
  label: string;
  description: string;
  required: boolean;
  multiSelect?: boolean;
  dependsOn?: string[];
  options: Option[];
}

export interface Option {
  id: string;
  label: string;
  description: string;
  recipe: Provision[];
  docsets?: DocsetDef[];
  available?: (deps: Record<string, Option | undefined>) => boolean;
}

export interface DocsetDef {
  id: string;
  label: string;
  origin: string;
  description: string;
}

export interface Provision {
  writer: ProvisionWriter;
  config: Record<string, unknown>;
}

export type ProvisionWriter =
  | "workflows"
  | "skills"
  | "knowledge"
  | "mcp-server"
  | "instruction"
  | "installable"
  | "git-hooks"
  | "setup-note"
  | "permission-policy";

// --- LogicalConfig types ---

export interface InlineSkill {
  name: string;
  description: string;
  body: string;
}

export interface ExternalSkill {
  name: string;
  source: string;
}

export type SkillDefinition = InlineSkill | ExternalSkill;

export interface GitHook {
  phase: "pre-commit" | "pre-push";
  script: string;
}

export type AutonomyProfile = "rigid" | "sensible-defaults" | "max-autonomy";

export interface PermissionPolicy extends Record<string, unknown> {
  profile: AutonomyProfile;
}

export interface LogicalConfig extends Record<string, unknown> {
  mcp_servers: McpServerEntry[];
  instructions: string[];
  cli_actions: CliAction[];
  knowledge_sources: KnowledgeSource[];
  skills: SkillDefinition[];
  git_hooks: GitHook[];
  setup_notes: string[];
  permission_policy?: PermissionPolicy;
}

export interface McpServerEntry {
  ref: string;
  command: string;
  args: string[];
  env: Record<string, string>;
  /**
   * Tool names the agent is pre-approved to use from this server.
   * Defaults to `["*"]` (all tools) when not specified.
   */
  allowedTools?: string[];
}

export interface CliAction {
  command: string;
  args: string[];
  phase: "setup" | "install";
}

export interface KnowledgeSource {
  name: string;
  origin: string;
  description: string;
}

// --- Resolution context ---

export interface ResolutionContext {
  resolved: Record<string, ResolvedFacet>;
}

export interface ResolvedFacet {
  optionId: string;
  option: Option;
}

// --- Config file types ---

export interface UserConfig {
  choices: Record<string, string | string[]>;
  excluded_docsets?: string[];
  harnesses?: string[];
  custom?: {
    mcp_servers?: McpServerEntry[];
    instructions?: string[];
  };
}

export interface LockFile {
  version: 1;
  generated_at: string;
  choices: Record<string, string | string[]>;
  harnesses?: string[];
  logical_config: LogicalConfig;
}

// --- Writer contracts (open, any package can implement) ---

export interface ProvisionWriterDef {
  id: string;
  write(
    config: Record<string, unknown>,
    context: ResolutionContext
  ): Promise<Partial<LogicalConfig>>;
}

export interface AgentWriterDef {
  id: string;
  install(config: LogicalConfig, projectRoot: string): Promise<void>;
}

export interface WriterRegistry {
  provisions: Map<string, ProvisionWriterDef>;
  agents: Map<string, AgentWriterDef>;
}

// --- Extension types ---

/**
 * Runtime validation helpers for extension file loading.
 *
 * We use z.custom<T>() for Option, Facet, HarnessWriter and ProvisionWriterDef
 * because their TypeScript interfaces contain function types that Zod cannot
 * faithfully represent without losing the concrete signature. z.custom<T>
 * gives us the correct TS type while still letting us write a runtime check.
 */
const OptionSchema = z.custom<Option>(
  (val) =>
    typeof val === "object" &&
    val !== null &&
    typeof (val as Record<string, unknown>).id === "string" &&
    typeof (val as Record<string, unknown>).label === "string" &&
    typeof (val as Record<string, unknown>).description === "string" &&
    Array.isArray((val as Record<string, unknown>).recipe),
  { message: "Option must have id, label, description and recipe fields" }
);

const FacetSchema = z.custom<Facet>(
  (val) =>
    typeof val === "object" &&
    val !== null &&
    typeof (val as Record<string, unknown>).id === "string" &&
    typeof (val as Record<string, unknown>).label === "string" &&
    typeof (val as Record<string, unknown>).description === "string" &&
    typeof (val as Record<string, unknown>).required === "boolean" &&
    Array.isArray((val as Record<string, unknown>).options),
  { message: "Facet must have id, label, description, required and options" }
);

const HarnessWriterSchema = z.custom<
  AgentWriterDef & { label: string; description: string }
>(
  (val) =>
    typeof val === "object" &&
    val !== null &&
    typeof (val as Record<string, unknown>).id === "string" &&
    typeof (val as Record<string, unknown>).label === "string" &&
    typeof (val as Record<string, unknown>).description === "string" &&
    typeof (val as Record<string, unknown>).install === "function",
  { message: "HarnessWriter must have id, label, description and install()" }
);

const ProvisionWriterDefSchema = z.custom<ProvisionWriterDef>(
  (val) =>
    typeof val === "object" &&
    val !== null &&
    typeof (val as Record<string, unknown>).id === "string" &&
    typeof (val as Record<string, unknown>).write === "function",
  { message: "ProvisionWriterDef must have id and write()" }
);

export const AdeExtensionsSchema = z.object({
  /** Add new options to existing facets, keyed by facet id */
  facetContributions: z.record(z.string(), z.array(OptionSchema)).optional(),
  /** Add entirely new facets */
  facets: z.array(FacetSchema).optional(),
  /** Add new provision writers */
  provisionWriters: z.array(ProvisionWriterDefSchema).optional(),
  /** Add new harness writers */
  harnessWriters: z.array(HarnessWriterSchema).optional()
});

/** The shape of a consumer's `ade.extensions.mjs` default export. */
export type AdeExtensions = z.infer<typeof AdeExtensionsSchema>;
