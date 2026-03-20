<!--
DESIGN DOCUMENT TEMPLATE - TIERED BY PROJECT COMPLEXITY

PURPOSE: Document design principles, patterns, and standards that guide implementation.
NOTE: Technology stack decisions belong in the Architecture Document, not here.

PROJECT COMPLEXITY GUIDE:
🚀 ESSENTIAL (Startup/MVP, 1-3 developers, <6 months): Sections 1-2 only
🏢 CORE (Small team, 2-5 developers, 6-18 months): Sections 1-4
🏗️ ADVANCED (Enterprise, 5+ developers, 18+ months): Sections 1-5
⚡ SPECIALIZED (Mission-critical, high reliability): All sections + custom

WHAT TO INCLUDE:
✅ Design principles and patterns
✅ Naming conventions and standards
✅ Component design approaches
✅ Data modeling principles
✅ Quality attribute design strategies
❌ Technology stack choices (goes in Architecture doc)
❌ Concrete class names or implementations
❌ Code snippets or method signatures

START SMALL: Begin with Essential sections, add more as project matures.

IMPORTANT: DO NOT REMOVE THIS COMMENT HOW TO USE THE TEMPLATE!
-->

# ADE — Design Document

## 1. Naming Conventions

### Types and Interfaces

- **PascalCase** for all TypeScript interfaces, type aliases, and enums: `LogicalConfig`, `KnowledgeSource`, `DocsetPreset`, `ProvisionWriterDef`.
- Suffix `Def` for writer definition interfaces: `ProvisionWriterDef`, `AgentWriterDef`.
- Suffix `Schema` for Zod validation schemas: `AdeExtensionsSchema`, `OptionSchema`.
- Suffix `Writer` for instances of writers registered in the registry: `docsetWriter`, `skillsWriter`, `workflowsWriter`.
- Suffix `Facet` for exported catalog facet objects: `architectureFacet`, `practicesFacet`.

### Functions

- **camelCase** throughout. Factory functions prefixed `create`: `createDefaultRegistry()`, `createRegistry()`. Reader/writer pairs prefixed `read`/`write`: `readLockFile()`, `writeLockFile()`. Accessor functions prefixed `get`: `getFacet()`, `getOption()`, `getProvisionWriter()`.
- CLI entry points prefixed `run`: `runSetup()`, `runInstall()`.

### Files

- One primary export per file; file name matches the export name in kebab-case: `docset.ts` exports `docsetWriter`, `knowledge-installer.ts` exports `installKnowledge`.
- Test files co-located: `docset.ts` → `docset.spec.ts`. Integration tests suffixed `.integration.spec.ts`.

### Writer IDs

- Kebab-case string IDs matching the file name: `"docset"`, `"git-hooks"`, `"permission-policy"`, `"setup-note"`.

---

## 2. Error Handling Design

### Provision Writers

Writers throw on invalid config. The resolver does not catch writer errors — a bad catalog entry or extension config fails loudly at setup time, not silently at runtime.

### Knowledge Installer

`createDocset` "already exists" errors are swallowed and execution falls through to `initDocset` (idempotency). All other `createDocset` errors and all `initDocset` errors are logged as warnings and skipped — one failing source does not block the rest.

### Extensions Loading

`AdeExtensionsSchema.safeParse()` on loaded extension data. On failure, a descriptive error is thrown before any resolution runs: _"Invalid ade.extensions file at …"_.

### Unknown Writer IDs

`resolve()` throws if a recipe provision references a writer ID not present in the registry. This is a catalog authoring error and should fail loudly.

### TUI Cancellation

`clack.isCancel()` is checked after every prompt. On cancel, `clack.cancel()` is called and the function returns early (no partial writes).

---

## 3. Architecture Patterns & Principles

### Registry Pattern for Open Extensibility

The `WriterRegistry` is a `Map`-based runtime dispatch table. New provision writers are registered with `registerProvisionWriter(registry, writerDef)` before `resolve()` runs. This keeps the system open for extension without modifying core — any package contributing via `ade.extensions.mjs` can register custom writers.

### Pure Function Resolution

`resolve()` is a pure async function: `(UserConfig, Catalog, WriterRegistry) → LogicalConfig`. It has no side effects and no I/O. This makes it trivially testable and usable in non-CLI contexts.

### Stable Interface Seam: `LogicalConfig`

All provision writers produce `Partial<LogicalConfig>`. All harness writers consume `LogicalConfig`. This seam is the only contract between the two sides — writers don't know about agents, agents don't know about writers.

### Data-Driven Catalog

The catalog is plain TypeScript data (no classes, no inheritance). Facets and options are literal objects conforming to the `Facet` and `Option` interfaces. This makes the catalog easily serializable, diffable, and extensible via `mergeExtensions()`.

### Opt-In Confirmation for Side Effects

Long-running or network-bound operations (skills installation, knowledge init) are never performed silently. The TUI asks the user with a `confirm` prompt (default: `false` for knowledge, `true` for skills). `ade install` performs these unconditionally since it is non-interactive and the lock file represents the user's prior decision.

---

## 4. Component Design Strategy

### Component Boundary Principles

- **`core`** has zero runtime I/O except config file reads/writes. No TUI, no network, no process spawning.
- **`cli`** is the I/O layer: TUI prompts, extension file loading, subprocess/API calls to `@codemcp/skills` and `@codemcp/knowledge`.
- **`harnesses`** knows all agent config formats but nothing about how selections were made.

### Responsibility Assignment

Each provision writer is responsible for exactly one `LogicalConfig` field group. It receives an untyped `config` record and narrows internally — the registry contract stays generic while the implementation is specific.

### Interface Design

Writers are `interface`-typed (open contracts), not `class`-based. This allows any object literal conforming to the interface to be registered — no inheritance required, no framework needed.

### Dependency Direction

```
cli → core ← harnesses
cli → harnesses
```

`core` has no upward dependencies. `harnesses` depends on `core` for types. `cli` depends on both.

---

## 5. Data Design Approach

### Two-File Config Model

- **`config.yaml`** (user-facing): stores `choices` and optional `custom` overrides. CLI-managed except the `custom` block. Checked into the repo as a team-shared declaration.
- **`config.lock.yaml`** (generated): stores the fully resolved `LogicalConfig` snapshot. Never hand-edited. The install source of truth — `ade install` reads this, never re-resolves.

### LogicalConfig as Intermediate Representation

`LogicalConfig` is agent-agnostic. It is the normalised representation of what the project needs, before it is translated into any agent's format. Fields are append-only lists (MCP servers, skills, knowledge sources, instructions) deduplicated by a stable key.

### Deduplication Keys

- MCP servers: deduplicated by `ref`
- Skills: deduplicated by `name`
- Knowledge sources: deduplicated by `name`

### `DocsetPreset` Typing

`KnowledgeSource.preset` uses the same literal union as `@codemcp/knowledge`'s `DocsetPreset` (`"git-repo" | "local-folder" | "archive"`), keeping the types aligned without re-exporting the dependency's internal types directly.

---

## 9. Extension and Evolution Strategy

### Extension Points

1. **`facetContributions`** — append options to existing facets (most common)
2. **`facets`** — add entirely new facets
3. **`provisionWriters`** — register custom writers for custom `config` shapes
4. **`harnessWriters`** — add support for new coding agents

All four are declared in `ade.extensions.{mjs,ts}` in the project root. The CLI loads and validates this file before every `setup` or `install` run.

### Versioning Strategy

The `config.lock.yaml` carries a `version: 1` field. Breaking changes to the lock file format increment this version. `ade install` can detect a stale lock file and prompt the user to re-run `ade setup`.

### Catalog Evolution

Built-in catalog options can be updated in place. Extension options that `replaces` a built-in skill name override it at resolution time without modifying the upstream catalog.

---

# Implementation Notes

- Tests import `runSetup` / `runInstall` directly; the CLI binary entry point is thin enough to not need its own tests.
- Integration tests mock `@clack/prompts` (TUI) and `@codemcp/knowledge` (network I/O) via `vi.mock`. All `confirm` mock return values must be set explicitly per test — `vi.clearAllMocks()` resets them to `undefined` (falsy).
- The `ProvisionWriter` union in `types.ts` is a type-level hint; the real runtime guard is the registry. Adding a new writer requires registering it in `createDefaultRegistry()` and the union.
