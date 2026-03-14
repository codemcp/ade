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

export interface LogicalConfig {
  mcp_servers: McpServerEntry[];
  instructions: string[];
  cli_actions: CliAction[];
  knowledge_sources: KnowledgeSource[];
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
