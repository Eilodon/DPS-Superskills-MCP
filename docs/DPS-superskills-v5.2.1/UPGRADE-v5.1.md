# DPS Super Skills v5.1 Upgrade Report

This release keeps the existing DPS Super Skills multi-skill bundle format. It does not convert the bundle to GPT/OpenAI Skill format.

## Upgrade theme

Epistemic hardening: make evidence discipline visible, proportional, and self-audited.

## Added skills

- `domain-alignment` — creates/updates CONTEXT.md before first brainstorming in a new domain.
- `complexity-gate` — routes tasks into C0-C4 rigor tiers.
- `context-reanchor` — prevents intra-session instruction drift.
- `release-readiness` — distinguishes code-complete from release-ready.
- `framework-doctor` — self-audits the framework before release/install/modification.

## Added shared references

- `shared/claim-grammar.md`
- `shared/gotcha-schema.md`
- `shared/subagent-evidence.md`
- `shared/epistemic-health.md`

## Key fixes

- Fixed invalid YAML frontmatter in `brainstorming/SKILL.md`.
- Fixed `kb-query` shell guard precedence.
- Removed stale install references to `super-skills-v4.2` and `19 skills` from README/install docs.
- Implemented missing `domain-alignment` references.
- Reconciled README count to 29 skills.
- Made `skill-init` DPS misplacement migration dry-run by default.

## Core behavior changes

- `using-super-skills` now routes software-development tasks through `complexity-gate` first.
- The 1% anti-rationalization rule is preserved inside the selected complexity tier.
- `verification-before-completion` now requires CLAIM/EVIDENCE/SOURCE/SCOPE/RESIDUAL RISK grammar.
- `tdd-verified` now supports proof modes while preserving TEST_FIRST as default for behavior code.
- Subagent reports are no longer treated as T1 evidence without parent verification.
- `specialist-review` now includes a MIGRATION lens.
- `kb-query` now supports structured claim search and alias-assisted retrieval.

## Verification evidence

Final release check should include:

```bash
python3 tools/framework_doctor.py .
python3 - <<'PY'
import pathlib, re, yaml
for p in pathlib.Path('.').glob('*/SKILL.md'):
    m = re.match(r'^---\n(.*?)\n---\n', p.read_text(), re.S)
    yaml.safe_load(m.group(1))
print('all frontmatter parses')
PY
grep -R "super-skills-v4.2\|19 skills\|23 Skills" -n README.md install || true
python3 dps-tools/dps.py --help
```
