# Development Plan: ade (extension-override-skills branch)

*Generated on 2026-03-20 by Vibe Feature MCP*
*Workflow: [epcc](https://mrsimpson.github.io/responsible-vibe-mcp/workflows/epcc)*

## Goal
Allow extension-contributed skills to declare that they replace/supersede generic baseline skills registered by the process option (`codemcp-workflows-skilled`). The resolver should deduplicate the final skills list so that only the effective (non-replaced) skills are shown and installed.

## Explore
<!-- beads-phase-id: ade-9.1 -->
### Tasks
- [x] Understand current skill registration flow (process → recipe → skills writer → LogicalConfig)
- [x] Identify the exact duplication: `codemcp-workflows-skilled` registers 5 generic skills; architecture extensions like `sabdx-frontend` register domain-specific replacements with different names
- [x] Evaluate solution options (replaces field, baseline priority, excludes at option level)
- [x] Agree on preferred approach: `replaces?: string[]` on `SkillDefinition`

### Phase Entrance Criteria:
*(initial phase — no prior phase)*

## Plan
<!-- beads-phase-id: ade-9.2 -->
### Tasks

*Tasks managed via `bd` CLI*

### Phase Entrance Criteria:
- [ ] The problem is clearly understood: duplicate generic + domain-specific skills shown at setup
- [ ] At least two solution alternatives have been evaluated
- [ ] The preferred approach (`replaces` field on `SkillDefinition`) is agreed upon
- [ ] Scope is clear: which files are touched

## Code
<!-- beads-phase-id: ade-9.3 -->
### Tasks

*Tasks managed via `bd` CLI*

### Phase Entrance Criteria:
- [ ] Concrete implementation plan is documented (what changes in which file)
- [ ] Edge cases are identified (ordering, name-collision, TUI display)
- [ ] Test strategy is defined

## Commit
<!-- beads-phase-id: ade-9.4 -->
### Tasks
- [ ] Squash WIP commits: `git reset --soft <first commit of this branch>`. Then, create a conventional commit. In the message, first summarize the intentions and key decisions from the development plan. Then, add a brief summary of the key changes and their side effects and dependencies.

*Tasks managed via `bd` CLI*

### Phase Entrance Criteria:
- [ ] All implementation tasks are done and tests pass
- [ ] The `replaces` field works end-to-end (resolver deduplicates, TUI shows reduced list)
- [ ] No regressions in existing resolver tests

## Key Decisions

### KD-1: Add `replaces?: string[]` to `SkillDefinition`
Both `InlineSkill` and `ExternalSkill` get an optional `replaces` field. Extension authors list the generic skill names they supersede. Deduplication happens as a post-processing step in the resolver (`resolve()` in `resolver.ts`).

### KD-2: Deduplication strategy — last-writer-wins + replaces set
After all provisions are merged, the resolver:
1. Builds a Set of all names that appear in any skill's `replaces` array.
2. Deduplicates by name (last occurrence wins, preserving insertion order otherwise) using a Map.
3. Filters out any skill whose `name` is in the replaced-names Set.

This means: if `sabdx-architecture` declares `replaces: ["architecture"]`, the generic `architecture` skill is dropped. The final list contains `sabdx-architecture` only.

### KD-3: Skill file names on disk — unchanged
Skills are written to `.ade/skills/<name>/SKILL.md` by `writeInlineSkills()` in `util.ts`.
- The generic `architecture` skill → `.ade/skills/architecture/SKILL.md`
- The replacing `sabdx-architecture` skill → `.ade/skills/sabdx-architecture/SKILL.md`

Because `architecture` is filtered out **before** `writeInlineSkills()` is called, **no file is written for `architecture`**. Only `sabdx-architecture/SKILL.md` ends up on disk. The `replaces` field is a resolver-level concern; it does not need to be written to SKILL.md frontmatter.

### KD-4: `replaces` field is stripped before writing SKILL.md
`writeInlineSkills()` uses the skill's `name`, `description`, and `body` for the SKILL.md frontmatter. The `replaces` field is simply ignored during file writing — no changes needed in `util.ts`.

### KD-5: `replaces` field is NOT persisted in `config.lock.yaml`
The lock file records `logical_config`, which is the *post-dedup* skills list. Replaced skills never appear in the lock file.

### KD-6: Ordering — extensions should register skills after process
The resolver processes facets in `sortFacets()` order. The `architecture` facet comes after `process`, so extension skills are appended after the generic ones. The last-writer-wins Map dedup naturally lets extension skills win. But `replaces` is independent of ordering — it is an explicit declaration.

## Notes

### Full flow for the sadb-frontend scenario
1. `codemcp-workflows-skilled` recipe runs → appends to `result.skills`: `[starting-project, architecture, application-design, coding, testing]`
2. `sabdx-frontend` recipe runs → appends: `[sabdx-tasks, sabdx-starting-project{replaces:["starting-project"]}, sabdx-architecture{replaces:["architecture"]}, sabdx-application-design{replaces:["application-design"]}, sabdx-coding{replaces:["coding"]}, sabdx-testing{replaces:["testing"]}, tdd]`
3. `conventional-commits` recipe runs → appends: `[conventional-commits]`
4. Raw merged list: 13 skills
5. Post-dedup (name Map + replaces filter): 8 skills remain — `[sabdx-tasks, sabdx-starting-project, sabdx-architecture, sabdx-application-design, sabdx-coding, sabdx-testing, tdd, conventional-commits]`
6. `writeInlineSkills()` writes SKILL.md files for the 6 inline sabdx-* skills under `.ade/skills/<name>/`
7. `installSkills()` installs all 8 into `.agentskills/skills/`

### What files exist on disk after setup
- `.ade/skills/sabdx-tasks/SKILL.md`
- `.ade/skills/sabdx-starting-project/SKILL.md`
- `.ade/skills/sabdx-architecture/SKILL.md`
- `.ade/skills/sabdx-application-design/SKILL.md`
- `.ade/skills/sabdx-coding/SKILL.md`
- `.ade/skills/sabdx-testing/SKILL.md`
- NO `.ade/skills/architecture/SKILL.md` (replaced, never written)
- NO `.ade/skills/starting-project/SKILL.md` (replaced, never written)
- etc.

### The `tdd` skill from the extension — no `replaces` needed
`tdd` is an external skill (`source: "mrsimpson/skills-coding"`) and there is no generic `tdd` skill in `codemcp-workflows-skilled`. No clash.

---
*This plan is maintained by the LLM and uses beads CLI for task management. Tool responses provide guidance on which bd commands to use for task management.*
