import { access } from "node:fs/promises";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { AdeExtensionsSchema, type AdeExtensions } from "@codemcp/ade-core";

const SEARCH_ORDER = [
  "ade.extensions.ts",
  "ade.extensions.mjs",
  "ade.extensions.js"
] as const;

/**
 * Loads and validates the project's `ade.extensions` file (if any).
 *
 * Search order: ade.extensions.ts → ade.extensions.mjs → ade.extensions.js
 *
 * - `.ts` files are loaded via `jiti` for TypeScript support.
 * - `.mjs` / `.js` files are loaded via native dynamic `import()`.
 * - Returns `{}` when no extensions file exists.
 * - Throws with a descriptive message when the file exports an invalid shape.
 */
export async function loadExtensions(
  projectRoot: string
): Promise<AdeExtensions> {
  for (const filename of SEARCH_ORDER) {
    const filePath = join(projectRoot, filename);

    if (!(await fileExists(filePath))) continue;

    // eslint-disable-next-line no-await-in-loop
    const mod = await loadModule(filePath, filename);
    const raw = mod?.default ?? mod;

    const result = AdeExtensionsSchema.safeParse(raw);
    if (!result.success) {
      throw new Error(
        `Invalid ade.extensions file at ${filePath}:\n${result.error.message}`
      );
    }

    return result.data;
  }

  return {};
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function loadModule(
  filePath: string,
  filename: string
): Promise<Record<string, unknown>> {
  if (filename.endsWith(".ts")) {
    // Use jiti for TypeScript support
    const { createJiti } = await import("jiti");
    const jiti = createJiti(import.meta.url);
    return jiti.import(filePath) as Promise<Record<string, unknown>>;
  }

  // Native ESM for .mjs / .js
  return import(pathToFileURL(filePath).href) as Promise<
    Record<string, unknown>
  >;
}
