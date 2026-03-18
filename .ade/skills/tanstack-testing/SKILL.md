---
name: tanstack-testing
description: Testing conventions for TanStack applications
---

# TanStack Testing Conventions

## Query Testing
- Wrap components in `QueryClientProvider` with a fresh `QueryClient` per test
- Use `@testing-library/react` with `renderHook` for testing custom query hooks
- Mock at the network level with MSW, not at the query level

## Router Testing
- Use `createMemoryHistory` and `createRouter` for route testing
- Test route loaders independently as plain async functions
- Test search param validation with unit tests on the validator schema

## Integration Tests
- Test full user flows through route transitions
- Assert on visible UI state, not internal query cache state
- Use `waitFor` for async query resolution in component tests
