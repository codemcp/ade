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
a coding agent needs into three explicit layers — each mapped to a concrete,
agent-native artifact type — and a mechanism to compose them.

```mermaid
flowchart TD
    Engineer(["👩‍💻 Engineer"])
    Agent(["🤖 Coding Agent"])

    Engineer --> Process
    Agent --> Process

    subgraph Process ["① Process · CLAUDE.md"]
        P["Universal engineering workflows\nloaded at every session\nexplore → plan → code → commit\nreproduce → analyze → fix → verify"]
    end

    subgraph Conventions ["② Conventions · Skills"]
        S["Project-specific standards\nselected per team or project\ntechnology · architecture · design decisions"]
    end

    subgraph Documentation ["③ Documentation · .docs/"]
        D["Reference knowledge\nread on demand\nAPIs · libraries · system context"]
    end

    Process -->|"invokes — 'use your design skill'"| Conventions
    Conventions -->|"points to — 'check .docs/tanstack'"| Documentation
```

Most `CLAUDE.md` files are snowflakes: ad-hoc, project-specific, unstructured.
They mix process instructions with coding conventions and documentation fragments
in a single flat file. Rule files and skills improve reusability but still lack a
coherent taxonomy.

ADE brings structure to this space. By separating the three layers explicitly and
binding each to a specific artifact type, it makes information easier to find,
easier to maintain, and — critically — easier for agents to apply in the right
context at the right moment.

The result is agents that behave predictably and professionally across your entire
team, regardless of who is running them.

---

## How the layers compose

The three layers are not independent — they reference each other in a deliberate
direction. Process invokes conventions. Conventions point to documentation.

**Process enforces workflows and delegates to skills:**

> *"When in the plan phase, use your `design` skill."*

The agent system prompt defines and enforces the workflow. At the right step, it
delegates to a skill that encodes the team's specific approach — keeping process
universal and conventions local.

**Skills reference documentation on demand:**

> *"We are using React with TanStack Query for backend interactions. Check*
> *`.docs/tanstack` when implementing data fetching. Check `.docs/components` for*
> *details on available reusable components."*

The skill encodes the convention — which libraries, which patterns. It surfaces
the exact documentation needed at the moment it is relevant, rather than loading
everything upfront.

This composability is what makes ADE scale. Process is written once and shared
across every project. Skills are curated per team or per project context — ADE
provides a mechanism to select and compose skill sets, so the right conventions
are available for the right context. Documentation lives where it belongs — in
the codebase — and is surfaced precisely when needed.

---

## What ADE includes

### Agent configurations that enforce workflows

A `CLAUDE.md` (or equivalent) structured around universal engineering workflows.
It does not describe how the agent *could* work — it enforces how the agent
*does* work. Every task type has a defined process. The agent follows it.

This is the layer that transfers across every project without modification. It
encodes the professional engineering mindset as an explicit, shareable artifact.

### Skill sets — selectable and composable

Skills encode project-specific knowledge as reusable, invocable artifacts. They
capture technology choices, architectural patterns, and design decisions in a form
the agent applies on demand.

ADE provides a mechanism to select and share **skill sets** — curated collections
of skills that match a team's context. A frontend team, a backend team, and a
platform team each activate the skill set appropriate to their work. Skills can
be shared across projects, versioned, and evolved independently of the process
layer.

### Documentation sharing

Reference material committed to the repository and made available to agents
through structured references in skills. Agents do not load documentation
upfront — they are directed to specific docs at the moment they are relevant.

ADE defines conventions for organizing and pointing to documentation so that
skills across different projects follow consistent patterns for surfacing
reference knowledge.

### MCP server configurations

Ready-to-use MCP (Model Context Protocol) server setups for standard development
tooling. Standardized tool access ensures agents have consistent capabilities
across the team.

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
Agents follow defined workflows for defined task types. The process is enforced,
not suggested.

**Technology-agnostic by design.**
The information architecture is universal. The content adapts to each project and
stack. What transfers across projects is the structure itself.

---

## Contributing

ADE is a living configuration. As your team's practices evolve, the configuration
should evolve with them.

Proposed changes to the shared configuration follow the same engineering workflow
as any other code change: branch, document the intent, review, merge. Agent
configuration is a first-class engineering artifact.
