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
*Important decisions will be documented here as they are made*

## Notes
*Additional context and observations*

---
*This plan is maintained by the LLM and uses beads CLI for task management. Tool responses provide guidance on which bd commands to use for task management.*
