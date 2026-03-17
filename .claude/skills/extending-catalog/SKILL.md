---
name: extending-catalog
description: Extends the ADE catalog with new facets, options, or practices. Use when adding a new architecture (e.g. Next.js), a new practice (e.g. Trunk-Based Development), or a new facet to the catalog.
---

# Extending the ADE catalog

The catalog lives in `packages/core/src/catalog/`. Each facet is a separate file under `facets/`.

## Adding an option to an existing facet

Single-file change. Edit the facet file and append an `Option` to the `options` array.

**Architecture option** — `packages/core/src/catalog/facets/architecture.ts`:

```ts
{
  id: "nextjs",
  label: "Next.js",
  description: "Full-stack conventions for Next.js App Router",
  recipe: [
    {
      writer: "skills",
      config: {
        skills: [
          {
            name: "nextjs-architecture",
            description: "Architecture conventions for Next.js applications",
            body: "# Next.js Architecture\n\n## Routing\n- Use App Router..."
          }
        ]
      }
    }
  ],
  docsets: [
    {
      id: "nextjs-docs",
      label: "Next.js",
      origin: "https://github.com/vercel/next.js.git",
      description: "Next.js framework documentation"
    }
  ]
}
```

**Practice option** — `packages/core/src/catalog/facets/practices.ts`:

Same shape, but `docsets` is optional. Practices must work independently of architecture choices.

### Option checklist

- `id`: kebab-case, unique within the facet
- `recipe`: array of provisions — each uses an existing writer (`skills`, `workflows`, `instruction`, `mcp-server`, `knowledge`, `installable`)
- `docsets`: optional, only add git repos that contain genuinely useful reference docs
- Inline skill `body`: keep concise — Claude already knows common frameworks
- For third-party skills, use `ExternalSkill` format: `{ name: "x", source: "org/repo/skills/x" }`

## Adding a new facet

Three touches.

**1. Create the facet file** — e.g. `packages/core/src/catalog/facets/runtime.ts`:

```ts
import type { Facet } from "../../types.js";

export const runtimeFacet: Facet = {
  id: "runtime",
  label: "Runtime",
  description: "Runtime configuration for agent execution",
  required: false,
  multiSelect: true,
  options: [
    // options here
  ]
};
```

**2. Register it** — `packages/core/src/catalog/index.ts`:

```ts
import { runtimeFacet } from "./facets/runtime.js";

export function getDefaultCatalog(): Catalog {
  return {
    facets: [processFacet, architectureFacet, practicesFacet, runtimeFacet]
  };
}
```

**3. Done** — the CLI setup command iterates `catalog.facets`, so a new facet gets its own selection step automatically.

### Facet checklist

- `id`: kebab-case, globally unique
- `required`: true only if every project must choose an option
- `multiSelect`: true when options are composable (like practices), false when mutually exclusive (like architecture)
- `dependsOn`: optional array of facet IDs that must be resolved first

## Adding a new provision writer

Only needed when existing writers (`workflows`, `skills`, `knowledge`, `mcp-server`, `instruction`, `installable`) cannot express the output.

1. Add the writer name to the `ProvisionWriter` union in `packages/core/src/types.ts`
2. Implement `ProvisionWriterDef` — a `write(config, context)` returning `Partial<LogicalConfig>`
3. Register it in the `WriterRegistry`
4. If the output doesn't fit existing `LogicalConfig` fields, extend the interface and update merge logic in `packages/core/src/resolver.ts`
5. Update every harness writer in `packages/harnesses/src/writers/` to emit the new config field

This is the most expensive extension — avoid it unless strictly necessary.

## Key types

All in `packages/core/src/types.ts`:

- `Catalog` → `{ facets: Facet[] }`
- `Facet` → `{ id, label, description, required, multiSelect?, dependsOn?, options }`
- `Option` → `{ id, label, description, recipe, docsets? }`
- `Provision` → `{ writer: ProvisionWriter, config }`
- `ProvisionWriter` → `"workflows" | "skills" | "knowledge" | "mcp-server" | "instruction" | "installable"`

## Resolution flow

`UserConfig.choices` → `resolve()` iterates facets → matches options → runs each provision's writer → merges into `LogicalConfig` → harness writers emit agent-specific files.

See `packages/core/src/resolver.ts` for the full implementation.
