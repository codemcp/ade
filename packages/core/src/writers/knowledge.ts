import type { ProvisionWriterDef } from "../types.js";

export const knowledgeWriter: ProvisionWriterDef = {
  id: "knowledge",
  async write(config) {
    const { name, origin, description } = config as {
      name: string;
      origin: string;
      description: string;
    };
    return {
      knowledge_sources: [{ name, origin, description }]
    };
  }
};
