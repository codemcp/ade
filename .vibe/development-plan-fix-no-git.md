# Development Plan: ade (fix-no-git branch)

*Generated on 2026-03-19 by Vibe Feature MCP*
*Workflow: [bugfix](https://mrsimpson.github.io/responsible-vibe-mcp/workflows/bugfix)*

## Goal
Fix `writeGitHooks` crashing with ENOENT when run in a non-git directory. Instead of throwing, it should detect the absence of `.git` and emit a warning, then skip gracefully (Option B).

## Reproduce
<!-- beads-phase-id: ade-4.1 -->
### Bug Description
When `ade setup` is run in a non-git directory and pre-commit hooks are configured, `writeGitHooks` tries to open `.git/hooks/pre-commit` for writing. Since `.git` doesn't exist, Node throws `ENOENT` and the whole process crashes.

### Error
```
Error: ENOENT: no such file or directory, open '/private/tmp/manual-test/.git/hooks/pre-commit'
```

### Root Cause (already identified via code reading)
`packages/harnesses/src/util.ts` → `writeGitHooks()` writes directly to `.git/hooks/<phase>` without checking if `.git` exists.

### Tasks

## Analyze
<!-- beads-phase-id: ade-4.2 -->
### Phase Entrance Criteria
- [x] Bug is reproducible and root cause is identified.
- [x] Affected code location is known (`writeGitHooks` in `packages/harnesses/src/util.ts`).

### Analysis
- `writeGitHooks` is a shared utility called by every harness writer (universal, cursor, copilot, cline, claude-code, roo-code, opencode, kiro, windsurf).
- The fix belongs in `writeGitHooks` itself — one place, all callers benefit.
- Chosen approach: **Option B** — check for `.git` existence; if absent, emit a `clack.log.warn(...)` and return early. This keeps the user informed (backpressure) without crashing.
- `clack` is already used throughout the codebase; it is available in `util.ts`.

### Tasks

## Fix
<!-- beads-phase-id: ade-4.3 -->
### Phase Entrance Criteria
- [x] Root cause is confirmed to be in `writeGitHooks`.
- [x] Fix strategy (Option B: warn + skip) is agreed upon.

### Tasks
- [ ] In `writeGitHooks`: use `fs/promises.access` to check for `.git` directory existence before writing hooks.
- [ ] If `.git` is absent, call `clack.log.warn(...)` with a clear message and return.
- [ ] Also ensure `.git/hooks` directory is created if `.git` exists but `hooks` subdir is missing (use `mkdir` with `recursive: true`).
- [ ] Add / update unit tests in `install.spec.ts` or `util.spec.ts` to cover the non-git-repo case.

## Verify
<!-- beads-phase-id: ade-4.4 -->
### Phase Entrance Criteria
- [ ] `writeGitHooks` checks for `.git` existence and warns instead of crashing.
- [ ] `.git/hooks` dir is created when `.git` exists but `hooks` subdir is missing.
- [ ] Unit tests cover the new behavior.

### Tasks
- [ ] Run existing test suite and confirm no regressions.
- [ ] Manually verify the warning message is shown when run outside a git repo.

## Finalize
<!-- beads-phase-id: ade-4.5 -->
### Phase Entrance Criteria
- [ ] All tests pass.
- [ ] Warning behavior verified.

### Tasks
- [ ] Squash WIP commits: `git reset --soft <first commit of this branch>`. Then, create a conventional commit. In the message, first summarize the intentions and key decisions from the development plan. Then, add a brief summary of the key changes and their side effects and dependencies.

## Key Decisions
- **Option B (warn + skip)** chosen over silent skip so users receive feedback that hooks were not installed — this preserves backpressure (user knows something was skipped).
- Fix is centralised in `writeGitHooks` utility; no changes needed in individual harness writers.

## Notes
- `clack` import must be added to `util.ts` if not already present.
- All harness writers already import `writeGitHooks` from `../util.js` — no call-site changes needed.
