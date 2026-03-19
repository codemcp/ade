import type { Facet } from "../../types.js";

export const processFacet: Facet = {
  id: "process",
  label: "Process",
  description: "How will you guide your agent",
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
            ref: "workflows",
            env: {
              VIBE_WORKFLOW_DOMAINS: "skilled"
            },
            allowedTools: [
              "whats_next",
              "conduct_review",
              "list_workflows",
              "get_tool_info"
            ]
          }
        },
        {
          writer: "instruction",
          config: {
            text: [
              "You are an AI assistant that helps users develop software features using the workflows server.",
              "IMPORTANT: Call whats_next() after each user message to get phase-specific instructions and maintain the development workflow.",
              'Each tool call returns a JSON response with an "instructions" field. Follow these instructions immediately after you receive them.',
              "Use the development plan which you will retrieve via whats_next() to record important insights and decisions as per the structure of the plan.",
              "Do not use your own task management tools."
            ].join("\n")
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
