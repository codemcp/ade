import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parse as parseYaml } from "yaml";

import {
  readUserConfig,
  writeUserConfig,
  readLockFile,
  writeLockFile
} from "./config.js";

import type { UserConfig, LockFile } from "./types.js";

describe("config", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "ade-config-test-"));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  describe("UserConfig roundtrip", () => {
    it("write then read produces identical data", async () => {
      const config: UserConfig = {
        choices: {
          language: "typescript",
          framework: "react"
        }
      };

      await writeUserConfig(tempDir, config);
      const result = await readUserConfig(tempDir);

      expect(result).toEqual(config);
    });

    it("returns null when config.yaml does not exist", async () => {
      const result = await readUserConfig(tempDir);
      expect(result).toBeNull();
    });

    it("multi-select choices (string[]) survive roundtrip", async () => {
      const config: UserConfig = {
        choices: {
          language: "typescript",
          plugins: ["eslint", "prettier", "vitest"]
        }
      };

      await writeUserConfig(tempDir, config);
      const result = await readUserConfig(tempDir);

      expect(result).toEqual(config);
      expect(Array.isArray(result!.choices.plugins)).toBe(true);
      expect(result!.choices.plugins).toEqual(["eslint", "prettier", "vitest"]);
    });

    it("custom section with mcp_servers and instructions survives roundtrip", async () => {
      const config: UserConfig = {
        choices: {
          language: "python"
        },
        custom: {
          mcp_servers: [
            {
              ref: "my-server",
              command: "npx",
              args: ["-y", "my-mcp-server"],
              env: { API_KEY: "test-key" }
            }
          ],
          instructions: ["Always use type hints", "Follow PEP 8 style guide"]
        }
      };

      await writeUserConfig(tempDir, config);
      const result = await readUserConfig(tempDir);

      expect(result).toEqual(config);
      expect(result!.custom!.mcp_servers).toHaveLength(1);
      expect(result!.custom!.mcp_servers![0].ref).toBe("my-server");
      expect(result!.custom!.instructions).toEqual([
        "Always use type hints",
        "Follow PEP 8 style guide"
      ]);
    });
  });

  describe("LockFile roundtrip", () => {
    it("write then read produces identical data", async () => {
      const lock: LockFile = {
        version: 1,
        generated_at: "2026-03-14T00:00:00.000Z",
        choices: {
          language: "typescript",
          framework: "react"
        },
        logical_config: {
          mcp_servers: [
            {
              ref: "typescript-server",
              command: "npx",
              args: ["-y", "ts-server"],
              env: {}
            }
          ],
          instructions: ["Use strict TypeScript"],
          cli_actions: [
            {
              command: "npm",
              args: ["install"],
              phase: "install"
            }
          ],
          knowledge_sources: [
            {
              name: "ts-docs",
              origin: "https://typescriptlang.org",
              description: "TypeScript documentation"
            }
          ],
          skills: []
        }
      };

      await writeLockFile(tempDir, lock);
      const result = await readLockFile(tempDir);

      expect(result).toEqual(lock);
    });

    it("returns null when config.lock.yaml does not exist", async () => {
      const result = await readLockFile(tempDir);
      expect(result).toBeNull();
    });
  });

  describe("YAML validity", () => {
    it("config file written is valid YAML", async () => {
      const config: UserConfig = {
        choices: {
          language: "typescript",
          tools: ["eslint", "prettier"]
        },
        custom: {
          instructions: ["Be concise"]
        }
      };

      await writeUserConfig(tempDir, config);

      const raw = await readFile(join(tempDir, "config.yaml"), "utf-8");
      const parsed = parseYaml(raw);

      expect(parsed).toEqual(config);
    });
  });
});
