# VHEATM Compact Glossary

Quick reference for VHEATM v16.1.1 terms used throughout Super Skills.
Full reference: VHEATM v16.1.1 SKILL.md (if installed).

---

## Core Terms

**QBR (Quality × Blast-Radius score)**
`QBR = (Severity × Blast-Radius) / Detectability`
Scores risk of a task or finding. QBR ≥ 6 = HIGH risk. Used in `task-risk-score`.

**FAST mode**
Compressed VHEATM audit that fits in ~1 page / 5–15 min budget.
Self-contained: steps 1–12, no reference files needed.
Used in `audit-design` for pre-implementation spec review.

**[E.IJ] — Independent Judge**
Protocol requiring a separate LLM session (no shared context) to review findings.
Prevents self-serving confirmation bias. T1 evidence when done correctly.
Used in `specialist-review` for Tier 3 CRITICAL/HIGH findings.

**G.ORG — Org Blast Radius**
Identifies which teams own which parts of the fix path.
`BOUNDARY: CROSS(teams=[...], fix-path-owner=<team>)` in `task-risk-score`.
Key insight: "LIVE vs ENTERPRISE = fix-path ownership, not regulatory scope."

**M.AT — Mandatory Accuracy Tracker**
Logs predicted severity vs. actual outcome per task/finding after sprint retrospective.
Feeds QBR threshold calibration after 5+ cycles.
Lives in `docs/superskills/qbr-calibration.md`. Used in `task-risk-score`.

**G.CDOC — Changelog-to-Code Verification**
After writing an ADR: re-read key claims (Section 3, Section 7) against actual code.
Prevents "aspirational ADR" — decisions documented that don't match implementation.
Used in `adr-commit` Step 3.6.

**CPT — Code Path Trace**
Traces a write chain A→B→C end-to-end to find silent failures at interface boundaries.
Triggered when: write chain ≥ 3 components, financial path, or async worker active.
Used in `specialist-review` TEMPORAL/CPT lens.

---

## Evidence Tiers

| Tier | Meaning | Example |
|---|---|---|
| T1 | Direct observation this session | Ran command, read output |
| T2 | External validation | CI passed, peer confirmed |
| T3 | Indirect / same-session review | Related test passed, pattern match |
| T4 | Heuristic / inference | "should work", "looks correct" |

T4 is never evidence. Completion claims require T1 or T2.
Used in `verification-before-completion` and `specialist-review`.

---

## VHEATM Layers (context for Super Skills integration)

```
Layer 1 — Core Loop:    5 Tikai Principles + Evidence Anchor + Pattern Globalization
                        → "always active" skills: verification-before-completion,
                          pattern-globalize, tdd-verified

Layer 2 — Specialist:   STRIDE / ATAM / FMEA / OWASP / TEMPORAL / CPT
                        → triggered skills: specialist-review, audit-design

Layer 3 — Meta-Defense: [E.IJ] Independent Judge + Accuracy Tracker + KB
                        → cycle-data-dependent: adr-commit (ADR), kb-query,
                          task-risk-score M.AT (deferred until 5+ cycles)
```
