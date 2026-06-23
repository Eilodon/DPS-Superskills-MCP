---
name: dispatching-parallel-agents
description: Use when facing 2+ independent tasks that can be worked on without shared state or sequential dependencies — dispatches one agent per problem domain concurrently.
---

# Dispatching Parallel Agents

**Register: TECHNIQUE**
**Goal:** Solve multiple independent problems in parallel time without context contamination between agents.
**Constraints:** True independence required — no shared files, no sequential dependencies. Each agent gets its own clean context. pattern-globalize after any agent finds a bug.
**Adapt:** number of agents, context depth, and coordination protocol to task complexity and available token budget.

---

## When to Use

**Use when ALL are true:**
- 2+ independent failures or tasks (different subsystems, different test files)
- Each can be understood without context from the others
- Agents won't touch the same files

**Don't use when:**
- Failures might be related (fixing one may fix others — investigate first)
- Need full system context to understand the problem
- Agents would touch shared files

---

## The Pattern

### 1. Identify Independent Domains

**Goal:** group failures by structural independence, not by file or feature proximity.

```
Domain A: auth module — 3 test failures
Domain B: data pipeline — 2 test failures
Domain C: API handlers — 1 test failure
```

Each domain independent: auth failure won't affect pipeline behavior.

### 2. Construct Focused Agent Context

**Goal:** give each agent exactly what it needs — no more, no less.
**Constraints:**
- Never let subagents inherit your session context — they get confused
- Specify scope explicitly: "Do NOT change files outside `tests/auth/`"
- Specify output format: "Return: root cause summary + list of file:line changes"

```markdown
Fix the N failing tests in <path>:

1. "<test name>" — <expected behavior from test>
2. "<test name>" — <expected behavior from test>

Your task:
1. Read the test file — understand what each test verifies
2. Find root cause using systematic-debugging Phase 1-3
3. Fix using tdd-verified (failing test → implement → passing test)
4. Do NOT change files outside <your scope>

Return: root cause summary + changes made (file:line for each)
```

### 3. Dispatch

**With Task tool (Claude Code / Cursor / Codex / OpenCode):**
```
Task("Fix auth module failures in tests/auth/")
Task("Fix pipeline failures in tests/pipeline/")
Task("Fix handler failures in tests/api/")
# Concurrent execution
```

**Without Task tool (Gemini / claude.ai):**
```
# Sequential fallback — run each as a separate focused session
# Session 1: scope=tests/auth/ → systematic-debugging → fix → report
# Session 2: scope=tests/pipeline/ → systematic-debugging → fix → report
# Parallel speed benefit lost. Isolation benefit retained.
```

### 4. Integrate and Verify

**Goal:** confirm fixes don't conflict and the full system is green.
**Constraints:**
- Read each agent's summary before merging
- Verify no two agents touched the same files
- Run full test suite after integration
- For each confirmed bug fixed → trigger `pattern-globalize`

---

## Common Mistakes

| Mistake | Better approach |
|---|---|
| "Fix all tests" | "Fix tests in `tests/auth/login.test.ts`" |
| No error context | Paste exact error messages and test names |
| No output format | "Return: root cause + file:line changes" |
| No constraints | "Do NOT change production code outside `src/auth/`" |

---

## After Integration

For each bug confirmed and fixed by agents:
- Trigger `pattern-globalize` — one bug found = grep globally for the class
- Run `verification-before-completion` before declaring all tasks done

## Gotchas — Observed Failure Points

<!-- Populated by knowledge-compound after cycles where this skill underperformed -->
<!-- Format: [YYYY-MM-DD] What failed | Root cause | What to do instead -->

## Evidence Boundary

Subagent reports are not T1 evidence for the parent agent. Treat them as T3 until the parent verifies raw output, diff, or runtime behavior directly. Use `shared/subagent-evidence.md` and `verification-before-completion` claim grammar before marking tasks complete.
