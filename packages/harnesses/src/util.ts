import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { LogicalConfig, McpServerEntry } from "@ade/core";

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

export async function writeInlineSkills(
  config: LogicalConfig,
  projectRoot: string
): Promise<void> {
  for (const skill of config.skills) {
    if (!("body" in skill)) continue;

    const skillDir = join(projectRoot, ".ade", "skills", skill.name);
    await mkdir(skillDir, { recursive: true });

    const frontmatter = [
      "---",
      `name: ${skill.name}`,
      `description: ${skill.description}`,
      "---"
    ].join("\n");

    await writeFile(
      join(skillDir, "SKILL.md"),
      `${frontmatter}\n\n${skill.body}\n`,
      "utf-8"
    );
  }
}
