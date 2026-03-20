import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  dts: true,
  tsconfig: "tsconfig.build.json",
  target: "node22",
  clean: true,
  noExternal: [
    "@clack/prompts",
    "@codemcp/ade-core",
    "@codemcp/ade-harnesses",
    "yaml",
    "zod"
  ],
  esbuildOptions(options) {
    options.banner = {
      js: `import { createRequire } from 'module'; const require = createRequire(import.meta.url);`
    };
  }
});
