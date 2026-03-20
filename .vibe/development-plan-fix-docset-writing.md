# Development Plan: ade (fix-docset-writing branch)

*Generated on 2026-03-20 by Vibe Feature MCP*
*Workflow: [epcc](https://mrsimpson.github.io/responsible-vibe-mcp/workflows/epcc)*

## Goal

Refactor: collapse `option.docsets[]` into a `docset` provision writer in the recipe.

**Background:** Currently `Option` has two separate mechanisms for contributing to `knowledge_sources`:
1. `recipe[]` entries with provision writers (skills, git-hooks, instruction, etc.)
2. A separate `docsets?: DocsetDef[]` sibling field — with its own confirmation UI, per-item exclusion (`excluded_docsets`), and `collectDocsets()` helper

The `docsets` field was kept separate to support per-docset user confirmation/exclusion. But this is inconsistent with how skills work — skills are presented as a bulk "install N skills?" prompt, not a per-skill multiselect. Docsets should follow the same pattern: a `docset` provision writer in the recipe that contributes to `knowledge_sources`, with a bulk defer prompt (matching skills), and no per-item exclusion UI.

**Target design:**
- `Option.docsets?: DocsetDef[]` → removed
- new `docset` provision writer → pushes a `KnowledgeSource` to `knowledge_sources[]`
- confirmation/exclusion multiselect in `setup.ts` → removed
- `excluded_docsets` in `UserConfig` → removed
- `collectDocsets()` → removed

## Explore
<!-- beads-phase-id: ade-11.1 -->
### Tasks

*Tasks managed via `bd` CLI*

## Plan
<!-- beads-phase-id: ade-11.2 -->

### Phase Entrance Criteria
- [ ] All usages of `docsets`, `collectDocsets`, `excluded_docsets` are catalogued
- [ ] Scope and approach are clearly understood

### Tasks

*Tasks managed via `bd` CLI*

## Code
<!-- beads-phase-id: ade-11.3 -->

### Phase Entrance Criteria
- [ ] Plan is complete and agreed
- [ ] New `docset` writer shape is defined
- [ ] All affected files are identified

### Tasks

*Tasks managed via `bd` CLI*

## Commit
<!-- beads-phase-id: ade-11.4 -->

### Phase Entrance Criteria
- [ ] All tests pass
- [ ] No references to `docsets`, `collectDocsets`, or `excluded_docsets` remain in production code

### Tasks
- [ ] Squash WIP commits: `git reset --soft <first commit of this branch>`. Then, create a conventional commit. In the message, first summarize the intentions and key decisions from the development plan. Then, add a brief summary of the key changes and their side effects and dependencies.

*Tasks managed via `bd` CLI*

## Key Decisions

- `docsets` as a sibling field on `Option` exists solely to support per-item confirmation/exclusion — a UI concern, not a data model concern
- Skills set the right precedent: bulk defer prompt, no per-item opt-out
- The `docset` provision writer config shape should match `DocsetDef`: `{ id, label, origin, description }`
- Mapping: writer config `id` → `KnowledgeSource.name`, `description` → `KnowledgeSource.description`, `origin` → `KnowledgeSource.origin`

## Notes

- Previous WIP commit on `fix-docset-writing`: removed `knowledge` writer, wired `installKnowledge` into setup/install
- The `knowledge.ts` writer file still exists on disk (dead code) — can be deleted as part of this refactor

---
*This plan is maintained by the LLM and uses beads CLI for task management. Tool responses provide guidance on which bd commands to use for task management.*
