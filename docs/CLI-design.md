# ADE CLI — Design Document

> **Scope.** This document covers the **ADE CLI** — the setup and
> configuration tool. It does not cover the runtime MCP servers
> (`@codemcp/workflows-server`, `@codemcp/knowledge-server`) or the broader
> ADE information architecture. For the overall ADE vision, see the project
> README.

## Package Structure

Two packages with clear responsibilities:

### `@ade/core` (`packages/core`)

All types, logic, and built-in writers. No CLI framework, no TUI, no user
interaction. Independently importable for programmatic use (CI scripts,
other tools).

```
core/src/
  types.ts              # all interfaces and type definitions
  config.ts             # read/write config.yaml and config.lock.yaml
  resolver.ts           # config + catalog → LogicalConfig
  registry.ts           # writer registry (provision + agent)
  catalog/
    index.ts            # catalog assembly, exports all facets
    facets/
      process.ts        # workflow delivery method
      architecture.ts   # stack-specific conventions (e.g. TanStack)
      practices.ts      # composable practices (commits, TDD, ADR)
  writers/              # built-in provision writers
    workflows.ts
    skills.ts
    knowledge.ts
    instruction.ts
  agents/               # built-in agent writers
    claude-code.ts      # AGENTS.md, .claude/settings.json, skill files
```

### `@ade/cli` (`packages/cli`)

Thin shell: CLI framework wiring and interactive TUI. All business logic
lives in core; CLI commands are thin handlers that parse args and delegate.

```
cli/src/
  index.ts                  # entry point, arg parser, command routing
  skills-installer.ts       # calls @codemcp/skills API to install skills
  knowledge-installer.ts    # calls @codemcp/knowledge API to install docsets
  commands/
    setup.ts                # interactive TUI setup
    install.ts              # resolve + generate (idempotent)
```

`@ade/cli` depends on `@ade/core`. Nothing depends on `@ade/cli`.

## Architecture Overview

```
┌──────────────────────────────────────────────────────────────┐
│  @ade/cli                                                     │
│  ade setup · ade install                                      │
│  TUI prompts · skills-installer · knowledge-installer         │
└──────────────────────────┬───────────────────────────────────┘
                           │ delegates to
┌──────────────────────────▼───────────────────────────────────┐
│  @ade/core                                                    │
│                                                               │
│  ┌──────────┐   ┌──────────┐   ┌────────────────────────┐    │
│  │ Catalog  │──▶│ Resolver │──▶│   Writer Registry      │    │
│  │ (facets) │   │          │   │                        │    │
│  └──────────┘   └────┬─────┘   │  provision: Map<id,W>  │    │
│                      │         │  agents:    Map<id,W>  │    │
│                      ▼         └───────────┬────────────┘    │
│               ┌──────────────┐             │                 │
│               │ LogicalConfig│◀────────────┘                 │
│               └──────┬───────┘   merge fragments             │
│                      │                                       │
│                      ▼                                       │
│               agent-specific files                           │
└──────────────────────────────────────────────────────────────┘
```

## Data Flow

### 1. Setup: TUI → config.yaml + config.lock.yaml + agent files

```
read existing config.yaml (if any) for default selections
  → walk facets interactively:
      → pre-select previous choice as default (if still valid)
      → warn if previous choice references a stale option
      → collect new user choices
  → collect docsets from all selected options
  → present docset confirmation (opt-out multiselect)
  → resolve choices + catalog → LogicalConfig
  → write config.yaml (user choices)
  → write config.lock.yaml (resolved LogicalConfig snapshot)
  → run agent writer (generate AGENTS.md, settings.json, etc.)
  → install skills via @codemcp/skills API
  → install knowledge via @codemcp/knowledge API
```

Resolution expands each selected option's recipe provisions into
LogicalConfig fragments, deduplicates docsets by id, filters by
`excluded_docsets`, maps enabled docsets to `knowledge_sources`, adds the
`@codemcp/knowledge-server` MCP entry if knowledge sources are present,
merges the custom section, and deduplicates MCP servers by ref.

For **multi-select facets**, each selected option's recipe is resolved
independently and their LogicalConfig fragments are merged.

### 2. Install: config.lock.yaml → agent files (idempotent)

```
read config.lock.yaml
  → select agent writer (default: claude-code)
  → apply logical_config from lock file (no re-resolution)
  → run agent writer
  → install skills
  → install knowledge
```

`ade install` does **not** re-resolve from `config.yaml`. It treats the
lock file as the source of truth, like `npm ci` treats `package-lock.json`.
To change selections, re-run `ade setup`.

The target agent is a **generation-time parameter** (`--agent` flag),
not stored in `config.yaml`. There is no auto-detection. This keeps the
config agent-agnostic — the same choices can produce output for any
supported agent.

### 3. Package API calls from CLI installers

Skills and knowledge installation delegates to sibling packages. ADE imports
them as TypeScript dependencies rather than shelling out, giving type safety
and avoiding CLI flag contracts.

```
skills-installer:
  → import { runAdd } from "@codemcp/skills/api"
  → for each skill: runAdd([source], { yes: true, all: true })
  → skills package writes SKILL.md files and skills-lock.json

knowledge-installer:
  → import { createDocset, initDocset }
      from "@codemcp/knowledge/packages/cli/dist/exports.js"
  → for each knowledge_source:
      createDocset({ id, name, preset: "git-repo", url: origin }, { cwd })
      initDocset({ docsetId: id, cwd })
  → knowledge package manages .knowledge/ directory and docset artifacts
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
  options: Option[];
}

interface Option {
  id: string; // e.g. "codemcp"
  label: string; // e.g. "CodeMCP Workflows"
  description: string;
  recipe: Provision[]; // multiple provisions per option is common
  docsets?: DocsetDef[]; // recommended documentation for this option
}

// Documentation as a weak entity on Option. Docsets are derived from
// upstream selections — picking "TanStack" in architecture implies
// TanStack docs, picking "GitHub Actions CI/CD" in practices implies
// GH Actions docs. The TUI presents all implied docsets as pre-selected
// defaults and allows the user to deselect. This is opt-out, not opt-in.
//
// The resolver collects docsets from all selected options, deduplicates
// by id, filters by excluded_docsets from UserConfig, and maps enabled
// docsets directly to knowledge_sources in LogicalConfig.
interface DocsetDef {
  id: string; // unique key for dedup, e.g. "tanstack-query-docs"
  label: string; // display name, e.g. "TanStack Query Reference"
  origin: string; // URL, path, or package ref
  description: string; // shown in TUI
}

// A recipe typically contains multiple provisions for different writers.
// Example: the "codemcp" workflow option produces:
//   1. workflows provision  → registers @codemcp/workflows-server as MCP server
//   2. instruction provision → adds workflow usage guidance to agent instructions
// This is how one logical concept materializes across different output channels.

interface Provision {
  writer: string; // references a registered ProvisionWriterDef.id
  config: Record<string, unknown>; // writer-specific, validated at boundary
}

// Passed to provision writers for future cross-facet context.
// Currently passed as { resolved: {} }.
interface ResolutionContext {
  resolved: Record<string, unknown>;
}
```

### LogicalConfig (intermediate representation)

```typescript
interface LogicalConfig {
  mcp_servers: McpServerEntry[];
  instructions: string[];
  skills: SkillDefinition[];
  knowledge_sources: KnowledgeSource[];
}

interface McpServerEntry {
  ref: string; // unique key for dedup/update
  command: string; // e.g. "npx"
  args: string[]; // e.g. ["-y", "@codemcp/workflows-server"]
  env: Record<string, string>;
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
  excluded_docsets?: string[]; // docset IDs the user opted out of
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

## Extensibility and Type Safety

### Design Tension

Provision and agent writers need two properties that pull in opposite
directions:

1. **Type safety** — built-in writers should have typed configs, not
   `Record<string, unknown>` everywhere.
2. **Runtime extensibility** — future packages must be able to register
   new writers without modifying core's source.

### Solution: Interfaces for Contracts, Registries for Dispatch

Writers are defined as **interfaces** (open contracts, implementable by
anyone) and collected in **runtime registries** (`Map`-based, open for
insertion). Built-in writers get typed configs internally while conforming
to the open interface at the boundary.

```typescript
// --- Writer contracts (open, any package can implement) ---

interface ProvisionWriterDef {
  id: string;
  write(
    config: Record<string, unknown>,
    context: ResolutionContext
  ): Promise<Partial<LogicalConfig>>;
}

interface AgentWriterDef {
  id: string;
  install(config: LogicalConfig, projectRoot: string): Promise<void>;
}

// --- Writer registry (open at runtime) ---

interface WriterRegistry {
  provisions: Map<string, ProvisionWriterDef>;
  agents: Map<string, AgentWriterDef>;
}
```

### How Built-In Writers Get Type Safety

Each built-in writer defines a typed config interface and validates/narrows
at the boundary. The registry doesn't care — it passes
`Record<string, unknown>` through. The writer narrows internally:

```typescript
// writers/workflows.ts
interface WorkflowsConfig {
  package: string;
  env?: Record<string, string>;
}

export const workflowsWriter: ProvisionWriterDef = {
  id: "workflows",
  async write(config, _context) {
    const c = config as WorkflowsConfig; // validated at boundary
    return {
      mcp_servers: [
        {
          ref: c.package,
          command: "npx",
          args: ["-y", c.package],
          env: c.env ?? {}
        }
      ]
    };
  }
};
```

The catalog definitions reference writers by string ID, not by import.
This is what makes the system open — a provision `{ writer: "my-custom", config: {...} }`
works as long as `"my-custom"` is registered before resolution runs.

### Registry Lifecycle

Core ships a `createDefaultRegistry()` that pre-registers all built-in
writers. The CLI calls this at startup. A future plugin would call
`registry.provisions.set("my-writer", myWriter)` before resolution.

```typescript
function createDefaultRegistry(): WriterRegistry {
  const registry = createRegistry();

  registerProvisionWriter(registry, instructionWriter);
  registerProvisionWriter(registry, workflowsWriter);
  registerProvisionWriter(registry, skillsWriter);
  registerProvisionWriter(registry, knowledgeWriter);

  registerAgentWriter(registry, claudeCodeWriter);

  return registry;
}
```

### Why Not Pure Functions + Discriminated Unions?

A discriminated union (`type Provision = { writer: "workflows", config: WorkflowsConfig } | ...`)
gives excellent compile-time safety but is a **closed set**. Adding a writer
from another package means modifying the union in core, which defeats
extensibility.

The interface-based registry trades compile-time exhaustiveness for runtime
openness. The `Provision.writer` field is `string`, not a union — the
registry validates at resolution time that the writer exists. Built-in
writers still get internal type safety via their own config interfaces.

### Built-In Provision Config Types

For reference, the typed configs used internally by built-in writers:

```typescript
interface WorkflowsConfig {
  package: string;
  ref?: string;
  env?: Record<string, string>;
}

interface SkillsConfig {
  skills: SkillDefinition[];
}

interface KnowledgeConfig {
  name: string;
  origin: string; // must be a valid .git URL
  description: string;
}

interface InstructionConfig {
  text: string;
}
```

These are not exported as part of the public contract. They are
implementation details of the built-in writers.

## Agent Writers

Each agent writer implements `AgentWriterDef`. The writer has full ownership
of how to translate LogicalConfig into agent-specific files. It reads
existing files when needed to perform incremental updates.

### Claude Code Writer (v1)

Produces agent-specific config files for Claude Code:

- **`AGENTS.md`** — ADE-managed section with resolved instructions
- **`.claude/settings.json`** — MCP server entries (merged with existing)
- **`.ade/skills/<name>/SKILL.md`** — Inline skill files (staging area for
  `@codemcp/skills` installation)

Future agent writers: OpenCode, Copilot, Kiro.

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

Each provision writer implements `ProvisionWriterDef`. Writers receive a
`ResolutionContext` containing the resolved options from dependent facets,
allowing them to adapt output based on sibling selections.

### `workflows` writer

```typescript
// provision config
{ package: "@codemcp/workflows-server", env: { WORKFLOW_DIR: "./workflows" } }
```

Produces: one `McpServerEntry` with `command: "npx"`,
`args: ["-y", "@codemcp/workflows-server"]`, and the given env vars.

### `skills` writer

```typescript
{
  skills: [
    { name: "tanstack-architecture", description: "...", body: "..." },
    {
      name: "playwright-cli",
      source: "microsoft/playwright-cli/skills/playwright-cli"
    }
  ];
}
```

Passes skill definitions (inline or external) through to LogicalConfig.
Inline skills include a `body` field; external skills reference a `source`.
The actual installation (writing SKILL.md files and calling `@codemcp/skills`
API) is handled by the agent writer and CLI's `skills-installer`.

### `knowledge` writer

```typescript
{ name: "tanstack-query-docs", origin: "https://github.com/TanStack/query.git", description: "Server state management" }
```

Produces a `KnowledgeSource` entry in LogicalConfig. The actual installation
(calling `@codemcp/knowledge` API) is handled by the CLI's
`knowledge-installer`. Origins must be valid `.git` URLs for the `git-repo`
preset.

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

// catalog/facets/architecture.ts — options carry skills + docsets
export const architectureFacet: Facet = {
  id: "architecture",
  label: "Architecture",
  description:
    "Stack and framework conventions that shape your project structure",
  required: false,
  options: [
    {
      id: "tanstack",
      label: "TanStack",
      description:
        "Full-stack conventions for TanStack (Router, Query, Form, Table)",
      recipe: [
        {
          writer: "skills",
          config: {
            skills: [
              {
                name: "tanstack-architecture",
                description: "...",
                body: "..."
              },
              {
                name: "playwright-cli",
                source: "microsoft/playwright-cli/skills/playwright-cli"
              }
            ]
          }
        },
        {
          writer: "instruction",
          config: { text: "This project follows TanStack conventions..." }
        }
      ],
      docsets: [
        {
          id: "tanstack-router-docs",
          label: "TanStack Router",
          origin: "https://github.com/TanStack/router.git",
          description: "File-based routing, loaders, and search params"
        },
        {
          id: "tanstack-query-docs",
          label: "TanStack Query",
          origin: "https://github.com/TanStack/query.git",
          description: "Server state management, caching, and mutations"
        }
        // ... form, table
      ]
    }
  ]
};
```

## Design Decisions

1. **Two packages: `@ade/core` + `@ade/cli`.** Core owns all types, logic,
   catalog, and writers. CLI is a thin shell for arg parsing and TUI. Core
   is independently importable for programmatic use. No MCP server package —
   runtime MCP servers are separate projects.

2. **Interfaces for contracts, registries for dispatch.** Writer contracts
   are open interfaces (`ProvisionWriterDef`, `AgentWriterDef`). Dispatch
   uses `Map`-based registries, open at runtime. This enables future
   extensibility from other packages without modifying core.

3. **Built-in writers get internal type safety.** Each built-in writer
   defines its own typed config interface and narrows from
   `Record<string, unknown>` at the boundary. The registry contract stays
   generic; the implementation is specific.

4. **Catalog is TypeScript code.** No YAML catalog files. Facets, options,
   and recipes are defined as typed objects in `core/src/catalog/`. This
   gives type safety, IDE support, and natural versioning with the package.
   Kept inside core for now; extractable to a separate package later along
   the `Catalog` interface seam.

5. **Direct package imports over CLI subprocesses.** The CLI's installers
   import `@codemcp/skills` and `@codemcp/knowledge` as TypeScript
   dependencies and call their programmatic APIs (`runAdd`, `createDocset`,
   `initDocset`). CLI subprocess invocation is the fallback for
   non-TypeScript or cross-runtime cases.

6. **`custom` section isolates user edits.** Only the `custom` block in
   `config.yaml` is user-managed. The rest is CLI-managed. This eliminates
   merge conflicts: the CLI never touches `custom`, and users never touch
   the rest. Agent writers merge both sections when generating output.

7. **Docsets are a weak entity on Option, not a separate facet.** Documentation
   sources are always implied by an upstream selection (architecture or
   practices). Making documentation a standalone facet would create a hollow
   indirection whose options just mirror upstream choices 1:1. Instead, each
   `Option` declares its recommended `docsets[]`. The resolver collects and
   deduplicates them; the TUI presents them as a confirmation step (opt-out,
   not opt-in). Config stores `excluded_docsets` (what the user opted out of)
   rather than selected docsets, keeping the common case (accept all
   recommendations) zero-config. When knowledge sources are present, the
   resolver automatically adds a `@codemcp/knowledge-server` MCP server entry.
