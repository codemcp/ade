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
  | "installable";

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

export interface LogicalConfig {
  mcp_servers: McpServerEntry[];
  instructions: string[];
  cli_actions: CliAction[];
  knowledge_sources: KnowledgeSource[];
  skills: SkillDefinition[];
}

export interface McpServerEntry {
  ref: string;
  command: string;
  args: string[];
  env: Record<string, string>;
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
  custom?: {
    mcp_servers?: McpServerEntry[];
    instructions?: string[];
  };
}

export interface LockFile {
  version: 1;
  generated_at: string;
  choices: Record<string, string | string[]>;
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
