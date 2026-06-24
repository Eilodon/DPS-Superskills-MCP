---
name: brainstorming
description: "Use before any feature, component, or behavior change — explores user intent and design before implementation. Precondition: domain-alignment should have run if this is a new project or domain area."
---

# Brainstorming — Design Before Code

**Register: TECHNIQUE**
**Goal:** Understand what's being built and why, produce a design both human and agent can commit to.
**Constraints:** No code before `SPEC_APPROVED: true` set in spec frontmatter. Terminal state: audit-design → writing-plans. Never invoke writing-plans directly.
**Adapt:** questions, pace, and depth to conversation — but every checkpoint must be reached.

**Announce:** "Using brainstorming to design before implementation."

---

## Pre-check

```bash
# Load domain context if available:
!head -40 docs/superskills/CONTEXT.md 2>/dev/null || echo "No CONTEXT.md — consider running domain-alignment first for new projects"
```

If CONTEXT.md is missing and this is a new project or unfamiliar domain → recommend `domain-alignment` first. If human prefers to proceed → proceed, but note vocabulary may need alignment mid-session.

---

## Checklist (complete in order)

1. **Explore project context** — check files, docs, recent commits, CONTEXT.md
2. **Assess scope** — multiple independent subsystems? Decompose first.
3. **Ask clarifying questions** — one at a time; purpose, constraints, success criteria
4. **Propose 2-3 approaches** — trade-offs + your recommendation
5. **Present design** — in sections, get approval after each section
6. **Write design doc** — save + commit
7. **Spec self-review** — fix placeholders, contradictions, ambiguity inline
7b. **DPS SYSTEM INTENT check** — C3+ only, or if project has DPS / spec will be promoted to DPS (see Step 7b below)
8. **User reviews written spec** — wait for explicit approval
9. **Set SPEC_APPROVED** — triggers audit-design

---

## The Conversation

**Goal:** understand what's being built, why, and what success looks like.
**Constraints:**
- One question per message — multiple choice preferred
- Don't ask for information you can infer from the codebase
- Scope before detail — if scope is unclear, ask about scope first
- YAGNI: propose the simplest approach that meets the actual need

**Exploring approaches:**
- Propose 2-3 options with trade-offs before settling
- Lead with your recommendation and the reasoning
- Be explicit about what each approach optimizes for and what it sacrifices

**Presenting the design:**
- Scale section length to complexity — a few sentences for simple, 200-300 words for nuanced
- Ask after each section: "Does this look right?"
- Cover: architecture, components, data flow, error handling, testing strategy
- Apply CONTEXT.md vocabulary — use the terms the team actually uses

**Design for isolation:**
- Each unit: one clear purpose, well-defined interfaces, independently testable
- If you can't explain a unit without reading its internals → boundaries need work

---

## After User Approves Design

**Write spec:**
```bash
# Save to:
docs/superskills/specs/YYYY-MM-DD-<topic>-design.md
```

**Spec self-review:**
1. Placeholder scan — any "TBD", "TODO", vague requirements?
2. Consistency — architecture matches feature descriptions?
3. Scope — focused enough for one plan?
4. Vocabulary — uses CONTEXT.md terms consistently?

Fix inline. Ask user to review.

## Step 7b: DPS SYSTEM INTENT self-check (C3+ or DPS projects)

Skip this step for C0-C2 tasks unless the project already uses DPS structure.
If complexity-gate rated C3+, OR project has DPS initialized, OR spec will be promoted to DPS:
Verify spec có answers cho tất cả SYSTEM INTENT fields:

```
[ ] PROBLEM: stated from user perspective (not technical solution)
[ ] FOR: specific user segment (not "everyone" / "users")
[ ] ASSUMING: ≥ 2 explicit world assumptions written down
[ ] WILL_DRIFT_IF: ≥ 1 trigger for assumption failure (business context, not technical)
[ ] NON-GOALS: ≥ 1 explicit out-of-scope item
[ ] ANTI-REQUIREMENTS: at least considered (may be "none identified")
```

If any missing → fix in spec before setting SPEC_APPROVED: true.
These fields prevent scope creep and assumption drift throughout implementation.

**Set SPEC_APPROVED flag:**
```yaml
---
title: <feature>
date: YYYY-MM-DD
author: <name>
SPEC_APPROVED: true
SPEC_ESCALATION: false
ESCALATION_FINDING: ""
---
```

```bash
git add docs/superskills/specs/
git commit -m "docs: spec approved — <feature-slug>"
```

→ `SPEC_APPROVED: true` triggers `audit-design`.
After audit-design PASS → `writing-plans` is invoked.

**Optional: Promote to DPS structure**
For non-trivial projects, run `dps-init` after this commit.
`dps-init` extracts SYSTEM INTENT, schemas, and components from this spec
into structured DPS canonical files.

---

## Common Traps

**"Too simple to need a design"** — Simple projects hide the most assumptions. Design can be short. It must exist.

**"Skip CONTEXT.md, I know this domain"** — The agent doesn't. Vocabulary mismatches survive into code.

**"Invoke writing-plans directly"** — Never. audit-design runs between spec approval and planning. Always.


## Pressure Tests — Common Rationalizations

- **"Tôi đã hiểu yêu cầu rồi, skip brainstorming"** → Apollos audit: 3 README features là stubs vì spec chưa hỏi "implementation tối thiểu satisfy spec literally nhưng miss intent là gì?" Brainstorm trước.
- **"Feature nhỏ, không cần design"** → Tikai H9: Shopee fee config là "feature nhỏ" — không ai hỏi "environment precondition nào phải đúng?" lúc design. Kết quả: manual SQL seed bị quên, P&L sai silently.
- **"Skip thẳng vào writing-plans cho nhanh"** → audit-design gate tồn tại để catch design-time risks trước khi commit vào implementation. Writing-plans mà không có audit-design = planning mà không có risk assessment.

## Gotchas — Observed Failure Points

<!-- Populated by knowledge-compound after cycles where this skill underperformed -->
<!-- New entries must follow shared/gotcha-schema.md -->
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
    Spec drift: features mô tả là 'X' trong spec shipped là weaker stubs — gap không bị catch trong brainstorming (Apollos, 3 README gaps: human escalation, motion-aware blocking, SSE stream)
  root_cause: >-
    brainstorming approve concept của 'human escalation' mà không stress-test 'implementation tối thiểu nào satisfy spec này literally nhưng miss safety intent?'
  do_instead: >-
    Với mọi safety-critical hoặc user-trust feature trong spec: explicitly hỏi 'implementation đơn giản nhất có thể technically satisfy requirement này là gì?' Nếu answer là stub hoặc hardcoded value → add 'not a stub' như explicit acceptance criterion.
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
    Operational dependencies không được surface trong design — 'manual SQL seed required' emerge ở audit, không phải ở design (Tikai H9)
  root_cause: >-
    brainstorming focus vào 'what to build' mà không hỏi 'điều gì phải đúng trong environment để feature này produce correct output?'
  do_instead: >-
    Cuối brainstorming: explicitly hỏi 'environment preconditions nào phải đúng để feature này produce correct output?' Mỗi precondition không trong automated migration là deployment risk — flag trong spec.
