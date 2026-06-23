# kb-query — nano

**Trigger:** Before answering "have we decided on X?" or starting work on any module.

**Non-negotiable:**
- Search before saying "we haven't documented this".
- Never create duplicate ADR without checking existing entries.
- KB health check: `grep -c "status: OPEN" docs/superskills/pattern-debt.md` periodically.

**Output:** Search results from `docs/superskills/` corpus.

→ Full: `kb-query/SKILL.md`