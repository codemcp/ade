import type { Facet } from "../../types.js";

export const autonomyFacet: Facet = {
  id: "autonomy",
  label: "Autonomy",
  description:
    "How much initiative and execution freedom the agent should have",
  required: false,
  multiSelect: false,
  options: [
    {
      id: "sensible-defaults",
      label: "Sensible defaults",
      description:
        "Allow a curated built-in capabilities set while keeping potentially risky actions approval-gated",
      recipe: [
        {
          writer: "permission-policy",
          config: { profile: "sensible-defaults" }
        }
      ]
    },
    {
      id: "rigid",
      label: "Rigid",
      description:
        "Keep built-in capabilities approval-gated and require confirmation before acting",
      recipe: [
        {
          writer: "permission-policy",
          config: { profile: "rigid" }
        }
      ]
    },
    {
      id: "max-autonomy",
      label: "Max autonomy",
      description:
        "Allow broad local built-in autonomy. Recommended for sandboxed environments only",
      recipe: [
        {
          writer: "permission-policy",
          config: { profile: "max-autonomy" }
        }
      ]
    }
  ]
};
