# Development Plan: ade (autonomy-facet branch)

_Generated on 2026-03-18 by Vibe Feature MCP_
_Workflow: [epcc](https://mrsimpson.github.io/responsible-vibe-mcp/workflows/epcc)_

## Goal

Add a new `autonomy` catalog facet that models how much initiative and execution freedom the agent should have, and register it consistently with the existing ADE facet system.

## Explore

<!-- beads-phase-id: ade-2.1 -->

### Tasks

_Tasks managed via `bd` CLI_

### Findings

- Existing facets live in `packages/core/src/catalog/facets/` and are registered in `packages/core/src/catalog/index.ts`.
- Facets can be single-select or multi-select and may depend on `architecture` when options vary by stack.
- Catalog behavior is covered by `packages/core/src/catalog/catalog.spec.ts`.

## Plan

<!-- beads-phase-id: ade-2.2 -->

### Phase Entrance Criteria

- [ ] The current catalog structure and facet conventions have been reviewed.
- [ ] The target role of the new `autonomy` facet is clear enough to choose `required`, `multiSelect`, and any `dependsOn` settings.
- [ ] The files and tests affected by the change have been identified.

### Tasks

_Tasks managed via `bd` CLI_

## Code

<!-- beads-phase-id: ade-2.3 -->

### Phase Entrance Criteria

- [ ] The `autonomy` facet design is defined, including its option ids, labels, descriptions, and recipes.
- [ ] The registration changes in `catalog/index.ts` are identified.
- [ ] The necessary validation updates in `catalog.spec.ts` are identified.

### Tasks

_Tasks managed via `bd` CLI_

## Commit

<!-- beads-phase-id: ade-2.4 -->

### Phase Entrance Criteria

- [ ] The new facet implementation is complete and wired into the default catalog.
- [ ] Relevant tests have been run and pass, or failures are understood and documented.
- [ ] The final user-facing impact of the new facet is summarized.

### Tasks

_Tasks managed via `bd` CLI_

## Key Decisions

_Important decisions will be documented here as they are made_

- Treat `autonomy` as a first-class facet rather than overloading `process` or `practices`, so agent initiative is configurable independently.
- Reuse existing provision writers for the first cut, with `instruction` as the most likely fit unless the user wants autonomy tied to skills or workflows.
- The clarified scope is to influence harness-writer permission output, not just instructions: built-in tools and MCP tools need a shared autonomy policy that each harness writer can translate.
- The clarified scope is to influence harness-writer permission output for built-in/basic operations only; MCP tool permissions will continue to flow from MCP provisioning.
- The autonomy modes should support three levels: rigid (ask), sensible defaults, and max autonomy (full allow, with sandbox-oriented guidance).
- Web access should remain on `ask` for all harnesses, even when broader autonomy settings are enabled.
- Recommended design: introduce a shared autonomy permission model in core and have each harness writer translate that model into its own config shape.
- Recommended design: introduce a shared autonomy permission model in core for built-in/basic operations and have each harness writer translate that model into its own config shape, while forwarding MCP tool permissions unchanged from MCP provisioning.
- When a harness cannot express the full shared policy, ADE should degrade conservatively rather than silently broadening permissions.
- The revised target policy shape should focus on built-in/basic operations rather than trying to re-model harness-specific MCP permissions.
- MCP permissions are explicitly out of scope for autonomy and must be forwarded from MCP provisioning rather than re-modeled in `permission_policy`.
- The next implementation pass should use an abstract capability model for built-in/basic operations and default unknown/unsupported capabilities to `ask`.
- Implement `autonomy` via a dedicated `permission-policy` provision writer so the catalog remains declarative while the resolver still has a built-in fallback for that writer in narrow test registries.
- Remove `PermissionPolicy.mcp` from the shared type so core autonomy models built-in/basic capabilities only; harnesses must forward MCP approvals from provisioning data instead.
- Implemented the core-facing autonomy contract as `permission_policy.capabilities`, using the abstract capability keys `read`, `edit_write`, `search_list`, `bash_safe`, `bash_unsafe`, `web`, and `task_agent`.
- The selected core profile mappings are: `rigid` = ask for every capability, `sensible-defaults` = allow `read`/`edit_write`/`search_list`/`bash_safe`/`task_agent` while keeping `bash_unsafe` and `web` on `ask`, and `max-autonomy` = allow everything except `web`, which remains `ask`.
- Removed MCP ownership from the shared autonomy model in core; harnesses must now derive MCP approvals exclusively from provisioned MCP server entries and their `allowedTools`.
- Claude Code should translate autonomy locally in its writer: only official built-in rule names go into `.claude/settings.json`, and only explicitly provisioned MCP tools are forwarded as `mcp__server__tool`.
- Kiro should be rewritten to use `.kiro/agents/ade.json` with documented built-in selectors (`read`, `write`, `shell`, `spec`) while forwarding MCP trust from provisioning into `.kiro/settings/mcp.json` via `autoApprove`; web stays omitted so approval remains required.
- Kiro custom agents are discovered from JSON files in `.kiro/agents/`, not Markdown files; the generated ADE agent must therefore be `.kiro/agents/ade.json` with `name`, `description`, `prompt`, and `tools` so `kiro-cli chat --agent ade` can resolve it.
- Copilot should translate autonomy only through documented `tools:` aliases, omit any capability that would still require approval (especially `web`), and forward MCP approvals exactly as `server/<ref>/*` or `server/<ref>/<tool>` based on provisioning.
- Cline should use the verified project-local MCP settings file name `cline_mcp_settings.json` instead of `.cline/mcp.json`, and autonomy must not invent agent-local permission semantics when only settings-level controls are documented.
- Windsurf should keep forwarding project-local MCP registration and `allowedTools` approvals through `.windsurf/mcp.json`, but built-in autonomy must degrade to clearly labeled advisory text in `.windsurfrules` until a verified committed Windsurf permission schema exists.
- Cursor should keep `.cursor/mcp.json` limited to documented MCP server registration and render autonomy only as an explicit non-enforcing note in `.cursor/rules/ade.mdc`, because no verified committed project-local built-in permission schema was found.

## Notes

_Additional context and observations_

- `backpressure` is the closest existing pattern for a behavior-oriented facet.
- The product docs currently frame “runtime agent behavior” as a non-goal, so the autonomy facet should likely influence generated instructions rather than introduce runtime control mechanisms.
- No existing `autonomy` concept appears anywhere in the repository yet, so option names and exact behaviors still need to be defined.
- Current permission handling is fragmented:
  - `McpServerEntry.allowedTools` exists for per-server MCP permissions.
  - `claude-code` maps MCP permissions into `.claude/settings.json`.
  - `cline`, `roo-code`, and `windsurf` map MCP permissions into `alwaysAllow`.
  - `kiro` writes both `tools` and `allowedTools`, but only MCP tools are derived from `allowedTools`.
  - `copilot` writes a `tools:` allowlist in agent frontmatter for built-in tools plus `server/*`.
  - `opencode` writes built-in tool approval defaults in agent frontmatter, but currently does not derive MCP permissions from `allowedTools`.
  - `cursor` and `universal` currently emit no explicit permission policy.
- This implies a new shared policy object is likely needed in `LogicalConfig`, with harness-specific translation and partial support where a harness cannot express the full policy.
- The user explicitly wants network/web access to stay approval-gated across the board; this constraint should shape the sensible-defaults and max-autonomy mappings for each harness.
- Design options considered:
  - Option A: encode autonomy directly inside each harness writer with no shared core model. Rejected because it duplicates policy logic and makes the catalog option semantics drift by harness.
  - Option B: add a shared permission policy to `LogicalConfig`, populate it from the new `autonomy` facet, and let harness writers render the nearest supported representation. Recommended because it keeps the policy centralized and testable.
- Recommended shared model shape:
  - Built-in/basic capability categories should be modeled abstractly and independently of harness-specific tool names.
  - The model should be expressive enough to represent `ask`, curated sensible defaults, and broad local allow while preserving `web` as `ask`.
  - Existing per-server MCP permissions should remain owned by MCP provisioning and simply be forwarded by harness writers.
- Recommended abstract capability model:
  - `read`
  - `edit_write`
  - `search_list`
  - `bash_safe`
  - `bash_unsafe`
  - `web`
  - `task_agent`
- Planned autonomy semantics:
  - `rigid`: approval-gated operation for mutable or risky capabilities.
  - `sensible-defaults`: allow a curated low-risk set of built-in/basic interactions, based on `SAMPLE_PERMISSIONS.md` and harness capabilities.
  - `max-autonomy`: broad allow for supported local capabilities, but keep web/network access on `ask`.
- Per-harness implementation plan for the next agent:
  - `claude-code`
    - Built-in/basic permissions belong in `.claude/settings.json`.
    - Use official Claude rule names such as `Read`, `Edit`, `Bash`, `Glob`, `Grep`, `WebFetch`, `WebSearch`, `TodoWrite`, and `Agent(...)`.
    - Do **not** use invented strings like `MCP(workflows:*)`; forwarded MCP permissions must use Claude’s documented `mcp__server__tool` style only when provisioning provides them.
    - Autonomy should map only built-in/basic capability decisions here; MCP forwarding remains separate.
  - `copilot`
    - Agent-level control is via `tools:` exposure only, not true `ask` / `allow` / `deny`.
    - Use documented Copilot tool aliases such as `read`, `edit`, `search`, `execute`, `agent`, `web`, and `todo`, plus `server/*` for MCP tools.
    - Plan: autonomy changes the built-in `tools:` allowlist only; unsupported `ask` semantics must be treated as a limitation and documented.
    - MCP tools should be forwarded as `server/*` or `server/tool` from provisioning, not interpreted by autonomy.
  - `opencode`
    - Built-in/basic permissions belong in OpenCode’s documented `permission` config.
    - Valid permission keys include `read`, `edit`, `glob`, `grep`, `list`, `bash`, `task`, `skill`, `lsp`, `todoread`, `todowrite`, `question`, `webfetch`, `websearch`, `codesearch`, `external_directory`, and `doom_loop`.
    - `sensible-defaults` should be derived from `SAMPLE_PERMISSIONS.md`, translated into OpenCode’s schema, with the explicit override that `webfetch`, `websearch`, and `codesearch` stay `ask`.
    - Re-check whether the ADE agent should carry agent-local `permission` versus project-level `opencode.json.permission`; user feedback suggests the agent-local location matters.
  - `kiro`
    - Current assumptions need replacement; research indicates Kiro agents are Markdown-based and use selectors like `read`, `write`, `shell`, `web`, `spec`, `@builtin`, `@server`, `@server/tool`, `@server/*`, and `*`.
    - Workspace MCP config belongs in `.kiro/settings/mcp.json`.
    - MCP trust/auto-approval uses Kiro MCP settings fields such as `autoApprove` / `disabledTools` and should be forwarded from provisioning only.
    - Plan: autonomy maps only the built-in/basic tool selectors in the Kiro agent definition.
  - `cline`
    - Permission/auto-approve is settings-level, not rules-file-level.
    - Research points to `cline_mcp_settings.json` rather than the currently written `.cline/mcp.json`.
    - Built-in tool names differ significantly and include actions like `read_file`, `write_to_file`, `replace_in_file`, `search_files`, `list_files`, `execute_command`, `browser_action`, `use_mcp_tool`, `access_mcp_resource`, `ask_followup_question`, and `new_task`.
    - Plan: map autonomy only where Cline exposes a real settings/config surface for built-ins; do not emulate agent-local permissions in `.clinerules`.
  - `roo-code`
    - Project MCP registration in `.roo/mcp.json` is valid.
    - Agent/mode configuration is mode-based (`.roomodes` / custom modes), with coarse groups like `read`, `edit`, `command`, and `mcp`.
    - Auto-approve is settings-level and should stay separate from autonomy.
    - Plan: map autonomy only to Roo’s documented built-in groups or mode config where deterministic; otherwise degrade conservatively.
  - `windsurf`
    - A stable committed per-agent permission schema was not verified.
    - Terminal allow/deny appears to live in editor settings, not rules files.
    - MCP config also appears to be user/global rather than a clean committed project-local agent surface in the docs found.
    - Plan: treat Windsurf as limited/unsupported for committed built-in permission enforcement unless additional verified docs are found.
  - `cursor`
    - MCP registration in `.cursor/mcp.json` is fine, but no verified committed ask/allow/deny permission surface was found for agent config.
    - Plan: keep Cursor conservative and avoid claiming enforcement beyond what documented config actually supports.
  - `universal`
    - No harness-specific permission schema exists.
    - Plan: encode autonomy only as instructions/documentation; do not pretend enforcement exists.
- Rework checklist for the next implementation agent:
  - Remove MCP-specific ownership from `permission_policy`.
  - Replace direct harness tool-name assumptions with the abstract capability model.
  - Build per-harness translators from abstract capabilities to documented harness tool names/config keys.
  - Default anything unknown or unsupported to `ask` or to “not exposed” where a harness only supports exposure lists.
  - Preserve web as `ask` across all harnesses.
- Testing scope should cover:
  - catalog registration and autonomy option metadata,
  - resolver output for the new shared permission model,
  - representative harness mappings for rigid/defaults/max,
  - the invariant that web access stays on `ask`.
- Implemented harness mappings in:
  - `claude-code` via `.claude/settings.json` permission rules,
  - `copilot` via agent `tools:` frontmatter,
  - `kiro` via `tools` and `allowedTools`,
  - `opencode` via top-level `permission` config in `opencode.json`.
- OpenCode-specific correction: agent frontmatter `tools.*` booleans were insufficient for `ask` semantics and invalid when written as strings; the writer now uses the documented `permission` schema instead.
- `sensible-defaults` now incorporates the `SAMPLE_PERMISSIONS.md` policy shape for OpenCode-style permissions, with the intentional override that web tools remain `ask` rather than `deny`.
- Implemented harness translations keep pre-existing behavior when no `permission_policy` is present, but switch to conservative autonomy-aware mappings for Claude Code, Copilot, Kiro, and OpenCode.
- TypeScript compatibility required making shared config objects record-like because the test suite treats `LogicalConfig` as an extensible JSON-shaped object.
- Core tests now validate the capability-based autonomy recipe/resolver output directly, and the default registry coverage includes the `permission-policy` provision writer.
- Claude Code now degrades conservative/default MCP handling by skipping wildcard auto-approval when provisioning does not name explicit tools, because invented blanket MCP rule syntax is out of scope.
- Copilot now replaces invented aliases (`runCommands`, `runTasks`, `fetch`, `githubRepo`) with documented aliases, exposes no built-ins for `rigid`, exposes only coarse safe subsets for `sensible-defaults`, and keeps wildcard or per-tool MCP exposure independent from autonomy.
- OpenCode autonomy permissions should live on the ADE agent itself (`.opencode/agents/ade.md` frontmatter `permission`) instead of generated project-level `opencode.json.permission`, because agent-local `permission` is a documented OpenCode agent field and this matches the user feedback that permissions belong to the ADE agent.
- OpenCode project config should remain responsible only for shared/project surfaces such as `mcp`, using the documented `environment` key for local MCP server env vars; MCP tool approvals remain forwarded-only and are not re-modeled into the autonomy permission block.
- Local OpenCode SDK typings under `.opencode/node_modules/@opencode-ai/sdk` confirmed that `tools` is deprecated in favor of `permission`, and that `permission` is valid on both project config and agent config; this evidence justified preferring the agent-local location for ADE-specific autonomy output.
- Integration cleanup aligned the completed Claude/Copilot/Kiro/OpenCode rewrites with the new core `permission_policy.capabilities` contract, removed stale helper assumptions about `permission_policy.web` and `permission_policy.mcp`, and kept each harness’s conservative degradation strategy where the harness cannot represent full ask/allow semantics.
- Roo Code should render autonomy into a project `.roomodes` custom mode using only the verified coarse groups `read`, `edit`, and `command`; `command` is enabled only when `bash_unsafe` is allowed because Roo cannot separately express safe-vs-unsafe shell, and unsupported capabilities like `web` and `task_agent` must degrade to “not granted.”
- Roo MCP access remains separate from autonomy: `.roo/mcp.json` keeps forwarding `alwaysAllow` from provisioning unchanged, while the generated ADE mode includes the coarse `mcp` group whenever MCP servers are provisioned so those forwarded approvals remain reachable without reinterpreting them through `permission_policy`.
- Cline now writes MCP registration to `cline_mcp_settings.json`, forwarding only provisioned `allowedTools` into `alwaysAllow`; because no additional verified committed Cline schema for built-in ask/allow autonomy controls was established, rigid / sensible-defaults / max-autonomy intentionally emit the same committed config so built-ins, including web, stay approval-gated by omission.
- Windsurf now renders autonomy into `.windsurfrules` as advisory-only capability guidance, explicitly documents the unsupported built-in enforcement limitation, and preserves the cross-harness invariant that web/network access remains approval-gated.
- Cursor now emits an autonomy note in `.cursor/rules/ade.mdc` whenever `permission_policy` is present, even if there are no user instructions, and keeps `.cursor/mcp.json` free of invented built-in permission fields so MCP registration stays separate from autonomy.
- Universal now renders `permission_policy` into AGENTS.md as an explicit documentation-only autonomy section, calls out that `.mcp.json` / AGENTS have no enforceable harness-level permission schema, and avoids inventing built-in or MCP permission enforcement that the harness cannot provide.

---

_This plan is maintained by the LLM and uses beads CLI for task management. Tool responses provide guidance on which bd commands to use for task management._

- Kiro named agents must embed `mcpServers` and MCP tool entries (for example `@workflows/*`) inside `.kiro/agents/ade.json`; relying on `.kiro/settings/mcp.json` alone was not enough for `kiro-cli chat --agent ade` to see provisioned MCP servers.
- Copilot MCP tool exposure should use the provisioner-visible `ref/...` form (for example `workflows/*` or `workflows/whats_next`) rather than `server/ref/...`.

- Copilot custom agents should embed provisioned MCP servers in `mcp-servers` frontmatter with per-server `tools` allowlists from provisioning, in addition to `.vscode/mcp.json`; this matches Copilot coding agent / CLI MCP configuration and is the surface that carries autonomous MCP tool permissions.
