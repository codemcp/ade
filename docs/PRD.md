# ADE CLI — Product Requirements Document

> **Scope.** This document covers the **ADE CLI** (`packages/ade`) — the
> setup and configuration tool. It does not cover the broader ADE information
> architecture (process, conventions, documentation layers) or the runtime
> MCP servers. For the overall ADE vision, see the project README.

## Problem

Coding agents (Claude Code, Copilot, Kiro, etc.) each require their own
configuration format to wire in MCP servers, instructions, and documentation.
Teams manually maintain these per-agent config files, leading to drift,
duplication, and onboarding friction. Adding a new MCP server or skill means
editing multiple agent-specific files by hand.

ADE's information architecture (process, conventions, documentation) is
agent-agnostic, but the last mile — getting it into an agent's config — is not.

## Goal

Provide a single CLI that lets engineers declare *what* their project needs
(workflows, skills, knowledge, tools) in one place, and generates the correct
agent-specific configuration for whichever coding agent they use.

## Users

- **Individual developers** setting up a project for agentic development.
- **Tech leads** standardizing agent configuration across a team.
- **CI/CD pipelines** that need reproducible agent environments.

## Core Concepts

### Facet

A user-facing configuration question representing a single concern (e.g.
"Which workflow framework?" or "Which testing convention?"). Each facet offers
a set of options, exactly one of which is selected. Facets can be skippable
(no selection = no provisions from that facet).

Facets may **depend on other facets**. When a facet declares dependencies,
its provision writers receive the resolved options from those facets as
context. This allows provisions to adapt their output based on sibling
selections. For example, the testing facet may depend on the workflow facet
so that its skills writer knows which workflow-specific test conventions to
install. The resolver processes facets in dependency order.

### Option

One possible answer to a facet. Each option carries a recipe.

### Recipe

A list of provisions that an option brings into the project. A recipe is
never referenced directly by the user — it is the payload behind an option.

A single option often produces **multiple provisions targeting different
writers**. For example, the "codemcp" workflow option's recipe contains both
a `workflows` provision (registers the MCP server) and an `instruction`
provision (adds workflow guidance to the agent's instructions). This is how
one logical concept (e.g. "use codemcp workflows") materializes as both
runtime config and agent instructions.

### Provision

An atomic unit of configuration. Each provision names a **writer** and
carries writer-specific config. Provision types:

| Writer        | What it produces                                          |
|---------------|-----------------------------------------------------------|
| `workflows`   | MCP server entry for `@codemcp/workflows-server`          |
| `skills`      | Invokes `@codemcp/skills` to install skills               |
| `knowledge`   | Invokes `@codemcp/knowledge` CLI to set up knowledge sources |
| `mcp-server`  | Generic MCP server entry (command + args + env)           |
| `instruction` | Raw instruction text for the agent                        |
| `installable` | CLI tool or dependency to be installed                     |

### KnowledgeSource

Describes the origin of documentation content (e.g. a URL, a local path, or
a package reference). Multiple knowledge sources may be combined into a single
docset when the `@codemcp/knowledge-server` MCP is the selected option for the
documentation facet. The knowledge CLI (`@codemcp/knowledge`) manages the
physical docset artifacts; ADE only tracks the sources.

### LogicalConfig (intermediate representation)

Agent-agnostic resolved configuration. This is the contract between the
resolution step and the agent writers:

```
mcp_servers:        [{ref, command, args, env}]
instructions:       [string]
cli_actions:        [{command, args}]
knowledge_sources:  [{name, origin, description}]
```

### Agent Writer

Translates LogicalConfig into agent-specific files. ADE owns the knowledge of
every supported agent's config format. When an agent changes its format, only
its writer needs updating.

Supported agents (initial):

| Agent       | Output files                                |
|-------------|---------------------------------------------|
| Claude Code | `.claude/settings.json`, `CLAUDE.md`        |
| Copilot     | `.vscode/settings.json`, instructions MD    |
| Kiro        | `.kiro/` steering files                     |

## User-Facing Files

### `config.yaml` (checked into repo)

Records facet selections. The CLI manages most of this file via commands;
users may add manual entries in the `custom` section.

```yaml
choices:
  workflow: codemcp            # facet_id: option_id
  testing: vitest
  knowledge: tanstack
custom:                        # user-managed section (not touched by CLI)
  mcp_servers:
    - ref: custom-server
      command: npx
      args: ["-y", "@acme/mcp-server"]
  instructions:
    - "Always use pnpm, never npm."
```

The target agent (claude-code, copilot, kiro) is **not** stored in
`config.yaml`. It is specified at generation time (e.g. `ade setup` or
`ade install --agent claude-code`). This keeps the config agent-agnostic —
the same `config.yaml` can generate output for any supported agent.

The `custom` section is the only part users edit by hand. All other sections
are maintained exclusively through CLI commands, which simplifies merge
conflicts and keeps the file structure predictable.

### `config.lock.yaml` (checked into repo)

Fully resolved LogicalConfig snapshot. Deterministic — same `config.yaml`
always produces the same lock file. Enables diffing what actually changed
when a facet selection or catalog version is updated.

## CLI Commands

```
ade setup          Interactive TUI: select agent, walk through facets,
                   write config.yaml + config.lock.yaml + agent files.
                   Agent selection is a setup-time choice, not stored in config.

ade install        Re-resolve config.yaml → config.lock.yaml → agent files.
                   Non-interactive. Idempotent. Requires --agent flag or
                   detects agent from existing project files.

ade add <facet>    Add or change a single facet selection interactively.

ade remove <facet> Remove a facet selection.

ade status         Show current selections and what would change on install.
```

## Catalog

Facets, options, and recipes live in a **catalog** — TypeScript code shipped
with ADE. Using code (not data files) gives us type safety, registry
patterns, and explicit references between options. The catalog is the single
place that knows which provisions each option requires, and it versions
naturally with the ADE package.

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
