import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  dts: true,
  tsconfig: "tsconfig.build.json",
  target: "node22",
  clean: true,
  noExternal: [/^@clack\//, /^@codemcp\//]
});
