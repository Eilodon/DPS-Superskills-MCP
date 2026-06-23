---
name: framework-doctor
description: Use before releasing, installing, or modifying Super Skills itself — self-audits the framework for broken skill references, YAML errors, stale version drift, nano mismatches, shell guard bugs, missing shared files, and DPS tooling availability.
---

# Framework-Doctor — Super Skills Self-Audit

**Register: DISCIPLINE**
**Goal:** Make the framework eat its own dogfood before release.
**Core principle:** a framework that enforces evidence discipline must verify its own artifacts.

**Announce:** "Using framework-doctor to self-audit Super Skills before release."

---

## Run

```bash
python3 tools/framework_doctor.py .
python3 tools/run_framework_fixtures.py .
python3 tools/epistemic_health_check.py .
```

If the script is unavailable, run the manual checklist below.

---

## Checks

```text
[ ] all SKILL.md YAML frontmatter parses
[ ] every skill has a matching .nano.md
[ ] README skill count matches actual SKILL.md count
[ ] registry skill references resolve to folders
[ ] install docs version matches README
[ ] no stale v4.2 / 19 skills references
[ ] no broken shell snippets where an OR guard is followed by echo and then an AND exit without braces
[ ] shared references required by skills exist
[ ] dps.py --help works
[ ] automation scripts compile: framework_doctor, build_kb_index, epistemic_health_check, run_framework_fixtures
[ ] framework fixtures exist and are executable with `tools/run_framework_fixtures.py`
[ ] release docs reference staleness and KB-index automation
[ ] archive can be created without changing framework format
```

---

## Completion Claim

Use claim grammar:

```text
CLAIM: Super Skills framework self-audit passes.
EVIDENCE: T1 — ran `python3 tools/framework_doctor.py .` and `python3 tools/run_framework_fixtures.py .`, exit 0.
SOURCE: command output.
SCOPE: Verifies packaging/hygiene/control-plane integrity; does not prove real-world adoption effectiveness.
RESIDUAL RISK: Requires production cycles for behavioral validation.
```

## Gotchas — Observed Failure Points

<!-- Populated by knowledge-compound after cycles where this skill underperformed -->
<!-- New entries should follow shared/gotcha-schema.md -->
