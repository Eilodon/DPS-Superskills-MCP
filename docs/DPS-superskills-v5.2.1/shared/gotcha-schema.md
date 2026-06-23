# Gotcha Schema and Decay Rules

Gotchas are local behavioral memory injected at the point a skill runs. Keep them high-signal.
New Gotchas should use this schema unless migrating an older free-form entry.

```yaml
- date: YYYY-MM-DD
  status: ACTIVE | WATCH | INACTIVE | RETIRED
  source: production-audit | incident | failed-cycle | code-review | retrospective
  evidence: T1 | T2
  scope: skill | project | domain | pattern | global
  applies_when: "specific trigger conditions"
  avoid_when: "conditions where this Gotcha should not bias behavior"
  last_seen: YYYY-MM-DD
  retire_if: "measurable condition for downgrade/retirement"
  claim: "what failed or surprised us"
  root_cause: "structural cause, not instance symptom"
  do_instead: "actionable behavior change"
```

## Decay rules

- ACTIVE: apply normally when `applies_when` matches.
- WATCH: still relevant, but verify scope before applying.
- INACTIVE: do not apply by default; preserve for history.
- RETIRED: obsolete; keep only if it explains past decisions.

A Gotcha should be revalidated, downgraded, or retired when:
- `retire_if` condition is met;
- no recurrence appears after the stated number of relevant cycles;
- project/domain scope changed;
- evidence source is stale or contradicted by newer T1/T2 evidence.
