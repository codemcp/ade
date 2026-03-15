import type { ProvisionWriterDef } from "../types.js";

export const workflowsWriter: ProvisionWriterDef = {
  id: "workflows",
  async write(config) {
    const {
      package: pkg,
      ref,
      env
    } = config as {
      package: string;
      ref?: string;
      env?: Record<string, string>;
    };
    return {
      mcp_servers: [
        {
          ref: ref ?? pkg,
          command: "npx",
          args: [pkg],
          env: env ?? {}
        }
      ]
    };
  }
};
