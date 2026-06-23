# audit-distill — nano

**Trigger:** Khi có VHEATM audit report muốn extract thành Super Skills knowledge.

**Non-negotiable:**
- T1/T2 evidence only vào Gotchas — không speculation.
- Tag M.AT entries với formula version (v8.0-additive vs v16.x-multiplicative không comparable).
- Idempotency check trước khi write — không duplicate entries.

**Output:** Updated Gotchas + pattern-debt.md + qbr-calibration.md + CONTEXT.md + compound-wiki entry. Committed.

→ Full: `audit-distill/SKILL.md`
