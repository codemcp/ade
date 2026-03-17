#!/usr/bin/env node

import { version } from "./version.js";
import { runSetup } from "./commands/setup.js";
import { runInstall } from "./commands/install.js";
import { getDefaultCatalog } from "@ade/core";
import { getHarnessIds } from "@ade/harnesses";

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
  console.log(`ade v${version}`);
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
