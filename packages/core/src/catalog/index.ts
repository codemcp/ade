import type { Catalog, Facet, Option } from "../types.js";
import { processFacet } from "./facets/process.js";
import { architectureFacet } from "./facets/architecture.js";
import { practicesFacet } from "./facets/practices.js";
import { backpressureFacet } from "./facets/backpressure.js";

export function getDefaultCatalog(): Catalog {
  return {
    facets: [processFacet, architectureFacet, practicesFacet, backpressureFacet]
  };
}

export function getFacet(catalog: Catalog, id: string): Facet | undefined {
  return catalog.facets.find((f) => f.id === id);
}

export function getOption(facet: Facet, id: string): Option | undefined {
  return facet.options.find((o) => o.id === id);
}

/**
 * Topologically sort facets so that dependency facets come before dependent ones.
 * Uses Kahn's algorithm. Throws if a cycle is detected.
 */
export function sortFacets(catalog: Catalog): Facet[] {
  const facets = catalog.facets;
  const idToFacet = new Map(facets.map((f) => [f.id, f]));

  // Build in-degree and adjacency (dependsOn edge: dep → dependent)
  const inDegree = new Map<string, number>(facets.map((f) => [f.id, 0]));
  const dependents = new Map<string, string[]>(facets.map((f) => [f.id, []]));

  for (const facet of facets) {
    for (const dep of facet.dependsOn ?? []) {
      if (idToFacet.has(dep)) {
        inDegree.set(facet.id, (inDegree.get(facet.id) ?? 0) + 1);
        dependents.get(dep)!.push(facet.id);
      }
    }
  }

  const queue: Facet[] = facets.filter((f) => (inDegree.get(f.id) ?? 0) === 0);
  const result: Facet[] = [];

  while (queue.length > 0) {
    const facet = queue.shift()!;
    result.push(facet);
    for (const depId of dependents.get(facet.id) ?? []) {
      const newDegree = (inDegree.get(depId) ?? 0) - 1;
      inDegree.set(depId, newDegree);
      if (newDegree === 0) {
        queue.push(idToFacet.get(depId)!);
      }
    }
  }

  if (result.length !== facets.length) {
    throw new Error("Cycle detected in facet dependsOn graph");
  }

  return result;
}

/**
 * Returns only the options of a facet that are visible given the current choices.
 * Options without an `available()` function are always visible.
 */
export function getVisibleOptions(
  facet: Facet,
  choices: Record<string, string | string[]>,
  catalog: Catalog
): Option[] {
  return facet.options.filter((option) => {
    if (!option.available) return true;
    const deps: Record<string, Option | undefined> = {};
    for (const depFacetId of facet.dependsOn ?? []) {
      const depFacet = getFacet(catalog, depFacetId);
      const choiceVal = choices[depFacetId];
      deps[depFacetId] =
        depFacet && typeof choiceVal === "string"
          ? getOption(depFacet, choiceVal)
          : undefined;
    }
    return option.available(deps);
  });
}
