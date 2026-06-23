---
name: writing-super-skills
description: Use when creating a new Super Skill, extending an existing one, or auditing skill quality — applies TDD-for-documentation with VHEATM quality lens.
---

# Writing Super Skills

**Creating a Super Skill IS TDD applied to process documentation.**

**REQUIRED BACKGROUND:** Understand `tdd-verified` and `verification-before-completion`
before writing skills. Same Iron Laws apply to documentation.

**Authoring fundamentals:** CSO (description = triggers only, never workflow summary), token efficiency
(< 600 words), flowcharts only for non-obvious decisions, one excellent example over many mediocre ones.
This skill focuses on Super Skills–specific requirements and VHEATM quality gates on top of those fundamentals.

---

## What Makes a Super Skill Different

A Superskills skill encodes technique.
A Super Skill encodes **technique + VHEATM verification gates**.

Every Super Skill must have:

| Element | Superskills | Super Skills |
|---|---|---|
| Trigger condition | ✅ | ✅ |
| Workflow steps | ✅ | ✅ |
| Rationalization prevention | ✅ | ✅ |
| Evidence anchors | ❌ | **REQUIRED** |
| Idempotency guard | ❌ | **REQUIRED** |
| Loop/escalation path | ❌ | if bidirectional |
| Schema reference | ❌ | if writing to KB |

---

## RED-GREEN-REFACTOR for Super Skills

### RED: Baseline

Run scenarios WITHOUT the skill. Document exactly:
- What did the agent do wrong?
- What rationalization did it use?
- Did it produce a VHEATM artifact without evidence anchors?
- Did it re-run and append a duplicate section?

### GREEN: Write Minimal Skill

Address those specific failures. Structure:

```markdown
---
name: [verb-noun, e.g., audit-design]
description: Use when [triggering condition only — no workflow summary]
---

# [Skill Name]

[One-sentence core principle]

## [Trigger / When to Use]
[Condition that fires this skill, including any flag checks]

## Idempotency Check
[How to detect if this skill already ran — prevent duplicate output]

## [Main Steps]
[Numbered, each with evidence gate where output is produced]

## Output Format
[Exact format for KB artifacts — reference shared/pattern-debt-schema.md if applicable]

## Red Flags — Never
[Explicit loophole closures]
```

**Token targets:** Trigger-heavy skills → < 300 words. Reference skills → < 600 words.

### REFACTOR: VHEATM Quality Lens

After GREEN, run this checklist:

**Evidence gates:**
- [ ] Does each step that produces an artifact have an evidence anchor?
- [ ] Is "ASSUMED" vs "VERIFIED" distinction explicit?
- [ ] Can the output be faked with T4 evidence? If yes → add T1 requirement

**Idempotency:**
- [ ] Does the skill check for existing output before appending?
- [ ] Is there a timestamp or version marker on produced sections?

**Loop safety (if skill escalates to another):**
- [ ] Is there a flag to prevent double-escalation?
- [ ] Does the skill clear its own escalation flag after running?

**Schema alignment:**
- [ ] If writing to `docs/superskills/`, does it reference a canonical schema?
- [ ] Does it match the format expected by `kb-query`?

**Rationalization table:**
- [ ] Does the skill explicitly counter the top 3 rationalizations for skipping it?

---

## Super Skills Specific Patterns

### Trigger flags in frontmatter

Skills that need deterministic triggers use spec frontmatter flags:

```yaml
SPEC_APPROVED: true       # triggers audit-design
SPEC_ESCALATION: true     # triggers audit-design re-run
```

If your skill needs a similar deterministic trigger, define a flag in this style.
Document it in README.md Spec Frontmatter section.

### KB output format

If your skill writes to `docs/superskills/`:

```
→ ADRs:           docs/superskills/adrs/YYYY-MM-DD-<slug>.md
→ Pattern Debt:   docs/superskills/pattern-debt.md (use canonical schema)
→ QBR calibration: docs/superskills/qbr-calibration.md
→ New file types: add to kb-query Common Query Patterns
```

Always commit KB artifacts before claiming step complete.

### Cross-skill references

```markdown
# ✅ Correct — triggering conditions only
**REQUIRED:** Use `tdd-verified` before writing implementation code

# ❌ Wrong — force-loads full skill context
@skills/tdd-verified/SKILL.md
```

---

## Deployment Checklist

- [ ] RED phase: ran baseline WITHOUT skill — documented failures verbatim
- [ ] name: letters, numbers, hyphens only
- [ ] description: "Use when..." + triggers only, no workflow summary
- [ ] Idempotency guard present
- [ ] Evidence anchors on output-producing steps
- [ ] Rationalization table covers actual observed rationalizations
- [ ] Token count within target (run `wc -w SKILL.md`)
- [ ] GREEN phase: agent now complies with skill present
- [ ] REFACTOR phase: VHEATM quality checklist above — all boxes checked
- [ ] Commit + update using-super-skills registry table

## Red Flags — Never

- Deploy skill without RED baseline run
- Skip idempotency guard ("nobody will re-run this")
- Skip evidence gates ("the workflow is obvious")
- Write skill for a one-off solution (put in CLAUDE.md instead)
- Duplicate content already in this skill's authoring fundamentals section (cross-reference instead)

## Gotchas — Observed Failure Points

<!-- Populated by knowledge-compound skill after cycles where this skill underperformed -->
<!-- Format: [YYYY-MM-DD] What failed | Root cause | What to do instead -->
<!-- DO NOT pre-populate with speculation — real observations only -->
<!-- Example: [2026-06-01] Agent skipped risk scoring for "trivial" CSS task that touched auth config | Triage gate not read carefully | Triage gate now checks file content, not just task description -->
