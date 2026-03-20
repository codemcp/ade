# Development Plan: ade (fix-zod branch)

*Generated on 2026-03-20 by Vibe Feature MCP*
*Workflow: [bugfix](https://mrsimpson.github.io/responsible-vibe-mcp/workflows/bugfix)*

## Goal
Fix the packaged version of `@codemcp/ade` CLI failing with `ERR_MODULE_NOT_FOUND` for `zod` after the latest extensibility enhancement.

## Reproduce
<!-- beads-phase-id: ade-8.1 -->
### Tasks

- [ ] Identify where `zod` was introduced in the codebase
- [ ] Understand whether `zod` is listed as a dependency or devDependency
- [ ] Confirm the build/bundle configuration to determine if it should be bundled or declared external

## Analyze
<!-- beads-phase-id: ade-8.2 -->

### Phase Entrance Criteria:
- [ ] The bug is reproducible or the root cause is clear from code inspection
- [ ] The affected code path is identified

### Tasks

- [ ] Determine why `zod` is not bundled into the CLI dist output
- [ ] Check build configuration (tsup / rollup / esbuild)
- [ ] Identify whether `zod` should be bundled or added as a runtime dependency

## Fix
<!-- beads-phase-id: ade-8.3 -->

### Phase Entrance Criteria:
- [ ] Root cause is clearly understood and documented
- [ ] Fix strategy is decided (bundle vs. add dependency)

### Tasks

- [ ] Apply fix (either bundle zod or add it as a real dependency)
- [ ] Verify the dist output includes or correctly references zod

## Verify
<!-- beads-phase-id: ade-8.4 -->

### Phase Entrance Criteria:
- [ ] Fix has been applied
- [ ] Build has been re-run

### Tasks

- [ ] Build the CLI package
- [ ] Verify the packaged CLI starts without `ERR_MODULE_NOT_FOUND`

## Finalize
<!-- beads-phase-id: ade-8.5 -->

### Phase Entrance Criteria:
- [ ] All verify tasks pass
- [ ] No regressions introduced

### Tasks
- [ ] Squash WIP commits: `git reset --soft <first commit of this branch>`. Then, Create a conventional commit. In the message, first summarize the intentions and key decisions from the development plan. Then, add a brief summary of the key changes and their side effects and dependencies

## Key Decisions
- **Bundle `zod` into CLI dist**: `zod` was added to `@codemcp/ade-core` for runtime validation of the new extension API (`AdeExtensionsSchema` in `types.ts`). The core package is built with plain `tsc`, leaving a bare `import { z } from "zod"` in its dist output. Since the CLI's tsup config inlines core via `noExternal`, but tsup does not recursively bundle core's own external deps, `zod` ended up as an unbundled external reference in the CLI output — causing `ERR_MODULE_NOT_FOUND` when installed globally via npx. Fix: add `"zod"` to `noExternal` in `packages/cli/tsup.config.ts` so tsup bundles it alongside the other inlined packages.

## Notes
- The `yaml` package is in core's dependencies too — it also gets pulled in transitively. Currently yaml is also listed as a direct dep of CLI and appears to be handled differently (likely already bundled or handled via noExternal path). Worth monitoring if the same pattern would affect yaml in future.
- Bundle size went from ~1.26 MB to ~1.32 MB after adding zod (expected, zod is ~50 KB minified).

---
*This plan is maintained by the LLM and uses beads CLI for task management. Tool responses provide guidance on which bd commands to use for task management.*
