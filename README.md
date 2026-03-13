# ADE — Agentic Development Environment

> A technology-agnostic information architecture for coding agents that enables
> consistent, professional-grade agentic engineering at team scale.

---

## The alignment problem

The biggest challenge in agentic development is not agent capability — it is alignment.

An agent can write excellent code and still produce the wrong result, if it lacks
the right context. The human engineer had a goal in mind. The agent had a
different understanding of the problem. The output is technically correct but
misses the point entirely.

This is not a capability problem. It is an **information problem**.

---

## How professional engineers work

Think about what distinguishes a senior engineer from a developer who jumps
straight to writing code. It is not just technical skill — it is a structured
way of thinking about problems.

A senior engineer working on a feature does not open an editor immediately. They
**explore** the problem space, **plan** an approach, **implement** incrementally,
and **commit** deliberate, well-scoped changes. Working on a bug, they first
**reproduce** it reliably, **analyze** the root cause, **fix** the right thing,
and **verify** the fix holds.

This process knowledge is partially taught, partially acquired through experience
— and, in practice, frequently skipped. Developers jump to conclusions. Agents
do the same.

Beyond process, every project carries **conventions**: the technology choices,
architectural patterns, design principles, and team agreements about *how* to
solve problems in this specific context. You acquire this knowledge when you join
a new project, through code review, discussions with colleagues, and time.

And then there is **documentation**: the reference material you consult while
implementing — API details, library behavior, system specifications. You do not
memorize it. You look it up at the moment you need it.

Three distinct types of information. Three different acquisition modes. Three
different roles in the act of engineering.

---

## What ADE is

**ADE is an information architecture for agentic development.**

It provides a rigid, technology-agnostic structure that organizes the information
a coding agent needs into three explicit layers:

| Layer | What it contains | Scope |
|---|---|---|
| **Process** | Universal workflows and mental models for engineering tasks | Technology-agnostic, transferable across all projects |
| **Conventions** | Project-specific standards: tech stack, architecture, design decisions, team agreements | Project-specific |
| **Documentation** | Reference knowledge consulted during implementation | Domain and context-specific |

Most `CLAUDE.md` files are snowflakes: ad-hoc, project-specific, unstructured.
They mix process instructions with coding conventions and documentation fragments
in a single flat file. Rule files and skills improve reusability but still lack a
coherent taxonomy.

ADE brings structure to this space. By separating the three layers explicitly, it
makes information easier to find, easier to maintain, and — critically — easier
for agents to apply in the right context at the right moment.

The result is agents that behave predictably and professionally across your entire
team, regardless of who is running them.

---

## What ADE includes

### Agent configuration files

Structured `CLAUDE.md` templates and supporting configuration files organized
around the three-layer taxonomy. These files are committed to the repository so
every developer and every agent shares the same context.

### MCP server configurations

Ready-to-use MCP (Model Context Protocol) server setups for standard development
tooling. Standardized tool access ensures agents have consistent capabilities
across the team.

### Workflow and process documentation

Explicit process definitions for common engineering tasks — written for both
human engineers and coding agents. Covers human-agent collaboration conventions,
PR and review workflows, branching strategies, and escalation protocols (when the
agent should ask vs. proceed autonomously).

---

## Core principles

**Shared context over personal configuration.**
Agent configuration lives in the repository, not in individual developer
dotfiles. Every team member, every agent, every CI run operates from the same
information foundation.

**Structure over accumulation.**
Information is organized by type — process, conventions, documentation — not
accumulated into a single growing file. Structure makes information findable and
maintainable.

**Explicit process over implicit assumption.**
Agents follow defined workflows for defined task types. The process is specified,
not left to inference.

**Technology-agnostic by design.**
The information architecture is universal. The content adapts to each project and
stack. What transfers across projects is the structure itself.

---

## Repository structure

```
ade/
├── process/          # Universal engineering workflows (feature, bug, refactor, …)
├── conventions/      # Project-specific standards (populated per project)
├── docs/             # Reference documentation (populated per project)
└── mcp/              # MCP server configuration templates
```

---

## Contributing

ADE is a living configuration. As your team's practices evolve, the configuration
should evolve with them.

Proposed changes to the shared configuration follow the same engineering workflow
as any other code change: branch, document the intent, review, merge. Agent
configuration is a first-class engineering artifact.
