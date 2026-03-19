#!/usr/bin/env node

import { version } from "./version.js";
import { runSetup } from "./commands/setup.js";
import { runInstall } from "./commands/install.js";
import { getDefaultCatalog, mergeExtensions } from "@codemcp/ade-core";
import { getHarnessIds, buildHarnessWriters } from "@codemcp/ade-harnesses";
import { loadExtensions } from "./extensions.js";

const args = process.argv.slice(2);
const command = args[0];

if (command === "setup") {
  const projectRoot = args[1] ?? process.cwd();
  const extensions = await loadExtensions(projectRoot);
  const catalog = mergeExtensions(getDefaultCatalog(), extensions);
  const harnessWriters = buildHarnessWriters(extensions);
  await runSetup(projectRoot, catalog, harnessWriters);
} else if (command === "install") {
  const projectRoot = args[1] ?? process.cwd();
  const extensions = await loadExtensions(projectRoot);
  const harnessWriters = buildHarnessWriters(extensions);

  let harnessIds: string[] | undefined;

  // Support --harness flag (comma-separated)
  if (args.includes("--harness")) {
    const val = args[args.indexOf("--harness") + 1];
    if (val) {
      harnessIds = val.split(",").map((s) => s.trim());
    }
  }

  await runInstall(projectRoot, harnessIds, harnessWriters);
} else if (command === "--version" || command === "-v") {
  console.log(version);
} else {
  const allIds = getHarnessIds();
  console.log(`ade v${version} — Agentic Development Environment`);
  console.log();
  console.log(
    "Define how your team works with coding agents — pick your facets,"
  );
  console.log(
    "ADE translates them into a shared information hierarchy in your repo."
  );
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
