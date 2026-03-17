import type { Facet } from "../../types.js";

const LINT_BUILD_SCRIPT = `#!/bin/sh
set -e
if [ -f package.json ]; then
  cmd="npm run lint 2>&1 && npm run build 2>&1"
elif [ -f pom.xml ]; then
  cmd="mvn -q validate compile 2>&1"
elif [ -f Cargo.toml ]; then
  cmd="cargo clippy -- -D warnings 2>&1"
elif [ -f build.gradle ] || [ -f build.gradle.kts ]; then
  cmd="./gradlew compileJava lintDebug 2>&1"
else
  echo "✓"; exit 0
fi
output=$(eval "$cmd"); exit_code=$?
if [ $exit_code -eq 0 ]; then echo "✓"; else echo "$output"; exit $exit_code; fi
`;

const UNIT_TEST_SCRIPT = `#!/bin/sh
set -e
if [ -f package.json ]; then
  cmd="npm test -- --bail 2>&1"
elif [ -f pom.xml ]; then
  cmd="mvn -q test 2>&1"
elif [ -f Cargo.toml ]; then
  cmd="cargo test 2>&1"
elif [ -f build.gradle ] || [ -f build.gradle.kts ]; then
  cmd="./gradlew test 2>&1"
else
  echo "✓"; exit 0
fi
output=$(eval "$cmd"); exit_code=$?
if [ $exit_code -eq 0 ]; then echo "✓"; else echo "$output"; exit $exit_code; fi
`;

export const backpressureFacet: Facet = {
  id: "backpressure",
  label: "Backpressure",
  description:
    "Install git hooks that enforce quality gates — silent on success, surface only relevant failures",
  required: false,
  multiSelect: true,
  options: [
    {
      id: "lint-build-precommit",
      label: "Lint + Build (pre-commit)",
      description:
        "Block commits if lint or build fails; emit only ✓ on success",
      recipe: [
        {
          writer: "git-hooks",
          config: {
            hooks: [
              {
                phase: "pre-commit",
                script: LINT_BUILD_SCRIPT
              }
            ]
          }
        },
        {
          writer: "instruction",
          config: {
            text: "Commit often using small WIP commits so pre-commit quality gates run frequently and catch issues early."
          }
        }
      ]
    },
    {
      id: "unit-test-prepush",
      label: "Unit Tests (pre-push)",
      description: "Block pushes if unit tests fail; emit only ✓ on success",
      recipe: [
        {
          writer: "git-hooks",
          config: {
            hooks: [
              {
                phase: "pre-push",
                script: UNIT_TEST_SCRIPT
              }
            ]
          }
        }
      ]
    }
  ]
};
