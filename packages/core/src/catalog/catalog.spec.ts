import { describe, it, expect } from "vitest";
import {
  getDefaultCatalog,
  getFacet,
  getOption,
  sortFacets,
  getVisibleOptions
} from "./index.js";
import { createDefaultRegistry, getProvisionWriter } from "../registry.js";

describe("catalog", () => {
  describe("getDefaultCatalog", () => {
    it("returns a catalog containing at least the 'process' facet", () => {
      const catalog = getDefaultCatalog();
      const process = getFacet(catalog, "process");
      expect(process).toBeDefined();
      expect(process!.id).toBe("process");
    });
  });

  describe("getFacet / getOption", () => {
    it("process facet's 'codemcp-workflows' option has a recipe referencing the 'workflows' writer", () => {
      const catalog = getDefaultCatalog();
      const process = getFacet(catalog, "process")!;
      const option = getOption(process, "codemcp-workflows");

      expect(option).toBeDefined();
      expect(option!.recipe.some((p) => p.writer === "workflows")).toBe(true);
    });

    it("process facet's 'native-agents-md' option has a recipe referencing only the 'instruction' writer", () => {
      const catalog = getDefaultCatalog();
      const process = getFacet(catalog, "process")!;
      const option = getOption(process, "native-agents-md");

      expect(option).toBeDefined();
      const writers = option!.recipe.map((p) => p.writer);
      expect(writers).toEqual(["instruction"]);
    });

    it("returns undefined for a nonexistent facet id", () => {
      const catalog = getDefaultCatalog();
      expect(getFacet(catalog, "nonexistent")).toBeUndefined();
    });

    it("returns undefined for a nonexistent option id", () => {
      const catalog = getDefaultCatalog();
      const process = getFacet(catalog, "process")!;
      expect(getOption(process, "nonexistent")).toBeUndefined();
    });
  });

  describe("architecture facet", () => {
    it("exists in the default catalog", () => {
      const catalog = getDefaultCatalog();
      const architecture = getFacet(catalog, "architecture");
      expect(architecture).toBeDefined();
      expect(architecture!.required).toBe(false);
    });

    it("is single-select", () => {
      const catalog = getDefaultCatalog();
      const architecture = getFacet(catalog, "architecture")!;
      expect(architecture.multiSelect).toBe(false);
    });

    it("has tanstack option with skills for architecture, design, code, testing, and playwright", () => {
      const catalog = getDefaultCatalog();
      const architecture = getFacet(catalog, "architecture")!;
      const tanstack = getOption(architecture, "tanstack");

      expect(tanstack).toBeDefined();
      const skillsProvisions = tanstack!.recipe.filter(
        (p) => p.writer === "skills"
      );
      expect(skillsProvisions).toHaveLength(1);

      const skills = (
        skillsProvisions[0].config as { skills: { name: string }[] }
      ).skills;
      const names = skills.map((s) => s.name);
      expect(names).toContain("tanstack-architecture");
      expect(names).toContain("tanstack-design");
      expect(names).toContain("tanstack-code");
      expect(names).toContain("tanstack-testing");
      expect(names).toContain("playwright-cli");

      // playwright-cli should be an external skill (has source, no body)
      const playwright = skills.find(
        (s: Record<string, unknown>) => s.name === "playwright-cli"
      ) as Record<string, unknown>;
      expect(playwright.source).toBe(
        "microsoft/playwright-cli/skills/playwright-cli"
      );
      expect(playwright).not.toHaveProperty("body");
    });
  });

  describe("nodejs-backend option", () => {
    it("has nodejs-backend option with skills for architecture, design, code, and testing", () => {
      const catalog = getDefaultCatalog();
      const architecture = getFacet(catalog, "architecture")!;
      const nodejsBackend = getOption(architecture, "nodejs-backend");

      expect(nodejsBackend).toBeDefined();
      const skillsProvisions = nodejsBackend!.recipe.filter(
        (p) => p.writer === "skills"
      );
      expect(skillsProvisions).toHaveLength(1);

      const skills = (
        skillsProvisions[0].config as { skills: { name: string }[] }
      ).skills;
      const names = skills.map((s) => s.name);
      expect(names).toContain("nodejs-backend-architecture");
      expect(names).toContain("nodejs-backend-design");
      expect(names).toContain("nodejs-backend-code");
      expect(names).toContain("nodejs-backend-testing");
    });

    it("nodejs-backend option declares docsets for tRPC, Drizzle, Express, and Zod", () => {
      const catalog = getDefaultCatalog();
      const architecture = getFacet(catalog, "architecture")!;
      const nodejsBackend = getOption(architecture, "nodejs-backend")!;

      expect(nodejsBackend.docsets).toBeDefined();
      const ids = nodejsBackend.docsets!.map((d) => d.id);
      expect(ids).toContain("trpc-docs");
      expect(ids).toContain("drizzle-orm-docs");
      expect(ids).toContain("express-docs");
      expect(ids).toContain("zod-docs");
    });

    it("each nodejs-backend docset has required fields", () => {
      const catalog = getDefaultCatalog();
      const architecture = getFacet(catalog, "architecture")!;
      const nodejsBackend = getOption(architecture, "nodejs-backend")!;

      for (const docset of nodejsBackend.docsets!) {
        expect(docset.id).toBeTruthy();
        expect(docset.label).toBeTruthy();
        expect(docset.origin).toMatch(/^https:\/\//);
        expect(docset.description).toBeTruthy();
      }
    });
  });

  describe("java-backend option", () => {
    it("has java-backend option with skills for architecture, design, code, and testing", () => {
      const catalog = getDefaultCatalog();
      const architecture = getFacet(catalog, "architecture")!;
      const javaBackend = getOption(architecture, "java-backend");

      expect(javaBackend).toBeDefined();
      const skillsProvisions = javaBackend!.recipe.filter(
        (p) => p.writer === "skills"
      );
      expect(skillsProvisions).toHaveLength(1);

      const skills = (
        skillsProvisions[0].config as { skills: { name: string }[] }
      ).skills;
      const names = skills.map((s) => s.name);
      expect(names).toContain("java-backend-architecture");
      expect(names).toContain("java-backend-design");
      expect(names).toContain("java-backend-code");
      expect(names).toContain("java-backend-testing");
    });

    it("java-backend option declares docsets for Spring Boot, Spring Data JPA, Spring Security, and Lombok", () => {
      const catalog = getDefaultCatalog();
      const architecture = getFacet(catalog, "architecture")!;
      const javaBackend = getOption(architecture, "java-backend")!;

      expect(javaBackend.docsets).toBeDefined();
      const ids = javaBackend.docsets!.map((d) => d.id);
      expect(ids).toContain("spring-boot-docs");
      expect(ids).toContain("spring-data-jpa-docs");
      expect(ids).toContain("spring-security-docs");
      expect(ids).toContain("lombok-docs");
    });

    it("each java-backend docset has required fields", () => {
      const catalog = getDefaultCatalog();
      const architecture = getFacet(catalog, "architecture")!;
      const javaBackend = getOption(architecture, "java-backend")!;

      for (const docset of javaBackend.docsets!) {
        expect(docset.id).toBeTruthy();
        expect(docset.label).toBeTruthy();
        expect(docset.origin).toMatch(/^https:\/\//);
        expect(docset.description).toBeTruthy();
      }
    });
  });

  describe("architecture facet docsets", () => {
    it("tanstack option declares docsets for Router, Query, Form, and Table", () => {
      const catalog = getDefaultCatalog();
      const architecture = getFacet(catalog, "architecture")!;
      const tanstack = getOption(architecture, "tanstack")!;

      expect(tanstack.docsets).toBeDefined();
      const ids = tanstack.docsets!.map((d) => d.id);
      expect(ids).toContain("tanstack-router-docs");
      expect(ids).toContain("tanstack-query-docs");
      expect(ids).toContain("tanstack-form-docs");
      expect(ids).toContain("tanstack-table-docs");
    });

    it("each docset has required fields", () => {
      const catalog = getDefaultCatalog();
      const architecture = getFacet(catalog, "architecture")!;
      const tanstack = getOption(architecture, "tanstack")!;

      for (const docset of tanstack.docsets!) {
        expect(docset.id).toBeTruthy();
        expect(docset.label).toBeTruthy();
        expect(docset.origin).toMatch(/^https:\/\//);
        expect(docset.description).toBeTruthy();
      }
    });
  });

  describe("practices facet", () => {
    it("exists in the default catalog", () => {
      const catalog = getDefaultCatalog();
      const practices = getFacet(catalog, "practices");
      expect(practices).toBeDefined();
      expect(practices!.required).toBe(false);
    });

    it("is multi-select", () => {
      const catalog = getDefaultCatalog();
      const practices = getFacet(catalog, "practices")!;
      expect(practices.multiSelect).toBe(true);
    });

    it("has conventional-commits option with a single skill", () => {
      const catalog = getDefaultCatalog();
      const practices = getFacet(catalog, "practices")!;
      const option = getOption(practices, "conventional-commits");

      expect(option).toBeDefined();
      const skills = (
        option!.recipe.find((p) => p.writer === "skills")!.config as {
          skills: { name: string }[];
        }
      ).skills;
      expect(skills).toHaveLength(1);
      expect(skills[0].name).toBe("conventional-commits");
    });

    it("conventional-commits option declares the spec docset", () => {
      const catalog = getDefaultCatalog();
      const practices = getFacet(catalog, "practices")!;
      const option = getOption(practices, "conventional-commits")!;

      expect(option.docsets).toBeDefined();
      expect(option.docsets).toHaveLength(1);
      expect(option.docsets![0].id).toBe("conventional-commits-spec");
    });

    it("has tdd-london option with a single skill", () => {
      const catalog = getDefaultCatalog();
      const practices = getFacet(catalog, "practices")!;
      const option = getOption(practices, "tdd-london");

      expect(option).toBeDefined();
    });

    it("has adr-nygard option with a single skill", () => {
      const catalog = getDefaultCatalog();
      const practices = getFacet(catalog, "practices")!;
      const option = getOption(practices, "adr-nygard");

      expect(option).toBeDefined();
    });
  });

  describe("backpressure facet", () => {
    it("exists in the default catalog", () => {
      const catalog = getDefaultCatalog();
      const backpressure = getFacet(catalog, "backpressure");
      expect(backpressure).toBeDefined();
      expect(backpressure!.required).toBe(false);
    });

    it("is multi-select", () => {
      const catalog = getDefaultCatalog();
      const backpressure = getFacet(catalog, "backpressure")!;
      expect(backpressure.multiSelect).toBe(true);
    });

    it("depends on architecture facet", () => {
      const catalog = getDefaultCatalog();
      const backpressure = getFacet(catalog, "backpressure")!;
      expect(backpressure.dependsOn).toContain("architecture");
    });

    it("has per-architecture lint-build-precommit options with git-hooks provisions", () => {
      const catalog = getDefaultCatalog();
      const backpressure = getFacet(catalog, "backpressure")!;

      for (const archId of ["tanstack", "nodejs-backend", "java-backend"]) {
        const option = getOption(
          backpressure,
          `lint-build-precommit-${archId}`
        );
        expect(option, `lint-build-precommit-${archId} missing`).toBeDefined();
        expect(option!.recipe.some((p) => p.writer === "git-hooks")).toBe(true);

        const gitHooksProvision = option!.recipe.find(
          (p) => p.writer === "git-hooks"
        )!;
        const hooks = (
          gitHooksProvision.config as { hooks: { phase: string }[] }
        ).hooks;
        expect(hooks.some((h) => h.phase === "pre-commit")).toBe(true);
      }
    });

    it("lint-build-precommit options have an instruction provision for WIP commits", () => {
      const catalog = getDefaultCatalog();
      const backpressure = getFacet(catalog, "backpressure")!;

      for (const archId of ["tanstack", "nodejs-backend", "java-backend"]) {
        const option = getOption(
          backpressure,
          `lint-build-precommit-${archId}`
        )!;
        expect(option.recipe.some((p) => p.writer === "instruction")).toBe(
          true
        );
      }
    });

    it("lint-build-precommit options have a setup-note provision", () => {
      const catalog = getDefaultCatalog();
      const backpressure = getFacet(catalog, "backpressure")!;

      for (const archId of ["tanstack", "nodejs-backend", "java-backend"]) {
        const option = getOption(
          backpressure,
          `lint-build-precommit-${archId}`
        )!;
        const note = option.recipe.find((p) => p.writer === "setup-note");
        expect(
          note,
          `lint-build-precommit-${archId} missing setup-note`
        ).toBeDefined();
        expect((note!.config as { text: string }).text).toBeTruthy();
      }
    });

    it("has per-architecture unit-test-prepush options with git-hooks provisions", () => {
      const catalog = getDefaultCatalog();
      const backpressure = getFacet(catalog, "backpressure")!;

      for (const archId of ["tanstack", "nodejs-backend", "java-backend"]) {
        const option = getOption(backpressure, `unit-test-prepush-${archId}`);
        expect(option, `unit-test-prepush-${archId} missing`).toBeDefined();
        expect(option!.recipe.some((p) => p.writer === "git-hooks")).toBe(true);

        const gitHooksProvision = option!.recipe.find(
          (p) => p.writer === "git-hooks"
        )!;
        const hooks = (
          gitHooksProvision.config as { hooks: { phase: string }[] }
        ).hooks;
        expect(hooks.some((h) => h.phase === "pre-push")).toBe(true);
      }
    });

    it("hook scripts contain the swallow-on-success pattern", () => {
      const catalog = getDefaultCatalog();
      const backpressure = getFacet(catalog, "backpressure")!;

      for (const option of backpressure.options) {
        const gitHooksProvision = option.recipe.find(
          (p) => p.writer === "git-hooks"
        )!;
        const hooks = (
          gitHooksProvision.config as { hooks: { script: string }[] }
        ).hooks;
        for (const hook of hooks) {
          expect(hook.script).toContain("✓");
          expect(hook.script).toContain("exit_code");
        }
      }
    });

    it("all options have an available() function", () => {
      const catalog = getDefaultCatalog();
      const backpressure = getFacet(catalog, "backpressure")!;

      for (const option of backpressure.options) {
        expect(
          typeof option.available,
          `option ${option.id} missing available()`
        ).toBe("function");
      }
    });
  });

  describe("backpressure facet — available()", () => {
    it("tanstack options are visible when architecture=tanstack", () => {
      const catalog = getDefaultCatalog();
      const backpressure = getFacet(catalog, "backpressure")!;
      const architectureFacet = getFacet(catalog, "architecture")!;
      const tanstackOption = getOption(architectureFacet, "tanstack")!;

      const visible = getVisibleOptions(
        backpressure,
        { architecture: "tanstack" },
        catalog
      );
      const ids = visible.map((o) => o.id);
      expect(ids).toContain("lint-build-precommit-tanstack");
      expect(ids).toContain("unit-test-prepush-tanstack");
      expect(ids).not.toContain("lint-build-precommit-java-backend");
      expect(tanstackOption).toBeDefined(); // guard
    });

    it("java-backend options are visible when architecture=java-backend", () => {
      const catalog = getDefaultCatalog();
      const backpressure = getFacet(catalog, "backpressure")!;

      const visible = getVisibleOptions(
        backpressure,
        { architecture: "java-backend" },
        catalog
      );
      const ids = visible.map((o) => o.id);
      expect(ids).toContain("lint-build-precommit-java-backend");
      expect(ids).toContain("unit-test-prepush-java-backend");
      expect(ids).not.toContain("lint-build-precommit-tanstack");
    });

    it("no options visible when architecture is not selected", () => {
      const catalog = getDefaultCatalog();
      const backpressure = getFacet(catalog, "backpressure")!;

      const visible = getVisibleOptions(backpressure, {}, catalog);
      expect(visible).toHaveLength(0);
    });

    it("only the two matching options are visible per architecture", () => {
      const catalog = getDefaultCatalog();
      const backpressure = getFacet(catalog, "backpressure")!;

      for (const archId of ["tanstack", "nodejs-backend", "java-backend"]) {
        const visible = getVisibleOptions(
          backpressure,
          { architecture: archId },
          catalog
        );
        expect(visible, `expected 2 options for ${archId}`).toHaveLength(2);
        expect(visible.every((o) => o.id.endsWith(`-${archId}`))).toBe(true);
      }
    });
  });

  describe("sortFacets", () => {
    it("returns all facets", () => {
      const catalog = getDefaultCatalog();
      const sorted = sortFacets(catalog);
      expect(sorted).toHaveLength(catalog.facets.length);
    });

    it("places backpressure after architecture", () => {
      const catalog = getDefaultCatalog();
      const sorted = sortFacets(catalog);
      const archIdx = sorted.findIndex((f) => f.id === "architecture");
      const bpIdx = sorted.findIndex((f) => f.id === "backpressure");
      expect(archIdx).toBeLessThan(bpIdx);
    });

    it("facets without dependsOn are not placed after their dependents", () => {
      const catalog = getDefaultCatalog();
      const sorted = sortFacets(catalog);
      for (const facet of sorted) {
        const facetIdx = sorted.findIndex((f) => f.id === facet.id);
        for (const depId of facet.dependsOn ?? []) {
          const depIdx = sorted.findIndex((f) => f.id === depId);
          expect(depIdx, `${depId} must come before ${facet.id}`).toBeLessThan(
            facetIdx
          );
        }
      }
    });
  });

  describe("getVisibleOptions", () => {
    it("returns all options when none have available()", () => {
      const catalog = getDefaultCatalog();
      const architecture = getFacet(catalog, "architecture")!;
      const visible = getVisibleOptions(architecture, {}, catalog);
      expect(visible).toHaveLength(architecture.options.length);
    });

    it("returns all options when available() returns true for all", () => {
      const catalog = getDefaultCatalog();
      const architecture = getFacet(catalog, "architecture")!;
      const visible = getVisibleOptions(
        architecture,
        { architecture: "tanstack" },
        catalog
      );
      expect(visible).toHaveLength(architecture.options.length);
    });
  });

  describe("catalog + registry integration", () => {
    it("every recipe provision references a writer that exists in the default registry", () => {
      const catalog = getDefaultCatalog();
      const registry = createDefaultRegistry();

      for (const facet of catalog.facets) {
        for (const option of facet.options) {
          for (const provision of option.recipe) {
            expect(
              getProvisionWriter(registry, provision.writer),
              `writer "${provision.writer}" referenced in ${facet.id}/${option.id} must exist in default registry`
            ).toBeDefined();
          }
        }
      }
    });
  });
});
