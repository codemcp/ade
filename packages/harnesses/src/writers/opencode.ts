import { join } from "node:path";
import type { AutonomyProfile, LogicalConfig } from "@codemcp/ade-core";
import type { HarnessWriter } from "../types.js";
import {
  writeAgentMd,
  writeGitHooks,
  writeMcpServers,
  formatYamlKey
} from "../util.js";
import { getAutonomyProfile } from "../permission-policy.js";

type PermissionDecision = "ask" | "allow" | "deny";
type PermissionRule = PermissionDecision | Record<string, PermissionDecision>;

const RIGID_RULES: Record<string, PermissionRule> = {
  "*": "ask",
  webfetch: "ask",
  websearch: "ask",
  codesearch: "ask",
  external_directory: "deny",
  doom_loop: "deny"
};

const SENSIBLE_DEFAULTS_RULES: Record<string, PermissionRule> = {
  read: {
    "*": "allow",
    "*.env": "deny",
    "*.env.*": "deny",
    "*.env.example": "allow"
  },
  edit: "allow",
  glob: "allow",
  grep: "allow",
  list: "allow",
  lsp: "allow",
  task: "allow",
  todoread: "deny",
  todowrite: "deny",
  skill: "deny",
  webfetch: "ask",
  websearch: "ask",
  codesearch: "ask",
  bash: {
    "*": "deny",
    "grep *": "allow",
    "rg *": "allow",
    "find *": "allow",
    "fd *": "allow",
    ls: "allow",
    "ls *": "allow",
    "cat *": "allow",
    "head *": "allow",
    "tail *": "allow",
    "wc *": "allow",
    "sort *": "allow",
    "uniq *": "allow",
    "diff *": "allow",
    "echo *": "allow",
    "printf *": "allow",
    pwd: "allow",
    "which *": "allow",
    "type *": "allow",
    whoami: "allow",
    date: "allow",
    "date *": "allow",
    env: "allow",
    "tree *": "allow",
    "file *": "allow",
    "stat *": "allow",
    "readlink *": "allow",
    "realpath *": "allow",
    "dirname *": "allow",
    "basename *": "allow",
    "sed *": "allow",
    "awk *": "allow",
    "cut *": "allow",
    "tr *": "allow",
    "tee *": "allow",
    "xargs *": "allow",
    "jq *": "allow",
    "yq *": "allow",
    "mkdir *": "allow",
    "touch *": "allow",
    "cp *": "ask",
    "mv *": "ask",
    "ln *": "ask",
    "npm *": "ask",
    "node *": "ask",
    "pip *": "ask",
    "python *": "ask",
    "python3 *": "ask",
    "rm *": "deny",
    "rmdir *": "deny",
    "curl *": "deny",
    "wget *": "deny",
    "chmod *": "deny",
    "chown *": "deny",
    "sudo *": "deny",
    "su *": "deny",
    "sh *": "deny",
    "bash *": "deny",
    "zsh *": "deny",
    "eval *": "deny",
    "exec *": "deny",
    "source *": "deny",
    ". *": "deny",
    "nohup *": "deny",
    "dd *": "deny",
    "mkfs *": "deny",
    "mount *": "deny",
    "umount *": "deny",
    "kill *": "deny",
    "killall *": "deny",
    "pkill *": "deny",
    "nc *": "deny",
    "ncat *": "deny",
    "ssh *": "deny",
    "scp *": "deny",
    "rsync *": "deny",
    "docker *": "deny",
    "kubectl *": "deny",
    "systemctl *": "deny",
    "service *": "deny",
    "crontab *": "deny",
    reboot: "deny",
    "shutdown *": "deny",
    "passwd *": "deny",
    "useradd *": "deny",
    "userdel *": "deny",
    "iptables *": "deny"
  },
  external_directory: "deny",
  doom_loop: "deny"
};

const MAX_AUTONOMY_RULES: Record<string, PermissionRule> = {
  "*": "allow",
  webfetch: "ask",
  websearch: "ask",
  codesearch: "ask",
  external_directory: "deny",
  doom_loop: "deny"
};

function getPermissionRules(
  profile: AutonomyProfile | undefined
): Record<string, PermissionRule> | undefined {
  switch (profile) {
    case "rigid":
      return RIGID_RULES;
    case "sensible-defaults":
      return SENSIBLE_DEFAULTS_RULES;
    case "max-autonomy":
      return MAX_AUTONOMY_RULES;
    default:
      return undefined;
  }
}

export const opencodeWriter: HarnessWriter = {
  id: "opencode",
  label: "OpenCode",
  description: "Terminal AI agent — opencode.json + .opencode/agents/",
  async install(config: LogicalConfig, projectRoot: string) {
    await writeMcpServers(config.mcp_servers, {
      path: join(projectRoot, "opencode.json"),
      key: "mcp",
      transform: (s) => ({
        type: "local",
        command: [s.command, ...s.args],
        ...(Object.keys(s.env).length > 0 ? { environment: s.env } : {})
      }),
      defaults: { $schema: "https://opencode.ai/config.json" }
    });

    const permission = getPermissionRules(getAutonomyProfile(config));

    await writeAgentMd(config, {
      path: join(projectRoot, ".opencode", "agents", "ade.md"),
      extraFrontmatter: permission
        ? renderYamlMapping("permission", permission)
        : undefined,
      fallbackBody:
        "ADE — Agentic Development Environment agent with project conventions and tools."
    });
    await writeGitHooks(config.git_hooks, projectRoot);
  }
};

function renderYamlMapping(
  key: string,
  value: Record<string, PermissionRule>,
  indent = 0
): string[] {
  const prefix = " ".repeat(indent);
  const lines = [`${prefix}${formatYamlKey(key)}:`];

  for (const [childKey, childValue] of Object.entries(value)) {
    if (
      typeof childValue === "object" &&
      childValue !== null &&
      !Array.isArray(childValue)
    ) {
      lines.push(...renderYamlMapping(childKey, childValue, indent + 2));
      continue;
    }

    lines.push(
      `${" ".repeat(indent + 2)}${formatYamlKey(childKey)}: ${JSON.stringify(childValue)}`
    );
  }

  return lines;
}
