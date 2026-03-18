---
name: tanstack-architecture
description: Architecture conventions for TanStack applications
---

# TanStack Architecture Conventions

## Project Structure
- Use file-based routing with TanStack Router (`routes/` directory)
- Colocate route components with their loaders and actions
- Organize by feature, not by type (e.g. `features/auth/`, not `components/auth/`)

## Data Flow
- Use TanStack Query for all server state management
- Use TanStack Router loaders for route-level data requirements
- Keep client state minimal — prefer server state via Query
- Use `queryOptions()` factory pattern for reusable query definitions

## Module Boundaries
- Each feature exports a public API via `index.ts`
- Features must not import from other features' internals
- Shared code goes in `lib/` or `shared/`
