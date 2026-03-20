# ADE — System Architecture (C4 Model)

## 1. System Context (C4 Level 1)

### System Overview

ADE (Agentic Development Environment) is a CLI tool that lets engineering teams declare _what_ their project needs for agentic development — workflow conventions, skills, knowledge sources, tools — and generates the correct agent-specific configuration files for whichever coding agent they use. It bridges the gap between a team's abstract preferences and the per-agent config formats each AI coding assistant requires.

### Users and Personas

- **Individual developer**: Runs `ade setup` once to configure a project, then `ade install` on subsequent machines or CI environments to reproduce the setup.
- **Tech lead / platform team**: Authors a shared `ade.extensions.mjs` that encodes org-specific conventions (custom skills, internal docsets, proprietary harnesses) and distributes it via a template repository.
- **CI/CD pipeline**: Calls `ade install` to ensure a reproducible agent environment before agentic tasks run.

### External Systems

- **`@codemcp/skills`**: Manages SKILL.md files and the skills lock file. ADE calls its programmatic API (`runAdd`) to install skills into the project.
- **`@codemcp/knowledge`**: Manages `.knowledge/config.yaml` and docset artifacts. ADE calls `createDocset` + `initDocset` to register and download knowledge sources.
- **`@codemcp/workflows-server`** (and other MCP servers): Runtime servers registered as MCP server entries in the generated agent config. ADE writes the config; it does not start or manage these servers.
- **Coding agents** (Claude Code, OpenCode, Copilot, Cursor, Kiro, etc.): Consumers of ADE's generated config files. Each has its own format; ADE's harness writers know the details.
- **Skills server** (e.g. `mrsimpson/skills-coding`): External source for skill definitions referenced in catalog options.

### System Boundaries

- **Inside ADE**: Catalog, resolver, provision writers, harness writers, CLI TUI, lock file management, skills installer, knowledge installer.
- **Outside ADE**: Runtime MCP servers, agent execution, skill content authoring, docset content management, the agents themselves.

### Context Diagram

```
┌─────────────────────────────────────────────────────────┐
│                        Developer                        │
└─────────────────────────┬───────────────────────────────┘
                          │ ade setup / ade install
┌─────────────────────────▼───────────────────────────────┐
│                   ADE CLI (@codemcp/ade)                 │
│  Interactive TUI + resolver + file generators           │
└──────┬──────────────────┬──────────────────┬────────────┘
       │ programmatic API │                  │ writes config files
       ▼                  ▼                  ▼
@codemcp/skills   @codemcp/knowledge   Agent config files
(skills lock,     (.knowledge/         (AGENTS.md,
 SKILL.md files)   config.yaml,         .mcp.json,
                   docset artifacts)    opencode.json, …)
```

---

## 2. Container Architecture (C4 Level 2)

### Containers

#### `@codemcp/ade-core` (`packages/core`)

- **Technology**: TypeScript, pure functions, no I/O except config file reads/writes
- **Responsibilities**: All types, catalog definitions, resolution logic, provision writers, writer registry
- **Interfaces**: Public TypeScript API (`index.ts`) — exported types, `resolve()`, `createDefaultRegistry()`, `mergeExtensions()`, catalog accessors, config read/write utilities
- **Data storage**: None at runtime; reads/writes `config.yaml` and `config.lock.yaml` via helper functions

#### `@codemcp/ade-cli` (`packages/cli`)

- **Technology**: TypeScript, `@clack/prompts` for TUI, `tsup` bundle
- **Responsibilities**: Argument parsing, interactive TUI, extensions loading, skills installation, knowledge installation, command routing
- **Interfaces**: CLI binary (`ade setup [dir]`, `ade install [dir]`); programmatic entry points `runSetup()` and `runInstall()` (used in tests)
- **Data storage**: None; delegates to core for file I/O

#### `@codemcp/ade-harnesses` (`packages/harnesses`)

- **Technology**: TypeScript
- **Responsibilities**: Per-agent config file writers (AGENTS.md, .mcp.json, opencode.json, .kiro/, etc.)
- **Interfaces**: `allHarnessWriters`, `getHarnessWriter()`, `buildHarnessWriters()`, `installSkills()`, `writeInlineSkills()`
- **Data storage**: Writes agent-specific config files to the project root

### Container Interactions

```
ade setup/install
  │
  ├─► loadExtensions()        [cli → disk: ade.extensions.mjs]
  ├─► mergeExtensions()       [cli → core]
  ├─► resolve()               [cli → core: UserConfig + Catalog → LogicalConfig]
  ├─► writeLockFile()         [cli → core → disk: config.lock.yaml]
  ├─► harness.install()       [cli → harnesses → disk: agent config files]
  ├─► installSkills()         [cli → harnesses → @codemcp/skills]
  └─► installKnowledge()      [cli → @codemcp/knowledge API]
```

### Deployment

ADE is a developer tool — it runs locally (`npx @codemcp/ade`) or in CI. There is no persistent service. The generated output files are checked into the project repository.

---

## 3. Component Architecture (C4 Level 3)

### `@codemcp/ade-core` Components

#### Catalog

- **Responsibilities**: Declares all built-in facets and options as TypeScript objects; provides `getDefaultCatalog()`, `mergeExtensions()`, `sortFacets()`, `getVisibleOptions()`
- **Key files**: `catalog/index.ts`, `catalog/facets/{process,architecture,practices,backpressure,autonomy}.ts`
- **Design pattern**: Static data objects; no runtime state

#### Resolver

- **Responsibilities**: Expands `UserConfig` choices against the `Catalog` using the `WriterRegistry`; produces `LogicalConfig`; deduplicates MCP servers and skills by key; auto-adds `@codemcp/knowledge-server` when `knowledge_sources` are non-empty
- **Key files**: `resolver.ts`
- **Design pattern**: Pure function `resolve(userConfig, catalog, registry): Promise<LogicalConfig>`

#### Writer Registry

- **Responsibilities**: Maps writer IDs to `ProvisionWriterDef` instances; `createDefaultRegistry()` pre-registers all built-in writers; open for runtime extension
- **Key files**: `registry.ts`
- **Design pattern**: `Map`-based registry; open/closed principle — new writers added without modifying core

#### Provision Writers (built-in)

| Writer | File | Output |
|---|---|---|
| `workflows` | `writers/workflows.ts` | `mcp_servers[]` entry |
| `skills` | `writers/skills.ts` | `skills[]` entries |
| `docset` | `writers/docset.ts` | `knowledge_sources[]` entry |
| `instruction` | `writers/instruction.ts` | `instructions[]` entry |
| `git-hooks` | `writers/git-hooks.ts` | `git_hooks[]` entries |
| `permission-policy` | `writers/permission-policy.ts` | `permission_policy` |
| `setup-note` | `writers/setup-note.ts` | `setup_notes[]` entry |
| `mcp-server` | `writers/mcp-server.ts` | `mcp_servers[]` entry |

Each writer receives `Record<string, unknown>` config and narrows internally; the registry contract stays generic.

#### Types

- **Responsibilities**: Single source of truth for all shared interfaces — `Catalog`, `Facet`, `Option`, `Provision`, `LogicalConfig`, `KnowledgeSource`, `DocsetPreset`, `SkillDefinition`, `UserConfig`, `LockFile`, `WriterRegistry`, `AdeExtensions`, and their Zod validation schemas
- **Key file**: `types.ts`

### `@codemcp/ade-cli` Components

#### Entry Point / Router (`index.ts`)

Parses `process.argv`, loads extensions, builds catalog and harness writers, delegates to `runSetup` or `runInstall`.

#### `runSetup` (`commands/setup.ts`)

Walks the user through the TUI facet-by-facet, resolves choices, writes `config.yaml` + `config.lock.yaml`, runs harness writers, installs skills and offers knowledge initialization.

#### `runInstall` (`commands/install.ts`)

Reads `config.lock.yaml`, runs harness writers, installs skills, and calls `installKnowledge` — no re-resolution.

#### Extensions Loader (`extensions.ts`)

Finds and loads `ade.extensions.{ts,mjs,js}` from the project root. Uses `jiti` for TypeScript files. Validates with `AdeExtensionsSchema`.

#### Knowledge Installer (`knowledge-installer.ts`)

Wraps `createDocset` + `initDocset` from `@codemcp/knowledge`. Handles "already exists" gracefully (proceeds to `initDocset`). Passes `preset` from `KnowledgeSource` (default: `"git-repo"`).

---

## 4. Architecture Decisions

### Docsets as `docset` provision writer (not `Option.docsets[]`)

**Decision**: Documentation sources are declared as `{ writer: "docset", config: { id, label, origin, description, preset? } }` recipe entries, identical in structure to skills provisions.

**Rationale**: The old `Option.docsets[]` sibling field was a parallel mechanism that bypassed the writer registry, required a separate opt-out multiselect prompt, and introduced `excluded_docsets` in `UserConfig`. The writer model is already the right abstraction — using it for docsets makes the catalog uniform, removes per-item opt-out UX, and lets extensions contribute docsets with the same syntax as everything else.

**Consequences**: `DocsetDef`, `collectDocsets()`, and `excluded_docsets` removed. Setup prompt simplified to a single opt-in confirm.

### Two-package split: `core` + `cli`

**Decision**: All types, logic, and writers live in `@codemcp/ade-core`. The CLI is a thin shell.

**Rationale**: Core can be imported programmatically (CI scripts, tests, extensions) without pulling in TUI dependencies. It also enables the harnesses package to depend on core without depending on the CLI.

### `LogicalConfig` as the stable contract

**Decision**: Provision writers produce `Partial<LogicalConfig>`; harness writers consume `LogicalConfig`. Neither knows about the other.

**Rationale**: Decouples the catalog / resolution side from the file-generation side. Adding a new harness requires no changes to writers; adding a new writer requires no changes to harnesses.

### Lock file is the install source of truth

**Decision**: `ade install` reads `config.lock.yaml` directly; it never re-resolves from `config.yaml`.

**Rationale**: Mirrors `npm ci` / `package-lock.json`. Makes installs deterministic and reviewable. `config.lock.yaml` is checked in, so CI produces exactly what was reviewed.

### Open registry for extensibility

**Decision**: `WriterRegistry` is a `Map`-based runtime registry, not a discriminated union.

**Rationale**: A discriminated union is a closed set — adding a writer from an extension package would require modifying core. The registry is open: any package can register a writer before `resolve()` runs.

---

## 5. References

- Existing CLI design doc: `docs/CLI-design.md`
- Existing CLI PRD: `docs/CLI-PRD.md`
- Extensions guide: `docs/guide/extensions.md`
- Example extension: `ade.extensions.mjs`
