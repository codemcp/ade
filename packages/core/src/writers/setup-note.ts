import type { ProvisionWriterDef } from "../types.js";

export const setupNoteWriter: ProvisionWriterDef = {
  id: "setup-note",
  async write(config) {
    const { text } = config as { text: string };
    return { setup_notes: [text] };
  }
};
