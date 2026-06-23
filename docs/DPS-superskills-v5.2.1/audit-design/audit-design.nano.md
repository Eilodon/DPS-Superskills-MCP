# audit-design — nano

**Trigger:** `SPEC_APPROVED: true` in spec frontmatter, or `SPEC_ESCALATION: true` from specialist-review.

**Non-negotiable:**
- FAST audit: pre-mortem 3 failure modes + L1–L7 scan + auditor defense.
- Gate Result HOLD → return to brainstorming. Do NOT invoke writing-plans.
- Idempotency: update existing Risk Assessment section, never append duplicate.

**Output:** Risk Assessment appended to spec. Gate: PASS | PASS WITH FLAGS | HOLD.

→ Full: `audit-design/SKILL.md`