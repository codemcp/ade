#!/usr/bin/env node

import { version } from "./version.js";
import { runSetup } from "./commands/setup.js";
import { runInstall } from "./commands/install.js";
import { getDefaultCatalog } from "@codemcp/ade-core";
import { getHarnessIds } from "@codemcp/ade-harnesses";

const args = process.argv.slice(2);
const command = args[0];

if (command === "setup") {
  const projectRoot = args[1] ?? process.cwd();
  const catalog = getDefaultCatalog();
  await runSetup(projectRoot, catalog);
} else if (command === "install") {
  const projectRoot = args[1] ?? process.cwd();

  let harnessIds: string[] | undefined;

  // Support --harness flag (comma-separated)
  if (args.includes("--harness")) {
    const val = args[args.indexOf("--harness") + 1];
    if (val) {
      harnessIds = val.split(",").map((s) => s.trim());
    }
  }

  await runInstall(projectRoot, harnessIds);
} else if (command === "--version" || command === "-v") {
  console.log(version);
} else {
  const allIds = getHarnessIds();
  console.log(`ade v${version} — Agentic Development Environment`);
  console.log();
  console.log(
    "ADE organizes the information a coding agent needs into three layers:"
  );
  console.log(
    "  Process      — structured workflows that enforce how the agent tackles tasks"
  );
  console.log(
    "  Conventions  — architecture and practice skills that encode your team's decisions"
  );
  console.log(
    "  Documentation — reference knowledge surfaced at the moment it is relevant"
  );
  console.log();
  console.log("Run `ade setup` to configure these layers for your project.");
  console.log();
  console.log("Usage: ade <command> [options]");
  console.log();
  console.log("Commands:");
  console.log(
    "  setup [dir]      Interactive setup wizard (re-run to change selections)"
  );
  console.log(
    "  install [dir]    Apply lock file to generate agent files (idempotent)"
  );
  console.log();
  console.log("Options:");
  console.log(
    `  --harness <ids>  Comma-separated harnesses (${allIds.join(", ")})`
  );
  console.log("  -v, --version    Show version");
  process.exitCode = command ? 1 : 0;
}
