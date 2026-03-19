import { describe, it, expect } from "vitest";
import { loadExtensions } from "./extensions.js";
import { tmpdir } from "node:os";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";

describe("loadExtensions", () => {
  it("returns an empty object when no extensions file exists", async () => {
    const dir = await mkdtemp(join(tmpdir(), "ade-ext-test-"));
    try {
      const result = await loadExtensions(dir);
      expect(result).toEqual({});
    } finally {
      await rm(dir, { recursive: true });
    }
  });

  it("loads and validates a valid .mjs extensions file", async () => {
    const dir = await mkdtemp(join(tmpdir(), "ade-ext-test-"));
    try {
      await writeFile(
        join(dir, "ade.extensions.mjs"),
        `export default {
          facetContributions: {
            architecture: [
              {
                id: "sap",
                label: "SAP BTP / ABAP",
                description: "SAP BTP ABAP development",
                recipe: [{ writer: "skills", config: { skills: [] } }]
              }
            ]
          }
        };`
      );
      const result = await loadExtensions(dir);
      expect(result.facetContributions?.architecture).toHaveLength(1);
      expect(result.facetContributions?.architecture?.[0].id).toBe("sap");
    } finally {
      await rm(dir, { recursive: true });
    }
  });

  it("throws a descriptive error when the extensions file exports an invalid shape", async () => {
    const dir = await mkdtemp(join(tmpdir(), "ade-ext-test-"));
    try {
      await writeFile(
        join(dir, "ade.extensions.mjs"),
        `export default { facetContributions: "not-an-object" };`
      );
      await expect(loadExtensions(dir)).rejects.toThrow(/invalid/i);
    } finally {
      await rm(dir, { recursive: true });
    }
  });

  it("loads a .js file when only .js exists", async () => {
    const dir = await mkdtemp(join(tmpdir(), "ade-ext-test-"));
    try {
      await writeFile(
        join(dir, "ade.extensions.js"),
        `export default {
          facets: [
            {
              id: "js-only-facet",
              label: "JS Only",
              description: "From .js fallback",
              required: false,
              options: []
            }
          ]
        };`
      );
      const result = await loadExtensions(dir);
      expect(result.facets).toHaveLength(1);
      expect(result.facets?.[0].id).toBe("js-only-facet");
    } finally {
      await rm(dir, { recursive: true });
    }
  });

  it("prefers .mjs over .js when both exist", async () => {
    const dir = await mkdtemp(join(tmpdir(), "ade-ext-test-"));
    try {
      await writeFile(
        join(dir, "ade.extensions.mjs"),
        `export default { facets: [{ id: "from-mjs", label: "MJS", description: "MJS wins", required: false, options: [] }] };`
      );
      await writeFile(
        join(dir, "ade.extensions.js"),
        `export default { facets: [{ id: "from-js", label: "JS", description: "JS loses", required: false, options: [] }] };`
      );
      const result = await loadExtensions(dir);
      expect(result.facets?.[0].id).toBe("from-mjs");
    } finally {
      await rm(dir, { recursive: true });
    }
  });

  it("loads from an absolute path — simulating npx run from a different cwd", async () => {
    // This is the published-package scenario:
    // The CLI binary lives in ~/.npm/_npx/... but projectRoot is the user's cwd.
    // loadExtensions(projectRoot) must look in projectRoot, not in the CLI package dir.
    const userProjectDir = await mkdtemp(join(tmpdir(), "ade-user-project-"));
    const cliPackageDir = await mkdtemp(join(tmpdir(), "ade-cli-package-"));
    try {
      // Simulate: user project has ade.extensions.mjs
      await writeFile(
        join(userProjectDir, "ade.extensions.mjs"),
        `export default {
          facets: [{ id: "user-project-facet", label: "User", description: "From user project", required: false, options: [] }]
        };`
      );
      // CLI package dir has no extension file (it shouldn't be used)

      // loadExtensions is called with the user's project dir as projectRoot
      const result = await loadExtensions(userProjectDir);
      expect(result.facets?.[0].id).toBe("user-project-facet");

      // CLI package dir produces empty extensions — it is never consulted
      const cliResult = await loadExtensions(cliPackageDir);
      expect(cliResult).toEqual({});
    } finally {
      await rm(userProjectDir, { recursive: true });
      await rm(cliPackageDir, { recursive: true });
    }
  });
});
