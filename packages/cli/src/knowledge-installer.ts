import type { KnowledgeSource } from "@ade/core";
import {
  createDocset,
  initDocset
} from "@codemcp/knowledge/packages/cli/dist/exports.js";

/**
 * Install knowledge sources using the @codemcp/knowledge programmatic API.
 *
 * For each knowledge source:
 * 1. Creates a docset config entry via `createDocset`
 * 2. Initializes (downloads) the docset via `initDocset`
 *
 * Errors on individual sources are logged and skipped so that one failure
 * doesn't block the rest.
 */
export async function installKnowledge(
  sources: KnowledgeSource[],
  projectRoot: string
): Promise<void> {
  if (sources.length === 0) return;

  for (const source of sources) {
    try {
      await createDocset(
        {
          id: source.name,
          name: source.description,
          preset: "git-repo" as const,
          url: source.origin
        },
        { cwd: projectRoot }
      );
    } catch (err) {
      console.warn(
        `Warning: failed to create docset "${source.name}":`,
        err instanceof Error ? err.message : err
      );
      continue;
    }

    try {
      await initDocset({
        docsetId: source.name,
        cwd: projectRoot
      });
    } catch (err) {
      console.warn(
        `Warning: failed to initialize docset "${source.name}":`,
        err instanceof Error ? err.message : err
      );
    }
  }
}
