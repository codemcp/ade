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
    docset.ts
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
    setup.ts                # interactive TUI: dev choices only
    configure.ts            # interactive TUI: harness config (ephemeral)
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

### 1. Setup: TUI → config.yaml + config.lock.yaml (dev choices only)

`ade setup` covers **team-level development choices** only. Harness configuration
(autonomy, agent selection, skills install) is handled separately by `ade configure`.

```
read existing config.yaml (if any) for default selections
  → walk dev-choice facets interactively (process, architecture, practices, backpressure):
      → pre-select previous choice as default (if still valid)
      → warn if previous choice references a stale option
      → collect new user choices
      → autonomy facet is excluded — it is harness-level config
  → resolve choices + catalog → LogicalConfig
  → write config.yaml (user choices, no harnesses key)
  → write config.lock.yaml (resolved LogicalConfig snapshot, no harnesses key)
  → stage inline skill files to .ade/skills/ (skip locally modified ones)
  → prompt: "Would you like to configure your coding agent now?"
      → if yes: delegate to ade configure
```

### 2. Configure: ephemeral harness config → agent files

`ade configure` covers **developer/environment-level** settings. Nothing is
written to `config.yaml` or `config.lock.yaml` — the configuration is ephemeral.

```
read config.lock.yaml (requires ade setup to have run first)
  → prompt for autonomy profile (rigid / sensible-defaults / max-autonomy / skip)
  → prompt for harness selection (which agents receive config)
  → merge autonomy as permission_policy on top of locked logical config (in memory)
  → run agent writers for selected harnesses
  → stage any new inline skill files to .ade/skills/ (skip locally modified ones)
  → install all skills via @codemcp/skills API (no prompt — always runs)
  → prompt to initialize knowledge sources via @codemcp/knowledge API
```

### 3. Install: config.lock.yaml → agent files (idempotent)

```
read config.lock.yaml
  → select harnesses (--harness flag, or lock file harnesses, or "universal")
  → apply logical_config from lock file (no re-resolution)
  → run agent writers for selected harnesses
  → install skills
  → install knowledge
```

`ade install` does **not** re-resolve from `config.yaml`. It treats the
lock file as the source of truth, like `npm ci` treats `package-lock.json`.
To change dev-choice selections, re-run `ade setup`. To change autonomy or
harness config, run `ade configure`.

Resolution note: setup expands each selected option's recipe provisions into
LogicalConfig fragments, maps `docset` provisions to `knowledge_sources`,
adds the `@codemcp/knowledge-server` MCP entry if knowledge sources are
present, merges the custom section, and deduplicates MCP servers by ref.
For **multi-select facets**, each selected option's recipe is resolved
independently and their LogicalConfig fragments are merged.

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
  preset?: "git-repo" | "local-folder" | "archive"; // defaults to "git-repo"
}
```

### Config Files

```typescript
// config.yaml — team-level dev choices, committed to version control
interface UserConfig {
  choices: Record<string, string | string[]>; // single-select: string, multi-select: string[]
  // Note: autonomy and harnesses are NOT stored here — they are ephemeral
  // and managed via `ade configure`.
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
  choices: Record<string, string>; // snapshot of dev-choice selections
  logical_config: LogicalConfig;
  // Note: no harnesses key — harness selection is ephemeral
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
  registerProvisionWriter(registry, docsetWriter);

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

interface DocsetConfig {
  id: string;
  label: string;
  origin: string;
  description: string;
  preset?: "git-repo" | "local-folder" | "archive"; // defaults to "git-repo"
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

### `docset` writer

```typescript
{
  id: "tanstack-query-docs",
  label: "TanStack Query",
  origin: "https://github.com/TanStack/query.git",
  description: "Server state management",
  preset: "git-repo" // optional, defaults to "git-repo"
}
```

Produces a `KnowledgeSource` entry in LogicalConfig. The `preset` field
controls how the source is fetched: `"git-repo"` (default) for git
repositories, `"archive"` for remote `.tar.gz` archives, `"local-folder"`
for local paths. The actual installation (calling `@codemcp/knowledge` API)
is handled by the CLI's `knowledge-installer`.

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

// catalog/facets/architecture.ts — options carry skills + docset provisions
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
        },
        {
          writer: "docset",
          config: {
            id: "tanstack-router-docs",
            label: "TanStack Router",
            origin: "https://github.com/TanStack/router.git",
            description: "File-based routing, loaders, and search params"
          }
        },
        {
          writer: "docset",
          config: {
            id: "tanstack-query-docs",
            label: "TanStack Query",
            origin: "https://github.com/TanStack/query.git",
            description: "Server state management, caching, and mutations"
          }
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

7. **Docsets are `docset` provisions in the recipe, not a separate field on Option.**
   Documentation sources are always implied by an upstream selection (architecture
   or practices). Each option declares docsets as `{ writer: "docset", config: {...} }`
   recipe entries — consistent with how skills are declared. The resolver processes
   `docset` provisions like any other: the `docsetWriter` maps each one to a
   `KnowledgeSource` in LogicalConfig. When knowledge sources are present, the
   resolver automatically adds a `@codemcp/knowledge-server` MCP server entry.
