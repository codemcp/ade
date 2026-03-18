---
name: tanstack-code
description: Code style conventions for TanStack applications
---

# TanStack Code Conventions

## TypeScript

- Enable strict mode in tsconfig
- Infer types from TanStack APIs rather than writing manual type annotations
- Use `satisfies` operator for type-safe object literals

## Naming

- Query keys: `['entity', ...params]` (e.g. `['user', userId]`)
- Query option factories: `entityQueryOptions` (e.g. `userQueryOptions`)
- Route files: `$param` for dynamic segments (e.g. `users/$userId.tsx`)
- Loaders: export as named `loader` from route file

## Imports

- Import from `@tanstack/react-query`, `@tanstack/react-router`, etc.
- Never import internal modules from TanStack packages
- Use path aliases for project imports (`@/features/...`)
