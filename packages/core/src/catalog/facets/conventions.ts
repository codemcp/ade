import type { Facet } from "../../types.js";

export const conventionsFacet: Facet = {
  id: "conventions",
  label: "Conventions",
  description: "Team conventions your AI agent should follow",
  required: false,
  multiSelect: true,
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
                description:
                  "Architecture conventions for TanStack applications",
                body: [
                  "# TanStack Architecture Conventions",
                  "",
                  "## Project Structure",
                  "- Use file-based routing with TanStack Router (`routes/` directory)",
                  "- Colocate route components with their loaders and actions",
                  "- Organize by feature, not by type (e.g. `features/auth/`, not `components/auth/`)",
                  "",
                  "## Data Flow",
                  "- Use TanStack Query for all server state management",
                  "- Use TanStack Router loaders for route-level data requirements",
                  "- Keep client state minimal — prefer server state via Query",
                  "- Use `queryOptions()` factory pattern for reusable query definitions",
                  "",
                  "## Module Boundaries",
                  "- Each feature exports a public API via `index.ts`",
                  "- Features must not import from other features' internals",
                  "- Shared code goes in `lib/` or `shared/`"
                ].join("\n")
              },
              {
                name: "tanstack-design",
                description: "Design patterns for TanStack applications",
                body: [
                  "# TanStack Design Patterns",
                  "",
                  "## Query Patterns",
                  "- Define query options as standalone functions: `export const userQueryOptions = (id: string) => queryOptions({ queryKey: ['user', id], queryFn: () => fetchUser(id) })`",
                  "- Use `useSuspenseQuery` in route components paired with `loader` for prefetching",
                  "- Use `useMutation` with `onSettled` for cache invalidation",
                  "",
                  "## Router Patterns",
                  "- Define routes using `createFileRoute` for type-safe file-based routing",
                  "- Use `beforeLoad` for auth guards and redirects",
                  "- Use search params validation with `zodSearchValidator` for type-safe URL state",
                  "",
                  "## Form Patterns",
                  "- Use TanStack Form with Zod validators for form state and validation",
                  "- Prefer field-level validation over form-level where possible",
                  "- Connect form submission to `useMutation` for server sync"
                ].join("\n")
              },
              {
                name: "tanstack-code",
                description: "Code style conventions for TanStack applications",
                body: [
                  "# TanStack Code Conventions",
                  "",
                  "## TypeScript",
                  "- Enable strict mode in tsconfig",
                  "- Infer types from TanStack APIs rather than writing manual type annotations",
                  "- Use `satisfies` operator for type-safe object literals",
                  "",
                  "## Naming",
                  "- Query keys: `['entity', ...params]` (e.g. `['user', userId]`)",
                  "- Query option factories: `entityQueryOptions` (e.g. `userQueryOptions`)",
                  "- Route files: `$param` for dynamic segments (e.g. `users/$userId.tsx`)",
                  "- Loaders: export as named `loader` from route file",
                  "",
                  "## Imports",
                  "- Import from `@tanstack/react-query`, `@tanstack/react-router`, etc.",
                  "- Never import internal modules from TanStack packages",
                  "- Use path aliases for project imports (`@/features/...`)"
                ].join("\n")
              },
              {
                name: "tanstack-testing",
                description: "Testing conventions for TanStack applications",
                body: [
                  "# TanStack Testing Conventions",
                  "",
                  "## Query Testing",
                  "- Wrap components in `QueryClientProvider` with a fresh `QueryClient` per test",
                  "- Use `@testing-library/react` with `renderHook` for testing custom query hooks",
                  "- Mock at the network level with MSW, not at the query level",
                  "",
                  "## Router Testing",
                  "- Use `createMemoryHistory` and `createRouter` for route testing",
                  "- Test route loaders independently as plain async functions",
                  "- Test search param validation with unit tests on the validator schema",
                  "",
                  "## Integration Tests",
                  "- Test full user flows through route transitions",
                  "- Assert on visible UI state, not internal query cache state",
                  "- Use `waitFor` for async query resolution in component tests"
                ].join("\n")
              }
            ]
          }
        },
        {
          writer: "instruction",
          config: {
            text: "This project follows TanStack conventions. Use use_skill() to access the tanstack-architecture, tanstack-design, tanstack-code, and tanstack-testing skills before making changes."
          }
        }
      ]
    },
    {
      id: "conventional-commits",
      label: "Conventional Commits",
      description:
        "Structured commit messages following the Conventional Commits specification",
      recipe: [
        {
          writer: "skills",
          config: {
            skills: [
              {
                name: "conventional-commits",
                description:
                  "Conventional Commits specification for structured commit messages",
                body: [
                  "# Conventional Commits",
                  "",
                  "## Format",
                  "```",
                  "<type>[optional scope]: <description>",
                  "",
                  "[optional body]",
                  "",
                  "[optional footer(s)]",
                  "```",
                  "",
                  "## Types",
                  "- `feat`: A new feature (correlates with MINOR in SemVer)",
                  "- `fix`: A bug fix (correlates with PATCH in SemVer)",
                  "- `docs`: Documentation only changes",
                  "- `style`: Changes that do not affect the meaning of the code",
                  "- `refactor`: A code change that neither fixes a bug nor adds a feature",
                  "- `perf`: A code change that improves performance",
                  "- `test`: Adding missing tests or correcting existing tests",
                  "- `chore`: Changes to the build process or auxiliary tools",
                  "",
                  "## Rules",
                  "- Subject line must not exceed 72 characters",
                  '- Use imperative mood in the subject line ("add" not "added")',
                  "- Do not end the subject line with a period",
                  "- Separate subject from body with a blank line",
                  "- Use the body to explain what and why, not how",
                  "- `BREAKING CHANGE:` footer or `!` after type/scope for breaking changes"
                ].join("\n")
              }
            ]
          }
        },
        {
          writer: "instruction",
          config: {
            text: "Use the conventional-commits skill (via use_skill()) when writing commit messages."
          }
        }
      ]
    },
    {
      id: "tdd-london",
      label: "TDD (London Style)",
      description:
        "Test-Driven Development using the London school (mockist) approach",
      recipe: [
        {
          writer: "skills",
          config: {
            skills: [
              {
                name: "tdd-london",
                description:
                  "London-school TDD methodology with outside-in design",
                body: [
                  "# TDD — London Style (Mockist)",
                  "",
                  "## Core Cycle",
                  "1. **Red** — Write a failing test for the next behavior",
                  "2. **Green** — Write the minimum code to make the test pass",
                  "3. **Refactor** — Improve the code while keeping tests green",
                  "",
                  "## London School Principles",
                  "- Work **outside-in**: start from the outermost layer (API / UI) and drive inward",
                  "- **Mock collaborators**: each unit test isolates the unit under test by mocking its direct dependencies",
                  "- Discover interfaces through tests — let the test define the collaborator contract before implementing it",
                  "- Prefer **role-based interfaces** over concrete classes",
                  "",
                  "## Test Structure",
                  "- **Arrange**: Set up mocks and the unit under test",
                  "- **Act**: Call the method being tested",
                  "- **Assert**: Verify the unit's output and interactions with mocks",
                  "",
                  "## Guidelines",
                  "- One logical assertion per test",
                  '- Test names describe behavior, not methods (e.g. "notifies user when order is placed")',
                  "- Only mock types you own — wrap third-party APIs in adapters and mock those",
                  "- Use the test doubles: stubs for queries, mocks for commands",
                  "- Do not test implementation details — test observable behavior",
                  "- Refactor step is mandatory, not optional"
                ].join("\n")
              }
            ]
          }
        },
        {
          writer: "instruction",
          config: {
            text: "This project uses London-style TDD. Use the tdd-london skill (via use_skill()) before writing tests. Always follow the Red-Green-Refactor cycle."
          }
        }
      ]
    },
    {
      id: "adr-nygard",
      label: "ADR (Nygard)",
      description:
        "Architecture Decision Records following Michael Nygard's template",
      recipe: [
        {
          writer: "skills",
          config: {
            skills: [
              {
                name: "adr-nygard",
                description:
                  "Architecture Decision Records following Nygard's lightweight template",
                body: [
                  "# Architecture Decision Records (Nygard)",
                  "",
                  "## When to Write an ADR",
                  "- When making a significant architectural decision",
                  "- When choosing between multiple viable options",
                  "- When the decision will be hard to reverse",
                  '- When future developers will ask "why did we do this?"',
                  "",
                  "## Template",
                  "Store ADRs in `docs/adr/` as numbered markdown files: `NNNN-title-with-dashes.md`",
                  "",
                  "```markdown",
                  "# N. Title",
                  "",
                  "## Status",
                  "Proposed | Accepted | Deprecated | Superseded by [ADR-NNNN]",
                  "",
                  "## Context",
                  "What is the issue that we're seeing that is motivating this decision or change?",
                  "",
                  "## Decision",
                  "What is the change that we're proposing and/or doing?",
                  "",
                  "## Consequences",
                  "What becomes easier or more difficult to do because of this change?",
                  "```",
                  "",
                  "## Rules",
                  "- ADRs are immutable once accepted — supersede, don't edit",
                  "- Keep context focused on forces at play at the time of the decision",
                  "- Write consequences as both positive and negative impacts",
                  "- Number sequentially, never reuse numbers",
                  '- Title should be a short noun phrase (e.g. "Use PostgreSQL for persistence")'
                ].join("\n")
              }
            ]
          }
        },
        {
          writer: "instruction",
          config: {
            text: "This project uses Architecture Decision Records. Use the adr-nygard skill (via use_skill()) when making or documenting architectural decisions. Store ADRs in docs/adr/."
          }
        }
      ]
    }
  ]
};
