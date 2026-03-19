# Development Plan: ade (better-in-cli-explanation branch)

*Generated on 2026-03-19 by Vibe Feature MCP*
*Workflow: [minor](https://mrsimpson.github.io/responsible-vibe-mcp/workflows/minor)*

## Goal
Improve user guidance in the ADE CLI — add contextual introductory text to help users understand what ADE is and what each setup facet (Process, Architecture, Practices, Autonomy, Backpressure, Harnesses, Docsets) means before they make a selection.

## Explore
<!-- beads-phase-id: ade-5.1 -->
### Tasks
- [x] Read and understand current CLI structure (index.ts, setup.ts, install.ts)
- [x] Read all facet definitions (process, architecture, practices, autonomy, backpressure)
- [x] Identify all prompts where contextual guidance is missing

### Findings
- The setup command starts with `clack.intro("ade setup")` — no explanation of what ADE is or what the wizard will do
- Facet prompts show only `facet.label` as the message — no educational context about what the facet means
- The harness prompt says "which coding agents should receive config?" — helpful but no context on what harnesses are
- The docset prompt says "deselect any you don't need" — no explanation of what docsets are used for
- The skill install confirm says only "Install N skill(s) now?" — no context on what skills are
- `index.ts` help text is minimal — no explanation of ADE's purpose

### Phase Entrance Criteria for Implement:
- [x] All touchpoints where user guidance is missing have been identified
- [x] Content approach is clear (what to say at each step)
- [x] No ambiguity about scope (we're adding text/hints, not redesigning prompts)

## Implement
<!-- beads-phase-id: ade-5.2 -->

### Phase Entrance Criteria:
- [x] Explore phase findings are complete
- [x] All identified touchpoints for improvement are listed
- [x] Scope is clearly defined: text additions only, no structural changes

### Tasks
*Tasks managed via `bd` CLI*

## Finalize
<!-- beads-phase-id: ade-5.3 -->

### Phase Entrance Criteria:
- [x] All identified touchpoints have been addressed with guidance text
- [x] Code compiles without errors
- [x] Changes look correct and consistent in tone

### Tasks
- [ ] Squash WIP commits: `git reset --soft <first commit of this branch>`. Then, create a conventional commit. In the message, first summarize the intentions and key decisions from the development plan. Then, add a brief summary of the key changes and their side effects and dependencies

*Tasks managed via `bd` CLI*

## Key Decisions
- Used `clack.note()` for the ADE intro (boxed, titled) to make it stand out as orientation content vs. action prompts
- Used `clack.log.info()` before each facet/section prompt — lightweight, doesn't interrupt the flow, provides context without being intrusive
- Facet descriptions from the catalog data model are reused directly (they were already well-written) rather than duplicated elsewhere
- Harness guidance explicitly calls out the 'universal' option since it's the most common default and its purpose isn't obvious from the name alone
- Skill install context placed immediately before the confirm prompt so it reads naturally in sequence

## Notes
*Additional context and observations*

---
*This plan is maintained by the LLM and uses beads CLI for task management. Tool responses provide guidance on which bd commands to use for task management.*
