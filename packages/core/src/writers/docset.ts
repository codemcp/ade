import type { DocsetPreset, ProvisionWriterDef } from "../types.js";

export const docsetWriter: ProvisionWriterDef = {
  id: "docset",
  async write(config) {
    const { id, label, origin, description, preset } = config as {
      id: string;
      label: string;
      origin: string;
      description: string;
      preset?: DocsetPreset;
    };
    return {
      knowledge_sources: [
        {
          name: id,
          origin,
          description: description ?? label,
          ...(preset && { preset })
        }
      ]
    };
  }
};
