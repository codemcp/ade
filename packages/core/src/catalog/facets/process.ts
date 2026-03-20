import type { Facet } from "../../types.js";

export const processFacet: Facet = {
  id: "process",
  label: "Process",
  description: "How will you guide your agent",
  required: true,
  options: [
    {
      id: "codemcp-workflows",
      label: "CodeMCP Workflows",
      description:
        "Use @codemcp/workflows to drive agent tasks with structured engineering workflows",
      recipe: [
        {
          writer: "workflows",
          config: {
            package: "@codemcp/workflows-server@latest",
            ref: "workflows",
            // env: {
            //   VIBE_WORKFLOW_DOMAINS: "skilled"
            // },
            allowedTools: [
              "whats_next",
              "conduct_review",
              "list_workflows",
              "get_tool_info"
            ]
          }
        },
        {
          writer: "instruction",
          config: {
            text: [
              "You are an AI assistant that helps users develop software features using the workflows server.",
              "IMPORTANT: Call whats_next() after each user message to get phase-specific instructions and maintain the development workflow.",
              'Each tool call returns a JSON response with an "instructions" field. Follow these instructions immediately after you receive them.',
              "Use the development plan which you will retrieve via whats_next() to record important insights and decisions as per the structure of the plan.",
              "Do not use your own task management tools."
            ].join("\n")
          }
        }
      ]
    },
    {
      id: "codemcp-workflows-skilled",
      label: "CodeMCP Workflows (Skilled)",
      description:
        "Use @codemcp/workflows with domain-specific skills for starting projects, architecture, design, coding and testing",
      recipe: [
        {
          writer: "workflows",
          config: {
            package: "@codemcp/workflows-server@latest",
            ref: "workflows",
            env: {
              VIBE_WORKFLOW_DOMAINS: "skilled"
            },
            allowedTools: [
              "whats_next",
              "conduct_review",
              "list_workflows",
              "get_tool_info"
            ]
          }
        },
        {
          writer: "skills",
          config: {
            skills: [
              {
                name: "starting-project",
                description:
                  "Conventions and tooling to expect when starting a new project",
                body: [
                  "# Starting a New Project",
                  "",
                  "## Project Setup",
                  "- Check for an existing README, architecture doc, or requirements doc before doing anything else",
                  "- Prefer monorepo tooling (pnpm workspaces, nx, turborepo) for multi-package projects",
                  "- Use a `.editorconfig` and a linter/formatter config (ESLint + Prettier, Biome, etc.) from day one",
                  "- Store secrets in environment variables — never commit them; provide a `.env.example`",
                  "",
                  "## Conventions",
                  "- Follow the language/framework conventions already present in the project",
                  "- If no conventions exist yet, propose them and document them before writing code",
                  "- Prefer explicit over implicit: clear naming, documented interfaces, typed APIs",
                  "",
                  "## First Steps Checklist",
                  "1. Read all existing documentation",
                  "2. Understand the intended architecture (ask if unclear)",
                  "3. Confirm the tech stack and tooling",
                  "4. Set up the development environment and verify it works",
                  "5. Identify and create the initial project skeleton if needed"
                ].join("\n")
              },
              {
                name: "architecture",
                description:
                  "Architectural conventions and decision-making guidelines",
                body: [
                  "# Architecture",
                  "",
                  "## Principles",
                  "- Prefer simple, proven architectural patterns over novel ones",
                  "- Separate concerns: domain logic, infrastructure, and presentation must not be mixed",
                  "- Design for testability: business logic must be testable without I/O",
                  "- Apply the dependency rule: inner layers must not depend on outer layers",
                  "",
                  "## Decision Making",
                  "- Document significant architecture decisions as ADRs (Architecture Decision Records)",
                  "- Evaluate alternatives before committing to an approach",
                  "- Consider non-functional requirements: scalability, maintainability, operability",
                  "",
                  "## Boundaries",
                  "- Define clear module/package boundaries with explicit public APIs",
                  "- Avoid circular dependencies between modules",
                  "- Keep infrastructure concerns (DB, HTTP, queues) behind interfaces"
                ].join("\n")
              },
              {
                name: "application-design",
                description:
                  "Design patterns for authentication, routing, error handling, and forms",
                body: [
                  "# Application Design",
                  "",
                  "## Authentication & Authorization",
                  "- Authenticate at the edge (middleware/guard) — never inside business logic",
                  "- Use short-lived tokens (JWT or session) with refresh strategies",
                  "- Apply the principle of least privilege for all role/permission checks",
                  "",
                  "## Routing",
                  "- Use declarative, file-based or configuration-driven routing where available",
                  "- Protect routes with auth guards rather than ad-hoc checks",
                  "- Keep route handlers thin — delegate to services immediately",
                  "",
                  "## Error Handling",
                  "- Distinguish between operational errors (expected) and programmer errors (bugs)",
                  "- Return structured error responses with consistent shape (code, message, details)",
                  "- Log errors with context (request id, user id, stack trace) for observability",
                  "- Never expose internal stack traces or sensitive data to clients",
                  "",
                  "## Forms & Validation",
                  "- Validate input at the boundary (schema-first with Zod, Yup, Joi, etc.)",
                  "- Show inline, field-level validation errors in the UI",
                  "- Prevent double-submission by disabling submit controls during in-flight requests"
                ].join("\n")
              },
              {
                name: "coding",
                description:
                  "Code style, patterns, and implementation conventions",
                body: [
                  "# Coding",
                  "",
                  "## Style",
                  "- Follow the project's existing code style and linter rules unconditionally",
                  "- Write self-documenting code: prefer expressive names over comments that explain *what*",
                  "- Use comments only to explain *why* when the reason is non-obvious",
                  "",
                  "## Patterns",
                  "- Prefer pure functions and immutable data structures",
                  "- Keep functions small and focused on a single responsibility",
                  "- Avoid deep nesting — use early returns, guard clauses, and extraction",
                  "- Prefer composition over inheritance",
                  "",
                  "## Quality Gates",
                  "- Run the linter and type-checker before declaring a task done",
                  "- Fix all warnings, not just errors",
                  "- Ensure the build passes end-to-end before moving on"
                ].join("\n")
              },
              {
                name: "testing",
                description:
                  "Testing strategy, patterns, and execution conventions",
                body: [
                  "# Testing",
                  "",
                  "## Strategy",
                  "- Follow the test pyramid: many unit tests, fewer integration tests, fewest E2E tests",
                  "- Write tests alongside the code — not as an afterthought",
                  "- Each test must be independent: no shared mutable state between tests",
                  "",
                  "## Unit Tests",
                  "- Test one unit of behavior per test case",
                  "- Use descriptive test names that read as specifications",
                  "- Mock only direct dependencies, not transitive ones",
                  "",
                  "## Integration & E2E Tests",
                  "- Test real interactions between components (DB, HTTP, queue) in integration tests",
                  "- Use realistic data and environments — avoid fake setups that hide real issues",
                  "- Clean up test data after each test to keep tests isolated",
                  "",
                  "## Execution",
                  "- All tests must pass before committing",
                  "- Run the full test suite after refactoring, even if only small changes were made",
                  "- Treat a flaky test as a bug — fix or delete it, never ignore it"
                ].join("\n")
              }
            ]
          }
        },
        {
          writer: "instruction",
          config: {
            text: [
              "You are an AI assistant that helps users develop software features using the workflows server.",
              "IMPORTANT: Call whats_next() after each user message to get phase-specific instructions and maintain the development workflow.",
              'Each tool call returns a JSON response with an "instructions" field. Follow these instructions immediately after you receive them.',
              "Use the development plan which you will retrieve via whats_next() to record important insights and decisions as per the structure of the plan.",
              "Do not use your own task management tools."
            ].join("\n")
          }
        }
      ]
    },
    {
      id: "native-agents-md",
      label: "Native agents.md",
      description: "Use a plain agents.md instruction file",
      recipe: [
        {
          writer: "instruction",
          config: {
            text: "Read AGENTS.md for project conventions and task instructions."
          }
        }
      ]
    }
  ]
};
