import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

// Mock only the TUI — everything else (catalog, registry, resolver, config I/O, writers) is real
vi.mock("@clack/prompts", () => ({
  intro: vi.fn(),
  outro: vi.fn(),
  note: vi.fn(),
  select: vi.fn(),
  multiselect: vi.fn(),
  confirm: vi.fn().mockResolvedValue(false), // decline skill install prompt
  isCancel: vi.fn().mockReturnValue(false),
  cancel: vi.fn(),
  log: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), success: vi.fn() },
  spinner: vi.fn().mockReturnValue({ start: vi.fn(), stop: vi.fn() })
}));

import * as clack from "@clack/prompts";
import { runSetup } from "./setup.js";
import {
  readLockFile,
  getDefaultCatalog,
  mergeExtensions
} from "@codemcp/ade-core";
import type { AdeExtensions } from "@codemcp/ade-core";

describe("extension e2e — option contributes skills and knowledge to setup output", () => {
  let dir: string;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.mocked(clack.confirm).mockResolvedValue(false); // don't install skills
    dir = await mkdtemp(join(tmpdir(), "ade-ext-e2e-"));
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it(
    "extension-contributed architecture option writes inline skill and knowledge source",
    { timeout: 60_000 },
    async () => {
      // Build an extension with a SAP option that has an inline skill + knowledge
      const extensions: AdeExtensions = {
        facetContributions: {
          architecture: [
            {
              id: "sap-abap",
              label: "SAP BTP / ABAP",
              description: "SAP BTP ABAP Cloud development",
              recipe: [
                {
                  writer: "skills",
                  config: {
                    skills: [
                      {
                        name: "sap-abap-code",
                        description: "SAP ABAP coding guidelines",
                        body: "# SAP ABAP Code\nUse ABAP Cloud APIs only."
                      }
                    ]
                  }
                },
                {
                  writer: "knowledge",
                  config: {
                    name: "sap-abap-docs",
                    origin: "https://help.sap.com/docs/abap-cloud",
                    description: "SAP ABAP Cloud documentation"
                  }
                }
              ]
            }
          ]
        }
      };

      const catalog = mergeExtensions(getDefaultCatalog(), extensions);

      // Facet order from sortFacets: process → architecture → practices → backpressure → autonomy
      vi.mocked(clack.select)
        .mockResolvedValueOnce("native-agents-md") // process
        .mockResolvedValueOnce("sap-abap"); // architecture — the extended option
      vi.mocked(clack.multiselect)
        .mockResolvedValueOnce([]) // practices: none
        // backpressure: sap-abap has no matching options so skipped
        .mockResolvedValueOnce([]); // harnesses

      await runSetup(dir, catalog);

      // ── Skill should be staged to .ade/skills/sap-abap-code/SKILL.md ────
      const skillMd = await readFile(
        join(dir, ".ade", "skills", "sap-abap-code", "SKILL.md"),
        "utf-8"
      );
      expect(skillMd).toContain("name: sap-abap-code");
      expect(skillMd).toContain("SAP ABAP Code");
      expect(skillMd).toContain("ABAP Cloud APIs only");

      // ── Knowledge source should appear in the lock file ──────────────────
      const lock = await readLockFile(dir);
      expect(lock).not.toBeNull();
      const knowledgeSources = lock!.logical_config.knowledge_sources;
      expect(knowledgeSources).toHaveLength(1);
      expect(knowledgeSources[0].name).toBe("sap-abap-docs");
      expect(knowledgeSources[0].origin).toBe(
        "https://help.sap.com/docs/abap-cloud"
      );
      expect(knowledgeSources[0].description).toBe(
        "SAP ABAP Cloud documentation"
      );

      // ── config.yaml should record the extension option as the choice ──────
      const { readUserConfig } = await import("@codemcp/ade-core");
      const config = await readUserConfig(dir);
      expect(config!.choices.architecture).toBe("sap-abap");
    }
  );
});
