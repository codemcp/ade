// @ts-check
/** @type {import("vitest/config").defineConfig} */

import { resolve } from "path";
const baseConfig = await import("../../vitest.config.js");

export default {
  ...baseConfig.default,
  resolve: {
    alias: {
      "@ade/core": resolve(__dirname, "../core/src/index.ts")
    }
  }
};
