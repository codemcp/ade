# ADE CLI — Design Document

## Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│                     CLI Layer                        │
│  ade init · ade apply · ade add · ade remove         │
└──────────────────────┬──────────────────────────────┘
                       │
              ┌────────▼────────┐
              │     Catalog     │  facets, options, recipes
              └────────┬────────┘
                       │
              ┌────────▼────────┐
              │    Resolver     │  config.yaml + catalog → provisions
              └────────┬────────┘
                       │
          ┌────────────▼────────────┐
          │   Provision Writers     │  each writer produces LogicalConfig
          │                         │  fragments; some invoke external CLIs
          │  workflows · skills     │
          │  knowledge · mcp-server │
          │  instruction · tool     │
          └────────────┬────────────┘
                       │ merge
              ┌────────▼────────┐
              │  LogicalConfig  │  agent-agnostic intermediate repr
              └────────┬────────┘
                       │
          ┌────────────▼────────────┐
          │     Agent Writers       │  ADE owns format knowledge
          │                         │
          │  claude-code · copilot  │
          │  kiro                   │
          └─────────────────────────┘
                       │
              agent-specific files
```

## Data Flow

### 1. Resolution: config.yaml → LogicalConfig

```
read config.yaml
  → for each choice, look up (facet, option) in catalog
  → collect all provisions from the selected option's recipe
  → merge extras from config.yaml
  → for each provision, invoke the corresponding provision writer
  → each writer returns a LogicalConfig fragment
  → merge all fragments into one LogicalConfig
  → write config.lock.yaml (serialized LogicalConfig)
```

### 2. Generation: LogicalConfig → agent files

```
read config.lock.yaml (or use in-memory LogicalConfig)
  → select agent writer based on config.yaml `agent` field
  → writer reads current agent files (if any) for merge/update
  → writer produces updated agent-specific files
  → write files to disk
```

### 3. CLI actions: provision writers that invoke CLIs

Some provisions (notably `skills` and `knowledge`) don't produce
LogicalConfig entries directly. Instead, they invoke external CLIs that
manage their own state. ADE orchestrates these invocations during `apply`.

```
provision {writer: "skills", config: {name: "design", version: "1.0"}}
  → ade invokes: npx @codemcp/skills install design@1.0
  → skills CLI manages its own files
  → no LogicalConfig entry produced (or a marker entry for tracking)

provision {writer: "knowledge", config: {name: "tanstack", source: "..."}}
  → ade invokes: knowledge CLI to install/update the docset
  → knowledge CLI manages .knowledge/ or equivalent
  → LogicalConfig gets a docsets entry for agent writer reference
```

## Entity Model

### Catalog Structure

```typescript
interface Catalog {
  facets: Facet[];
}

interface Facet {
  id: string;               // e.g. "workflow"
  label: string;            // e.g. "Workflow Framework"
  description: string;
  required: boolean;        // false = skippable
  options: Option[];
}

interface Option {
  id: string;               // e.g. "codemcp"
  label: string;            // e.g. "CodeMCP Workflows"
  description: string;
  recipe: Provision[];
}

interface Provision {
  writer: ProvisionWriter;
  config: Record<string, unknown>;  // writer-specific
}

type ProvisionWriter =
  | "workflows"
  | "skills"
  | "knowledge"
  | "mcp-server"
  | "instruction"
  | "tool";
```

### LogicalConfig (intermediate representation)

```typescript
interface LogicalConfig {
  mcp_servers: McpServerEntry[];
  instructions: string[];
  cli_actions: CliAction[];
  docsets: Docset[];
}

interface McpServerEntry {
  ref: string;            // unique key for dedup/update
  command: string;        // e.g. "npx"
  args: string[];         // e.g. ["-y", "@anthropic/workflows"]
  env: Record<string, string>;
}

interface CliAction {
  command: string;
  args: string[];
  phase: "setup" | "apply";  // when to run
}

interface Docset {
  path: string;
  description: string;
}
```

### Config Files

```typescript
// config.yaml — human-authored
interface UserConfig {
  agent: string;                           // agent writer id
  choices: Record<string, string>;         // facet_id → option_id
  extras?: {
    mcp_servers?: McpServerEntry[];
    instructions?: string[];
  };
}

// config.lock.yaml — generated
interface LockFile {
  version: 1;
  generated_at: string;                   // ISO timestamp
  agent: string;
  choices: Record<string, string>;        // snapshot of selections
  logical_config: LogicalConfig;
}
```

## Agent Writers

Each agent writer implements a single interface:

```typescript
interface AgentWriter {
  id: string;
  apply(config: LogicalConfig, projectRoot: string): Promise<void>;
}
```

The writer has full ownership of how to translate LogicalConfig into
agent-specific files. It reads existing files when needed to perform
incremental updates rather than full overwrites.

### Claude Code Writer

Produces:
- `.claude/settings.json` — MCP server declarations under
  `mcpServers` key. Each `McpServerEntry` maps to a server object with
  `command`, `args`, and `env`.
- `CLAUDE.md` — instructions block. Writer appends/replaces a clearly
  delimited ADE-managed section.

### Copilot Writer

Produces:
- `.vscode/settings.json` — MCP server declarations under
  `github.copilot.chat.mcpServers` or equivalent key.
- `copilot-instructions.md` or `.github/copilot-instructions.md` —
  ADE-managed instructions section.

### Kiro Writer

Produces:
- `.kiro/` steering files — MCP server declarations and instruction
  documents per Kiro's expected format.

## Provision Writers

Each provision writer transforms its config into LogicalConfig fragments
and/or CLI actions:

### `workflows` writer

```yaml
# provision config
config:
  package: "@anthropic/workflows"
  env:
    WORKFLOW_DIR: "./workflows"
```

Produces: one `McpServerEntry` with `command: "npx"`,
`args: ["-y", "@anthropic/workflows"]`, and the given env vars.

### `skills` writer

```yaml
config:
  name: "design"
  version: "1.0"
```

Produces: one `CliAction` to invoke the skills CLI. May also produce an
`McpServerEntry` if the skills MCP server needs to be registered.

### `knowledge` writer

```yaml
config:
  name: "tanstack"
  source: "https://tanstack.com/query/latest/docs"
```

Produces: one `CliAction` to invoke the knowledge CLI, plus a `Docset`
entry so agent writers can reference it in instructions.

### `mcp-server` writer

```yaml
config:
  ref: "my-server"
  command: "npx"
  args: ["-y", "@acme/mcp-server"]
  env:
    API_KEY: "${API_KEY}"
```

Pass-through: produces one `McpServerEntry` directly.

### `instruction` writer

```yaml
config:
  text: "Always use pnpm, never npm."
```

Produces: one `instructions` entry.

### `tool` writer

```yaml
config:
  command: "pnpm"
  check: "pnpm --version"
```

Produces: one `CliAction` for validation/installation.

## Package Structure

```
packages/
  shared/src/
    types.ts          # LogicalConfig, Provision, Facet, etc.
    config.ts         # read/write config.yaml and config.lock.yaml
  ade/src/
    commands/
      init.ts         # interactive setup
      apply.ts        # resolve + generate
      add.ts          # modify single facet
      remove.ts       # remove facet selection
      status.ts       # show current state
    core/
      resolver.ts     # config.yaml + catalog → provisions → LogicalConfig
      catalog.ts      # load and query the catalog
    adapters/
      writers/        # provision writers
        workflows.ts
        skills.ts
        knowledge.ts
        mcp-server.ts
        instruction.ts
        tool.ts
      agents/         # agent writers
        claude-code.ts
        copilot.ts
        kiro.ts
    tui/
      prompts.ts      # interactive facet selection UI
    utils/
  ade/catalog/
    facets.yaml       # the embedded catalog
```

## Open Questions

1. **Catalog versioning.** When the catalog updates (new facets, changed
   recipes), how does `ade apply` behave for existing config.yaml files?
   Initial approach: warn on unknown facets/options, apply what resolves.

2. **CLI delegation details.** The exact CLI interfaces for `@codemcp/skills`
   and the knowledge tool are not finalized. ADE will invoke them as
   subprocesses; the contract is their CLI flags, not internal APIs.

3. **Merge strategy for agent files.** When agent files contain user-authored
   content outside ADE-managed sections, writers must preserve it. Delimiter
   conventions (e.g. `<!-- ade:start -->`) need to be defined per agent.
