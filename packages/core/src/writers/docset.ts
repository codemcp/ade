import type { ProvisionWriterDef } from "../types.js";

export const docsetWriter: ProvisionWriterDef = {
  id: "docset",
  async write(config) {
    const { id, label, origin, description } = config as {
      id: string;
      label: string;
      origin: string;
      description: string;
    };
    return {
      knowledge_sources: [
        { name: id, origin, description: description ?? label }
      ]
    };
  }
};
