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
      → if facet has unmet dependencies (via `ade add`), prompt for them first
      → look up selected option(s) in catalog
        (single-select: one option; multi-select: list of options)
      → build ResolutionContext from already-resolved dependent facets
      → for each selected option, collect all provisions from its recipe
      → for each provision, invoke the writer with (config, context)
      → each writer returns a LogicalConfig fragment
      → record facet as resolved
  → merge custom section from config.yaml
  → merge all fragments into one LogicalConfig
  → write config.lock.yaml (serialized LogicalConfig)
```

For **multi-select facets**, each selected option's recipe is resolved
independently and their LogicalConfig fragments are merged. This means
selecting both `react` and `node-express` in the frameworks facet produces
the union of both recipes' provisions.

### 2. Generation: LogicalConfig → agent files

```
read config.lock.yaml (or use in-memory LogicalConfig)
  → select agent writer from --agent flag (no auto-detection)
  → writer reads current agent files (if any) for merge/update
  → writer produces updated agent-specific files
  → write files to disk
```

The target agent is a **generation-time parameter** (`--agent` flag),
not stored in `config.yaml`. There is no auto-detection. This keeps the
config agent-agnostic — the same choices can produce output for any
supported agent.

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
  id: string; // e.g. "process"
  label: string; // e.g. "Process Guidance"
  description: string;
  required: boolean; // false = skippable
  multiSelect?: boolean; // true = user can pick multiple options
  dependsOn?: string[]; // facet IDs this facet depends on
  options: Option[];
}

interface Option {
  id: string; // e.g. "codemcp"
  label: string; // e.g. "CodeMCP Workflows"
  description: string;
  recipe: Provision[]; // multiple provisions per option is common
}

// A recipe typically contains multiple provisions for different writers.
// Example: the "codemcp" workflow option produces:
//   1. workflows provision  → registers @codemcp/workflows-server as MCP server
//   2. instruction provision → adds workflow usage guidance to agent instructions
// This is how one logical concept materializes across different output channels.

interface Provision {
  writer: ProvisionWriter;
  config: Record<string, unknown>; // writer-specific
}

// Passed to provision writers so they can adapt based on sibling selections.
// Only contains resolved options from facets declared in dependsOn.
interface ResolutionContext {
  resolved: Record<string, ResolvedFacet>; // facet_id → resolved info
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
  ref: string; // unique key for dedup/update
  command: string; // e.g. "npx"
  args: string[]; // e.g. ["-y", "@codemcp/workflows-server"]
  env: Record<string, string>;
}

interface CliAction {
  command: string;
  args: string[];
  phase: "setup" | "install"; // when to run
}

interface KnowledgeSource {
  name: string; // e.g. "tanstack"
  origin: string; // URL, path, or package ref
  description: string;
}
```

### Config Files

```typescript
// config.yaml — mostly CLI-managed, agent-agnostic
interface UserConfig {
  choices: Record<string, string | string[]>; // single-select: string, multi-select: string[]
  custom?: {
    // user-managed section
    mcp_servers?: McpServerEntry[];
    instructions?: string[];
  };
}

// config.lock.yaml — generated, never hand-edited
interface LockFile {
  version: 1;
  generated_at: string; // ISO timestamp
  choices: Record<string, string>; // snapshot of selections
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

### OpenCode Writer (v1)

Produces agent-specific config files for OpenCode. Exact output format TBD
based on OpenCode's config specification.

Future agent writers: Claude Code, Copilot, Kiro.

### ADE-Managed Section Delimiters

Agent writers that produce markdown or text files (instructions, AGENTS.md,
etc.) use delimiters to mark ADE-managed sections. This allows the writer to
update its sections without clobbering user-authored content.

```markdown
<!-- ade:begin -->

(ADE-managed content — do not edit manually)
...

<!-- ade:end -->
```

For JSON config files (e.g. settings.json), the writer manages a top-level
key or object scope and merges with existing content.

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
{
  text: "Always use pnpm, never npm.";
}
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
        process.ts        # process guidance facet
        conventions.ts    # conventions/skills facet
        documentation.ts  # documentation facet
        frameworks.ts     # development frameworks facet (multi-select)
    adapters/
      writers/            # provision writers
        workflows.ts
        skills.ts
        knowledge.ts
        mcp-server.ts
        instruction.ts
        installable.ts
      agents/             # agent writers
        opencode.ts       # v1 agent writer
    tui/
      prompts.ts          # interactive facet selection UI
    utils/
```

## V1 Catalog (TypeScript)

Example of how the catalog is defined in code:

```typescript
// catalog/facets/process.ts
export const processFacet: Facet = {
  id: "process",
  label: "Process Guidance",
  description: "How the agent receives workflow and process instructions",
  required: false,
  options: [
    {
      id: "codemcp-workflows",
      label: "CodeMCP Workflows",
      description:
        "Structured EPCC workflows via @codemcp/workflows-server MCP",
      recipe: [
        {
          writer: "workflows",
          config: { package: "@codemcp/workflows-server" }
        },
        {
          writer: "instruction",
          config: { text: "Use the workflows MCP server..." }
        }
      ]
    },
    {
      id: "native-agents-md",
      label: "Native AGENTS.md",
      description: "Inline EPCC instructions in AGENTS.md, no MCP dependency",
      recipe: [
        {
          writer: "instruction",
          config: { text: "Follow the EPCC workflow..." }
        }
      ]
    }
  ]
};

// catalog/facets/frameworks.ts
export const frameworksFacet: Facet = {
  id: "frameworks",
  label: "Development Frameworks",
  description: "Which tech stacks the project uses",
  required: false,
  multiSelect: true,
  dependsOn: ["conventions"], // skills may vary by framework
  options: [
    {
      id: "react",
      label: "React",
      description: "React frontend framework",
      recipe: [
        {
          writer: "knowledge",
          config: { name: "react", origin: "https://react.dev/reference" }
        },
        {
          writer: "instruction",
          config: { text: "This project uses React..." }
        }
      ]
    }
    // ... vue, java-spring, node-express
  ]
};
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
