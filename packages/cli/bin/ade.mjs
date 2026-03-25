#!/usr/bin/env node

const [major] = process.versions.node.split(".").map(Number);
if (major < 22) {
  console.error(
    `ade requires Node.js >= 22 (current: ${process.versions.node}). Please upgrade Node.js.`
  );
  process.exit(1);
}

await import("../dist/index.js");
