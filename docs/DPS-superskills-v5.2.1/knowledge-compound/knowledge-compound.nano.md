# knowledge-compound — nano

**Trigger:** Immediately after adr-commit completes. One run per merged branch.

**Non-negotiable:**
- Read ADR Part 10 first. If missing → prompt for it before extracting.
- New domain terms → CONTEXT.md. New gotchas → skill Gotchas sections.
- Idempotent: check compound-wiki.md for existing entry before running.

**Output:** `compound-wiki.md` entry + CONTEXT.md updated + skill Gotchas populated.

→ Full: `knowledge-compound/SKILL.md`