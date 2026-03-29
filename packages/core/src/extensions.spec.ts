import { describe, it, expect } from "vitest";
import type { AdeExtensions } from "./types.js";
import { AdeExtensionsSchema } from "./types.js";
import { mergeExtensions } from "./catalog/index.js";
import { getDefaultCatalog, getFacet, getOption } from "./catalog/index.js";

// ─── AdeExtensionsSchema (Zod validation) ──────────────────────────────────

describe("AdeExtensionsSchema", () => {
  it("accepts an empty object (all fields optional)", () => {
    const result = AdeExtensionsSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("accepts a valid facetContributions map", () => {
    const ext: AdeExtensions = {
      facetContributions: {
        architecture: [
          {
            id: "sap",
            label: "SAP",
            description: "SAP BTP ABAP development",
            recipe: [{ writer: "skills", config: { skills: [] } }]
          }
        ]
      }
    };
    const result = AdeExtensionsSchema.safeParse(ext);
    expect(result.success).toBe(true);
  });

  it("accepts a valid facets array (new facets)", () => {
    const ext: AdeExtensions = {
      facets: [
        {
          id: "custom-facet",
          label: "Custom",
          description: "A custom facet",
          required: false,
          options: []
        }
      ]
    };
    const result = AdeExtensionsSchema.safeParse(ext);
    expect(result.success).toBe(true);
  });

  it("accepts harnessWriters", () => {
    const ext: AdeExtensions = {
      harnessWriters: [
        {
          id: "my-harness",
          label: "My Harness",
          description: "Custom harness",
          verified: false,
          detect: async () => false,
          install: async () => {}
        }
      ]
    };
    const result = AdeExtensionsSchema.safeParse(ext);
    expect(result.success).toBe(true);
  });

  it("rejects an invalid facetContributions value (wrong type)", () => {
    const result = AdeExtensionsSchema.safeParse({
      facetContributions: "not-an-object"
    });
    expect(result.success).toBe(false);
  });

  it("rejects a facetContributions option missing required fields", () => {
    const result = AdeExtensionsSchema.safeParse({
      facetContributions: {
        architecture: [
          { id: "sap" } // missing label, description, recipe
        ]
      }
    });
    expect(result.success).toBe(false);
  });
});

// ─── mergeExtensions ────────────────────────────────────────────────────────

describe("mergeExtensions", () => {
  it("returns the original catalog unchanged when extensions is empty", () => {
    const original = getDefaultCatalog();
    const merged = mergeExtensions(original, {});
    expect(merged.facets).toHaveLength(original.facets.length);
    expect(merged.facets.map((f) => f.id)).toEqual(
      original.facets.map((f) => f.id)
    );
  });

  it("adds new options to an existing facet via facetContributions", () => {
    const catalog = getDefaultCatalog();
    const sapOption = {
      id: "sap",
      label: "SAP BTP / ABAP",
      description: "SAP BTP ABAP development",
      recipe: [{ writer: "skills" as const, config: { skills: [] } }]
    };

    const merged = mergeExtensions(catalog, {
      facetContributions: { architecture: [sapOption] }
    });

    const arch = getFacet(merged, "architecture")!;
    expect(arch).toBeDefined();
    const sap = getOption(arch, "sap");
    expect(sap).toBeDefined();
    expect(sap!.label).toBe("SAP BTP / ABAP");
  });

  it("does not mutate the original catalog", () => {
    const catalog = getDefaultCatalog();
    const originalArchOptionCount = getFacet(catalog, "architecture")!.options
      .length;

    mergeExtensions(catalog, {
      facetContributions: {
        architecture: [
          {
            id: "sap",
            label: "SAP",
            description: "SAP",
            recipe: [{ writer: "skills" as const, config: { skills: [] } }]
          }
        ]
      }
    });

    expect(getFacet(catalog, "architecture")!.options).toHaveLength(
      originalArchOptionCount
    );
  });

  it("appends entirely new facets from extensions.facets", () => {
    const catalog = getDefaultCatalog();
    const newFacet = {
      id: "sap-specific",
      label: "SAP Specific",
      description: "SAP-specific choices",
      required: false,
      options: []
    };

    const merged = mergeExtensions(catalog, { facets: [newFacet] });
    expect(merged.facets.map((f) => f.id)).toContain("sap-specific");
    expect(merged.facets).toHaveLength(catalog.facets.length + 1);
  });

  it("ignores facetContributions for unknown facet ids (no crash)", () => {
    const catalog = getDefaultCatalog();
    const merged = mergeExtensions(catalog, {
      facetContributions: {
        "totally-unknown-facet": [
          {
            id: "x",
            label: "X",
            description: "X",
            recipe: [{ writer: "skills" as const, config: { skills: [] } }]
          }
        ]
      }
    });
    // Should not throw; catalog unchanged
    expect(merged.facets).toHaveLength(catalog.facets.length);
  });
});
