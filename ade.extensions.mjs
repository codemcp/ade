/**
 * ade.extensions.mjs — SAP BTP / ABAP architecture extension example
 *
 * Place this file in your project root to extend the default ADE catalog
 * without modifying any upstream source files.
 *
 * This file serves as both documentation and an integration example.
 * It is by no means functional! It's about providing options with dependent
 * skills and documentation sources.
 * TypeScript consumers can use ade.extensions.ts with full IDE type-checking.
 *
 * @type {import('@codemcp/ade-core').AdeExtensions}
 */
export default {
  facetContributions: {
    architecture: [
      {
        id: "sap-abap",
        label: "SAP BTP / ABAP",
        description:
          "SAP Business Technology Platform with ABAP Cloud development",
        recipe: [
          {
            writer: "skills",
            config: {
              skills: [
                {
                  name: "sap-abap-architecture",
                  source: "your-org/ade-sap/skills/sap-abap-architecture"
                },
                {
                  name: "sap-abap-code",
                  source: "your-org/ade-sap/skills/sap-abap-code"
                },
                {
                  name: "sap-abap-testing",
                  source: "your-org/ade-sap/skills/sap-abap-testing"
                }
              ]
            }
          },
          {
            writer: "knowledge",
            config: {
              sources: [
                {
                  name: "sap-abap-docs",
                  origin: "https://your-serialized-version-of-abap-docs.git",
                  description: "Official SAP ABAP Cloud development guide"
                }
              ]
            }
          }
        ],
        docsets: [
          {
            id: "sap-btp-docs",
            label: "SAP BTP",
            origin: "https://your-serialized-version-of-btp-docs.git",
            description: "SAP Business Technology Platform documentation"
          }
        ]
      }
    ]
  }
};
