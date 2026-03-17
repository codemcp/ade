import { defineConfig } from "vitest/config";
import { resolve } from "path";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"]
    }
  },
  resolve: {
    alias: {
      "@ade/core": resolve(__dirname, "packages/core/src/index.ts"),
      "@ade/harnesses": resolve(__dirname, "packages/harnesses/src/index.ts")
    }
  }
});
