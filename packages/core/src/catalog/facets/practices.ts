import type { Facet } from "../../types.js";

export const practicesFacet: Facet = {
  id: "practices",
  label: "Practices",
  description:
    "Composable development practices — mix and match regardless of stack",
  required: false,
  multiSelect: true,
  options: [
    {
      id: "conventional-commits",
      label: "Conventional Commits",
      description:
        "Structured commit messages following the Conventional Commits specification",
      recipe: [
        {
          writer: "skills",
          config: {
            skills: [
              {
                name: "conventional-commits",
                description:
                  "Conventional Commits specification for structured commit messages",
                body: [
                  "# Conventional Commits",
                  "",
                  "## Format",
                  "```",
                  "<type>[optional scope]: <description>",
                  "",
                  "[optional body]",
                  "",
                  "[optional footer(s)]",
                  "```",
                  "",
                  "## Types",
                  "- `feat`: A new feature (correlates with MINOR in SemVer)",
                  "- `fix`: A bug fix (correlates with PATCH in SemVer)",
                  "- `docs`: Documentation only changes",
                  "- `style`: Changes that do not affect the meaning of the code",
                  "- `refactor`: A code change that neither fixes a bug nor adds a feature",
                  "- `perf`: A code change that improves performance",
                  "- `test`: Adding missing tests or correcting existing tests",
                  "- `chore`: Changes to the build process or auxiliary tools",
                  "",
                  "## Rules",
                  "- Subject line must not exceed 72 characters",
                  '- Use imperative mood in the subject line ("add" not "added")',
                  "- Do not end the subject line with a period",
                  "- Separate subject from body with a blank line",
                  "- Use the body to explain what and why, not how",
                  "- `BREAKING CHANGE:` footer or `!` after type/scope for breaking changes"
                ].join("\n")
              }
            ]
          }
        },
        {
          writer: "instruction",
          config: {
            text: "Use the conventional-commits skill (via use_skill()) when writing commit messages."
          }
        }
      ],
      docsets: [
        {
          id: "conventional-commits-spec",
          label: "Conventional Commits Spec",
          origin:
            "https://github.com/conventional-commits/conventionalcommits.org.git",
          description: "The Conventional Commits specification"
        }
      ]
    },
    {
      id: "tdd-london",
      label: "TDD (London Style)",
      description:
        "Test-Driven Development using the London school (mockist) approach",
      recipe: [
        {
          writer: "skills",
          config: {
            skills: [
              {
                name: "tdd-london",
                description:
                  "London-school TDD methodology with outside-in design",
                body: [
                  "# TDD — London Style (Mockist)",
                  "",
                  "## Core Cycle",
                  "1. **Red** — Write a failing test for the next behavior",
                  "2. **Green** — Write the minimum code to make the test pass",
                  "3. **Refactor** — Improve the code while keeping tests green",
                  "",
                  "## London School Principles",
                  "- Work **outside-in**: start from the outermost layer (API / UI) and drive inward",
                  "- **Mock collaborators**: each unit test isolates the unit under test by mocking its direct dependencies",
                  "- Discover interfaces through tests — let the test define the collaborator contract before implementing it",
                  "- Prefer **role-based interfaces** over concrete classes",
                  "",
                  "## Test Structure",
                  "- **Arrange**: Set up mocks and the unit under test",
                  "- **Act**: Call the method being tested",
                  "- **Assert**: Verify the unit's output and interactions with mocks",
                  "",
                  "## Guidelines",
                  "- One logical assertion per test",
                  '- Test names describe behavior, not methods (e.g. "notifies user when order is placed")',
                  "- Only mock types you own — wrap third-party APIs in adapters and mock those",
                  "- Use the test doubles: stubs for queries, mocks for commands",
                  "- Do not test implementation details — test observable behavior",
                  "- Refactor step is mandatory, not optional"
                ].join("\n")
              }
            ]
          }
        },
        {
          writer: "instruction",
          config: {
            text: "This project uses London-style TDD. Use the tdd-london skill (via use_skill()) before writing tests. Always follow the Red-Green-Refactor cycle."
          }
        }
      ]
    },
    {
      id: "adr-nygard",
      label: "ADR (Nygard)",
      description:
        "Architecture Decision Records following Michael Nygard's template",
      recipe: [
        {
          writer: "skills",
          config: {
            skills: [
              {
                name: "adr-nygard",
                description:
                  "Architecture Decision Records following Nygard's lightweight template",
                body: [
                  "# Architecture Decision Records (Nygard)",
                  "",
                  "## When to Write an ADR",
                  "- When making a significant architectural decision",
                  "- When choosing between multiple viable options",
                  "- When the decision will be hard to reverse",
                  '- When future developers will ask "why did we do this?"',
                  "",
                  "## Template",
                  "Store ADRs in `docs/adr/` as numbered markdown files: `NNNN-title-with-dashes.md`",
                  "",
                  "```markdown",
                  "# N. Title",
                  "",
                  "## Status",
                  "Proposed | Accepted | Deprecated | Superseded by [ADR-NNNN]",
                  "",
                  "## Context",
                  "What is the issue that we're seeing that is motivating this decision or change?",
                  "",
                  "## Decision",
                  "What is the change that we're proposing and/or doing?",
                  "",
                  "## Consequences",
                  "What becomes easier or more difficult to do because of this change?",
                  "```",
                  "",
                  "## Rules",
                  "- ADRs are immutable once accepted — supersede, don't edit",
                  "- Keep context focused on forces at play at the time of the decision",
                  "- Write consequences as both positive and negative impacts",
                  "- Number sequentially, never reuse numbers",
                  '- Title should be a short noun phrase (e.g. "Use PostgreSQL for persistence")'
                ].join("\n")
              }
            ]
          }
        },
        {
          writer: "instruction",
          config: {
            text: "This project uses Architecture Decision Records. Use the adr-nygard skill (via use_skill()) when making or documenting architectural decisions. Store ADRs in docs/adr/."
          }
        }
      ]
    }
  ]
};
