---
name: audit-distill
description: Use when you have a VHEATM audit report and want to extract its findings into Super Skills knowledge — populates Gotchas sections, pattern-debt.md, qbr-calibration.md, and CONTEXT.md from real production audit evidence.
---

# Audit-Distill — From Audit Results to Framework Knowledge

**Register: TECHNIQUE**
**Goal:** Transform VHEATM audit findings into structured Super Skills knowledge that shapes future cycles.
**Constraints:** Only T1/T2 evidence enters Gotchas sections — no speculation. Tag every M.AT entry with QBR formula version. Deduplicate before writing.
**Adapt:** extraction depth to audit size; a 5-finding audit needs 10 minutes, a 30-finding audit needs an hour.

**The feedback loop this closes:**
```
VHEATM audit → audit-distill → Gotchas + PATTERN-DEBT + M.AT seed
     ↑                                        ↓
Better audits ← Better agent coding ← Better framework knowledge
```

No other agentic coding framework has this loop. Guard it.

**Announce:** "Using audit-distill to extract [project-name] audit findings into Super Skills knowledge."

---

## Pre-Check

```bash
# Confirm KB structure exists:
!ls docs/superskills/ 2>/dev/null || echo "⚠️  Run skill-init first"

# Check existing Gotchas content (don't duplicate):
!grep -r "^\- \[20" ~/.claude/skills/*/SKILL.md 2>/dev/null | wc -l | xargs echo "Existing Gotcha entries:"

# Idempotency: check if this audit was already distilled
!grep -r "[audit-source-name]" docs/superskills/compound-wiki.md 2>/dev/null && echo "⚠️  Already distilled — check for duplicates"
```

---

## Step 1: Parse and Classify Findings

Read the audit report. For each finding, extract:

```
FINDING:
  id:          [H-01, SEC-001, MANDATORY-01, etc.]
  type:        [BUG | SECURITY | PERFORMANCE | OPS | COMPLIANCE | AI-SAFETY | ARCHITECTURE]
  qbr:         [score] (note formula version: v8.0-additive | v16.x-multiplicative)
  severity:    [MANDATORY | REQUIRED | RECOMMENDED | LOW]
  actual_outcome: [if known post-fix: INCIDENT | NEAR_MISS | NO_IMPACT | OVERESTIMATED | UNKNOWN]
  evidence_tier: [T1 | T2 | T3 | T4]
  description: [1-2 sentence summary]
  root_cause:  [structural cause, not instance]
  lesson:      [what to do differently next time]
```

**Skip:** T4 evidence findings (speculation, "might be" — not T1/T2 direct code observation)
**Skip:** RECOMMENDED or LOW if audit has > 20 findings (prioritize signal over noise)

---

## Step 2: Map Findings to Target Skills

Route each finding to the skill whose Gotchas section it improves:

| Finding type | Primary target | Secondary target |
|---|---|---|
| Auth/session/token | `specialist-review` (STRIDE) | `audit-design` |
| User input → sink (injection) | `specialist-review` (OWASP) | `verification-before-completion` |
| Async/worker/queue | `specialist-review` (TEMPORAL) | `systematic-debugging` |
| Write chain A→B→C | `specialist-review` (CPT) | `verification-before-completion` |
| Comment ≠ code (intent drift) | `verification-before-completion` | `adr-commit` (G.CDOC) |
| README ≠ implementation | `verification-before-completion` | `brainstorming` |
| Manual ops step not automated | `brainstorming` | `audit-design` |
| Non-critical dep on critical path | `systematic-debugging` | `task-risk-score` |
| Recurring bug class (≥2 occurrences) | `pattern-globalize` | PATTERN-DEBT entry |
| QBR under/overestimated | `task-risk-score` | M.AT calibration |
| Design-time assumption proved wrong | `brainstorming` | `audit-design` |
| AI restriction via labels (aspirational) | `audit-design` | `specialist-review` |
| ADR claim ≠ actual code | `adr-commit` (G.CDOC) | |

Multiple targets = write to primary; note secondary in the entry.

### DPS Smell Mapping (khi DPS present)

```bash
# Gate: only run if DPS is present
DPS_BLUEPRINT="docs/superskills/DPS_v5/BLUEPRINT.md"
if [ ! -f "$DPS_BLUEPRINT" ]; then
  echo "DPS absent — skip DPS Smell Mapping"
  # Continue to Step 6 (CONTEXT.md update)
fi
DPS_STATUS=$(grep "DPS STATUS:" "$DPS_BLUEPRINT" 2>/dev/null | head -1 | awk '{print $NF}')
echo "DPS STATUS: ${DPS_STATUS:-NOT_PRESENT}"
```

Sau khi map findings vào Super Skills targets, cũng map sang DPS Smell Indicators:

| Finding type | DPS Smell category | DPS Action |
|---|---|---|
| Spec/design assumption wrong | Arc 2 / CONFIDENCE = LOW | Downgrade Confidence → WATCHFUL/VOLATILE |
| Schema at 2 places in code | Arc 1 / Single-definition violation | Update CONTRACTS.md; add Ref<X> in BLUEPRINT |
| Agent kept asking about behavior | Arc 1 / Pseudocode underdetermined | Improve BLUEPRINT §5 component spec |
| Component renamed but DPS not updated | Arc 2 / implementation drift | Run dps.py sync; update component name |
| External API behavior changed | Arc 2 Trigger 1 | Update External Contract; update ADR Confidence |
| Bug from assumption about dependency | Arc 1 / Dependency Fitness | Add/update Dependency Fitness Registry entry |

```bash
# Check DPS for matching Smell Indicators:
python3 docs/superskills/DPS_v5/tools/dps.py lint --strict 2>/dev/null
```

If DPS is LIVING-SPEC → update relevant sections directly.
If DPS is IMPLEMENTATION-ACTIVE → add SPEC NOTE; schedule update at next phase gate.

---

## Step 3: Write Gotchas Entries

Format: use `shared/gotcha-schema.md` for new Gotchas. Older free-form entries may remain, but every new entry needs date, status, source, evidence tier, scope, applies_when, avoid_when, last_seen, retire_if, claim, root_cause, and do_instead.

**Quality gates before writing:**
- Is this T1/T2 evidence? (direct code observation or external validation)
- Is this a *class* of failure, not an *instance*?
- Does the "what to do instead" change agent behavior concretely?
- Does a duplicate already exist in this skill's Gotchas? → Update, don't append.

**Write to:** `~/.claude/skills/<skill>/SKILL.md` → `## Gotchas` section

---

## Step 4: Update Pattern Debt

For findings where same structural pattern appears ≥ 2 times (same audit or cross-audit):

Create or update entry in `docs/superskills/pattern-debt.md` using schema in `shared/pattern-debt-schema.md`:

```yaml
PATTERN-DEBT-[slug]:
  pattern:      "[structural description — class, not instance]"
  grep_cmd:     "[exact grep to find recurrences]"
  evidence:     ["[project-1]: [observation]", "[project-2]: [observation]"]
  found:        [N occurrences]
  fixed_now:    []
  priority:     HIGH | MEDIUM | LOW
  owner:        "[team]"
  created_date: [YYYY-MM]
  created_sprint: "audit-distill"
  review_interval: "every project at skill-init"
  resolution_trigger: "[measurable condition]"
  status:       OPEN
```

**Idempotency:** `grep -c "PATTERN-DEBT-[slug]" docs/superskills/pattern-debt.md` before creating. Update if exists.

---

## Step 5: Seed M.AT Calibration

For every finding with a QBR score AND a known outcome (post-fix):

Append to `docs/superskills/qbr-calibration.md`:

```markdown
| [project]-[finding-id] | [project-sprint] | [formula-version] | [qbr-score] | [predicted-risk] | [actual-severity] | [CONFIRMED|OVERESTIMATED|UNDERESTIMATED] |
```

**Formula version is mandatory.** v8.0-additive and v16.x-multiplicative scores are not comparable.

**Flag underestimations explicitly:**
```
<!-- UNDERESTIMATION: [finding-id] — predicted [X] actual [Y]. Root cause: [D/B/S assigned wrong]. Correction rule: [rule] -->
```

Underestimation findings are the highest-value calibration data. They reveal systematic biases in QBR scoring.

---

## Step 6: Update CONTEXT.md

For each audit:

**Domain terms** (from audit context descriptions, ADR decisions, finding rationale):
```bash
grep -i "[term]" docs/superskills/CONTEXT.md 2>/dev/null | wc -l
# Count 0 → add to Ubiquitous Language with source tag
```

**Architectural decisions** (findings that imply a design rule with broad applicability):
- "Non-critical dep caused critical path failure" → AD: non-critical deps must degrade gracefully
- "In-memory state lost on restart" → AD: state surviving restart belongs in persistence layer

Add to `CONTEXT.md → ## Architectural Decisions` with source: `<!-- from audit: [project] [finding-id] -->`

---

## Step 7: Compound Wiki Entry

Append to `docs/superskills/compound-wiki.md`:

```markdown
---
date: YYYY-MM-DD
source: audit-distill
audit: [project-name] [audit-date]
vheatm-version: [16.x | 8.0 | etc.]
skills-updated: [list]
pattern-debts-created: [list]
mat-entries: [N]
---

## Distillation: [project-name] audit

### Gotchas Added
- [skill]: [entry summary] ✅

### PATTERN-DEBT Created
- [slug]: [pattern class] ✅

### M.AT Entries
- [finding-id]: predicted [X] → actual [Y] [CONFIRMED/UNDER/OVER] ✅

### CONTEXT.md Updates
- [domain term or architectural decision] ✅

### Nothing extracted
(if audit had no T1/T2 findings applicable to skill improvement)

---
```

---

## Step 8: Commit

```bash
git add ~/.claude/skills/*/SKILL.md
git add docs/superskills/pattern-debt.md
git add docs/superskills/qbr-calibration.md
git add docs/superskills/CONTEXT.md
git add docs/superskills/compound-wiki.md
git commit -m "knowledge: distill [project-name] audit [YYYY-MM-DD] — [N] gotchas, [N] patterns, [N] M.AT entries"
```

---

## Red Flags — Never

- Write T3/T4 findings into Gotchas (speculation contaminates the signal)
- Mix QBR formula versions in M.AT calibration without tagging
- Create duplicate PATTERN-DEBT entries (check idempotency first)
- Skip the compound-wiki entry — it's the cross-reference index
- Distill the same audit twice (check compound-wiki for source before starting)

## Gotchas — Observed Failure Points

<!-- Populated by knowledge-compound after cycles where this skill underperformed -->
<!-- Format: [YYYY-MM] What failed | Root cause | What to do instead -->
