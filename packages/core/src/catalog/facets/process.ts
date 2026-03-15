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
      description: "Use codemcp workflow files to drive agent tasks",
      recipe: [
        {
          writer: "workflows",
          config: { package: "@anthropic/codemcp" }
        },
        {
          writer: "instruction",
          config: {
            text: "Use codemcp workflow files (.workflow.md) to structure and execute tasks."
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
