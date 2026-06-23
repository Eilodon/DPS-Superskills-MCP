# specialist-review — nano

**Trigger:** Before task completion or merge.

**Non-negotiable:**
- Role or lens first: Security=STRIDE+OWASP | Systems=ATAM+CPT | Async=TEMPORAL | Domain=CONTEXT.md
- Same-session review = T3 (bias acknowledged). Tier 3 CRITICAL/HIGH → [E.IJ] required.
- Pre-flight API diff: `grep -iE "password|secret|api_key|token" diff`.

**Output:** Review findings with specialist lens + evidence tier declared.

→ Full: `specialist-review/SKILL.md`