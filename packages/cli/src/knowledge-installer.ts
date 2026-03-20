import type { KnowledgeSource } from "@codemcp/ade-core";
import {
  createDocset,
  initDocset
} from "@codemcp/knowledge/packages/cli/dist/exports.js";

/**
 * Install knowledge sources using the @codemcp/knowledge programmatic API.
 *
 * For each knowledge source:
 * 1. Creates a docset config entry via `createDocset` (skips if already exists)
 * 2. Initializes (downloads) the docset via `initDocset`
 *
 * Errors on individual sources are logged and skipped so that one failure
 * doesn't block the rest.
 */
export async function installKnowledge(
  sources: KnowledgeSource[],
  projectRoot: string,
  options: { force?: boolean } = {}
): Promise<void> {
  if (sources.length === 0) return;

  for (const source of sources) {
    try {
      await createDocset(
        {
          id: source.name,
          name: source.description,
          preset: source.preset ?? "git-repo",
          url: source.origin
        },
        { cwd: projectRoot }
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (!msg.includes("already exists")) {
        console.warn(`Warning: failed to create docset "${source.name}":`, msg);
        continue;
      }
      // Docset already registered in config — proceed to (re-)initialize it
    }

    try {
      await initDocset({
        docsetId: source.name,
        cwd: projectRoot,
        ...(options.force && { force: true })
      });
    } catch (err) {
      console.warn(
        `Warning: failed to initialize docset "${source.name}":`,
        err instanceof Error ? err.message : err
      );
    }
  }
}
