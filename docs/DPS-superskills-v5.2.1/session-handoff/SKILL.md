---
name: session-handoff
description: Use when a session must end before a task is complete, or when transferring work to a new agent session — captures current state compactly so the next session starts with full context rather than blank slate.
---

# Session-Handoff — Compact State for Session Transfer

**Register: TECHNIQUE**
**Goal:** Preserve task continuity across session boundaries. Next session reads handoff doc and continues without loss of context.
**Constraints:** Handoff doc must be machine-readable (next agent loads it, not just humans). Include all open decisions and evidence anchors produced so far. Commit before session ends.
**Adapt:** depth of handoff to task complexity — a 2-hour session needs more than a 15-minute one.

**When to use:**
- Session approaching token budget limit mid-task
- Switching agent (different model, different harness)
- Handing off to another developer's agent session
- Long task that will need multiple sessions
- End of day, task incomplete

**Distinguish from:**
- `adr-commit` → branch-level closure (task COMPLETE, merging)
- `knowledge-compound` → cycle-level extraction (sprint COMPLETE, extracting learnings)
- `session-handoff` → session-level state capture (task IN PROGRESS, continuing later)

**Announce:** "Using session-handoff to capture current state before session ends."

---

## Pre-Check

```bash
# Current branch and recent commits:
!git log --oneline -5 2>/dev/null

# Open specs and plans:
!ls docs/superskills/specs/ docs/superskills/plans/ 2>/dev/null

# Any SPEC_APPROVED specs in progress:
!grep -rl "SPEC_APPROVED: true" docs/superskills/specs/ 2>/dev/null
```

---

## The Handoff Document

Save to: `docs/superskills/session-state-YYYY-MM-DD-HH.md`

```markdown
# Session Handoff — [YYYY-MM-DD HH:MM]

## Task Summary
[1-2 sentences: what we're building and why]

## Current Status
STATUS: IN_PROGRESS | BLOCKED | WAITING_FOR_REVIEW

## Completed Steps
[Bullet list of what was done this session — be specific, include file paths]
- ✅ [Step]: [outcome] — Evidence Anchor: [command + result if applicable]
- ✅ [Step]: [outcome]

## Open Work
[What remains to be done — ordered by dependency]
- [ ] [Next step] — depends on: [prerequisite if any]
- [ ] [Step after that]

## Open Decisions
[Questions that arose but weren't resolved — next session must address these]
- ❓ [Decision]: [context] — Options: [A] vs [B] — Lean: [current thinking]

## Active Context
SPEC: [path to spec file if exists]
PLAN: [path to plan file if exists]
BRANCH: [current git branch]
CONSTITUTION_LAWS_ACTIVE: [any constitution rules especially relevant to remaining work]

## Evidence Produced This Session
[Evidence Anchors already established — next session doesn't need to re-verify]
- [File:line] — [what was verified] — [Evidence Tier T1/T2]

## Blockers
[Anything that stopped progress — next session's first task is resolving these]
- 🚫 [Blocker]: [what's needed to unblock]

## Next Session Opening
[Exact first action for the next session — specific enough that a fresh agent can start immediately]
"Start by: [specific action]. Context loaded from this file."

## Skills in Use
[Which Super Skills are active for this task — next session inherits these]
- [skill]: [why it's relevant to remaining work]
```

---

## Nano Mode Handoff

If token budget is critical, compress to:

```markdown
# Handoff [YYYY-MM-DD]
STATUS: [IN_PROGRESS | BLOCKED]
BRANCH: [branch]
DONE: [comma-separated completed steps]
NEXT: [immediate next action]
DECISIONS: [open questions]
SPEC: [path]
PLAN: [path]
```

---

## Step 2: Commit

```bash
git add docs/superskills/session-state-*.md
git commit -m "session: handoff [task-slug] [YYYY-MM-DD] — [status]"
```

---

## Step 3: Session Opening Protocol

When next session starts and finds a handoff doc:

```bash
# Load handoff:
!cat docs/superskills/session-state-*.md | sort | tail -1 | xargs cat

# Verify branch:
!git branch --show-current

# Verify open work still accurate:
!git log --oneline -3
```

Then: announce "Resuming from session handoff [date]. Current task: [summary]. Starting with: [next step]."

---

## Cleanup

When task completes (`adr-commit` runs), clean up handoff files:

```bash
git rm docs/superskills/session-state-*.md
git commit -m "chore: remove session handoff docs — task complete"
```

---

## Red Flags — Never

- Leave handoff uncommitted — session ends unexpectedly, doc lost
- Write handoff in a format only humans can parse (next agent must load it)
- Omit open decisions — next session will make them without context
- Skip "Next Session Opening" section — ambiguous first step = context re-gathering time

## Gotchas — Observed Failure Points

<!-- Populated by knowledge-compound after cycles where this skill underperformed -->
<!-- Format: [YYYY-MM] What failed | Root cause | What to do instead -->
