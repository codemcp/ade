import type { Catalog, Facet, Option } from "../types.js";
import { processFacet } from "./facets/process.js";

export function getDefaultCatalog(): Catalog {
  return {
    facets: [processFacet]
  };
}

export function getFacet(catalog: Catalog, id: string): Facet | undefined {
  return catalog.facets.find((f) => f.id === id);
}

export function getOption(facet: Facet, id: string): Option | undefined {
  return facet.options.find((o) => o.id === id);
}
