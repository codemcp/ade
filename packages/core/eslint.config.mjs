import js from "@eslint/js";
import { parser, configs } from "typescript-eslint";
import prettier from "eslint-config-prettier";

export default [
  js.configs.recommended,
  ...configs.recommended,
  prettier,
  {
    // Config for TypeScript files
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      parser,
      parserOptions: {
        project: ["./tsconfig.json", "./tsconfig.vitest.json"]
      }
    }
  },
  {
    // Config for JavaScript files - no TypeScript parsing
    files: ["**/*.{js,jsx}"],
    ...js.configs.recommended
  },
  {
    // Relaxed rules for test files
    files: ["**/*.test.ts", "**/*.spec.ts"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": "off"
    }
  },
  {
    ignores: [
      "**/node_modules/**",
      "**/dist/**",
      ".pnpm-store/**",
      "pnpm-lock.yaml"
    ]
  }
];
