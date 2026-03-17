import type { Facet } from "../../types.js";

export const architectureFacet: Facet = {
  id: "architecture",
  label: "Architecture",
  description:
    "Stack and framework conventions that shape your project structure",
  required: false,
  multiSelect: false,
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
              },
              {
                name: "playwright-cli",
                source: "microsoft/playwright-cli/skills/playwright-cli"
              }
            ]
          }
        }
      ],
      docsets: [
        {
          id: "tanstack-router-docs",
          label: "TanStack Router",
          origin: "https://github.com/TanStack/router.git",
          description: "File-based routing, loaders, and search params"
        },
        {
          id: "tanstack-query-docs",
          label: "TanStack Query",
          origin: "https://github.com/TanStack/query.git",
          description: "Server state management, caching, and mutations"
        },
        {
          id: "tanstack-form-docs",
          label: "TanStack Form",
          origin: "https://github.com/TanStack/form.git",
          description: "Type-safe form state and validation"
        },
        {
          id: "tanstack-table-docs",
          label: "TanStack Table",
          origin: "https://github.com/TanStack/table.git",
          description: "Headless table and datagrid utilities"
        }
      ]
    }
  ]
};
