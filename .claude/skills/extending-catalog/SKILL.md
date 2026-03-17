---
name: extending-catalog
description: Extends the ADE catalog with new facets, options, or practices. Use when adding a new architecture (e.g. Next.js), a new practice (e.g. Trunk-Based Development), or a new facet to the catalog.
---

# Extending the ADE catalog

Catalog: `packages/core/src/catalog/`. Facets: one file each under `facets/`. Types: `packages/core/src/types.ts`.

## Adding an option

Single-file change. Append an `Option` to the facet's `options` array. Read the existing facet file for the shape — follow the pattern already there.

- Architecture options go in `facets/architecture.ts` (single-select)
- Practice options go in `facets/practices.ts` (multi-select, stack-independent)
- Each option's `recipe` uses existing writers: `skills`, `workflows`, `instruction`, `mcp-server`, `knowledge`, `installable`
- Inline skill bodies should be concise — only add context Claude doesn't already have
- For third-party skills use `ExternalSkill`: `{ name, source }` instead of `{ name, description, body }`
- `docsets` are optional — only add repos with genuinely useful reference docs

## Adding a facet

1. Create `facets/<name>.ts` — export a `Facet` object. Read an existing facet for the shape
2. Register it in `packages/core/src/catalog/index.ts` — add to the `facets` array
3. The CLI auto-discovers facets from the array — no UI changes needed

Key decisions: `required` (must every project choose?), `multiSelect` (composable or mutually exclusive?), `dependsOn` (resolved after which facets?).

## Adding a provision writer

Expensive — touches types, registry, resolver, and every harness writer. Avoid unless existing writers cannot express the output.

1. Extend `ProvisionWriter` union in `types.ts`
2. Implement `ProvisionWriterDef` with `write(config, context) → Partial<LogicalConfig>`
3. Register in `WriterRegistry`
4. If needed, extend `LogicalConfig` and update merge logic in `resolver.ts`
5. Update every harness writer in `packages/harnesses/src/writers/`

## Resolution flow

`UserConfig.choices` → `resolve()` iterates facets → matches options → runs each provision's writer → merges into `LogicalConfig` → harness writers emit agent-specific files. See `packages/core/src/resolver.ts`.
