# Bootstrap Templates

Pre-seeded versions of `docs/superskills/` runtime files,
distilled from 3 real VHEATM audits (Tikai v2.0.0, Aletheia, Apollos DO).

## How to use

These are **optional** starters. Use them instead of the empty templates
that `skill-init` creates, to skip the cold start period.

```bash
# After running skill-init, replace empty files with seeded versions:
cp bootstrap-templates/qbr-calibration.seed.md docs/superskills/qbr-calibration.md
cp bootstrap-templates/pattern-debt.seed.md    docs/superskills/pattern-debt.md
cp bootstrap-templates/CONTEXT.seed.md         docs/superskills/CONTEXT.md
# Edit CONTEXT.md — remove non-applicable domain terms, keep architectural decisions
```

## What's seeded

| File | Contents |
|---|---|
| `qbr-calibration.seed.md` | 8 QBR predictions with outcomes + calibration observations |
| `pattern-debt.seed.md` | 6 recurring bug patterns from 3 independent codebases |
| `CONTEXT.seed.md` | 6 cross-project architectural decisions + domain gotchas |

## Evidence quality

All entries are T1/T2 evidence from direct code analysis. Not speculation.
Sources: Tikai v2.0.0 (VHEATM 16.0) · Aletheia (VHEATM 16.1.1) · Apollos DO (VHEATM 8.0)

## Key calibration finding

**tikai-H25: QBR underestimated.** Redis degradation scored MEDIUM (QBR=6), actual = blocking.
Root cause: Detectability for external service failures assigned D=2 when it should be D=1.
Rule: if no test exists for the failure mode → D=1 always.
