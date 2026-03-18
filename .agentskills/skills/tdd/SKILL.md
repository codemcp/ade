---
name: tdd
description: "Apply this when developing new features that add to or change the business logic of the system"
---

Apply TDD with agents:

1. Ask an agent to write a failing test (RED phase). The agent shall commit this as WIP.
2. Ask an agent to write the actual code to make the test pass (GREEN phase). The agent shall commit this as WIP.
3. Ask an agent to judge the previous two commits: The GREEN phase commit must not have changed semantics of tests implemented in the RED phase.
