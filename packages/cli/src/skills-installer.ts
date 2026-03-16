import { join } from "node:path";
import type { SkillDefinition, InlineSkill } from "@ade/core";
import { runAdd } from "@codemcp/skills/api";

function isInlineSkill(skill: SkillDefinition): skill is InlineSkill {
  return "body" in skill;
}

/**
 * Install skills using the @codemcp/skills programmatic API.
 *
 * Inline skills are expected to already exist as SKILL.md files under
 * `<projectRoot>/.ade/skills/<name>/` (written by the agent writer).
 * This function calls `runAdd` with the local path for inline skills
 * and the remote source for external skills.
 *
 * Note: `runAdd` uses `process.cwd()` to determine the install destination.
 * This function changes cwd to `projectRoot` before calling `runAdd`.
 */
export async function installSkills(
  skills: SkillDefinition[],
  projectRoot: string
): Promise<void> {
  if (skills.length === 0) return;

  const originalCwd = process.cwd();
  process.chdir(projectRoot);

  try {
    for (const skill of skills) {
      const source = isInlineSkill(skill)
        ? join(projectRoot, ".ade", "skills", skill.name)
        : skill.source;

      try {
        await runAdd([source], { yes: true, all: true });
      } catch (err) {
        // runAdd may throw on network errors for external skills.
        // Log and continue — inline skills should always succeed.
        console.warn(
          `Warning: failed to install skill "${skill.name}" from ${source}:`,
          err instanceof Error ? err.message : err
        );
      }
    }
  } finally {
    // Restore cwd only if the original directory still exists
    try {
      process.chdir(originalCwd);
    } catch {
      // Original cwd may have been removed (e.g. in tests)
    }
  }
}
