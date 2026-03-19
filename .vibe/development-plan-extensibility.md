# Development Plan: ade (main branch)

*Generated on 2026-03-19 by Vibe Feature MCP*
*Workflow: [epcc](https://mrsimpson.github.io/responsible-vibe-mcp/workflows/epcc)*

## Goal

Make the ADE project extensible so that forks/downstream consumers can add new facets, options, and harness writers without modifying the upstream source files. The goal is upstream-compatibility — consumers should be able to pull upstream changes without merge conflicts caused by modifications to core catalog or registry files.

## Explore
<!-- beads-phase-id: ade-6.1 -->
### Tasks
- [x] Explore codebase structure: packages/core, packages/harnesses, packages/cli
- [x] Understand how catalog, registry, and writers are wired together
- [x] Identify all the places consumers currently need to modify to extend

### Findings

**Current extension points require modifying upstream files:**
1. **Adding a new facet/option** → must edit `packages/core/src/catalog/index.ts` (`getDefaultCatalog()`) and add a new file in `catalog/facets/`
2. **Adding a new provision writer** → must edit `packages/core/src/registry.ts` (`createDefaultRegistry()`) 
3. **Adding a new harness writer** → must edit `packages/harnesses/src/index.ts` (`allHarnessWriters` array + `getHarnessWriter` + `getHarnessIds`)
4. **Wiring it all into the CLI** → `packages/cli/src/index.ts` calls `getDefaultCatalog()` and relies on `allHarnessWriters` from harnesses

**Existing infrastructure that's already extensible:**
- `WriterRegistry` + `registerProvisionWriter/registerAgentWriter` already exist as a general-purpose registry
- `Catalog` and `Facet` types are public and composable
- `createRegistry()` + `createDefaultRegistry()` already allow building custom registries
- `resolve()` accepts a `Catalog` and `WriterRegistry` — so it's already injection-ready
- `runSetup(projectRoot, catalog)` already takes a `catalog` parameter

**Key insight:** The CLI's `index.ts` is the main wiring point. It hardcodes `getDefaultCatalog()` and `allHarnessWriters`. The CLI needs a plugin/extension loading mechanism so forks can inject their extensions without modifying the upstream entry point.

## Plan
<!-- beads-phase-id: ade-6.2 -->

### Phase Entrance Criteria:
- [x] The codebase has been thoroughly explored
- [x] Current extension points and blockers are identified
- [x] It's clear what's in scope and what's out of scope

### Tasks

*Tasks managed via `bd` CLI*

## Code
<!-- beads-phase-id: ade-6.3 -->

### Phase Entrance Criteria:
- [ ] Design is documented and reviewed
- [ ] Scope is agreed upon: what changes are needed and where
- [ ] No open design questions remain

### Tasks

*Tasks managed via `bd` CLI*

## Commit
<!-- beads-phase-id: ade-6.4 -->

### Phase Entrance Criteria:
- [ ] All code changes are implemented and tested
- [ ] Existing tests pass
- [ ] The extension mechanism works end-to-end (catalog + writers + harnesses injectable)

### Tasks
- [ ] Squash WIP commits: `git reset --soft <first commit of this branch>`. Then, create a conventional commit. In the message, first summarize the intentions and key decisions from the development plan. Then, add a brief summary of the key changes and their side effects and dependencies

*Tasks managed via `bd` CLI*

## Key Decisions

### KD-1: Extension model — `ade.extensions.mjs` with declarative contributions

A consumer creates `ade.extensions.mjs` (or `.js`) in their project (or in a forked CLI's src dir).
The CLI loads it via dynamic `import()` at startup and merges contributions before resolving.

The extension file exports a default object conforming to `AdeExtensions`:

```ts
interface AdeExtensions {
  // Contribute new options into existing facets (e.g. add "SAP" to "architecture")
  facetContributions?: Record<string, Option[]>
  // Register entirely new facets
  facets?: Facet[]
  // Register new provision writers (e.g. a "sap-config" writer)
  provisionWriters?: ProvisionWriterDef[]
  // Register new harness writers (e.g. a custom IDE)
  harnessWriters?: HarnessWriter[]
}
```

**Why this model:**
- `facetContributions` (keyed by facet id) is the right primitive for the SAP use case:
  SAP is a new *option* inside the existing `architecture` facet, not a new facet.
- `facets` covers the case where a consumer wants to add a completely new facet (e.g. "cloud-provider").
- `provisionWriters` and `harnessWriters` cover the writer extension cases.
- The consumer never needs to modify upstream files.
- Dynamic `import()` means no build step required for `.mjs` extensions.

### KD-2: Loading location

The extension file is resolved relative to the **project root** passed to the CLI.
Search order: `ade.extensions.mjs` → `ade.extensions.js` (first match wins).
This works for both the "consumer uses npx @codemcp/ade setup" case and the "fork scenario".

### KD-3: Type exports

`AdeExtensions`, `HarnessWriter` (re-exported from harnesses), and all catalog/writer types
are already exported from `@codemcp/ade-core`. We need to add `AdeExtensions` to the exports.
No breaking changes to existing APIs.

### KD-4: SAP example placement

The SAP example (`sap` option on the `architecture` facet) will be implemented as a concrete
`ade.extensions.mjs` example file **in the repo root** (not bundled into the catalog).
This doubles as the integration test and documentation for the extension mechanism.

### KD-5: Type safety for extension loading → documented in `docs/adrs/0002-extension-file-type-safety.md`

Runtime Zod validation (always) + `jiti` for `.ts` extension files + `AdeExtensions` type export for JSDoc consumers.

## Notes

**SAP Architecture option shape** (what the consumer writes):
```js
// ade.extensions.mjs
import { } from '@codemcp/ade-core'  // types only if needed

const sapOption = {
  id: 'sap',
  label: 'SAP',
  description: 'SAP development with ABAP, CAP (Cloud Application Programming model), and BTP',
  recipe: [
    {
      writer: 'skills',
      config: {
        skills: [
          { name: 'sap-architecture', description: '...', body: '...' },
          { name: 'sap-design', description: '...', body: '...' },
        ]
      }
    }
  ],
  docsets: [
    { id: 'cap-docs', label: 'SAP CAP', origin: 'https://github.com/SAP/cloud-sdk.git', description: '...' }
  ]
}

export default {
  facetContributions: {
    architecture: [sapOption]
  }
}
```

The CLI then calls `mergeExtensions(catalog, registry, extensions)` before running setup/install.

**Files to create/modify:**
1. `packages/core/src/types.ts` — add `AdeExtensions` type
2. `packages/core/src/catalog/index.ts` — add `mergeExtensions(catalog, extensions)` function
3. `packages/core/src/index.ts` — export `AdeExtensions` and `mergeExtensions`
4. `packages/cli/src/extensions.ts` — new file: `loadExtensions(projectRoot)` using dynamic import
5. `packages/cli/src/index.ts` — load extensions and pass merged catalog/registry to setup/install
6. `packages/harnesses/src/index.ts` — expose `mergeHarnessWriters` or accept additional writers
7. `ade.extensions.mjs` — example file in repo root with the SAP architecture option

---
*This plan is maintained by the LLM and uses beads CLI for task management. Tool responses provide guidance on which bd commands to use for task management.*
