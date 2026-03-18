---
name: tanstack-design
description: Design patterns for TanStack applications
---

# TanStack Design Patterns

## Query Patterns

- Define query options as standalone functions: `export const userQueryOptions = (id: string) => queryOptions({ queryKey: ['user', id], queryFn: () => fetchUser(id) })`
- Use `useSuspenseQuery` in route components paired with `loader` for prefetching
- Use `useMutation` with `onSettled` for cache invalidation

## Router Patterns

- Define routes using `createFileRoute` for type-safe file-based routing
- Use `beforeLoad` for auth guards and redirects
- Use search params validation with `zodSearchValidator` for type-safe URL state

## Form Patterns

- Use TanStack Form with Zod validators for form state and validation
- Prefer field-level validation over form-level where possible
- Connect form submission to `useMutation` for server sync
