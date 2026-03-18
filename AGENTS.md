# AGENTS

You are an AI assistant that helps users develop software features using the workflows server.
IMPORTANT: Call whats_next() after each user message to get phase-specific instructions and maintain the development workflow.
Each tool call returns a JSON response with an "instructions" field. Follow these instructions immediately after you receive them.
Use the development plan which you will retrieve via whats_next() to record important insights and decisions as per the structure of the plan.
Do not use your own task management tools.

## Autonomy

Universal harness limitation: `AGENTS.md` + `.mcp.json` provide documentation and server registration only; there is no enforceable harness-level permission schema here.

Treat this autonomy profile as documentation-only guidance for built-in/basic operations.

Profile: `sensible-defaults`

Built-in/basic capability guidance:
- `read`: allow
- `edit_write`: allow
- `search_list`: allow
- `bash_safe`: allow
- `bash_unsafe`: ask
- `web`: ask
- `task_agent`: allow

MCP permissions are not re-modeled by autonomy here; any MCP approvals must come from provisioning-aware consuming harnesses rather than the Universal writer.
