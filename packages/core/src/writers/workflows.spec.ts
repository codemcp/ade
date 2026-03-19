import { describe, it, expect } from "vitest";
import { workflowsWriter } from "./workflows.js";
import type { ResolutionContext } from "../types.js";

describe("workflowsWriter", () => {
  const context: ResolutionContext = { resolved: {} };

  it("has id 'workflows'", () => {
    expect(workflowsWriter.id).toBe("workflows");
  });

  it("returns mcp_servers with correct ref, command, and args for a given package", async () => {
    const result = await workflowsWriter.write(
      { package: "@codemcp/workflows-server" },
      context
    );
    expect(result).toEqual({
      mcp_servers: [
        {
          ref: "@codemcp/workflows-server",
          command: "npx",
          args: ["@codemcp/workflows-server"],
          env: {}
        }
      ]
    });
  });

  it("uses ref override when provided", async () => {
    const result = await workflowsWriter.write(
      { package: "@codemcp/workflows-server@latest", ref: "workflows" },
      context
    );
    expect(result.mcp_servers![0].ref).toBe("workflows");
    expect(result.mcp_servers![0].args).toEqual([
      "@codemcp/workflows-server@latest"
    ]);
  });

  it("includes env in the entry when env is specified", async () => {
    const result = await workflowsWriter.write(
      {
        package: "@codemcp/workflows-server",
        env: { API_KEY: "secret", NODE_ENV: "production" }
      },
      context
    );
    expect(result.mcp_servers![0].env).toEqual({
      API_KEY: "secret",
      NODE_ENV: "production"
    });
  });

  it("defaults env to an empty object when not specified", async () => {
    const result = await workflowsWriter.write(
      { package: "@codemcp/workflows-server" },
      context
    );
    expect(result.mcp_servers![0].env).toEqual({});
  });

  it("includes allowedTools in the entry when specified", async () => {
    const result = await workflowsWriter.write(
      {
        package: "@codemcp/workflows-server",
        allowedTools: ["whats_next", "conduct_review"]
      },
      context
    );
    expect(result.mcp_servers![0].allowedTools).toEqual([
      "whats_next",
      "conduct_review"
    ]);
  });

  it("omits allowedTools from entry when not specified", async () => {
    const result = await workflowsWriter.write(
      { package: "@codemcp/workflows-server" },
      context
    );
    expect(result.mcp_servers![0]).not.toHaveProperty("allowedTools");
  });

  it("only returns mcp_servers, not other LogicalConfig keys", async () => {
    const result = await workflowsWriter.write(
      { package: "@codemcp/workflows-server" },
      context
    );
    expect(Object.keys(result)).toEqual(["mcp_servers"]);
    expect(result).not.toHaveProperty("instructions");
    expect(result).not.toHaveProperty("cli_actions");
    expect(result).not.toHaveProperty("knowledge_sources");
  });
});
