---
name: knowledge-compound
description: Use after adr-commit completes — extracts lessons, domain terms, bug patterns, and gotchas from the current cycle into a structured compound wiki, making each cycle permanently improve future cycles.
---

# Knowledge-Compound — Extract and Persist Cycle Learnings

**Goal:** Turn ADR Part 10 (Cycle Retrospective) + code diff patterns into structured knowledge
that shapes future brainstorming and planning sessions automatically.

**Core insight:** ADRs are read when you remember to search for them.
Compound wiki entries are read automatically at the start of every planning session.
The difference is compounding vs. archiving.

**Trigger:** Invoke immediately after `adr-commit` completes. One run per merged branch.

**Announce:** "Using knowledge-compound to extract cycle learnings."

---

## Pre-Check

```bash
# Detect mode: DPS or legacy?
DPS_ADR="docs/superskills/DPS_v5/ADR.md"
if [ -f "$DPS_ADR" ]; then
  echo "DPS MODE — reading ADR from $DPS_ADR"
  grep -c "Cycle Retrospective" "$DPS_ADR" | xargs echo "DPS ADR Part 10 entries:"
  # Get last ADR entry header for context:
  grep "^## ADR-" "$DPS_ADR" | tail -3
else
  echo "LEGACY MODE — reading from docs/superskills/adrs/"
  ls -t docs/superskills/adrs/*.md 2>/dev/null | head -3
  grep -l "Cycle Retrospective" docs/superskills/adrs/*.md 2>/dev/null | tail -1
fi
```

If no ADR with Part 10 found (in either mode) → prompt: "Run adr-commit first with Part 10 filled in."

---

## Extraction Protocol

Read the most recent ADR. Extract into four categories:

### Category 1: New Domain Terms

Read ADR Part 2 (Context) and Part 3 (Decision). Find terms used that are NOT in CONTEXT.md.

For each new term:
```bash
# Check if term exists:
grep -i "[term]" docs/superskills/CONTEXT.md 2>/dev/null | wc -l
```

- Exists → skip
- Missing → add to `CONTEXT.md` Ubiquitous Language with source: `<!-- from ADR: [filename] -->`

### Category 2: Bug Patterns

Read ADR Part 5 (Consequences) and Part 10 (Cycle Retrospective). Find any bug class mentioned.

For each bug pattern:
```bash
# Check if already tracked:
grep -i "[pattern-slug]" docs/superskills/pattern-debt.md 2>/dev/null | wc -l
```

- Tracked → update `actual_outcome` field if this cycle resolved it
- New pattern (not yet a PATTERN-DEBT) → create entry if it recurred ≥ 2 cycles

### Category 3: Gotchas

Read ADR Part 10. Find any "what surprised us" or "what would we do differently."

For each gotcha:
- Identify which Super Skill it relates to (e.g., "audit-design missed X" → `audit-design`).
- Use `shared/gotcha-schema.md` for new entries, including `status`, `evidence`, `scope`, `applies_when`, `avoid_when`, `last_seen`, and `retire_if`.
- Append to that skill's `Gotchas` section.
- Also append to `CONTEXT.md` → Domain Gotchas if it's domain-specific.
- If updating an older free-form Gotcha, preserve the old text and add schema metadata when touched.

### Category 4: Architectural Decisions

Read ADR Part 3 (Decision). Find decisions with broader applicability than this feature.

Criteria: "Would future brainstorming on a *different* feature benefit from knowing this?"
- YES → append to `CONTEXT.md` → Architectural Decisions
- NO → stays in ADR only

### Category 5: DPS Living Spec (Arc 2 feed) ← New

*Run if DPS present and STATUS ≥ IMPLEMENTATION-ACTIVE*

```bash
DPS_STATUS=$(grep "DPS STATUS:" docs/superskills/DPS_v5/README.md 2>/dev/null | awk '{print $NF}')
[ "$DPS_STATUS" = "IMPLEMENTATION-ACTIVE" ] || [ "$DPS_STATUS" = "LIVING-SPEC" ] && echo "Arc 2 update needed"
```

**5a. Learning Loop response (BLUEPRINT §8):**
Read ADR Part 10 (Cycle Retrospective). For each surprise or new insight:
- Does it change an assumption in SYSTEM INTENT? → Update WILL_DRIFT_IF or ASSUMING
- Does it invalidate an ADR? → Update CONFIDENCE tag; if major → create new ADR
- Does it reveal spec gap? → Add SPEC NOTE in BLUEPRINT §5 for affected component

**5b. Update LAST CONFIRMED on relevant ADRs:**
ADRs whose IMPACT RADIUS overlaps with this cycle's changed components:
```bash
# Which ADRs cover components touched this cycle?
git diff --name-only HEAD~1 | xargs grep -l "dps:id=ADR" 2>/dev/null
```
For each relevant ADR: update `LAST CONFIRMED: {{today's date}}`

**5c. Promote to LIVING-SPEC if criteria met:**
Criteria: ≥ 1 Learning Loop response written + Scope Boundary Log updated + metrics confirmed
→ invoke `dps-promote`: IMPLEMENTATION-ACTIVE → LIVING-SPEC

---

## Compound Wiki Entry

Append to `docs/superskills/compound-wiki.md`:

```markdown
---
date: YYYY-MM-DD
sprint: <sprint or cycle identifier>
adr: <adr-filename.md>
modules: [<affected modules>]
---

## Cycle: <feature-slug>

### New Domain Terms Added to CONTEXT.md
- [term]: [definition] ✅ | already existed ⚠️ (list only new ones)

### Bug Patterns
- [pattern class]: [status — new PATTERN-DEBT | existing updated | observed but no debt]

### Gotchas Captured
- [gotcha] → added to [skill-name]/SKILL.md Gotchas ✅

### Architectural Decisions Promoted
- [decision] → added to CONTEXT.md Architectural Decisions ✅

### DPS Arc 2 Updates
- LAST CONFIRMED updated: [ADR-N, ADR-M]
- Learning Loop: [what changed in BLUEPRINT §8]
- Spec promoted to: [LIVING-SPEC | still IMPLEMENTATION-ACTIVE]

### Nothing extracted
(if cycle produced no new learnings — valid, log explicitly)

---
```

---

## Commit

```bash
git add docs/superskills/CONTEXT.md
git add docs/superskills/compound-wiki.md
git add docs/superskills/pattern-debt.md
# Update skill Gotchas sections
git add */SKILL.md
git commit -m "knowledge: compound extraction from <feature-slug> [$(date +%Y-%m-%d)]"
```

---

## CONTEXT.md Update — Version Bump

```bash
# Bump version in CONTEXT.md header:
python3 -c "
import re
content = open('docs/superskills/CONTEXT.md').read()
content = re.sub(
    r'version: (\d+)',
    lambda m: f'version: {int(m.group(1))+1}',
    content
)
open('docs/superskills/CONTEXT.md', 'w').write(content)
"
```

---

## MCP-Readiness Note

`compound-wiki.md` entries use YAML frontmatter + structured sections.
When `agentmemory` or semantic KB MCP is available, this file is the import source.
Schema is designed for forward compatibility — do not change frontmatter field names.

---

## How Future Sessions Use This

`brainstorming` reads CONTEXT.md at invocation (via `!command` in a future update).
The compound wiki is not read every session — `kb-query` surfaces it when relevant.
Gotchas sections in skills are always read when skills are invoked.

The compounding mechanism: each cycle's gotchas improve the next cycle's skill precision.
Five cycles of gotchas in `systematic-debugging` makes it materially better than zero cycles.

---



## Evidence Staleness Lifecycle

When extracting learnings, do not only add new knowledge. Also check whether old knowledge should be revalidated, downgraded, or retired.

When automation is available, run:

```bash
python3 tools/epistemic_health_check.py .
```

Use `shared/epistemic-health.md` for:
- stale ADR `LAST CONFIRMED` values;
- Gotchas whose `retire_if` condition may be met;
- T4 assumptions that have not been validated;
- QBR/M.AT thresholds after 5+ cycles.

---

## Idempotency

If `knowledge-compound` is run twice on same ADR:
```bash
# Check if entry already exists:
grep -c "<feature-slug>" docs/superskills/compound-wiki.md 2>/dev/null
```
Count ≥ 1 → log "already extracted for this ADR — skip" and exit.

## Gotchas — Observed Failure Points

<!-- Populated by knowledge-compound after cycles where this skill underperformed -->
<!-- Format: [YYYY-MM-DD] What failed | Root cause | What to do instead -->


## Epistemic Health Cadence

At the end of each completed knowledge-compound cycle, record the cycle so staleness checks do not depend on agent memory:

```bash
python3 tools/epistemic_health_check.py . --record-cycle
```

If the output reports `CADENCE_DUE`, run the periodic check before starting the next C3/C4 task or release:

```bash
python3 tools/epistemic_health_check.py . --record-run --strict
```
