# ADR 0002: Type Safety Strategy for Extension File Loading

## Status

Proposed

## Context

ADE is being made extensible: consumers who fork the repository or use it as an upstream
can place an `ade.extensions.mjs` (or `.js`, `.ts`) file in their project root to contribute
new catalog options, facets, provision writers, and harness writers without modifying
upstream files.

The CLI loads this file at runtime via dynamic `import()`. This creates a type safety gap:

- `import()` returns `Promise<unknown>`, so the loaded module has no compile-time shape
  guarantee on the CLI side.
- Consumers writing `.mjs`/`.js` extension files have no TypeScript compiler checking their
  exported object against the `AdeExtensions` interface.
- Shape errors (wrong property name, wrong recipe format, missing required field) would
  surface as confusing runtime failures deep inside `resolve()` or a writer, not at the
  point of authoring the extension.

Three levels of type safety are available:

**Level 1 — JSDoc `@type` annotation (authoring-time, opt-in)**
The consumer annotates their JS extension file with
`/** @type {import('@codemcp/ade-core').AdeExtensions} */`.
This provides IDE autocompletion and type hints in editors with JSDoc awareness (VS Code).
No build step. No CLI-side guarantee — the annotation is advisory only and silently ignored
if the consumer doesn't use it.

**Level 2 — Runtime Zod validation (load-time, mandatory)**
The CLI validates the loaded module against a Zod schema derived from `AdeExtensions`
immediately after import. Rejects invalid extensions with a structured, actionable error
message before any catalog or registry mutation happens.
No authoring-time feedback, but errors surface at `ade setup` time rather than
mid-resolution.

**Level 3 — TypeScript extension files via `jiti` (authoring-time, opt-in)**
The CLI's extension loader also accepts `ade.extensions.ts`. Loading it requires an
in-process TypeScript runner. `jiti` (by the Nuxt/unjs team) is the established solution:
it strips types at load time using `oxc-transform` (zero native binaries, fast, ESM-native).
Consumers writing `.ts` extension files get full TypeScript compiler checking and IDE
support. `jiti` is already used by Vite, Nuxt, and most of the unjs ecosystem.

These levels are not mutually exclusive. The fork scenario (consumer edits source TypeScript
directly in a forked CLI) already has full compile-time safety through the TypeScript
compiler — no additional mechanism needed there.

## Decision

We will implement **Level 2 (Zod runtime validation) combined with Level 3 (`.ts` support
via `jiti`)**, and export the `AdeExtensions` type from `@codemcp/ade-core` to enable
Level 1 as a zero-cost baseline for JS consumers.

Concretely:

1. `AdeExtensions` is defined as a TypeScript interface in `@codemcp/ade-core` and exported
   from its public index.

2. A corresponding `AdeExtensionsSchema` Zod schema is defined alongside the interface.
   The CLI's `loadExtensions(projectRoot)` function validates every loaded extension object
   against this schema and throws a structured error if validation fails.

3. The extension loader searches for files in this order:
   `ade.extensions.ts` → `ade.extensions.mjs` → `ade.extensions.js`
   The first match is loaded. `.ts` files are loaded via `jiti`; `.mjs`/`.js` files via
   native `import()`.

4. `jiti` is added as a production dependency of `@codemcp/ade-cli`.

## Consequences

**Easier:**

- Consumers writing `ade.extensions.ts` get full IDE type checking and compile-time errors
  — the same authoring experience as editing the upstream source directly.
- All consumers (JS and TS) get clear, structured error messages at `ade setup` time if
  their extension file is malformed, rather than cryptic failures during resolution.
- The `AdeExtensions` type and JSDoc `@type` path give JS consumers a zero-friction
  upgrade path toward type safety without requiring a build step.
- The fork scenario (editing CLI TypeScript source directly) retains full compile-time
  safety with no additional tooling.

**More difficult / trade-offs:**

- Adding `jiti` as a dependency introduces a transitive dependency surface (~400 kB
  unpacked, no native binaries). This is a deliberate trade-off accepted in exchange for
  `.ts` extension support.
- Zod must be kept as a runtime dependency of `@codemcp/ade-core` (it already is, or will
  be added). The `AdeExtensionsSchema` must be kept in sync with the `AdeExtensions`
  interface — a dual-maintenance surface. A build-time `zod-to-ts` or `ts-to-zod` step
  could eliminate this in the future if drift becomes a problem.
- Dynamic loading of arbitrary user files (via `import()` or `jiti`) means the CLI cannot
  be fully type-checked end-to-end at its own build time. The Zod boundary is the explicit
  trust boundary between upstream-typed code and user-supplied code.
