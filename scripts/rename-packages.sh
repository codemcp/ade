#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "Renaming @ade/* packages to @codemcp/ade-* in $ROOT ..."

# Replace @ade/ scope with @codemcp/ade- in package.json and TypeScript files
find "$ROOT" \
  \( -name "*.json" -o -name "*.ts" \) \
  -not -path "*/node_modules/*" \
  -not -path "*/dist/*" \
  | xargs sed -i \
      -e 's|"@ade/cli"|"@codemcp/ade-cli"|g' \
      -e 's|"@ade/core"|"@codemcp/ade-core"|g' \
      -e 's|"@ade/harnesses"|"@codemcp/ade-harnesses"|g' \
      -e "s|from '@ade/|from '@codemcp/ade-|g" \
      -e "s|require('@ade/|require('@codemcp/ade-|g"

# Rename root package (private, "name": "ade")
sed -i 's|"name": "ade"|"name": "@codemcp/ade"|' "$ROOT/package.json"

echo "Done. Run 'pnpm install' to regenerate the lockfile."
