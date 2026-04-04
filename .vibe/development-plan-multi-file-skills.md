# Development Plan: ade (multi-file-skills branch)

*Generated on 2026-04-04 by Vibe Feature MCP*
*Workflow: [epcc](https://mrsimpson.github.io/responsible-vibe-mcp/workflows/epcc)*

## Goal

Support **multi-part inline skills** so that skills defined in `ade.extensions.mjs` can supply not just a `body` (SKILL.md content) but also **additional asset files** (references, scripts, etc.) placed in subdirectories of the skill folder, following the agentskills.io "progressive disclosure" pattern.

## Key Decisions

### KD-1: Asset format — flat path-keyed map

Inline skills in `ade.extensions.mjs` will declare additional files via a flat `assets` map where each key is a relative path (the path signals both type and filename):

```js
{
  name: "sabdx-architecture",
  description: "...",
  body: "# Architecture\n\nSee [folder structure](references/folder-structure.md)\n...",
  assets: {
    "references/folder-structure.md": "## Folder Structure\n\nDetailed content...",
    "references/file-naming.md": "## File Naming\n\n...",
    "scripts/setup.sh": "#!/bin/bash\n..."
  }
}
```

**Rationale:** The path itself carries the type and filename, maps 1:1 to the output file structure under `.ade/skills/<name>/`, requires no comment-marker parsing in the Markdown body, and is trivially extensible to new asset types (just use a new path prefix).

### KD-2: No inline markers in body

The `<!-- reference: name -->` HTML comment marker approach (previously observed in consumer extension files) is **not adopted** in ADE core. Authors reference asset files naturally in Markdown: `[see details](references/folder-structure.md)`.

### KD-3: Type extension — `assets` field added to `InlineSkill`

`InlineSkill` in `packages/core/src/types.ts` gains an optional `assets?: Record<string, string>` field. Keys are relative paths; values are file contents.

### KD-4: Bug in existing `writeInlineSkills` (fix as part of this work)

In `packages/harnesses/src/util.ts:233-244`, there is an inverted logic bug:
- When existing file **matches** expected content, it adds to `modified` and `continue`s (skipping the write) — correct behavior would be to do nothing
- When existing file **differs** (or doesn't exist), it falls through to the write — but `modified` isn't populated in this case

The correct logic should be: add to `modified` when the file differs (or is new), and skip the write when content is identical. This will be fixed alongside the asset writing work.

## Notes

### Agentskills.io progressive disclosure pattern
1. **Metadata** (~100 tokens): `name` + `description` in SKILL.md frontmatter — loaded at startup
2. **Instructions** (<5000 tokens): Full SKILL.md body — loaded when skill is activated
3. **Resources**: Files in `references/`, `scripts/`, `assets/` — loaded only when needed

### Current relevant files
- `packages/core/src/types.ts` — `InlineSkill` type
- `packages/core/src/writers/skills.ts` — skills provision writer (minimal pass-through)
- `packages/core/src/writers/skills.spec.ts` — skills writer tests
- `packages/harnesses/src/util.ts` — `writeInlineSkills()` — writes SKILL.md to `.ade/skills/<name>/`
- `packages/harnesses/src/skills-installer.ts` — `installSkills()` — calls agentskills runAdd
- `packages/cli/src/commands/install.ts`, `setup.ts`, `configure.ts` — invoke writeInlineSkills + installSkills

### Implementation tasks (Code phase)

**T1: Extend `InlineSkill` type** (`packages/core/src/types.ts`)
- Add `assets?: Record<string, string>` field to `InlineSkill`
- Keys are relative paths like `"references/folder-structure.md"` or `"scripts/setup.sh"`
- Values are file contents (strings)
- Add JSDoc explaining the path-as-type convention

**T2: Fix bug in `writeInlineSkills`** (`packages/harnesses/src/util.ts`)
- The existing logic is inverted: it currently marks a skill as `modified` when the file is **unchanged** and writes when it differs — swap the logic
- Correct behavior: add to `modified` when content differs or file is new; skip write when identical

**T3: Write asset files in `writeInlineSkills`** (`packages/harnesses/src/util.ts`)
- After writing `SKILL.md`, iterate over `skill.assets` if present
- For each entry `(relativePath, content)`:
  - Resolve full path: `join(skillDir, relativePath)`
  - Create parent directory with `mkdir(..., { recursive: true })`
  - Write file content
  - Track in `modified` if content differs from existing
- No special handling needed per asset type — the path convention is entirely up to the consumer

**T4: Update tests in `skills.spec.ts`** (`packages/core/src/writers/skills.spec.ts`)
- Add test: `assets` field is passed through on inline skills (single asset)
- Add test: multiple assets with different path prefixes are all preserved

**T5: Add/update tests for `writeInlineSkills`** (in `packages/harnesses/` test suite, if it exists; otherwise add tests)
- Test: skill with no assets writes only `SKILL.md`
- Test: skill with `assets` writes `SKILL.md` + each asset file at correct relative path
- Test: asset files in subdirectories (e.g. `references/foo.md`) have their parent dirs created
- Test: unchanged assets are not re-written (idempotent); changed assets are tracked in `modified`
- Test: bug fix — verify `modified` is populated correctly

**T6: Update plan file and transition to Commit phase**

## Accomplished

- ✅ T1: Added `assets?: Record<string, string>` to `InlineSkill` in `packages/core/src/types.ts` with JSDoc
- ✅ T2: Fixed inverted logic bug in `writeInlineSkills` — now correctly marks skill as modified only when content differs
- ✅ T3: Extended `writeInlineSkills` to write asset files — iterates `skill.assets`, resolves full paths, creates parent dirs, writes content, tracks in `modified`
- ✅ T4: Added two new tests in `skills.spec.ts` — single asset pass-through, multiple assets with different path prefixes
- ✅ T5: Added 10 new tests in `util.spec.ts` for `writeInlineSkills` — new skill, idempotency, modified detection, assets, subdirs, deduplication
- ✅ Full test suite: 254 tests across 32 files — all pass
- ✅ Typecheck: all 3 packages clean

### KD-5: `InlineSkill` import in `util.ts`
Added `InlineSkill` to the explicit import from `@codemcp/ade-core` in `packages/harnesses/src/util.ts`. The harness resolves the type from `packages/core/dist/` (symlinked via pnpm workspace), so rebuilding core was required before the LSP and `tsc` agreed on the new type.

## Explore
<!-- beads-phase-id: ade-14.1 -->
### Tasks
<!-- beads-synced: 2026-04-04 -->
*Auto-synced — do not edit here, use `bd` CLI instead.*


## Plan
<!-- beads-phase-id: ade-14.2 -->
### Tasks
<!-- beads-synced: 2026-04-04 -->
*Auto-synced — do not edit here, use `bd` CLI instead.*


## Code
<!-- beads-phase-id: ade-14.3 -->
### Tasks
<!-- beads-synced: 2026-04-04 -->
*Auto-synced — do not edit here, use `bd` CLI instead.*


## Commit
<!-- beads-phase-id: ade-14.4 -->
### Tasks
<!-- beads-synced: 2026-04-04 -->
*Auto-synced — do not edit here, use `bd` CLI instead.*

