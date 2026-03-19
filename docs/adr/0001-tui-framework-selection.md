# ADR 0001: TUI Framework Selection for ADE CLI

## Status

Accepted

## Context

ADE (Agentic Development Environment) is a CLI tool that guides users through setup and configuration via interactive terminal prompts. The CLI needs to:

- Present guided wizard-style flows (select, multiselect, confirm, text input)
- Display streaming output from LLM/agent processes
- Look visually polished and modern ("world-class-nerdy") while remaining enterprise-appropriate
- Terminate after completion (not a long-lived interactive TUI)
- Run in standard terminals including CI environments
- Be ESM-compatible (the project is `"type": "module"`)
- Integrate cleanly into a TypeScript monorepo (Node >= 22, pnpm)

We evaluated the actively-maintained Node.js TUI/prompt frameworks available as of March 2026. Legacy libraries (blessed, neo-blessed, enquirer, prompts by terkelg) were excluded upfront due to abandonment or CJS-only distribution.

## Decision

We will use **@clack/prompts** as the TUI framework for the ADE CLI.

## Evaluation: Weighted Pugh Matrix

Criteria were weighted on a 3-point scale (1 = nice-to-have, 2 = important, 3 = critical). Each candidate was scored relative to a baseline of 0 (meets expectations), with +1 (better) and -1 (worse).

| #   | Criterion                          | Weight | @clack/prompts | @inquirer/prompts | Ink + @inkjs/ui |
| --- | ---------------------------------- | ------ | -------------- | ----------------- | --------------- |
| 1   | Visual polish out-of-the-box       | 3      | +1             | -1                | +1              |
| 2   | Wizard/prompt flow suitability     | 3      | +1             | +1                | 0               |
| 3   | ESM-native compatibility           | 3      | +1             | 0                 | 0               |
| 4   | LLM/streaming output support       | 2      | +1             | -1                | +1              |
| 5   | Learning curve / simplicity        | 2      | +1             | 0                 | -1              |
| 6   | Bundle size / dependency footprint | 2      | +1             | 0                 | -1              |
| 7   | Ecosystem / plugin breadth         | 1      | -1             | +1                | 0               |
| 8   | Community size / adoption          | 1      | 0              | +1                | +1              |
| 9   | Custom prompt authoring            | 1      | 0              | +1                | +1              |

**Weighted totals:**

| Candidate             | Calculation                                                         | Total   |
| --------------------- | ------------------------------------------------------------------- | ------- |
| **@clack/prompts**    | 3(+1) + 3(+1) + 3(+1) + 2(+1) + 2(+1) + 2(+1) + 1(-1) + 1(0) + 1(0) | **+14** |
| **@inquirer/prompts** | 3(-1) + 3(+1) + 3(0) + 2(-1) + 2(0) + 2(0) + 1(+1) + 1(+1) + 1(+1)  | **+1**  |
| **Ink + @inkjs/ui**   | 3(+1) + 3(0) + 3(0) + 2(+1) + 2(-1) + 2(-1) + 1(0) + 1(+1) + 1(+1)  | **+5**  |

@clack/prompts scores highest by a significant margin.

## Rationale

**@clack/prompts wins on the criteria that matter most to ADE:**

1. **Visual polish (weight 3):** Clack's pre-styled prompts are the most visually striking of any Node.js prompt library. Unicode box-drawing, colored indicators, and thoughtful spacing produce a premium feel with zero configuration. @inquirer/prompts looks functional but plain; Ink can match Clack's aesthetics but requires manual styling.

2. **Wizard suitability (weight 3):** ADE's CLI is a terminating wizard, not a persistent dashboard. Clack was purpose-built for sequential prompt flows with `intro()`, `outro()`, `group()`, and `spinner()`. Ink is designed for persistent, React-rendered UIs — architectural overkill for a flow that collects answers and exits.

3. **ESM-native (weight 3):** Clack is ESM-only, aligning perfectly with ADE's `"type": "module"` configuration. No dual-format complications, no CJS shims.

4. **LLM streaming (weight 2):** Clack includes native `stream` utilities designed for rendering LLM/agent output in the terminal — a direct match for ADE's agentic use case. Inquirer has no equivalent.

5. **Simplicity (weight 2):** Clack's API is a flat set of async functions (`select()`, `text()`, `confirm()`, `spinner()`). No React knowledge required, no component tree to manage. This lowers the contribution barrier and reduces maintenance surface.

6. **Footprint (weight 2):** Clack uses Node's built-in `styleText` instead of external color libraries. Minimal transitive dependencies. Ink pulls in React, Yoga (native binary), and a reconciler.

**Where Clack is weaker — and why it doesn't matter:**

- _Ecosystem breadth (weight 1):_ Inquirer has more community plugins (table prompts, file selectors, i18n). ADE's current scope doesn't require these, and `@clack/core` allows building custom prompts if needed.
- _Persistent UI:_ Clack can't render a dashboard or split-pane view. ADE doesn't need one — it's a wizard that terminates.

## Consequences

- The `@ade/cli` package will add `@clack/prompts` as a production dependency.
- All interactive CLI flows (setup, configuration, MCP server management) will use Clack's prompt primitives.
- If a future requirement emerges for persistent/dashboard-style terminal UI (e.g., a live agent monitoring view), we can evaluate adding Ink as a complementary dependency at that time. The two libraries are not mutually exclusive.
- Custom prompts beyond Clack's built-in set will be authored using `@clack/core`.
