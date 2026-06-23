---
name: using-super-skills
description: Use when starting any conversation or software-development task — establishes the Super Skills registry, runs complexity-gate for proportional rigor, and prevents rationalized skill skipping before acting.
---

<SUBAGENT-STOP>
If dispatched as a subagent for a specific task, skip this skill.
</SUBAGENT-STOP>

<EXTREMELY-IMPORTANT>
For any software-development task, run `complexity-gate` first.
Inside the selected tier, if there is even a 1% chance a required or eligible skill applies, YOU MUST invoke it.
IF A REQUIRED/ELIGIBLE SKILL APPLIES IN THE CURRENT TIER, YOU DO NOT HAVE A CHOICE. USE IT.
This is not negotiable.
</EXTREMELY-IMPORTANT>

# Using Super Skills

Super Skills is a complete, standalone software development methodology.

```bash
# Project state at session start (auto-injected):
!cat docs/superskills/.skill-init 2>/dev/null || echo "⚠️  Not initialized — run skill-init first"
!ls docs/superskills/adrs/ 2>/dev/null | wc -l | xargs -I{} echo "ADRs in KB: {}"
```

It does not require any other framework to function.

**Platform compatibility:** See `shared/tool-compatibility.md` and `install/README-install.md`
for per-harness capability matrix and fallback instructions.

**Key fallbacks:**
- No Task tool → use `executing-plans` instead of `subagent-driven-development`
- No TodoWrite → maintain `- [ ]` checklist inline
- No Artifacts API → use Method B (local subagent) in `specialist-review` [E.IJ]


## Token Budget Management

When context window is constrained (long session, many files loaded), apply budget mode:

```
BUDGET MODE — activate when:
  - Conversation turn > 20
  - Multiple large files in context
  - Agent outputs growing verbose

Rules in budget mode:
  - Prefer nano-tier skill references over full-skill invocations
  - Output: drop filler, keep technical accuracy ("ultra-compressed" mode)
  - Announce: "Operating in budget mode — compressed output"
  - Skip prose explanations; use inline comments only
  - Still produce all required Evidence Anchors — never skip these

Budget mode OFF: anytime user asks for detail or explanation.
```

**Auto-detect signal:** if you find yourself re-reading already-loaded files or
repeating context that's been established — budget mode should already be active.

## Instruction Priority

1. **User's explicit instructions** (CLAUDE.md, direct requests) — highest
2. **Super Skills** — all methodology is self-contained here
3. **Default behavior** — lowest

---

## Skill Registry

Run `complexity-gate` BEFORE acting on software-development work. Then invoke the appropriate required/eligible skill inside the selected tier. Run `epistemic-health-check` when relying on old evidence or before C3/C4 release decisions. Every skill that applies in-tier. Every time.

### Top-Level Routing
| Skill | Trigger |
|---|---|
| `complexity-gate` | Before any software-development task — chooses C0-C4 rigor tier |

### Knowledge Foundation (run before Design)
| Skill | Trigger |
|---|---|
| `domain-alignment` | New project or new domain area — before first brainstorming |
| `knowledge-compound` | After every adr-commit completes |
| `epistemic-health-check` | Before relying on old ADRs/Gotchas/ASSUMED claims; before major releases or C3/C4 staleness-sensitive work |

### Design & Planning
| Skill | Trigger |
|---|---|
| `brainstorming` | Before any feature, component, or behavior change |
| `dps-init`    | After brainstorming SPEC_APPROVED; when spec has SYSTEM INTENT, schemas, components |
| `audit-design` | When `SPEC_APPROVED=true` in spec frontmatter |
| `dps-promote` | After audit-design PASS; after user sign-off; after first production cycle |
| `writing-plans` | After audit-design PASS gate |
| `task-risk-score` | During writing-plans Self-Review |

### Execution
| Skill | Trigger |
|---|---|
| `using-git-worktrees` | Before starting feature work |
| `subagent-driven-development` | Executing plan with subagent support |
| `executing-plans` | Executing plan without subagent support |
| `dispatching-parallel-agents` | 2+ independent tasks that can run concurrently |

### Quality Gates (discipline skills — gate everything)
| Skill | Trigger |
|---|---|
| `tdd-verified` | Before writing ANY implementation code — declare proof mode first |
| `verification-before-completion` | Before claiming work is done, fixed, or passing |
| `context-reanchor` | Long sessions, phase transitions, many files loaded, or before completion after drift risk |
| `privacy-secrets-gate` | Data sensitivity 2/3, PII, secrets, credentials, payment/regulated data, logs/telemetry/prompts/tools, external disclosure, or C4 workflows |

### Debugging & Review
| Skill | Trigger |
|---|---|
| `systematic-debugging` | Any bug, test failure, unexpected behavior |
| `pattern-globalize` | After every confirmed bug fix |
| `specialist-review` | Before task completion or merge |
| `release-readiness` | Before merge, deploy, production traffic, migration, or feature-flag rollout |
| `receiving-code-review` | When receiving code review feedback |

### Completion
| Skill | Trigger |
|---|---|
| `adr-commit` | Before merging or closing any branch |

### Knowledge Base
| Skill | Trigger |
|---|---|
| `kb-query` | Before answering "have we decided on X?" or searching past decisions |
| `skill-init` | Once, when starting a new project |
| `writing-super-skills` | Before creating or editing a skill |
| `framework-doctor` | Before releasing, installing, or modifying Super Skills itself |

---

## Skill Priority When Multiple Apply

1. **Discipline skills first** (`tdd-verified`, `verification-before-completion`) — these gate everything else
2. **Workflow skills second** (`audit-design`, `systematic-debugging`) — these shape execution
3. **Reference skills last** — these guide specifics

Announce every activation: `"Using [skill-name] to [purpose]."`
If skill has a checklist → create a TodoWrite item per checklist item before starting.

---



## Completion Claim Grammar

Before any success claim, use `verification-before-completion` and the shared claim grammar:

```text
CLAIM: <what is asserted>
EVIDENCE: <T1|T2|T3|T4> — <why this tier>
SOURCE: <command/file/output/review artifact>
SCOPE: <what the evidence proves and does not prove>
RESIDUAL RISK: <remaining assumptions or missing coverage>
```

T4 remains ASSUMED, never VERIFIED. Subagent reports are not T1 unless the parent directly verifies the raw output or artifact.

---

## Cognitive Load Circuit Breaker

Before generating more fix code after repeated failures, run this check:

```bash
# Count recent fix-type commits on current branch (last 10 commits)
git log --oneline -10 | grep -icE "^[a-f0-9]+ (fix|wip|attempt|retry|debug|patch):" \
  || git log --oneline -10 | grep -icE "(fix attempt|try again|another fix|still broken)"
```

**Rule:**
```
IF fix-type commits ≥ 3 on same feature/component WITHOUT a passing test commit between them:
  MANDATORY STOP — halt new code generation
  MANDATORY INVOKE — systematic-debugging (Phase 1-3 root cause first)

BEFORE attempting any more code, verify:
  git log --oneline -6
  # Do you see 3+ "fix:" commits targeting the same component?
  # YES → invoke systematic-debugging. This is the architectural signal.
  # NO  → continue, reset mental count.
```

**Why git-verifiable:** Agent memory across messages is unreliable. Git log is ground truth.
Commit message discipline required: use `fix:` prefix for fix attempts. If your commits
don't follow this convention, check manually: are there 3+ commits on this branch all
trying to solve the same problem?

This is the external enforcement of `systematic-debugging` Phase 4.5
("3+ failed fixes → question architecture") applied at the meta level.

### DPS Spec-Conflict Signal

When implementation repeatedly fails because "spec isn't clear":

```
IF agent has asked clarifying questions after reading BLUEPRINT.md more than once,
OR the same design decision keeps re-opening during implementation:
  → STOP. This is a DPS SPEC BUG, not a code bug.
  → Classify per Change Classification Protocol (see adr-commit / DPS README)
  → Fix BLUEPRINT.md / CONTRACTS.md first — spec is SSOT
  → Only then re-implement
```

Do not generate more fix code until the spec conflict is resolved.
Pseudocode that still prompts agent questions after reading = underspecified (DPS Rule 3).

**Rationalizations — all rejected:**

| Thought | Reality |
|---|---|
| "This attempt is different" | Check git log. Is the commit count ≥ 3? Then invoke systematic-debugging. |
| "One more try" | `git log --oneline -10` first. Count. Then decide. |
| "I don't use fix: prefix" | Count manually. The rule is about fix attempt count, not commit format. |

---

## Red Flags — Stop, You're Rationalizing

| Thought | Reality |
|---|---|
| "This is too simple for a skill" | Check anyway. Simple tasks have skills. |
| "I need context first" | Skill check comes BEFORE gathering context. |
| "I remember this skill" | Skills evolve. Read the current version. |
| "The skill is overkill here" | Use it. Complexity hides in simple-looking tasks. |
| "Just this one action first" | Check BEFORE any action. |
| "No SPEC_APPROVED flag, skip audit-design" | Check for SPEC_ESCALATION flag too. |
| "We don't have Superskills installed" | Super Skills is complete. Everything is here. |
| "The spec is clear enough" | DPS pseudocode is evidence-checkable: if agent asks follow-up questions, pseudocode is not clear enough |
| "ADR doesn't need CONFIDENCE rating" | CONFIDENCE = LOW without VALIDATION TARGET = guaranteed ignored debt |

## Gotchas — Observed Failure Points

<!-- Populated by knowledge-compound skill after cycles where this skill underperformed -->
<!-- Format: [YYYY-MM-DD] What failed | Root cause | What to do instead -->
<!-- DO NOT pre-populate with speculation — real observations only -->
<!-- Example: [2026-06-01] Agent skipped risk scoring for "trivial" CSS task that touched auth config | Triage gate not read carefully | Triage gate now checks file content, not just task description -->
