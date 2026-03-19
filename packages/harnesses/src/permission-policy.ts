import type { LogicalConfig } from "@codemcp/ade-core";

export function getAutonomyProfile(config: LogicalConfig) {
  return config.permission_policy?.profile;
}

export function hasPermissionPolicy(config: LogicalConfig): boolean {
  return config.permission_policy !== undefined;
}
