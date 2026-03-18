import type { PermissionPolicy, ProvisionWriterDef } from "../types.js";

export const permissionPolicyWriter: ProvisionWriterDef = {
  id: "permission-policy",
  async write(config) {
    return { permission_policy: config as PermissionPolicy };
  }
};
