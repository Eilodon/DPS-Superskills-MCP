# Pattern Debt Register
<!-- Seeded from: Tikai v2.0.0 (VHEATM 16.0), Aletheia (VHEATM 16.1.1), Apollos DO (VHEATM 8.0) -->
<!-- Schema: shared/pattern-debt-schema.md -->
<!-- Generated: 2026-05 — first-cycle bootstrap, not from production incidents -->

---

PATTERN-DEBT-inmemory-state-persistence:
  pattern:            "In-process mutable state (Map, dict, list) used for data that must survive restart"
  grep_cmd:           "grep -rn 'Map<\\|HashMap<\\|dict()\\|{} #\\|= {}$\\|= \\[\\]$' . --include='*.ts' --include='*.py' --include='*.rs' | grep -v test | grep -v node_modules"
  evidence:
    - "Tikai: ARQ worker state — session status held in-memory; worker restart = status stuck"
    - "Aletheia: userStore: Map — lost on every server restart (ADR-AL-20 acknowledged)"
    - "Apollos: SessionStore in session.rs — session pruning not implemented, browser processes leak"
  found:              3 independent occurrences across 3 unrelated codebases (high recurrence signal)
  fixed_now:          []
  remaining:          "pattern class — apply grep to each new codebase"
  priority:           HIGH
  owner:              "Team: Backend / Systems"
  created_date:       2026-05
  created_sprint:     "bootstrap"
  review_interval:    "every project, at skill-init"
  resolution_trigger: "Any state that must survive restart is in a persistence layer (DB, Redis, SQLite)"
  status:             OPEN
  resolved_date:      null
  actual_outcome:     UNKNOWN
  notes:              "This pattern appeared independently in all 3 audited codebases. High prior probability in new codebases."

---

PATTERN-DEBT-pii-in-persistence-unclassified:
  pattern:            "User-generated text fields stored in persistence without PII classification review"
  grep_cmd:           "grep -rn 'raw\\|reason\\|notes\\|comment\\|description\\|feedback\\|message' . --include='*.py' --include='*.ts' | grep -i 'column\\|field\\|model\\|schema\\|db\\|store' | grep -v test"
  evidence:
    - "Tikai H15: refund_reason_raw — Shopee exports may include buyer name/address in refund reason field; stored as-is to DB"
    - "Tikai H33: buyer phone pattern (10-11 digits) present in order data; sanitized for AI but stored in DB"
    - "Aletheia R08: sessionStorage stores user info — XSS-accessible; PII classification unclear"
    - "Aletheia: situationText (user AI input) — unclear if captured in Sentry/PostHog error contexts"
  found:              4 instances across 2 codebases
  fixed_now:          []
  remaining:          "pattern class"
  priority:           HIGH
  owner:              "Backend + Legal"
  created_date:       2026-05
  created_sprint:     "bootstrap"
  review_interval:    "every cycle touching user-generated content"
  resolution_trigger: "All free-text user-generated fields have documented PII classification (PII / PII-adjacent / non-PII) and retention policy"
  status:             OPEN
  resolved_date:      null
  actual_outcome:     UNKNOWN

---

PATTERN-DEBT-noncritical-dep-on-critical-path:
  pattern:            "Non-critical external dependency (AI enhancement, analytics, optional feature) placed on critical path with no graceful degradation"
  grep_cmd:           "grep -rn 'await.*redis\\|await.*cache\\|await.*check.*budget\\|await.*rate.*limit' . --include='*.py' --include='*.ts' | grep -v test"
  evidence:
    - "Tikai H25: Redis budget check for AI calls on critical path for file import — Redis outage → 100% import failure (QBR underestimated: predicted MEDIUM/6, actual HIGH/blocking)"
    - "Apollos H-08: Single AI provider (DO Gradient) with no fallback → provider outage = complete feature failure"
    - "Aletheia R10: Uncapped AI timeout (120s default) with no circuit breaker on server path"
  found:              3 instances across 3 codebases
  fixed_now:          []
  remaining:          "pattern class"
  priority:           HIGH
  owner:              "Backend / Systems"
  created_date:       2026-05
  created_sprint:     "bootstrap"
  review_interval:    "every cycle touching external service integration"
  resolution_trigger: "All external dependency calls have explicit: (1) timeout, (2) fallback behavior, (3) graceful degradation that keeps core feature functional"
  status:             OPEN
  resolved_date:      null
  actual_outcome:     UNKNOWN
  notes:              "tikai-H25 was QBR underestimated (scored 6=MEDIUM, actual=blocking). Detectability should be D=1 for AI/cache integration failures — only visible in production."

---

PATTERN-DEBT-api-key-in-url:
  pattern:            "API key or secret appended as URL query parameter"
  grep_cmd:           "grep -rn '\\?key=\\|&key=\\|\\?api_key=\\|\\?token=\\|\\?secret=' . --include='*.ts' --include='*.py' --include='*.js' | grep -v test | grep -v node_modules"
  evidence:
    - "Aletheia R01 CRITICAL: Gemini API key appended as ?key= in URL — appears in every server access log line"
  found:              1 instance (CRITICAL severity — single instance sufficient for PATTERN-DEBT)
  fixed_now:          []
  remaining:          "pattern class — check all HTTP client URL construction"
  priority:           HIGH
  owner:              "Backend"
  created_date:       2026-05
  created_sprint:     "bootstrap"
  review_interval:    "every cycle adding new external API integration"
  resolution_trigger: "All API keys passed via Authorization header or env-loaded HTTP client config, never via URL query string"
  status:             OPEN
  resolved_date:      null
  actual_outcome:     UNKNOWN

---

PATTERN-DEBT-internal-error-leak:
  pattern:            "Internal exception details (stack trace, file path, DB error) serialized into user-facing API response"
  grep_cmd:           "grep -rn 'str(e)\\|str(err)\\|str(exc)\\|exception.message\\|\\.toString()' . --include='*.py' --include='*.ts' | grep -i 'response\\|return\\|json\\|body\\|error' | grep -v test"
  evidence:
    - "Tikai H16 QBR=6: error_summary.internal_detail = str(e)[:200] stored in DB and returned in ImportSessionResponse to authenticated user"
  found:              1 instance
  fixed_now:          []
  remaining:          "pattern class"
  priority:           MEDIUM
  owner:              "Backend"
  created_date:       2026-05
  created_sprint:     "bootstrap"
  review_interval:    "every cycle touching error handling"
  resolution_trigger: "All API error responses return only user-safe message; internal_detail restricted to logs/Sentry"
  status:             OPEN
  resolved_date:      null
  actual_outcome:     UNKNOWN

---

PATTERN-DEBT-readme-vs-reality-drift:
  pattern:            "README/spec describes feature as implemented; code shows stub, keyword-only, or weaker implementation"
  grep_cmd:           "grep -rn 'TODO\\|STUB\\|FIXME\\|hardcoded\\|placeholder\\|not.*implement' . --include='*.ts' --include='*.py' --include='*.rs' | grep -v test | grep -v node_modules"
  evidence:
    - "Apollos: README 'human escalation path for payment' → human_fallback.rs returns hardcoded dead URL"
    - "Apollos: README 'motion-aware blocking' → agent.rs keyword-only enum, no sensor data"
    - "Apollos: README 'replay-backed SSE status stream' → global StatusBus (not per-session)"
  found:              3 instances in 1 codebase (high-density — suggests architectural gap, not accidents)
  fixed_now:          []
  remaining:          "pattern class"
  priority:           HIGH
  owner:              "Product / Engineering"
  created_date:       2026-05
  created_sprint:     "bootstrap"
  review_interval:    "before every production-readiness gate"
  resolution_trigger: "All README feature claims verified against implementation (not against intended implementation)"
  status:             OPEN
  resolved_date:      null
  actual_outcome:     UNKNOWN
  notes:              "Pattern is especially dangerous for safety-critical features (human escalation for blind users). G.CDOC protocol applies."
