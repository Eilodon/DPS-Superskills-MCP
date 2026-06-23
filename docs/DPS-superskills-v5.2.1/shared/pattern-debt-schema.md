# PATTERN-DEBT Canonical Schema

**Source of truth** for all PATTERN-DEBT entries.
Referenced by: `pattern-globalize`, `adr-commit`, `kb-query`.

---

## Schema

```yaml
PATTERN-DEBT-<slug>:
  pattern:            # Structural description — NOT a symptom, the class of bug
  grep_cmd:           # Exact command used to find instances (reproducible)
  found:              # Total instance count at time of discovery
  fixed_now:          # List of file:line references fixed in this cycle
  remaining:          # Count of unfixed instances
  priority:           # HIGH | MEDIUM | LOW
  owner:              # Team or person responsible for resolution (REQUIRED)
  created_date:       # YYYY-MM-DD
  created_sprint:     # Sprint or cycle identifier
  review_interval:    # e.g., "every 2 sprints" or "before next feature touching <module>"
  resolution_trigger: # MEASURABLE CONDITION — reject vague phrases (see rules below)
  status:             # OPEN | IN_PROGRESS | RESOLVED | DEFERRED
  resolved_date:      # YYYY-MM-DD (fill when status = RESOLVED)
  actual_outcome:     # For M.AT calibration: INCIDENT | NEAR_MISS | NO_IMPACT | UNKNOWN
```

---

## Resolution Trigger Rules

**REJECT** if trigger contains any of: "after launch", "post-release", "TBD",
"when we get around to it", "when needed", "eventually", or lacks a measurable condition.

**ACCEPT** format: `"When [observable event] OR [metric] exceeds [threshold]"`

```
✅  "When any new feature touches <module>"
✅  "When error rate on affected endpoint exceeds 0.1% over 1h"
✅  "Before the next team onboards to this service"
✅  "When PATTERN-DEBT count in this module exceeds 3"
❌  "Post-launch cleanup"
❌  "Technical debt sprint"
❌  "TBD"
```

---

## Example Entry

```yaml
PATTERN-DEBT-async-commit:
  pattern:            "AsyncSession used without explicit commit boundary — PY-07 class"
  grep_cmd:           "grep -rn 'async with.*Session\\|AsyncSession' . --include='*.py'"
  found:              23
  fixed_now:          ["src/users/repo.py:47", "src/orders/service.py:112", "src/billing/dao.py:88"]
  remaining:          20
  priority:           HIGH
  owner:              backend-team
  created_date:       2026-05-18
  created_sprint:     sprint-14
  review_interval:    "every sprint until remaining = 0"
  resolution_trigger: "Before any new async endpoint is added to the service"
  status:             OPEN
  resolved_date:      null
  actual_outcome:     UNKNOWN
```

---

## Storage Location

All PATTERN-DEBT entries live in: `docs/superskills/pattern-debt.md`
Append new entries, never delete — update `status` field instead.
`kb-query` skill reads this file for search.
