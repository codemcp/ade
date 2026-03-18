import type { ProvisionWriterDef, GitHook } from "../types.js";

export const gitHooksWriter: ProvisionWriterDef = {
  id: "git-hooks",
  async write(config) {
    const { hooks } = config as { hooks: GitHook[] };
    return { git_hooks: hooks };
  }
};
