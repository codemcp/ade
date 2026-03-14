import type { ProvisionWriterDef } from "../types.js";

export const workflowsWriter: ProvisionWriterDef = {
  id: "workflows",
  async write(config) {
    const { package: pkg, env } = config as {
      package: string;
      env?: Record<string, string>;
    };
    return {
      mcp_servers: [
        {
          ref: pkg,
          command: "npx",
          args: ["-y", pkg],
          env: env ?? {}
        }
      ]
    };
  }
};
