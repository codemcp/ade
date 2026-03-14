# ADE CLI — Product Requirements Document

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

### Option

One possible answer to a facet. Each option carries a recipe.

### Recipe

A list of provisions that an option brings into the project. A recipe is
never referenced directly by the user — it is the payload behind an option.

### Provision

An atomic unit of configuration. Each provision names a **writer** and
carries writer-specific config. Provision types:

| Writer        | What it produces                                  |
|---------------|---------------------------------------------------|
| `workflows`   | MCP server entry for `@anthropic/workflows`       |
| `skills`      | Invokes `@codemcp/skills` CLI to install skills   |
| `knowledge`   | Invokes knowledge CLI to set up a docset          |
| `mcp-server`  | Generic MCP server entry (command + args + env)    |
| `instruction` | Raw instruction text for the agent                |
| `tool`        | CLI tool dependency to be available               |

### LogicalConfig (intermediate representation)

Agent-agnostic resolved configuration. This is the contract between the
resolution step and the agent writers:

```
mcp_servers:   [{ref, command, args, env}]
instructions:  [string]
cli_actions:   [{command, args}]
docsets:       [{path, description}]
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

The human-authored source of truth. Records facet selections and any manual
overrides. Minimal, readable, diffable.

```yaml
agent: claude-code          # which agent writer to use
choices:
  workflow: codemcp          # facet_id: option_id
  testing: vitest
  knowledge: tanstack
extras:                      # manual additions outside facets
  mcp_servers:
    - ref: custom-server
      command: npx
      args: ["-y", "@acme/mcp-server"]
  instructions:
    - "Always use pnpm, never npm."
```

### `config.lock.yaml` (checked into repo)

Fully resolved LogicalConfig snapshot. Deterministic — same `config.yaml`
always produces the same lock file. Enables diffing what actually changed
when a facet selection or catalog version is updated.

## CLI Commands

```
ade init           Interactive TUI: select agent, walk through facets,
                   write config.yaml + config.lock.yaml + agent files.

ade apply          Re-resolve config.yaml → config.lock.yaml → agent files.
                   Non-interactive. Idempotent.

ade add <facet>    Add or change a single facet selection interactively.

ade remove <facet> Remove a facet selection.

ade status         Show current selections and what would change on apply.
```

## Catalog

Facets, options, and recipes live in a **catalog** — a structured data source
shipped with ADE (initially embedded, later fetchable/versioned). The catalog
is the single place that knows which provisions each option requires.

## Non-Goals (initial release)

- Runtime agent behavior (that is the MCP servers' job).
- Managing MCP server lifecycles or health checks.
- Supporting agent-specific features beyond config file generation.
- Plugin API for third-party provision writers (keep it internal first).

## Key Design Decisions

1. **ADE owns agent config format knowledge.** MCP servers are pure runtime;
   they do not know or care which agent invoked them.

2. **Provision writers may invoke external CLIs.** The `skills` and
   `knowledge` writers delegate to existing `@codemcp/skills` and knowledge
   CLIs rather than reimplementing their logic. ADE orchestrates; it does not
   absorb.

3. **LogicalConfig is the stable contract.** Provision writers produce it,
   agent writers consume it. Neither side knows about the other.

4. **Lock file is mandatory.** It makes the resolved state explicit,
   reviewable, and reproducible.
