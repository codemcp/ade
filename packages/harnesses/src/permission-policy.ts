import type {
  AutonomyCapability,
  LogicalConfig,
  PermissionDecision,
  PermissionRule
} from "@codemcp/ade-core";

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

export function getAutonomyProfile(config: LogicalConfig) {
  return config.permission_policy?.profile;
}

export function hasPermissionPolicy(config: LogicalConfig): boolean {
  return config.permission_policy !== undefined;
}

export function getCapabilityDecision(
  config: LogicalConfig,
  capability: AutonomyCapability
): PermissionDecision | undefined {
  return config.permission_policy?.capabilities?.[capability];
}

export function allowsCapability(
  config: LogicalConfig,
  capability: AutonomyCapability
): boolean {
  return getCapabilityDecision(config, capability) === "allow";
}

export function keepsWebOnAsk(config: LogicalConfig): boolean {
  return getCapabilityDecision(config, "web") === "ask";
}

export function getHarnessPermissionRules(
  config: LogicalConfig
): Record<string, PermissionRule> | undefined {
  switch (config.permission_policy?.profile) {
    case "rigid":
      return {
        "*": "ask",
        webfetch: "ask",
        websearch: "ask",
        codesearch: "ask",
        external_directory: "deny",
        doom_loop: "deny"
      };
    case "sensible-defaults":
      return SENSIBLE_DEFAULTS_RULES;
    case "max-autonomy":
      return {
        "*": "allow",
        webfetch: "ask",
        websearch: "ask",
        codesearch: "ask",
        external_directory: "deny",
        doom_loop: "deny"
      };
    default:
      return undefined;
  }
}
