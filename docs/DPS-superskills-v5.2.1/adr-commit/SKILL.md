---
name: adr-commit
description: Use when implementation is complete, all tests pass, and you are about to merge, create a PR, or close out a development branch — enforces an Architecture Decision Record and PATTERN-DEBT lifecycle review before any integration action.
---

# ADR-Commit — Finish a Branch with a Decision Record

Completes a development branch with a mandatory ADR gate
and PATTERN-DEBT lifecycle review.

**Announce:** "I'm using adr-commit to complete this work."

---

## Step 1: Verify Tests

```bash
npm test / cargo test / pytest / go test ./...
```

Failing tests → stop. Show failures. Do not proceed.

---

## Step 2: Detect Environment

```bash
GIT_DIR=$(cd "$(git rev-parse --git-dir)" 2>/dev/null && pwd -P)
GIT_COMMON=$(cd "$(git rev-parse --git-common-dir)" 2>/dev/null && pwd -P)
```

| State | Menu | Cleanup |
|---|---|---|
| `GIT_DIR == GIT_COMMON` | 4 options | None |
| `GIT_DIR != GIT_COMMON`, named branch | 4 options | Provenance-based |
| `GIT_DIR != GIT_COMMON`, detached HEAD | 3 options | None |

---

## Step 3: Determine Base Branch

```bash
git merge-base HEAD main 2>/dev/null || git merge-base HEAD master 2>/dev/null
```

---

## Step 3.5: ADR Gate ← MANDATORY

**Cannot proceed to Step 4 without a committed ADR.**

```bash
# Recent commits for context (auto-injected):
!git log --oneline -10 2>/dev/null
```

Choose output target:
```bash
# DPS present? → append to docs/superskills/DPS_v5/ADR.md
# DPS absent?  → standalone file (legacy format, unchanged)
ls docs/superskills/DPS_v5/ADR.md 2>/dev/null && echo "DPS mode" || echo "Standalone mode"
```

**DPS ADR format (khi DPS present):**
```markdown
---
## ADR-{{N}}: {{Feature Name}}

<!-- dps:id=ADR-{{N}} -->
<!-- dps:type=adr -->

**DATE:** {{YYYY-MM-DD}}
**STATUS:** ACCEPTED
**CHANGE CLASSIFICATION:** {{DESIGN CHANGE | SPEC BUG | IMPLEMENTATION BUG | INTENT DRIFT | EXTERNAL CONSTRAINT CHANGE}}

### Context
{{What problem forced this decision?}}

### Decision
{{What was built or changed? One concrete paragraph.}}

### Alternatives Considered
{{At least one alternative and why rejected.}}

### Consequences
{{What improved? What worsened? What debt was created?}}

### CONFIDENCE: {{HIGH | MEDIUM | LOW}}
### VOLATILITY: {{STABLE | WATCHFUL | VOLATILE}}
### VALIDATION TARGET: {{Required if CONFIDENCE = LOW}}
### WATCH SIGNAL: {{Required if VOLATILITY = WATCHFUL or VOLATILE}}
### LAST CONFIRMED: {{YYYY-MM-DD}} (INITIAL)

### IMPACT RADIUS
Components: {{list component names from DPS Component Registry}}
Schemas: {{list schema names from DPS CONTRACTS.md}}
Cascade Review: {{✅ Not needed | 🔄 Pending: component/schema list}}

### Evidence (T1/T2)
{{Ran command → output | CI passed | peer confirmed}}

### Part 10: Cycle Retrospective
{{For knowledge-compound: what surprised us, what to do differently}}
---
```

**Legacy ADR format (khi DPS absent):**
Save to: `docs/superskills/adrs/YYYY-MM-DD-<feature-slug>.md`
```markdown
# ADR: <feature name>

## 1. Title
One-line description of the decision made.

## 2. Context
What problem forced this decision? What constraints existed?

## 3. Decision
What was built or changed? One concrete paragraph.

## 4. Status
ACCEPTED | SUPERSEDED | DEPRECATED

## 5. Consequences
What improved? What worsened? What debt was created?

## 6. Alternatives Considered
At least one alternative and why it was rejected.

## 7. Evidence
Test results, benchmarks, or observations validating the decision.
Unverified claims → mark as ASSUMED.

## 8. Owner
**REQUIRED — full name or team handle. No anonymous ADRs.**

## 8b. Known Debts (PATTERN-DEBT)
<!-- Reference entries from docs/superskills/pattern-debt.md -->
<!-- Schema: see shared/pattern-debt-schema.md -->
PATTERN-DEBT entries introduced or affected by this change:
  - PATTERN-DEBT-<slug>: [status] — [remaining count]

## 9. Next Cycle Trigger
**REQUIRED — measurable condition only.**

REJECT: "after launch", "post-release", "TBD", "when needed", no metric/event.
ACCEPT: "When [observable event] OR [metric] exceeds [threshold]"

Examples:
  ✅ "When error rate on /checkout exceeds 0.5% for 10 minutes"
  ✅ "When this module is touched by a second team"
  ❌ "Post-launch review" / "TBD"

## 10. Cycle Retrospective
**PURPOSE:** Preserve lessons for the next agent working on this module.
`kb-query` will surface this section when the next cycle starts on the same module.

Answer in bullet points, max 5 items, write for a future agent with no session context:

```
- What assumption proved wrong during this implementation?
- What surprised us about the codebase / domain / dependencies?
- What would we design differently if starting over?
- What debt was knowingly created and why?
- What signal should the next cycle watch for?
```

**Anti-patterns to avoid:**
- "Everything went smoothly" — if nothing surprised you, you weren't paying attention
- Implementation narrative — future agent needs lessons, not story
- Vague entries — "auth was tricky" is useless; "JWT expiry not validated at refresh endpoint, assumed handled upstream" is useful
```

**Commit ADR:**
```bash
# If Legacy:
git add docs/superskills/adrs/
git commit -m "docs: add ADR for <feature-slug>"

# If DPS:
cd docs/superskills/DPS_v5/
python3 tools/dps.py sync
python3 tools/dps.py check
git add docs/superskills/DPS_v5/
git commit -m "dps: sync sidecars after ADR-{{N}} [adr-commit]"
```
**Auto-promote if DPS APPROVED-SSOT:**
If implementation just started (first adr-commit on this branch):
  → run `dps-promote`: APPROVED-SSOT → IMPLEMENTATION-ACTIVE

---

## Step 3.6: [G.CDOC] ADR Verification

After writing the ADR, spot-check key claims against actual code.
Prevents "aspirational ADR" — decisions documented that don't match implementation.

**Re-read Section 3 (Decision) and Section 7 (Evidence):**

**DPS extension:** Also check:
```bash
# Component names in ADR IMPACT RADIUS still exist in code?
# Schema names still match implementation?
# Any Ref<X> broken after this implementation?
python3 docs/superskills/DPS_v5/tools/dps.py check 2>/dev/null
```

```bash
# For each key claim in Section 3 and 7, verify against code:
# 1. Find the relevant file
# 2. Read the relevant section
# 3. Confirm claim matches implementation
```

For each claim:
- **VERIFIED** — code matches claim → mark as `[verified YYYY-MM-DD]`
- **ASSUMED** — could not verify in this session → mark as `[assumed — verify post-deploy]`
- **CONTRADICTED** — code does NOT match claim → fix claim or fix code before proceeding

If any CONTRADICTED claim → do not proceed. Resolve first.

```bash
git add docs/superskills/adrs/
git commit -m "docs: verify ADR claims for <feature-slug> [G.CDOC]"
```

---

## Step 3.7: PATTERN-DEBT Lifecycle Check

Before merging, check for stale PATTERN-DEBT entries:

```bash
# Find open entries older than review_interval
grep -A 15 "PATTERN-DEBT" docs/superskills/pattern-debt.md | grep "status: OPEN"
```

For each OPEN entry:
1. Check `resolution_trigger` — has it fired? (measurable condition, check now)
2. Check `review_interval` — is this entry overdue for review?
3. Check `created_sprint` — if > 3 sprints old with no progress → escalate priority

**If trigger has fired** → do not merge until `pattern-globalize` is re-run for that entry.
**If overdue** → flag in ADR Part 8b. Do not block merge, but document explicitly.

---

## Step 4: Present Options

**Normal repo / named-branch worktree:**
```
ADR committed and verified. Ready to integrate.

1. Merge back to <base-branch> locally
2. Push and create a Pull Request
3. Keep the branch as-is (I'll handle it later)
4. Discard this work
```

**Detached HEAD:**
```
ADR committed. Detached HEAD (externally managed workspace).

1. Push as new branch and create a Pull Request
2. Keep as-is (I'll handle it later)
3. Discard this work
```

---

## Step 5: Execute Choice

**Option 1 — Merge Locally:**
```bash
MAIN_ROOT=$(git -C "$(git rev-parse --git-common-dir)/.." rev-parse --show-toplevel)
cd "$MAIN_ROOT"
git checkout <base-branch> && git pull && git merge <feature-branch>
<test command>
```
Then: cleanup worktree (Step 6) → `git branch -d <feature-branch>`

**Option 2 — Push and PR:**
```bash
git push -u origin <feature-branch>
gh pr create --title "<title>" --body "$(cat <<'EOF'
## Summary
<2-3 bullets>

## ADR
docs/superskills/adrs/<filename>.md

## PATTERN-DEBT
<list affected entries or "none">

## Test Plan
- [ ] <verification steps>
EOF
)"
```
Do NOT clean up worktree.

**Option 3 — Keep As-Is:** Report path. No cleanup.

**Option 4 — Discard:** Require typed `discard`, then cleanup.

---

## Step 6: Cleanup Workspace (Options 1 and 4 only)

```bash
WORKTREE_PATH=$(git rev-parse --show-toplevel)
```

- `GIT_DIR == GIT_COMMON` → no worktree. Done.
- Path under `.worktrees/`, `worktrees/`, `~/.config/superskills/worktrees/` → we own it:
  ```bash
  cd "$MAIN_ROOT"
  git worktree remove "$WORKTREE_PATH"
  git worktree prune
  ```
- Otherwise → do NOT remove (harness-owned).

---

## Quick Reference

| Option | Merge | Push | Keep Worktree | Cleanup | ADR Required |
|---|---|---|---|---|---|
| 1. Merge | yes | — | — | yes | ✅ Steps 3.5–3.7 |
| 2. PR | — | yes | yes | — | ✅ Steps 3.5–3.7 |
| 3. Keep | — | — | yes | — | ✅ Steps 3.5–3.7 |
| 4. Discard | — | — | — | yes | ✅ Steps 3.5–3.7 |

## Red Flags — Never

- Proceed to Step 4 without committed ADR
- Accept vague Next Cycle Trigger ("TBD", "post-launch")
- Accept ADR with no Owner field
- Skip [G.CDOC] verification — CONTRADICTED claims unresolved
- Merge when a fired PATTERN-DEBT resolution_trigger has not been actioned
- Delete work without typed `discard` confirmation
- Run `git worktree remove` from inside the worktree

## Gotchas — Observed Failure Points

<!-- Populated by knowledge-compound skill after cycles where this skill underperformed -->
<!-- New entries must follow shared/gotcha-schema.md -->
<!-- DO NOT pre-populate with speculation — real observations only -->
- date: 2026-05-31
  status: ACTIVE
  source: production-audit
  evidence: T2
  scope: skill
  applies_when: >-
    this skill is active and the same failure mode is plausible
  avoid_when: >-
    newer T1/T2 evidence shows this failure mode no longer applies in the current project
  last_seen: 2026-05-31
  retire_if: >-
    no recurrence after 6 relevant cycles, or contradictory newer T1/T2 evidence narrows or invalidates the pattern
  claim: >-
    G.CDOC có giá trị cao nhất trên: async worker state machines, AI degradation paths, và safety-critical escalation paths — đây là nơi có 'aspirational ADR' risk cao nhất (từ Tikai, Aletheia, Apollos)
  root_cause: >-
    những paths này complex, khó test, và thường được document bằng intent thay vì verified implementation
  do_instead: >-
    Trong G.CDOC Step 3.6, ưu tiên re-read 3 sections: (1) mọi claim 'will gracefully degrade if X fails', (2) mọi async state transition ('completes → done'), (3) mọi safety escalation path ('will notify/escalate if Y'). Đây là highest-drift claims.
- date: 2026-05-31
  status: ACTIVE
  source: production-audit
  evidence: T2
  scope: skill
  applies_when: >-
    this skill is active and the same failure mode is plausible
  avoid_when: >-
    newer T1/T2 evidence shows this failure mode no longer applies in the current project
  last_seen: 2026-05-31
  retire_if: >-
    no recurrence after 6 relevant cycles, or contradictory newer T1/T2 evidence narrows or invalidates the pattern
  claim: >-
    ADR Part 9 (Next Cycle Trigger) với wording mơ hồ không bao giờ fire (Tikai ADR format, VHEATM 16.0)
  root_cause: >-
    triggers mơ hồ nghe có vẻ acceptable vì describe real intent
  do_instead: >-
    Trước khi commit bất kỳ ADR nào: reject Part 9 nếu chứa 'TBD', 'post-launch', 'when needed', 'after X ships', 'next quarter'. Replace bằng: 'when [observable metric] exceeds [threshold]' hoặc 'when [specific event] occurs'.
<!-- Example: [2026-06-01] Agent skipped risk scoring for "trivial" CSS task that touched auth config | Triage gate not read carefully | Triage gate now checks file content, not just task description -->

## DPS Tooling Fallback — Manual Check

If `python3` or `dps.py` is unavailable, DPS is degraded but not disabled. Label enforcement as manual fallback and complete this checklist before promotion or completion:

```text
[ ] Every Ref<X> in BLUEPRINT resolves to CONTRACTS.
[ ] BLUEPRINT does not redefine schemas owned by CONTRACTS.
[ ] ADR fields complete.
[ ] LOW confidence has VALIDATION TARGET.
[ ] WATCHFUL/VOLATILE has WATCH SIGNAL.
[ ] LAST CONFIRMED freshness reviewed.
[ ] DPS STATUS consistent across README/CONTRACTS/BLUEPRINT/ADR.
[ ] No unresolved SPEC BUG before implementation.
```

Output `DPS enforcement: automated` when `dps.py check` ran, otherwise `DPS enforcement: manual fallback`.

## Release Readiness Boundary

Before merge/deploy/production traffic for C3/C4 work, run `release-readiness`. Do not conflate:

- code complete;
- locally verified;
- release ready;
- deployed and verified.

Record release readiness evidence or accepted residual risk in the ADR evidence section.
