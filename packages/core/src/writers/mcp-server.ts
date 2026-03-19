import type { ProvisionWriterDef } from "../types.js";

export const mcpServerWriter: ProvisionWriterDef = {
  id: "mcp-server",
  async write(config) {
    const { ref, command, args, env, allowedTools } = config as {
      ref: string;
      command: string;
      args: string[];
      env?: Record<string, string>;
      allowedTools?: string[];
    };
    return {
      mcp_servers: [
        {
          ref,
          command,
          args,
          env: env ?? {},
          ...(allowedTools !== undefined ? { allowedTools } : {})
        }
      ]
    };
  }
};
