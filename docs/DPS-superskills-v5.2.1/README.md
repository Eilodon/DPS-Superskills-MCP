# Super Skills v5.2.1

**A high-assurance agentic coding framework for teams where evidence-gated completion, living specs, and compounding project memory justify ceremony cost.**

---

## Why this exists

Most coding workflows teach agents *what to do*. Super Skills focuses on *how to know the work is actually correct* — and how each verified cycle improves future cycles. It is optimized for high-assurance development, not lowest-friction experimentation.

Superpowers gives your agent discipline. mattpocock gives it alignment. Spec Kit gives it specs. All good. But after the feature ships, these frameworks know nothing more than before. And when the spec drifts from the code, they have no mechanism to catch it.

Super Skills is different in two fundamental ways: **every cycle makes the framework smarter**, and **every design has a proof obligation before a line of code is written.**

---

## How it works

Three interlocking ideas:

**1. Evidence before claims.** Every completion claim requires T1/T2 evidence — ran command, read output, CI passed. "Should work" is not evidence. Enforced at every gate.

**2. Cycles compound.** Bugs found → `pattern-globalize` finds the class. Cycles end → `knowledge-compound` extracts surprises into the framework. VHEATM audits → `audit-distill` turns findings into Gotchas preventing the same failure next cycle. The framework gets measurably better. This is documented and verifiable.

**3. Design has a proof obligation.** DPS v5 integration means every non-trivial spec travels through a structured lifecycle: DRAFT → PROOF-READY → APPROVED-SSOT → IMPLEMENTATION-ACTIVE → LIVING-SPEC. A spec can't become implementation authority without passing Arc 1 (proof at design time). It stays honest via Arc 2 (living proof as implementation reveals reality).

---

## Install

```bash
# Claude Code / Cursor / Codex / OpenCode
cp -r DPS-superskills/* ~/.claude/skills/

# Then in your project (once):
skill-init

# Optional — skip cold start with pre-seeded knowledge:
cp bootstrap-templates/qbr-calibration.seed.md docs/superskills/qbr-calibration.md
cp bootstrap-templates/pattern-debt.seed.md    docs/superskills/pattern-debt.md
cp bootstrap-templates/CONTEXT.seed.md         docs/superskills/CONTEXT.md
```

---

## Who this is for

**Use Super Skills when "it seemed to work" is not good enough.** Production SaaS, financial features, systems with real user data, multi-service architectures.

**Use Superpowers or mattpocock/skills for low-friction individual-developer workflow.** Excellent at what they do. Super Skills is not competing on adoption ease.

**Add DPS integration** (`dps-init` after brainstorming) when: multi-component systems, external integrations, team > 1 person, or when you need the spec to survive longer than one implementation sprint.

---

## Modes

Super Skills uses `complexity-gate` before software-development work to choose proportional rigor:

- **C0/C1 — compressed rigor:** keep evidence discipline, proof mode, and completion verification without full DPS ceremony.
- **C2 — feature rigor:** brainstorming-lite, proof-first implementation, verification, and decision capture when behavior changes.
- **C3/C4 — high-assurance rigor:** DPS, audit-design, specialist-review, release-readiness, ADR, and knowledge-compound.

Compressed rigor is allowed. Skipped evidence discipline is not.

## Not optimized for

- one-off scripts where no correctness/release claim matters;
- throwaway prototypes unless explicitly marked `SPIKE_THROWAWAY`;
- pure Q&A with no software-development action;
- low-risk solo experimentation where speed matters more than assurance.

---

## 31 Skills

**DISCIPLINE** (Iron Laws — non-negotiable):
`complexity-gate` · `tdd-verified` · `verification-before-completion` · `context-reanchor` · `epistemic-health-check` · `privacy-secrets-gate`

**TECHNIQUE** (Goal + constraints — adapt approach):
`brainstorming` · `dps-init` · `audit-design` · `dps-promote` · `writing-plans` · `task-risk-score`
`systematic-debugging` · `pattern-globalize` · `specialist-review` · `release-readiness`
`subagent-driven-development` · `executing-plans` · `dispatching-parallel-agents`
`receiving-code-review` · `using-git-worktrees` · `session-handoff`

**KNOWLEDGE LAYER** (Cross-cycle compounding):
`domain-alignment` · `knowledge-compound` · `audit-distill` · `adr-commit`

**REFERENCE** (Lookup only):
`kb-query` · `skill-init` · `writing-super-skills` · `framework-doctor`

---


## Quickstarts

New to the framework? Start with the profile that matches the task:

- [Solo / C1 bounded local fix](quickstarts/solo-c1.md)
- [Team / C2 feature rigor](quickstarts/team-c2.md)
- [High-Assurance / C4 workflow](quickstarts/high-assurance-c4.md)
- [One-page cheatsheet](quickstarts/cheatsheet.md)

## The full loop (v5.2.1)

```
Intent → brainstorming → dps-init → audit-design (Arc 1) → dps-promote → writing-plans
                                                                                 ↓
                                                                         [implement: proof-first discipline]
                                                                                 ↓
                                                                      adr-commit (DPS ADR format)
                                                                                 ↓
                                                              knowledge-compound (Arc 2 feed)
                                                                                 ↓
                                                 Code → Ship → VHEATM audit → audit-distill
                                                                                 ↓
                                                              Gotchas + pattern-debt + M.AT
                                                              DPS Living Spec updated
                                                                                 ↓
                                                                  Next cycle starts smarter
```

---

## Changelog

- **v5.2.1:** Final hardening release
  - Migrated production Gotchas from free-form pipe syntax to `shared/gotcha-schema.md` style entries
  - `epistemic-health-check`: cadence state added via `--record-cycle` and `--record-run` so the 5+ cycle trigger is enforceable
  - NEW: `privacy-secrets-gate` — C4/data-sensitivity gate for PII, secrets, payment/regulated data, logs, telemetry, prompts/tools, external disclosure, and redaction
  - NEW: profile quickstarts and one-page cheatsheet for Solo/C1, Team/C2, and High-Assurance/C4 adoption
  - `framework-doctor`: expanded to check quickstarts, privacy gate integration, legacy Gotcha syntax, and cadence flags

- **v5.2:** Automation hardening release
  - NEW: `epistemic-health-check` — automated staleness checks for ADRs, Gotchas, ASSUMED/T4 claims, and calibration
  - NEW TOOL: `tools/epistemic_health_check.py` — standard-library evidence staleness scanner
  - NEW TOOL: `tools/build_kb_index.py` — generates `docs/superskills/kb-index.md` from ADRs, specs, plans, pattern debt, compound wiki, and CONTEXT aliases
  - NEW TOOL: `tools/run_framework_fixtures.py` — executable fixture runner for deterministic framework behavior checks
  - `framework-doctor`: expanded coverage for tool syntax, fixtures, broader registry hygiene, and v5.2 release-doc readiness
  - `kb-query`: now points to generated KB index automation instead of only optional manual lookup
  - `knowledge-compound`: staleness pass now invokes `epistemic_health_check.py` when automation is available

- **v5.1:** Epistemic hardening release
  - NEW: `complexity-gate` — proportional rigor router (C0-C4) before software-development tasks
  - NEW: `domain-alignment` — missing context layer skill now implemented
  - NEW: `context-reanchor` — intra-session instruction drift guard
  - NEW: `release-readiness` — operational gate before merge/deploy/traffic/migration
  - NEW: `framework-doctor` — self-audit for registry, YAML, stale docs, shell guards, and tooling
  - Shared schemas: claim grammar, Gotcha schema/decay, subagent evidence tiers, epistemic health
  - `tdd-verified`: generalized into proof-first modes while preserving test-first default for behavior code
  - `verification-before-completion`: completion claims now use CLAIM/EVIDENCE/SOURCE/SCOPE/RESIDUAL RISK
  - `using-super-skills`: complexity-gate is the top-level router; 1% rule applies within the selected tier
  - `kb-query`: shell guard fixed and structured search/alias guidance added
  - `skill-init`: DPS misplacement scan is dry-run by default; no destructive move without explicit apply
  - Install docs: stale previous-version install references removed

- **v5.0:** DPS v5 integration — spec lifecycle + Arc 1/2 proof obligations
  - NEW: `dps-init` — elevate approved spec into DPS canonical structure (CONTRACTS, BLUEPRINT, ADR)
  - NEW: `dps-promote` — lifecycle gate management (DRAFT → PROOF-READY → APPROVED-SSOT → LIVING-SPEC)
  - NEW: 4 DPS bootstrap templates (dps-README, dps-CONTRACTS, dps-BLUEPRINT, dps-ADR)
  - `skill-init`: DPS scaffold (Step 2b) + DPS Misplacement Scan (Step 1b) + CONSTITUTION.md
  - `brainstorming`: DPS SYSTEM INTENT self-check (Step 7b)
  - `audit-design`: DPS detection + Arc 1 structural checks (single-definition, broken Ref<X>, version sync)
  - `writing-plans`: DPS §8 import/export — reads BLUEPRINT build order when APPROVED-SSOT present
  - `adr-commit`: DPS ADR format (CONFIDENCE, VOLATILITY, IMPACT RADIUS, CHANGE CLASSIFICATION) + dps.py sync
  - `knowledge-compound`: Category 5 — DPS Living Spec / Arc 2 feed (Learning Loop + LAST CONFIRMED updates)
  - `audit-distill`: DPS Smell Mapping — maps VHEATM findings to DPS Arc 1/2 smell categories
  - `using-super-skills`: dps-init/dps-promote in registry + DPS spec-conflict circuit breaker
  - Path rename: `docs/superpowers/` → `docs/superskills/` throughout
- **v4.6:** Register differentiation + 2 new skills + worldview-first README
  - NEW: `audit-distill` — VHEATM → Super Skills feedback loop formalized
  - NEW: `session-handoff` — missing session knowledge layer
  - Prescription registers: DISCIPLINE / TECHNIQUE / REFERENCE declared on all skills
  - Pressure Tests added to 5 skills
  - `task-risk-score`: CONTEXT type step (EXTERNAL_SERVICE → D=1 bias)
  - `specialist-review`: role-based dispatch alias
  - `using-super-skills`: token budget management
  - `skill-init`: project-constitution.md scaffolding
- **v4.5:** Gotchas bootstrap from 3 VHEATM audits (22 entries, 9 skills)
- **v4.4:** Knowledge infrastructure layer
- **v4:** Complete Superpowers replacement — 19 standalone skills, zero external deps

MIT License. Based on Superpowers (MIT) × VHEATM v16.1.1 × DPS v5.0.
