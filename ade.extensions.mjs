/**
 * ade.extensions.mjs — SAP BTP / ABAP architecture extension example
 *
 * Place this file in your project root to extend the default ADE catalog
 * without modifying any upstream source files.
 *
 * This file serves as both documentation and an integration example.
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
                  origin:
                    "https://help.sap.com/docs/abap-cloud/abap-development-tools-user-guide",
                  description: "Official SAP ABAP Cloud development guide"
                }
              ]
            }
          }
        ],
        docsets: [
          {
            id: "sap-abap-cloud-docs",
            label: "SAP ABAP Cloud",
            origin:
              "https://help.sap.com/docs/abap-cloud/abap-development-tools-user-guide",
            description: "SAP ABAP Cloud development documentation"
          },
          {
            id: "sap-btp-docs",
            label: "SAP BTP",
            origin: "https://help.sap.com/docs/btp",
            description: "SAP Business Technology Platform documentation"
          }
        ]
      }
    ]
  }
};
