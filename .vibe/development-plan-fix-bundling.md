# Development Plan: ade (fix-bundling branch)

*Generated on 2026-03-18 by Vibe Feature MCP*
*Workflow: [bugfix](https://mrsimpson.github.io/responsible-vibe-mcp/workflows/bugfix)*

## Goal
Fix bundling issue where `npx @codemcp/ade@latest setup` fails with ERR_MODULE_NOT_FOUND for '@clack/prompts' dependency.

## Reproduce
<!-- beads-phase-id: ade-3.1 -->
### Tasks
- [ ] Reproduce the error by running `npx @codemcp/ade@latest setup`
- [ ] Examine the bundled output to confirm @clack/prompts is not included
- [ ] Document the exact error and bundling configuration

## Analyze
<!-- beads-phase-id: ade-3.2 -->
### Phase Entrance Criteria:
- [ ] The error has been successfully reproduced
- [ ] The bundled output has been examined
- [ ] The root cause is identified

### Tasks
- [ ] Analyze tsup configuration in packages/cli/tsup.config.ts
- [ ] Identify why @clack/prompts is not being bundled
- [ ] Research tsup bundling options for dependencies

## Fix
<!-- beads-phase-id: ade-3.3 -->
### Phase Entrance Criteria:
- [ ] Root cause analysis is complete
- [ ] Solution approach is identified
- [ ] tsup configuration issues are understood

### Tasks
- [ ] Update tsup.config.ts to bundle @clack/prompts dependency
- [ ] Rebuild the CLI package
- [ ] Test the bundled output locally

## Verify
<!-- beads-phase-id: ade-3.4 -->
### Phase Entrance Criteria:
- [ ] Fix has been implemented
- [ ] Local build is successful
- [ ] Bundled output includes @clack/prompts

### Tasks
- [ ] Test the fixed CLI locally
- [ ] Verify npx command works after publishing
- [ ] Confirm no other dependencies are missing

## Finalize
<!-- beads-phase-id: ade-3.5 -->
### Phase Entrance Criteria:
- [ ] Fix has been verified to work
- [ ] No regressions introduced
- [ ] All tests pass

### Tasks
- [ ] Document the fix in commit message
- [ ] Update version if needed
- [ ] Publish the fixed package

## Key Decisions
- **Root Cause Identified**: tsup is not bundling the `@clack/prompts` dependency, leaving it as an external import in the bundled output
- **Solution**: Add `noExternal: ["@clack/prompts"]` to tsup.config.ts to force bundling of this dependency
- **Fix Applied**: Updated packages/cli/tsup.config.ts with noExternal configuration
- **Verification Status**: Fix is implemented but requires rebuild to take effect

## Notes
- The error occurs because when npx installs @codemcp/ade, it doesn't install the @clack/prompts dependency
- The bundled dist/index.js contains `import * as clack from "@clack/prompts";` instead of bundled code
- tsup by default treats all dependencies as external unless explicitly configured otherwise
- **Current bundled output still shows external imports** - rebuild needed to apply fix
- After rebuild, the @clack/prompts code should be bundled inline instead of imported externally

---
*This plan is maintained by the LLM and uses beads CLI for task management. Tool responses provide guidance on which bd commands to use for task management.*
