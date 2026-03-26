# ADE CLI — Product Requirements Document

> **Scope.** This document covers the **ADE CLI** (`packages/cli`) — the
> setup and configuration tool. It does not cover the broader ADE information
> architecture (process, practices, documentation layers) or the runtime
> MCP servers. For the overall ADE vision, see the project README.

## Problem

Coding agents (Claude Code, Copilot, Kiro, etc.) each require their own
configuration format to wire in MCP servers, instructions, and documentation.
Teams manually maintain these per-agent config files, leading to drift,
duplication, and onboarding friction. Adding a new MCP server or skill means
editing multiple agent-specific files by hand.

ADE's information architecture (process, practices, documentation) is
agent-agnostic, but the last mile — getting it into an agent's config — is not.

## Goal

Provide a single CLI that lets engineers declare _what_ their project needs
(workflows, skills, knowledge, tools) in one place, and generates the correct
agent-specific configuration for whichever coding agent they use.

## Users

- **Individual developers** setting up a project for agentic development.
- **Tech leads** standardizing agent configuration across a team.
- **CI/CD pipelines** that need reproducible agent environments.

## Core Concepts

### Facet

A user-facing configuration question representing a single concern (e.g.
"Which workflow framework?" or "Which architecture stack?"). Each facet offers
a set of options, exactly one of which is selected (or multiple, if the facet
allows multi-select). Facets can be skippable (no selection = no provisions
from that facet).

### Option

One possible answer to a facet. Each option carries a recipe list of
provisions. Documentation sources (docsets) are declared as `docset`
provisions in the recipe alongside skills and other provisions.

### Recipe

A list of provisions that an option brings into the project. A recipe is
never referenced directly by the user — it is the payload behind an option.

A single option often produces **multiple provisions targeting different
writers**. For example, the "codemcp-workflows" option's recipe contains both
a `workflows` provision (registers the MCP server) and an `instruction`
provision (adds workflow guidance to the agent's instructions). This is how
one logical concept (e.g. "use codemcp workflows") materializes as both
runtime config and agent instructions.

### Docset

Documentation sources declared as a `docset` provision in an option's
recipe. Docsets are always implied by an upstream selection (e.g. picking
"TanStack" implies TanStack Router/Query/Form/Table docs declared as
`docset` provisions in the `tanstack` option's recipe). The `docsetWriter`
maps each provision to a `KnowledgeSource` in LogicalConfig. When any
knowledge sources are present, the resolver automatically adds a
`@codemcp/knowledge-server` MCP server entry.

### Provision

An atomic unit of configuration. Each provision names a **writer** and
carries writer-specific config. Provision types:

| Writer        | What it produces                                             |
| ------------- | ------------------------------------------------------------ |
| `workflows`   | MCP server entry for `@codemcp/workflows-server`             |
| `skills`      | Skill definitions (inline or external) for `@codemcp/skills` |
| `docset`      | Knowledge source entry for `@codemcp/knowledge`              |
| `instruction` | Raw instruction text for the agent                           |

### KnowledgeSource

Describes the origin of documentation content. The `preset` field controls
how the source is fetched: `"git-repo"` (default) for git repositories,
`"archive"` for remote `.tar.gz` archives, `"local-folder"` for local paths.
The `@codemcp/knowledge` package manages the physical docset artifacts via
its programmatic API (`createDocset` + `initDocset`); ADE tracks the sources
in LogicalConfig.

### LogicalConfig (intermediate representation)

Agent-agnostic resolved configuration. This is the contract between the
resolution step and the agent writers:

```
mcp_servers:        [{ref, command, args, env}]
instructions:       [string]
skills:             [SkillDefinition]
knowledge_sources:  [{name, origin, description, preset?}]
```

### Agent Writer

Translates LogicalConfig into agent-specific files. ADE owns the knowledge of
every supported agent's config format. When an agent changes its format, only
its writer needs updating.

Supported agents (v1):

| Agent       | Output files                                      |
| ----------- | ------------------------------------------------- |
| Claude Code | `.claude/settings.json`, `AGENTS.md`, skill files |

## User-Facing Files

### `config.yaml` (checked into repo)

Records facet selections. The CLI manages most of this file via commands;
users may add manual entries in the `custom` section.

```yaml
choices:
  process: codemcp-workflows # single-select facet
  architecture: tanstack # single-select facet
  practices: # multi-select facet
    - conventional-commits
    - tdd-london
custom: # user-managed section (not touched by CLI)
  mcp_servers:
    - ref: custom-server
      command: npx
      args: ["-y", "@acme/mcp-server"]
  instructions:
    - "Always use pnpm, never npm."
```

The `custom` section is the only part users edit by hand. All other sections
are maintained exclusively through CLI commands, which simplifies merge
conflicts and keeps the file structure predictable.

### `config.lock.yaml` (checked into repo)

Fully resolved LogicalConfig snapshot. Deterministic — same `config.yaml`
always produces the same lock file. Enables diffing what actually changed
when a facet selection or catalog version is updated.

## CLI Commands

```
ade setup          Interactive TUI: walk through dev-choice facets only
                   (process, architecture, practices, backpressure).
                   Writes config.yaml + config.lock.yaml.
                   Stages inline skill files to .ade/skills/.
                   At the end, offers to run `ade configure` immediately.
                   Re-running setup on an existing project pre-selects
                   previous choices as defaults. Warns if a previous
                   selection references an option no longer in the catalog.

ade configure      Ephemeral harness configuration — writes no config files.
                   Prompts for: autonomy profile, target harnesses.
                   Merges the chosen autonomy policy on top of the locked
                   logical config (in memory), installs to selected harnesses,
                   installs all skills (no prompt), and prompts to initialize
                   knowledge sources.
                   Run after `ade setup`, after a fresh clone, or any time
                   you want to change autonomy or switch harnesses.

ade install        Reads config.lock.yaml and regenerates agent files for the
                   selected harnesses (idempotent). Does not re-resolve from
                   config.yaml. Use `ade setup` to change dev choices;
                   use `ade configure` to change harness/autonomy config.
```

## Catalog

Facets, options, and recipes live in a **catalog** — TypeScript code shipped
with ADE. Using code (not data files) gives us type safety, registry
patterns, and explicit references between options. The catalog is the single
place that knows which provisions each option requires, and it versions
naturally with the ADE package.

## V1 Catalog

Three facets ship in v1:

### 1. Process Guidance (`process`)

How the agent receives workflow and process instructions.

| Option              | Description                                                        |
| ------------------- | ------------------------------------------------------------------ |
| `codemcp-workflows` | Uses `@codemcp/workflows-server` MCP for structured EPCC workflows |
| `native-agents-md`  | Uses `AGENTS.md` with inline EPCC instructions (no MCP dependency) |

### 2. Architecture (`architecture`)

Stack and framework conventions that shape the project structure.

| Option     | Description                                                      |
| ---------- | ---------------------------------------------------------------- |
| `tanstack` | Full-stack conventions for TanStack (Router, Query, Form, Table) |

Each architecture option carries inline skills (conventions, design patterns,
code style, testing) and docset provisions (one `docset` recipe entry per
documentation source).

### 3. Practices (`practices`) — multi-select

Composable development practices. Multiple selections allowed.

| Option                 | Description                                                        |
| ---------------------- | ------------------------------------------------------------------ |
| `conventional-commits` | Structured commit messages following the Conventional Commits spec |
| `tdd-london`           | London-school (mockist) Test-Driven Development                    |
| `adr-nygard`           | Architecture Decision Records following Nygard's template          |

Practices with associated documentation (e.g. Conventional Commits) carry
`docset` provisions that resolve to knowledge sources alongside architecture
docsets.

### Documentation Layer (derived)

Documentation is **not** a standalone facet. Instead, each option in
architecture and practices declares documentation sources as `docset`
provisions in its recipe — the same mechanism used for skills. The resolver
processes these like any other provision: `docsetWriter` maps each to a
`KnowledgeSource`. Accepted docsets become `knowledge_sources` in
LogicalConfig, which triggers:

1. Automatic addition of the `@codemcp/knowledge-server` MCP server entry
2. A confirmation prompt in `ade configure` — default is to defer initialization

## Non-Goals (initial release)

- Runtime agent behavior (that is the MCP servers' job).
- Managing MCP server lifecycles or health checks.
- Supporting agent-specific features beyond config file generation.
- Plugin API for third-party provision writers (keep it internal first).

## Key Design Decisions

1. **ADE CLI owns agent config format knowledge.** MCP servers are pure
   runtime; they do not know or care which agent invoked them.

2. **Provision writers may call package APIs directly.** The `skills` and
   `knowledge` writers import `@codemcp/skills` and `@codemcp/knowledge` as
   TypeScript dependencies. This gives type safety over subprocess invocation.
   CLI fallback remains an option where direct import is impractical.

3. **LogicalConfig is the stable contract.** Provision writers produce it,
   agent writers consume it. Neither side knows about the other.

4. **Lock file is mandatory.** It makes the resolved state explicit,
   reviewable, and reproducible.

5. **User edits are confined to `custom`.** The rest of `config.yaml` is
   CLI-managed, eliminating merge conflicts in the structured sections.

6. **Docsets are `docset` provisions in the recipe, not a separate field.**
   Documentation sources are always implied by an upstream selection. They are
   declared as `{ writer: "docset", config: {...} }` recipe entries —
   consistent with how skills are declared. This eliminates the separate
   `Option.docsets[]` field and the `excluded_docsets` opt-out mechanism.
   Initialization is prompted in `ade configure`.

7. **Dev choices and harness config are separated.** `config.yaml` and the
   lock file contain only team-level development choices (process, architecture,
   practices, backpressure). Autonomy profile and harness selection are
   ephemeral — applied via `ade configure` and not persisted. This lets
   individual developers change their autonomy settings without touching
   shared config files.
