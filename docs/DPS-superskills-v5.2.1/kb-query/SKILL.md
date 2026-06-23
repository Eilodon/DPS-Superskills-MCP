---
name: kb-query
description: Use when searching for past decisions, pattern debt entries, risk assessments, or implementation plans — queries the super-skills KB using keyword search across ADRs, pattern-debt registry, and specs.
---

# KB-Query — Search the Super-Skills Knowledge Base

Grep-based and structured search across all KB artifacts accumulated by the super-skills pipeline. Structured claim grammar, alias maps, and indexes improve grep before any vector dependency is needed.

---

## Query Interface

When the user (or agent) says any of:
- "search KB for [topic]"
- "have we decided on [topic] before?"
- "any PATTERN-DEBT for [module]?"
- "what's the risk assessment for [feature]?"
- "find ADRs related to [keyword]"

→ run this skill.

---

## Search Targets

```
docs/superskills/adrs/          — Architecture Decision Records
docs/superskills/pattern-debt.md — PATTERN-DEBT registry
docs/superskills/specs/         — Design specs with risk assessments
docs/superskills/plans/         — Implementation plans
docs/superskills/qbr-calibration.md — QBR accuracy history
```

---

## The Process

### Step 1: Validate KB exists

```bash
# KB state snapshot (auto-injected at skill load):
!echo "=== ADRs ===" && ls docs/superskills/adrs/ 2>/dev/null | wc -l | xargs echo "count:"
!echo "=== Open PATTERN-DEBTs ===" && grep -c "status: OPEN" docs/superskills/pattern-debt.md 2>/dev/null || echo "0"
!echo "=== Specs ===" && ls docs/superskills/specs/ 2>/dev/null | wc -l | xargs echo "count:"
```


```bash
[ -d docs/superskills ] || { echo "KB not initialized — run skill-init first"; exit 1; }
```

### Step 2: Run targeted searches

```bash
QUERY="<search term>"

echo "=== ADRs ==="
grep -rl "$QUERY" docs/superskills/adrs/ 2>/dev/null \
  && grep -l "$QUERY" docs/superskills/adrs/*.md | while read f; do
       echo "--- $f ---"
       grep -n "$QUERY\|^## [0-9]\|^# ADR" "$f" | head -20
     done

echo "=== PATTERN-DEBT ==="
grep -A 12 "PATTERN-DEBT" docs/superskills/pattern-debt.md \
  | grep -i "$QUERY\|PATTERN-DEBT\|status:\|owner:\|resolution_trigger:"

echo "=== SPECS (Risk Assessments) ==="
grep -rl "$QUERY" docs/superskills/specs/ 2>/dev/null \
  | while read f; do
      echo "--- $f ---"
      grep -n "$QUERY\|## Risk Assessment\|Gate Result" "$f" | head -10
    done

echo "=== QBR HISTORY ==="
grep -i "$QUERY" docs/superskills/qbr-calibration.md 2>/dev/null | head -10
```



### Step 2b: Structured and alias-assisted search

Prefer structured fields when they exist:

```bash
# Keep generated topic index fresh when automation is available:
python3 tools/build_kb_index.py . 2>/dev/null || true

# Claim grammar fields improve grep precision:
grep -Rni "CLAIM:\|EVIDENCE:\|SOURCE:\|SCOPE:\|RESIDUAL RISK:" docs/superskills/ | grep -i "$QUERY"

# Alias map from CONTEXT.md improves recall:
grep -A 20 "^## Synonyms / Alias Map" docs/superskills/CONTEXT.md 2>/dev/null

# Optional generated index:
grep -Rni "$QUERY" docs/superskills/kb-index.md 2>/dev/null || true
```

Search order:
1. Exact grep.
2. Claim grammar fields.
3. Alias expansion from `CONTEXT.md`.
4. Generated `kb-index.md` topic map (`python3 tools/build_kb_index.py .`).
5. If no result, state that no documented decision was found and suggest whether an ADR/Gotcha should be created.

---

### Step 3: Format results

Present results grouped by source. For each hit:

```
[SOURCE TYPE] file-path
  Line N: [matched content]
  Context: [2 lines around match]
  ---
```

If zero results across all targets:
```
No KB entries found for: "<query>"
This topic has not been documented in super-skills KB yet.
Consider: is there a decision that should be recorded as an ADR?
```

---

## Common Query Patterns

```bash
# Find all OPEN pattern debts
grep -A 3 "PATTERN-DEBT" docs/superskills/pattern-debt.md | grep "status: OPEN"

# Find all HIGH-risk tasks in plans
grep -r "HIGH ⚠️" docs/superskills/plans/

# Find ADRs with fired triggers (check manually after query)
grep -r "Next Cycle Trigger\|resolution_trigger" docs/superskills/adrs/

# Find all HOLD gate results (specs that blocked implementation)
grep -r "Gate Result.*HOLD\|HOLD —" docs/superskills/specs/

# Find all unresolved ASSUMED items
grep -r "ASSUMED" docs/superskills/

# Find CROSS boundary tasks
grep -r "CROSS(" docs/superskills/plans/

# QBR calibration — find OVERESTIMATED predictions
grep "OVERESTIMATED" docs/superskills/qbr-calibration.md
```

---

## KB Health Check

Run periodically to surface stale entries:

```bash
echo "=== KB Health ==="

echo "Open PATTERN-DEBTs:"
grep -c "status: OPEN" docs/superskills/pattern-debt.md

echo "ADRs with no owner:"
grep -rL "^## 8. Owner" docs/superskills/adrs/ 2>/dev/null | wc -l

echo "ADRs with vague triggers:"
grep -r "TBD\|post-launch\|when needed" docs/superskills/adrs/ | grep "Next Cycle"

echo "Specs with HOLD result (blocked):"
grep -rl "Gate Result.*HOLD" docs/superskills/specs/

echo "ASSUMED claims not yet verified:"
grep -rc "ASSUMED" docs/superskills/adrs/ | grep -v ":0"
```

If health check surfaces issues → create a task to address them in the next sprint.

---



### Epistemic Health Check

For stale knowledge, run `python3 tools/epistemic_health_check.py .` when automation is available, then consult `shared/epistemic-health.md`. In addition to finding entries, check whether the entry is still safe to rely on:

- ADR `LAST CONFIRMED` vs `VOLATILITY`;
- Gotcha `status`, `scope`, `last_seen`, and `retire_if`;
- unresolved `ASSUMED` / T4 claims;
- README/install/spec claims that may have drifted from implementation;
- QBR/M.AT calibration after 5+ cycles.

---

## Red Flags — Never

- Answer "we've never decided on X" without running this skill first
- Create a new ADR without checking for existing decisions on the same topic
- Ignore OPEN PATTERN-DEBT entries when starting work on a related module

## Gotchas — Observed Failure Points

<!-- Populated by knowledge-compound skill after cycles where this skill underperformed -->
<!-- Format: [YYYY-MM-DD] What failed | Root cause | What to do instead -->
<!-- DO NOT pre-populate with speculation — real observations only -->
<!-- Example: [2026-06-01] Agent skipped risk scoring for "trivial" CSS task that touched auth config | Triage gate not read carefully | Triage gate now checks file content, not just task description -->
