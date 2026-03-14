# ADE CLI — Design Document

> **Scope.** This document covers the **ADE CLI** (`packages/ade`) — the
> setup and configuration tool. It does not cover the runtime MCP servers
> (`@codemcp/workflows-server`, `@codemcp/knowledge-server`) or the broader
> ADE information architecture. For the overall ADE vision, see the project
> README.

## Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│                     CLI Layer                        │
│  ade setup · ade install · ade add · ade remove       │
└──────────────────────┬──────────────────────────────┘
                       │
              ┌────────▼────────┐
              │     Catalog     │  facets, options, recipes (TypeScript)
              └────────┬────────┘
                       │
              ┌────────▼────────┐
              │    Resolver     │  config.yaml + catalog → provisions
              └────────┬────────┘
                       │
          ┌────────────▼────────────┐
          │   Provision Writers     │  each writer produces LogicalConfig
          │                         │  fragments; some call package APIs
          │  workflows · skills     │
          │  knowledge · mcp-server │
          │  instruction · install. │
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
  → topologically sort facets by dependsOn
  → for each facet (in dependency order):
      → look up (facet, selected option) in catalog
      → build ResolutionContext from already-resolved dependent facets
      → collect all provisions from the selected option's recipe
      → for each provision, invoke the writer with (config, context)
      → each writer returns a LogicalConfig fragment
      → record facet as resolved
  → merge custom section from config.yaml
  → merge all fragments into one LogicalConfig
  → write config.lock.yaml (serialized LogicalConfig)
```

### 2. Generation: LogicalConfig → agent files

```
read config.lock.yaml (or use in-memory LogicalConfig)
  → select agent writer (from --agent flag or auto-detect from project files)
  → writer reads current agent files (if any) for merge/update
  → writer produces updated agent-specific files
  → write files to disk
```

The target agent is a **generation-time parameter**, not stored in
`config.yaml`. This keeps the config agent-agnostic — the same choices
can produce output for any supported agent.

### 3. Package API calls from provision writers

Some provisions (notably `skills` and `knowledge`) delegate to sibling
packages. ADE imports them as TypeScript dependencies rather than shelling
out, giving type safety and avoiding CLI flag contracts.

```
provision {writer: "skills", config: {name: "design", version: "1.0"}}
  → import { install } from "@codemcp/skills"
  → install({name: "design", version: "1.0"})
  → skills package manages its own files
  → may return a LogicalConfig fragment (e.g. MCP server entry)

provision {writer: "knowledge", config: {name: "tanstack", origin: "https://..."}}
  → import { addSource } from "@codemcp/knowledge"
  → addSource({name: "tanstack", origin: "https://..."})
  → knowledge package manages docset artifacts
  → LogicalConfig gets a knowledge_sources entry
```

Where direct import is impractical (e.g. the dependency isn't TypeScript or
has incompatible runtimes), CLI subprocess invocation is the fallback.

## Entity Model

### Catalog Structure

The catalog is TypeScript code, not YAML. This gives us type safety, registry
patterns, and explicit references between options.

```typescript
interface Catalog {
  facets: Facet[];
}

interface Facet {
  id: string;               // e.g. "workflow"
  label: string;            // e.g. "Workflow Framework"
  description: string;
  required: boolean;        // false = skippable
  dependsOn?: string[];     // facet IDs this facet depends on
  options: Option[];
}

interface Option {
  id: string;               // e.g. "codemcp"
  label: string;            // e.g. "CodeMCP Workflows"
  description: string;
  recipe: Provision[];      // multiple provisions per option is common
}

// A recipe typically contains multiple provisions for different writers.
// Example: the "codemcp" workflow option produces:
//   1. workflows provision  → registers @codemcp/workflows-server as MCP server
//   2. instruction provision → adds workflow usage guidance to agent instructions
// This is how one logical concept materializes across different output channels.

interface Provision {
  writer: ProvisionWriter;
  config: Record<string, unknown>;  // writer-specific
}

// Passed to provision writers so they can adapt based on sibling selections.
// Only contains resolved options from facets declared in dependsOn.
interface ResolutionContext {
  resolved: Record<string, ResolvedFacet>;  // facet_id → resolved info
}

interface ResolvedFacet {
  optionId: string;
  option: Option;
}

type ProvisionWriter =
  | "workflows"
  | "skills"
  | "knowledge"
  | "mcp-server"
  | "instruction"
  | "installable";
```

### LogicalConfig (intermediate representation)

```typescript
interface LogicalConfig {
  mcp_servers: McpServerEntry[];
  instructions: string[];
  cli_actions: CliAction[];
  knowledge_sources: KnowledgeSource[];
}

interface McpServerEntry {
  ref: string;            // unique key for dedup/update
  command: string;        // e.g. "npx"
  args: string[];         // e.g. ["-y", "@codemcp/workflows-server"]
  env: Record<string, string>;
}

interface CliAction {
  command: string;
  args: string[];
  phase: "setup" | "install";  // when to run
}

interface KnowledgeSource {
  name: string;           // e.g. "tanstack"
  origin: string;         // URL, path, or package ref
  description: string;
}
```

### Config Files

```typescript
// config.yaml — mostly CLI-managed, agent-agnostic
interface UserConfig {
  choices: Record<string, string>;         // facet_id → option_id
  custom?: {                               // user-managed section
    mcp_servers?: McpServerEntry[];
    instructions?: string[];
  };
}

// config.lock.yaml — generated, never hand-edited
interface LockFile {
  version: 1;
  generated_at: string;                   // ISO timestamp
  choices: Record<string, string>;        // snapshot of selections
  logical_config: LogicalConfig;
}
```

## Agent Writers

Each agent writer implements a single interface:

```typescript
interface AgentWriter {
  id: string;
  install(config: LogicalConfig, projectRoot: string): Promise<void>;
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
and/or CLI actions. Writers receive an optional `ResolutionContext` containing
the resolved options from dependent facets, allowing them to adapt their
output based on sibling selections.

```typescript
type ProvisionWriterFn = (
  config: Record<string, unknown>,
  context: ResolutionContext
) => Promise<Partial<LogicalConfig>>;
```

### `workflows` writer

```typescript
// provision config
{ package: "@codemcp/workflows-server", env: { WORKFLOW_DIR: "./workflows" } }
```

Produces: one `McpServerEntry` with `command: "npx"`,
`args: ["-y", "@codemcp/workflows-server"]`, and the given env vars.

### `skills` writer

```typescript
{ name: "design", version: "1.0" }
```

Calls `@codemcp/skills` API to install. May also produce an `McpServerEntry`
if the skills MCP server needs to be registered.

### `knowledge` writer

```typescript
{ name: "tanstack", origin: "https://tanstack.com/query/latest/docs" }
```

Calls `@codemcp/knowledge` API to add the source. Produces a
`KnowledgeSource` entry so agent writers can reference it. The knowledge
package manages the physical docset artifacts; multiple sources may be
combined into one docset by `@codemcp/knowledge-server` at runtime.

### `mcp-server` writer

```typescript
{ ref: "my-server", command: "npx", args: ["-y", "@acme/mcp-server"], env: { API_KEY: "${API_KEY}" } }
```

Pass-through: produces one `McpServerEntry` directly.

### `instruction` writer

```typescript
{ text: "Always use pnpm, never npm." }
```

Produces: one `instructions` entry.

### `installable` writer

```typescript
{ command: "pnpm", check: "pnpm --version" }
```

Produces: one `CliAction` for validation/installation of a CLI tool or
dependency.

## Package Structure

```
packages/
  shared/src/
    types.ts              # LogicalConfig, Provision, Facet, etc.
    config.ts             # read/write config.yaml and config.lock.yaml
  ade/src/
    commands/
      setup.ts            # interactive TUI setup
      install.ts          # resolve + generate (idempotent)
      add.ts              # modify single facet
      remove.ts           # remove facet selection
      status.ts           # show current state
    core/
      resolver.ts         # config.yaml + catalog → provisions → LogicalConfig
    catalog/
      index.ts            # catalog registry, exports all facets
      facets/
        workflow.ts       # workflow facet definition
        testing.ts        # testing facet definition
        knowledge.ts      # knowledge/documentation facet definition
        ...
    adapters/
      writers/            # provision writers
        workflows.ts
        skills.ts
        knowledge.ts
        mcp-server.ts
        instruction.ts
        installable.ts
      agents/             # agent writers
        claude-code.ts
        copilot.ts
        kiro.ts
    tui/
      prompts.ts          # interactive facet selection UI
    utils/
```

## Decisions (formerly open questions)

1. **Catalog is TypeScript code.** No YAML catalog files. Facets, options,
   and recipes are defined as typed objects in `src/catalog/`. This gives
   type safety, IDE support, and natural versioning with the package.
   Each facet lives in its own file under `catalog/facets/`.

2. **Direct package imports over CLI subprocesses.** Provision writers for
   `skills` and `knowledge` import `@codemcp/skills` and `@codemcp/knowledge`
   as TypeScript dependencies and call their APIs. This provides type safety
   and avoids brittle CLI flag contracts. CLI subprocess invocation is the
   fallback for non-TypeScript or cross-runtime cases.

3. **`custom` section isolates user edits.** Only the `custom` block in
   `config.yaml` is user-managed. The rest is CLI-managed. This eliminates
   merge conflicts: the CLI never touches `custom`, and users never touch
   the rest. Agent writers merge both sections when generating output.
