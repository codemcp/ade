import type {
  AutonomyCapability,
  Facet,
  PermissionDecision,
  PermissionPolicy
} from "../../types.js";

const ALL_CAPABILITIES: AutonomyCapability[] = [
  "read",
  "edit_write",
  "search_list",
  "bash_safe",
  "bash_unsafe",
  "web",
  "task_agent"
];

function capabilityMap(
  defaultDecision: PermissionDecision,
  overrides: Partial<Record<AutonomyCapability, PermissionDecision>> = {}
): Record<AutonomyCapability, PermissionDecision> {
  return Object.fromEntries(
    ALL_CAPABILITIES.map((capability) => [
      capability,
      overrides[capability] ?? defaultDecision
    ])
  ) as Record<AutonomyCapability, PermissionDecision>;
}

function autonomyPolicy(profile: PermissionPolicy["profile"]): PermissionPolicy {
  switch (profile) {
    case "rigid":
      return {
        profile,
        capabilities: capabilityMap("ask")
      };
    case "sensible-defaults":
      return {
        profile,
        capabilities: capabilityMap("ask", {
          read: "allow",
          edit_write: "allow",
          search_list: "allow",
          bash_safe: "allow",
          task_agent: "allow",
          web: "ask"
        })
      };
    case "max-autonomy":
      return {
        profile,
        capabilities: capabilityMap("allow", {
          web: "ask"
        })
      };
  }
}

export const autonomyFacet: Facet = {
  id: "autonomy",
  label: "Autonomy",
  description: "How much initiative and execution freedom the agent should have",
  required: false,
  multiSelect: false,
  options: [
    {
      id: "rigid",
      label: "Rigid",
      description:
        "Keep built-in capabilities approval-gated and require confirmation before acting",
      recipe: [
        {
          writer: "permission-policy",
          config: autonomyPolicy("rigid")
        }
      ]
    },
    {
      id: "sensible-defaults",
      label: "Sensible defaults",
      description:
        "Allow a curated low-risk built-in capability set while keeping web access approval-gated",
      recipe: [
        {
          writer: "permission-policy",
          config: autonomyPolicy("sensible-defaults")
        }
      ]
    },
    {
      id: "max-autonomy",
      label: "Max autonomy",
      description:
        "Allow broad local built-in autonomy while keeping web access approval-gated",
      recipe: [
        {
          writer: "permission-policy",
          config: autonomyPolicy("max-autonomy")
        }
      ]
    }
  ]
};
