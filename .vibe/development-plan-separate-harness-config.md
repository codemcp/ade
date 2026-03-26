# Development Plan: ade (separate-harness-config branch)

*Generated on 2026-03-26 by Vibe Feature MCP*
*Workflow: [epcc](https://mrsimpson.github.io/responsible-vibe-mcp/workflows/epcc)*

## Goal
Separate the generated configuration into two distinct concerns:
1. **Development choices** — processes, architecture, practices (stable, project-level config)
2. **Harness config** — autonomy settings (mutable independently, e.g. more/less autonomous)

## Explore
<!-- beads-phase-id: ade-12.1 -->
### Tasks

*Tasks managed via `bd` CLI*

## Plan
<!-- beads-phase-id: ade-12.2 -->
### Phase Entrance Criteria:
- [ ] The current structure of generated config files is understood
- [ ] It's clear which parts belong to "development choices" vs "harness config"
- [ ] Use cases for changing harness config independently are documented
- [ ] Scope and out-of-scope items are defined

### Tasks

*Tasks managed via `bd` CLI*

## Code
<!-- beads-phase-id: ade-12.3 -->
### Phase Entrance Criteria:
- [ ] A clear design/approach has been chosen and documented
- [ ] The target file structure is defined (e.g. separate files, dedicated sections)
- [ ] Impact on existing functionality is assessed

### Tasks

*Tasks managed via `bd` CLI*

## Commit
<!-- beads-phase-id: ade-12.4 -->
### Phase Entrance Criteria:
- [ ] All code changes are implemented and tested
- [ ] The separation of concerns works correctly end-to-end
- [ ] No regressions introduced

### Tasks
- [ ] Squash WIP commits: `git reset --soft <first commit of this branch>`. Then, create a conventional commit. In the message, first summarize the intentions and key decisions from the development plan. Then, add a brief summary of the key changes and their side effects and dependencies

*Tasks managed via `bd` CLI*

## Key Decisions

### Decision: setup wizard only covers dev choices; configure covers everything agent-related
- **`ade setup`** prompts only for: process, architecture, practices, backpressure (pure dev choices). After resolving, writes config.yaml + config.lock.yaml. Then offers: *"Would you like to configure your coding agent now?"* — if yes, delegates to `runConfigure`.
- **`ade configure`** handles: autonomy profile, harness selection, skills installation, knowledge source init. All ephemeral — nothing written to config.yaml/lock.
- **Rationale**: Harness selection, autonomy, skills install, knowledge init are all agent/environment concerns, not team-level dev choices.

## Notes

### Codebase Exploration Findings

#### Current Config Flow
1. User runs `ade setup` → selects facets (process, practices, autonomy, etc.) + harnesses
2. Choices saved to `config.yaml` → resolved into `LogicalConfig` → saved in `config.lock.yaml`
3. `ade install` reads `config.lock.yaml` and runs each selected harness writer

#### Config Separation (current state in `config.yaml`)
```yaml
choices:
  process: codemcp-workflows
  practices: [adr-nygard, conventional-commits]
  autonomy: sensible-defaults        # ← THIS is the harness config concern
excluded_docsets: [...]
harnesses: [universal, opencode, copilot, kiro]
```

The `autonomy` facet is stored under `choices` alongside `process` and `practices`.
All choices go through the same `resolve()` pipeline → `LogicalConfig.permission_policy`.

#### Two Distinct Concerns
| Concern | Current location | Stability |
|---|---|---|
| Development choices (process, practices, architecture) | `config.yaml` → `choices` | Stable, project-level |
| Harness config (autonomy/permission policy) | `config.yaml` → `choices.autonomy` | Mutable, environment-level |

#### What gets written per harness
- **universal**: autonomy block goes into `AGENTS.md` alongside instructions
- **copilot**: autonomy maps to built-in tool list in `.github/agents/ade.agent.md` frontmatter
- **cursor**: autonomy goes into `.cursor/rules/ade.mdc` alongside instructions
- Other harnesses: similar mixing

#### The Problem
- Autonomy/harness config is locked into `config.lock.yaml` together with development choices
- Changing autonomy requires re-running `ade setup` (full wizard) or manually editing `config.yaml` + `config.lock.yaml`
- The `LockFile` type stores `logical_config` as one combined blob — no way to selectively re-resolve only the harness/autonomy part

#### Possible Approaches
1. **Separate config file** (e.g. `harness.yaml`) for autonomy + harness selection, independent of `config.yaml`
2. **Separate section in `config.yaml`** (e.g. `harness_config:` alongside `choices:`) 
3. **Dedicated CLI command** `ade configure-autonomy` that only re-resolves and re-installs the permission policy
4. **Separate lock file** for harness-specific overrides

---
*This plan is maintained by the LLM and uses beads CLI for task management. Tool responses provide guidance on which bd commands to use for task management.*
