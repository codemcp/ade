import type { ProvisionWriterDef } from "../types.js";

export const instructionWriter: ProvisionWriterDef = {
  id: "instruction",
  async write(config) {
    return { instructions: [(config as { text: string }).text] };
  }
};
