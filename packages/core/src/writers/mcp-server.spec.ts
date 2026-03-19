import { describe, it, expect } from "vitest";
import { mcpServerWriter } from "./mcp-server.js";
import type { ResolutionContext } from "../types.js";

describe("mcpServerWriter", () => {
  const context: ResolutionContext = { resolved: {} };

  it("has id 'mcp-server'", () => {
    expect(mcpServerWriter.id).toBe("mcp-server");
  });

  it("returns mcp_servers with correct ref, command, args, and env", async () => {
    const result = await mcpServerWriter.write(
      {
        ref: "my-server",
        command: "npx",
        args: ["my-mcp-package"],
        env: { KEY: "value" }
      },
      context
    );
    expect(result).toEqual({
      mcp_servers: [
        {
          ref: "my-server",
          command: "npx",
          args: ["my-mcp-package"],
          env: { KEY: "value" }
        }
      ]
    });
  });

  it("defaults env to an empty object when not specified", async () => {
    const result = await mcpServerWriter.write(
      { ref: "my-server", command: "npx", args: ["my-mcp-package"] },
      context
    );
    expect(result.mcp_servers![0].env).toEqual({});
  });

  it("includes allowedTools when specified", async () => {
    const result = await mcpServerWriter.write(
      {
        ref: "my-server",
        command: "npx",
        args: ["my-mcp-package"],
        allowedTools: ["tool_a", "tool_b"]
      },
      context
    );
    expect(result.mcp_servers![0].allowedTools).toEqual(["tool_a", "tool_b"]);
  });

  it("omits allowedTools from entry when not specified", async () => {
    const result = await mcpServerWriter.write(
      { ref: "my-server", command: "npx", args: ["my-mcp-package"] },
      context
    );
    expect(result.mcp_servers![0]).not.toHaveProperty("allowedTools");
  });
});
