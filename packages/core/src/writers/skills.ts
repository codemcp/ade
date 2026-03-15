import type { ProvisionWriterDef, SkillDefinition } from "../types.js";

export const skillsWriter: ProvisionWriterDef = {
  id: "skills",
  async write(config) {
    const { skills } = config as { skills: SkillDefinition[] };
    return { skills };
  }
};
