# Extending ADE

ADE is designed to be forked and extended without modifying upstream source
files. Drop an `ade.extensions.mjs` (or `.ts` / `.js`) into your project root
and ADE picks it up automatically on every `ade setup` or `ade install` run.

## How it works

```
your-project/
  ade.extensions.mjs   ← ADE reads this from process.cwd()
  config.yaml
  config.lock.yaml
```

`npx @codemcp/ade setup` resolves `projectRoot` to `process.cwd()` — the
directory you run the command from — so the extensions file is always loaded
from your project, never from the installed CLI package.

## The extension file

Export a default object conforming to `AdeExtensions`:

```js
// ade.extensions.mjs
/** @type {import('@codemcp/ade-core').AdeExtensions} */
export default {
  // Add options to an existing facet
  facetContributions: {
    architecture: [
      /* Option[] */
    ]
  },

  // Add entirely new facets
  facets: [
    /* Facet[] */
  ],

  // Add custom provision writers
  provisionWriters: [
    /* ProvisionWriterDef[] */
  ],

  // Add custom harness writers
  harnessWriters: [
    /* HarnessWriter[] */
  ]
};
```

All fields are optional — include only what you need.

For TypeScript with full IDE type-checking, name the file
`ade.extensions.ts` instead (requires `jiti`, which is bundled with the CLI).

## Adding an architecture option

The most common case: contributing a new option to the built-in `architecture`
facet so it appears in the setup wizard alongside TanStack, Node.js, etc.

```js
// ade.extensions.mjs
/** @type {import('@codemcp/ade-core').AdeExtensions} */
export default {
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
                // Inline skill — body is written to .ade/skills/<name>/SKILL.md
                {
                  name: "sap-abap-code",
                  description: "SAP ABAP coding guidelines",
                  body: "# SAP ABAP Code\n\nUse ABAP Cloud APIs only. ..."
                },
                // External skill — fetched from a skills server at install time
                {
                  name: "sap-abap-architecture",
                  source: "your-org/ade-sap/skills/sap-abap-architecture"
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
        ],
        docsets: [
          {
            id: "sap-abap-cloud-docs",
            label: "SAP ABAP Cloud",
            origin: "https://help.sap.com/docs/abap-cloud",
            description: "SAP ABAP Cloud development documentation"
          }
        ]
      }
    ]
  }
};
```

After running `ade setup` and selecting `SAP BTP / ABAP`:

- Inline skills are staged to `.ade/skills/<name>/SKILL.md` and installed
  to `.agentskills/skills/<name>/` for agent consumption
- Knowledge sources appear in `config.lock.yaml` under
  `logical_config.knowledge_sources` and can be initialised with
  `npx @codemcp/knowledge init`
- Docsets appear in the setup wizard's documentation sources step

## Adding a new facet

```js
export default {
  facets: [
    {
      id: "deployment",
      label: "Deployment",
      description: "Target deployment platform",
      required: false,
      options: [
        {
          id: "cf",
          label: "Cloud Foundry",
          description: "SAP BTP Cloud Foundry environment",
          recipe: [{ writer: "skills", config: { skills: [...] } }]
        }
      ]
    }
  ]
};
```

New facets are appended after the built-in facets in the wizard. To express
that a facet depends on another (for conditional option filtering), set
`dependsOn: ["architecture"]` and implement `available()` on individual options.

## Adding a harness writer

```js
export default {
  harnessWriters: [
    {
      id: "my-internal-ide",
      label: "Internal IDE",
      description: "Our internal coding assistant",
      async install(logicalConfig, projectRoot) {
        // write whatever config files your IDE expects
      }
    }
  ]
};
```

The harness appears in the setup wizard's "which agents should receive config?"
multi-select, after the built-in harnesses.

## Validation

The extensions file is validated with Zod when loaded. If the shape is wrong
you get a descriptive error at setup time, not a silent no-op:

```
Error: Invalid ade.extensions file at /your-project/ade.extensions.mjs:
  facetContributions: Expected object, received string
```

## What stays upstream-compatible

| Upstream file                        | Status                                           |
| ------------------------------------ | ------------------------------------------------ |
| `packages/core/src/catalog/index.ts` | ✅ Never touch — use `facetContributions`        |
| `packages/harnesses/src/index.ts`    | ✅ Never touch — use `harnessWriters`            |
| `packages/cli/src/index.ts`          | ✅ Never touch — extensions loaded automatically |
| `ade.extensions.mjs` (your file)     | 🔧 Yours to own                                  |
