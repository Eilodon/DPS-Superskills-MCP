---
name: receiving-code-review
description: Use when receiving code review feedback, before implementing suggestions — requires technical verification not performative agreement, especially if feedback seems unclear or questionable.
---

# Receiving Code Review

Code review requires technical evaluation, not emotional performance.

**Core principle:** Verify before implementing. Ask before assuming. Technical correctness over social comfort.

---

## The Response Pattern

```
1. READ     Complete feedback without reacting
2. CLARIFY  Anything unclear → ask FIRST, implement nothing until clear
3. VERIFY   Check against codebase reality
4. EVALUATE Technically sound for THIS codebase?
5. RESPOND  Technical acknowledgment or reasoned pushback
6. IMPLEMENT One item at a time, test each with tdd-verified
```

---

## Forbidden Responses

**Never:**
- "You're absolutely right!" / "Great point!" / "Excellent feedback!" (performative)
- "Let me implement that now" (before verification)
- Any expression of gratitude — actions speak, not thanks

**Instead:**
- Restate the technical requirement
- Ask clarifying questions
- Push back with technical reasoning if wrong
- Just start working

---

## Handling Unclear Feedback

```
IF any item is unclear:
  STOP — do not implement anything yet
  ASK for clarification on all unclear items

WHY: Items may be related. Partial understanding = wrong implementation.
```

Example:
```
Reviewer: "Fix items 1-6"
You understand 1, 2, 3, 6. Unclear on 4, 5.

❌ Implement 1,2,3,6 now — ask about 4,5 later
✅ "I understand items 1,2,3,6. Need clarification on 4 and 5 before proceeding."
```

---

## Verification Before Implementing

For any external reviewer suggestion:
```
Before implementing:
  1. Is this technically correct for THIS codebase?
  2. Does it break existing functionality?
  3. Is there a reason for the current implementation?
  4. Does reviewer understand the full context?
```

If suggestion seems wrong → push back with technical reasoning.
If conflicts with architectural decisions → discuss with human first.

---

## YAGNI Check

```
IF reviewer suggests "implementing properly" a feature:
  grep codebase for actual usage

  Unused → "This isn't called anywhere. Remove it (YAGNI)?"
  Used   → implement as suggested
```

---

## Acknowledging Correct Feedback

```
✅ "Fixed. [Brief description of what changed]"
✅ "Good catch — [issue]. Fixed in [location]."
✅ [Just fix it — the code shows you heard]

❌ "You're absolutely right!"  
❌ "Thanks for catching that!"
❌ Any gratitude expression
```

If you catch yourself about to write "Thanks" → delete it, state the fix instead.

---

## Pushing Back

Push back when:
- Suggestion breaks existing functionality
- Reviewer lacks full context
- Violates YAGNI
- Technically incorrect for this stack
- Legacy/compatibility reasons exist

**How:** Technical reasoning, not defensiveness. Reference working tests or code.

**Correcting your own wrong pushback:**
```
✅ "You were right — I checked X and it does Y. Implementing now."
❌ Long apology or over-explanation
```

---

## Implementation Order

1. Clarify ALL unclear items first
2. Then implement: blocking issues → simple fixes → complex fixes
3. Each fix: `tdd-verified` (test → implement → verify)
4. `verification-before-completion` before claiming all items resolved

---

## Common Mistakes

| Mistake | Fix |
|---|---|
| Performative agreement | State requirement or just act |
| Blind implementation | Verify against codebase first |
| Implementing without clarifying all items | Clarify first |
| Batch without testing | One at a time, tdd-verified each |
| Avoiding pushback | Technical correctness > comfort |

## Gotchas — Observed Failure Points

<!-- Populated by knowledge-compound skill after cycles where this skill underperformed -->
<!-- Format: [YYYY-MM-DD] What failed | Root cause | What to do instead -->
<!-- DO NOT pre-populate with speculation — real observations only -->
<!-- Example: [2026-06-01] Agent skipped risk scoring for "trivial" CSS task that touched auth config | Triage gate not read carefully | Triage gate now checks file content, not just task description -->
