import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import * as clack from "@clack/prompts";
import type { GitHook, LogicalConfig, McpServerEntry } from "@codemcp/ade-core";

/** Returns true if the given path exists (file or directory). */
export async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// JSON helpers
// ---------------------------------------------------------------------------

/** Read a JSON file, returning `{}` if missing or unparseable. */
export async function readJsonOrEmpty(
  path: string
): Promise<Record<string, unknown>> {
  try {
    return JSON.parse(await readFile(path, "utf-8"));
  } catch {
    return {};
  }
}

/** Write a JSON object with trailing newline. Creates parent dirs. */
export async function writeJson(path: string, data: unknown): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, JSON.stringify(data, null, 2) + "\n", "utf-8");
}

// ---------------------------------------------------------------------------
// Server entry transform — each harness overrides only what differs
// ---------------------------------------------------------------------------

/** Minimal MCP entry: command + args + optional env. */
function baseEntry(server: McpServerEntry) {
  return {
    command: server.command,
    args: server.args,
    ...(Object.keys(server.env).length > 0 ? { env: server.env } : {})
  };
}

export type ServerTransform = (
  server: McpServerEntry
) => Record<string, unknown>;

/** Standard mcpServers entry (cursor, universal, claude-code). */
export const standardEntry: ServerTransform = baseEntry;

/** Adds `type: "stdio"` (copilot). */
export const stdioEntry: ServerTransform = (s) => ({
  type: "stdio",
  ...baseEntry(s)
});

/** Adds `alwaysAllow` (cline, roo-code, windsurf). */
export const alwaysAllowEntry: ServerTransform = (s) => ({
  ...baseEntry(s),
  alwaysAllow: s.allowedTools ?? ["*"]
});

// ---------------------------------------------------------------------------
// MCP JSON writer — covers 7 of 9 harnesses
// ---------------------------------------------------------------------------

interface WriteMcpServersOpts {
  /** Full path to the JSON file. */
  path: string;
  /** Key in the JSON that holds the server map. Default: `"mcpServers"`. */
  key?: string;
  /** Transform each McpServerEntry into the harness-specific shape. */
  transform?: ServerTransform;
  /** Extra top-level fields to merge (e.g. `$schema`). */
  defaults?: Record<string, unknown>;
}

/**
 * Merge MCP server entries into an existing JSON config file.
 * Creates the file (and parent dirs) if missing.
 */
export async function writeMcpServers(
  servers: McpServerEntry[],
  opts: WriteMcpServersOpts
): Promise<void> {
  if (servers.length === 0) return;

  const key = opts.key ?? "mcpServers";
  const transform = opts.transform ?? standardEntry;

  const existing = await readJsonOrEmpty(opts.path);
  const map = (existing[key] as Record<string, unknown>) ?? {};

  for (const server of servers) {
    map[server.ref] = transform(server);
  }

  const result = { ...(opts.defaults ?? {}), ...existing, [key]: map };
  await writeJson(opts.path, result);
}

// ---------------------------------------------------------------------------
// Instructions → flat rules file (windsurf, cline, roo-code)
// ---------------------------------------------------------------------------

/**
 * Write instructions as a plain text rules file.
 * Skips if no instructions.
 */
export async function writeRulesFile(
  instructions: string[],
  path: string
): Promise<void> {
  if (instructions.length === 0) return;
  const lines = instructions.flatMap((i) => [i, ""]);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, lines.join("\n"), "utf-8");
}

// ---------------------------------------------------------------------------
// Instructions → agent markdown with YAML frontmatter
// ---------------------------------------------------------------------------

interface AgentMdOpts {
  /** Full path to the .md file. */
  path: string;
  /** Extra YAML frontmatter lines (after name/description, before `---`). */
  extraFrontmatter?: string[];
  /** Fallback body when instructions are empty. */
  fallbackBody?: string;
}

/**
 * Write an agent markdown file with YAML frontmatter.
 * Shared by claude-code, copilot, and opencode.
 */
export async function writeAgentMd(
  config: LogicalConfig,
  opts: AgentMdOpts
): Promise<void> {
  if (config.instructions.length === 0 && config.mcp_servers.length === 0)
    return;

  const fm: string[] = [
    "---",
    "name: ade",
    "description: ADE — Agentic Development Environment agent with project conventions and tools"
  ];

  if (opts.extraFrontmatter) {
    fm.push(...opts.extraFrontmatter);
  }

  fm.push("---");

  const body =
    config.instructions.length > 0
      ? config.instructions.join("\n\n")
      : (opts.fallbackBody ?? "");

  const content = fm.join("\n") + "\n\n" + body + "\n";
  await mkdir(dirname(opts.path), { recursive: true });
  await writeFile(opts.path, content, "utf-8");
}

// ---------------------------------------------------------------------------
// Inline skill SKILL.md writer (used by claude-code)
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Git hook installer
// ---------------------------------------------------------------------------

/**
 * Write git hook scripts to `.git/hooks/<phase>`.
 * Files are created with executable permissions (0o755).
 * No-op when the hooks array is empty or undefined.
 * Emits a warning and skips gracefully when the project root is not a git repository.
 */
export async function writeGitHooks(
  hooks: GitHook[] | undefined,
  projectRoot: string
): Promise<void> {
  if (!hooks || hooks.length === 0) return;

  const gitDir = join(projectRoot, ".git");
  try {
    await access(gitDir);
  } catch {
    clack.log.warn(
      "Git hooks were configured but could not be installed: the project is not a git repository.\n" +
        "Run `git init` and re-run setup to install the hooks."
    );
    return;
  }

  const hooksDir = join(gitDir, "hooks");
  await mkdir(hooksDir, { recursive: true });

  for (const hook of hooks) {
    const hookPath = join(hooksDir, hook.phase);
    await writeFile(hookPath, hook.script, { mode: 0o755 });
  }
}

export async function writeInlineSkills(
  config: LogicalConfig,
  projectRoot: string
): Promise<string[]> {
  const modified: string[] = [];

  for (const skill of config.skills) {
    if (!("body" in skill)) continue;

    const skillDir = join(projectRoot, ".ade", "skills", skill.name);
    const skillPath = join(skillDir, "SKILL.md");

    const frontmatter = [
      "---",
      `name: ${skill.name}`,
      `description: ${formatYamlValue(skill.description)}`,
      "---"
    ].join("\n");

    const expected = `${frontmatter}\n\n${skill.body}\n`;

    // Write SKILL.md — track as modified only when content changes or file is new
    let skillMdChanged = false;
    try {
      const existing = await readFile(skillPath, "utf-8");
      skillMdChanged = existing !== expected;
    } catch {
      // File doesn't exist yet — treat as changed
      skillMdChanged = true;
    }

    if (skillMdChanged) {
      await mkdir(skillDir, { recursive: true });
      await writeFile(skillPath, expected, "utf-8");
      modified.push(skill.name);
    }

    // Write asset files (e.g. references/foo.md, scripts/setup.sh)
    if (skill.assets) {
      for (const [relativePath, content] of Object.entries(skill.assets)) {
        const assetPath = join(skillDir, relativePath);
        let assetChanged = false;
        try {
          const existing = await readFile(assetPath, "utf-8");
          assetChanged = existing !== content;
        } catch {
          // File doesn't exist yet — treat as changed
          assetChanged = true;
        }

        if (assetChanged) {
          await mkdir(dirname(assetPath), { recursive: true });
          await writeFile(assetPath, content, "utf-8");
          if (!modified.includes(skill.name)) {
            modified.push(skill.name);
          }
        }
      }
    }
  }

  return modified;
}

// ---------------------------------------------------------------------------
// YAML helpers
// ---------------------------------------------------------------------------

/** Quote a YAML key only when it contains characters that require quoting. */
export function formatYamlKey(value: string): string {
  return /^[A-Za-z_][A-Za-z0-9_-]*$/.test(value)
    ? value
    : JSON.stringify(value);
}

/**
 * Format a YAML scalar value, adding double-quote wrapping when the value
 * contains characters that a YAML parser would otherwise misinterpret:
 *
 * - `: ` (colon-space) — parsed as a mapping entry separator
 * - `#` — parsed as a comment start
 * - Leading `@`, `{`, `}`, `[`, `]`, `|`, `>`, `'`, `"`, `&`, `*`, `!`, `%`
 *   — YAML indicator characters
 *
 * Double-quotes inside the value are escaped as `\"`.
 */
export function formatYamlValue(value: string): string {
  const needsQuoting =
    /: /.test(value) || /#/.test(value) || /^[@{}[\]|>'"`&*!%]/.test(value);
  if (!needsQuoting) return value;
  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}
