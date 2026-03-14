// @ts-check
/** @type {import("vitest/config").defineConfig} */

import { resolve } from "path";
const baseConfig = await import("../../vitest.config.js");

export default {
  ...baseConfig.default,
  resolve: {
    alias: {
      "@ade/shared": resolve(__dirname, "../shared/src/index.ts")
    }
  }
};
