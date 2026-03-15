#!/usr/bin/env node

import { version } from "./version.js";
import { runSetup } from "./commands/setup.js";
import { getDefaultCatalog } from "@ade/core";

const args = process.argv.slice(2);
const command = args[0];

if (command === "setup") {
  const projectRoot = args[1] ?? process.cwd();
  const catalog = getDefaultCatalog();
  await runSetup(projectRoot, catalog);
} else if (command === "--version" || command === "-v") {
  console.log(version);
} else {
  console.log(`ade v${version}`);
  console.log();
  console.log("Usage: ade <command> [options]");
  console.log();
  console.log("Commands:");
  console.log(
    "  setup [dir]    Configure your AI agent (default: current dir)"
  );
  console.log();
  console.log("Options:");
  console.log("  -v, --version  Show version");
  process.exitCode = command ? 1 : 0;
}
