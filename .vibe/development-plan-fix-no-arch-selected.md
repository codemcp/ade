# Development Plan: ade (fix-no-arch-selected branch)

_Generated on 2026-03-18 by Vibe Feature MCP_
_Workflow: [bugfix](https://mrsimpson.github.io/responsible-vibe-mcp/workflows/bugfix)_

## Goal

Fix bug where CLI adds takstack skills and docsets even when "skip" is selected for architecture option

## Reproduce

<!-- beads-phase-id: ade-1.1 -->

### Tasks

_Tasks managed via `bd` CLI_

## Analyze

<!-- beads-phase-id: ade-1.2 -->

### Phase Entrance Criteria:

- [ ] The bug has been successfully reproduced
- [ ] Steps to reproduce are documented
- [ ] Expected vs actual behavior is clearly defined

### Tasks

_Tasks managed via `bd` CLI_

## Fix

<!-- beads-phase-id: ade-1.3 -->

### Phase Entrance Criteria:

- [ ] Root cause of the bug has been identified
- [ ] Code location causing the issue is pinpointed
- [ ] Fix approach has been determined

### Tasks

_Tasks managed via `bd` CLI_

## Verify

<!-- beads-phase-id: ade-1.4 -->

### Phase Entrance Criteria:

- [ ] Bug fix has been implemented
- [ ] Code changes are complete
- [ ] Fix addresses the root cause

### Tasks

_Tasks managed via `bd` CLI_

## Finalize

<!-- beads-phase-id: ade-1.5 -->

### Phase Entrance Criteria:

- [ ] Bug fix has been verified to work correctly
- [ ] No regression issues introduced
- [ ] Testing confirms the issue is resolved

### Tasks

_Tasks managed via `bd` CLI_

## Key Decisions

_Important decisions will be documented here as they are made_

## Notes

_Additional context and observations_

### Bug Reproduction Results

- Successfully reproduced CLI setup with architecture "Skip" selected
- Configuration files show NO TanStack skills or docsets were added
- Only ADR (Nygard) skills were added from Practices selection
- The error was about missing local skill files, not incorrect skill selection
- **Initial bug report may be inaccurate** - need to clarify with reporter what exactly they observed

### Investigation Results

- Tested backpressure facet visibility logic when architecture is skipped
- Confirmed that NO TanStack-specific options are visible when architecture is undefined
- The `getVisibleOptions` function correctly filters out conditional options when dependencies are not met
- All TanStack-related options have `available: (deps) => deps["architecture"]?.id === "tanstack"` which returns `false` when architecture is skipped

### Conclusion

**The reported bug cannot be reproduced.** The CLI correctly excludes TanStack skills and docsets when architecture is skipped. The bug report may be based on a misunderstanding or a different scenario not yet identified.

---

_This plan is maintained by the LLM and uses beads CLI for task management. Tool responses provide guidance on which bd commands to use for task management._
