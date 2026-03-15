import type { Facet } from "../../types.js";

export const processFacet: Facet = {
  id: "process",
  label: "Process",
  description: "How your AI agent receives and executes tasks",
  required: true,
  options: [
    {
      id: "codemcp-workflows",
      label: "CodeMCP Workflows",
      description:
        "Use @codemcp/workflows to drive agent tasks with structured engineering workflows",
      recipe: [
        {
          writer: "workflows",
          config: {
            package: "@codemcp/workflows-server@latest",
            ref: "workflows"
          }
        },
        {
          writer: "instruction",
          config: {
            text: "Use @codemcp/workflows to follow structured engineering workflows for all tasks."
          }
        }
      ]
    },
    {
      id: "native-agents-md",
      label: "Native agents.md",
      description: "Use a plain agents.md instruction file",
      recipe: [
        {
          writer: "instruction",
          config: {
            text: "Read AGENTS.md for project conventions and task instructions."
          }
        }
      ]
    }
  ]
};
