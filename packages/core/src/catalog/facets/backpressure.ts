import type { Facet, Provision } from "../../types.js";

const NODEJS_LINT_BUILD_SCRIPT = `#!/bin/sh
output=$(npm run lint 2>&1 && npm run build 2>&1); exit_code=$?
if [ $exit_code -eq 0 ]; then echo "✓"; else echo "$output"; exit $exit_code; fi
`;

const JAVA_LINT_BUILD_SCRIPT = `#!/bin/sh
output=$(./gradlew compileJava checkstyleMain 2>&1); exit_code=$?
if [ $exit_code -eq 0 ]; then echo "✓"; else echo "$output"; exit $exit_code; fi
`;

const NODEJS_UNIT_TEST_SCRIPT = `#!/bin/sh
output=$(npm test -- --bail 2>&1); exit_code=$?
if [ $exit_code -eq 0 ]; then echo "✓"; else echo "$output"; exit $exit_code; fi
`;

const JAVA_UNIT_TEST_SCRIPT = `#!/bin/sh
output=$(./gradlew test 2>&1); exit_code=$?
if [ $exit_code -eq 0 ]; then echo "✓"; else echo "$output"; exit $exit_code; fi
`;

const WIP_COMMIT_INSTRUCTION =
  "Commit often using small WIP commits so pre-commit quality gates run frequently and catch issues early.";

const NODEJS_LINT_BUILD_NOTE =
  "Add lint and build scripts to package.json before committing:\n" +
  '  "lint": "eslint .",\n' +
  '  "build": "tsc --noEmit"';

const JAVA_LINT_BUILD_NOTE =
  "Apply the Checkstyle Gradle plugin before committing:\n" +
  "  // build.gradle.kts\n" +
  "  plugins { checkstyle }";

const NODEJS_LINT_BUILD_RECIPE: Provision[] = [
  {
    writer: "git-hooks",
    config: {
      hooks: [{ phase: "pre-commit", script: NODEJS_LINT_BUILD_SCRIPT }]
    }
  },
  {
    writer: "instruction",
    config: { text: WIP_COMMIT_INSTRUCTION }
  },
  {
    writer: "setup-note",
    config: { text: NODEJS_LINT_BUILD_NOTE }
  }
];

const JAVA_LINT_BUILD_RECIPE: Provision[] = [
  {
    writer: "git-hooks",
    config: {
      hooks: [{ phase: "pre-commit", script: JAVA_LINT_BUILD_SCRIPT }]
    }
  },
  {
    writer: "instruction",
    config: { text: WIP_COMMIT_INSTRUCTION }
  },
  {
    writer: "setup-note",
    config: { text: JAVA_LINT_BUILD_NOTE }
  }
];

const NODEJS_UNIT_TEST_RECIPE: Provision[] = [
  {
    writer: "git-hooks",
    config: {
      hooks: [{ phase: "pre-push", script: NODEJS_UNIT_TEST_SCRIPT }]
    }
  }
];

const JAVA_UNIT_TEST_RECIPE: Provision[] = [
  {
    writer: "git-hooks",
    config: {
      hooks: [{ phase: "pre-push", script: JAVA_UNIT_TEST_SCRIPT }]
    }
  }
];

export const backpressureFacet: Facet = {
  id: "backpressure",
  label: "Backpressure",
  description:
    "Which automated quality gates to put in place. Translates to git hooks",
  required: false,
  multiSelect: true,
  dependsOn: ["architecture"],
  options: [
    {
      id: "lint-build-precommit-tanstack",
      label: "Lint + Build (pre-commit)",
      description:
        "Block commits if lint or build fails; emit only ✓ on success",
      available: (deps) => deps["architecture"]?.id === "tanstack",
      recipe: NODEJS_LINT_BUILD_RECIPE
    },
    {
      id: "lint-build-precommit-nodejs-backend",
      label: "Lint + Build (pre-commit)",
      description:
        "Block commits if lint or build fails; emit only ✓ on success",
      available: (deps) => deps["architecture"]?.id === "nodejs-backend",
      recipe: NODEJS_LINT_BUILD_RECIPE
    },
    {
      id: "lint-build-precommit-java-backend",
      label: "Lint + Build (pre-commit)",
      description:
        "Block commits if lint or build fails; emit only ✓ on success",
      available: (deps) => deps["architecture"]?.id === "java-backend",
      recipe: JAVA_LINT_BUILD_RECIPE
    },
    {
      id: "unit-test-prepush-tanstack",
      label: "Unit Tests (pre-push)",
      description: "Block pushes if unit tests fail; emit only ✓ on success",
      available: (deps) => deps["architecture"]?.id === "tanstack",
      recipe: NODEJS_UNIT_TEST_RECIPE
    },
    {
      id: "unit-test-prepush-nodejs-backend",
      label: "Unit Tests (pre-push)",
      description: "Block pushes if unit tests fail; emit only ✓ on success",
      available: (deps) => deps["architecture"]?.id === "nodejs-backend",
      recipe: NODEJS_UNIT_TEST_RECIPE
    },
    {
      id: "unit-test-prepush-java-backend",
      label: "Unit Tests (pre-push)",
      description: "Block pushes if unit tests fail; emit only ✓ on success",
      available: (deps) => deps["architecture"]?.id === "java-backend",
      recipe: JAVA_UNIT_TEST_RECIPE
    }
  ]
};
