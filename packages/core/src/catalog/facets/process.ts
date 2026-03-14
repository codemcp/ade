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
          config: {}
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
          config: {}
        }
      ]
    }
  ]
};
