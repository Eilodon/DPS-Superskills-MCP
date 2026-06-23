# CONTEXT.md — Domain Knowledge Bootstrap
<!-- Seeded from: Tikai v2.0.0 (VHEATM 16.0), Aletheia (VHEATM 16.1.1), Apollos DO (VHEATM 8.0) -->
<!-- Version: 1 (bootstrap — not yet populated from domain-alignment sessions) -->
<!-- Add project-specific terms below. This file is the substrate for knowledge-compound. -->

---

## Ubiquitous Language

*Terms where the word in the codebase means something more specific than common usage.*
*(Populate via domain-alignment skill. Seeds below are cross-domain patterns from audit history.)*

**processing** (async pipeline status):
- Colloquially means "in progress"
- Danger: in dedup logic, "processing" is often treated as a terminal blocker — a crashed worker
  can leave records permanently stuck in "processing" with no auto-recovery path.
- Rule: never dedup-block on "processing" without a timeout/recovery mechanism.
- <!-- from audit: Tikai H5 -->

**internal_detail** (error schema field):
- Pattern: str(exception)[:N] stored as internal_detail for support/debugging
- Danger: if internal_detail flows into API response schema, it leaks file paths,
  DB errors, and stack traces to authenticated users.
- Rule: internal_detail stays in logs/Sentry only. API schema gets user_message_vi or equivalent.
- <!-- from audit: Tikai H16 -->

**fee_config_version** (vestigial field — Tikai-specific example):
- Example of a field whose name implies it controls behavior but doesn't.
- Fee lookup uses platform-aware query, not this field.
- Lesson: vestigial fields mislead future devs. Document what controls the actual behavior,
  or remove the field.
- <!-- from audit: Tikai H7 -->

---

## Architectural Decisions (broad applicability)

*Decisions from past cycles that apply to future features across projects.*

**AD-001: Non-critical dependencies must not block critical path**
- Decision: AI enhancements, analytics, and budget checks are non-critical by definition.
  If they fail, the core feature (file import, API response, reading) must still complete.
- Pattern: wrap non-critical calls in try/except with explicit fallback behavior.
  Never let a non-critical dep raise to the caller without a catch.
- Evidence: Tikai H25 — Redis outage caused 100% import failure when AI budget check
  was on the critical path. QBR underestimated (MEDIUM predicted, HIGH actual).
- Applies to: any feature that calls Redis/cache, AI providers, analytics, feature flags.

**AD-002: Seed data required for correct behavior must live in automated migration**
- Decision: If a DB seed file must be applied for the feature to produce correct output
  (not just to run), it must be part of the migration system, not a separate manual SQL file.
- Evidence: Tikai H9 — Shopee fee config required manual SQL seed. If forgotten, TikTok config
  used as fallback with only a WARNING log. P&L silently wrong.
- Applies to: any feature with platform-specific config, regional variants, or lookup tables.

**AD-003: State that must survive process restart belongs in a persistence layer**
- Decision: Application-level Maps, dicts, and in-memory stores are deployment liabilities.
  Any state that must survive server restart, crash, or scale-out must be in DB/Redis/SQLite.
- Evidence: Tikai (worker state), Aletheia (userStore Map), Apollos (SessionStore) — all three
  independently had in-memory state loss on restart as a production gap.
- Applies to: session management, user preferences, job state, rate limit counters (persistent).

**AD-004: AI prompt sanitization must cover all user languages, not just English**
- Decision: Injection pattern lists (keywords, prefixes, prompt delimiters) must include
  patterns in every language users can input.
- Evidence: Tikai H17 — sanitize_for_ai() checked EN injection patterns only. Vietnamese-language
  injection untested. App targets Vietnamese users.
- Applies to: any AI-integrated feature where user text flows into a prompt.

**AD-005: Broadcast/pub-sub state buses must be scoped to session or user**
- Decision: A global broadcast channel is acceptable in single-user demos. In any multi-user
  or multi-session system, it is a privacy and correctness failure by construction.
- Evidence: Apollos H-05 (QBR=32, MANDATORY) — global StatusBus meant user A received
  user B's navigation narration.
- Applies to: SSE streams, WebSocket channels, event buses, notification systems.

**AD-006: API keys must be passed via headers or env-loaded HTTP client config, never via URL query params**
- Decision: URL query params appear in access logs, browser history, Referer headers,
  and CDN logs. API keys in query params are effectively public.
- Evidence: Aletheia R01 (CRITICAL) — Gemini API key as ?key= appeared in every server access log.
- Applies to: all external API integrations. Replace ?key= with Authorization: Bearer header.

---

## Domain Gotchas

*Operational surprises from past cycles that don't fit "architectural decisions" but matter.*

- **[2026-05] QBR formula varies across VHEATM versions.** v8.0 uses weighted additive formula;
  v16.x uses (S×B)/D. Scores are NOT comparable across versions. Always tag M.AT entries with
  formula version. (from: Apollos v8.0 vs Tikai v16.0 comparison)

- **[2026-05] Detectability for integration failures is often coded too high.**
  Redis/cache/AI failures are often assigned D=2 ("needs integration test to catch") but in
  practice are only visible under production load → should be D=1. Review Detectability scores
  for all external dependency hypotheses. (from: tikai-H25 underestimation analysis)

- **[2026-05] Pre-mortem predictions have ~40% accuracy on finding count but HIGH accuracy on
  finding type.** A pre-mortem that predicts "worker crash = stuck file" will likely find
  that exact bug even if it misses 60% of total findings. Trust the pre-mortem on type,
  not on count. (from: Apollos pre-mortem accuracy report, Tikai [M.EF])

- **[2026-05] Manual deployment steps ("I'll remember") are the #1 underestimated operational risk.**
  Every audit found at least one "must remember to run X before go-live" that wasn't automated.
  Rule: if the step isn't in CI or migration, it will be forgotten under launch pressure.
  (from: Tikai H9 Shopee seed, Aletheia validate-env.sh prerequisites)

- **[2026-05] README features described as "X" are often implemented as stubs or weaker versions.**
  Three independent README gaps found in Apollos audit. G.CDOC applies to README claims,
  not just ADR claims. Before production gate, verify every README feature claim against code.
  (from: Apollos H-07, README vs Reality analysis)

## Synonyms / Alias Map

# Used by kb-query for alias-assisted search. Add project-specific aliases during domain-alignment.
auth: authentication, token, session, credential, permission
worker: async job, queue, background task, temporal
release: deploy, rollout, enable traffic, cutover
migration: schema change, backfill, data move

## Evidence Staleness Notes

# Use shared/epistemic-health.md when entries become stale.
