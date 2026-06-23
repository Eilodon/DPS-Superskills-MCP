# QBR Calibration — M.AT Accuracy Tracker
<!-- Seeded from 3 real VHEATM audits: Tikai v2.0.0 (v16.0), Aletheia (v16.1.1), Apollos DO (v8.0) -->
<!-- Formula used: (Severity × Blast-Radius) / Detectability — VHEATM v16.x standard -->
<!-- WARNING: Apollos entries use v8.0 formula (weighted additive) — NOT comparable. Tagged [v8-formula]. -->

## Active Threshold
HIGH ≥ 6 (default — calibrate after 5+ cycles)

---

## Calibration Log

| task-id | sprint | formula-ver | predicted-qbr | predicted-risk | actual-severity | outcome | notes |
|---|---|---|---|---|---|---|---|
| tikai-H5-dedup-stuck | tikai-v2.0.0 | v16.x | 8 | HIGH | HIGH | CONFIRMED | Worker crash → "processing" state never cleared → re-upload blocked permanently |
| tikai-H9-shopee-seed | tikai-v2.0.0 | v16.x | 7 | HIGH | HIGH | CONFIRMED | Manual SQL seed not run → TikTok fee config used for Shopee silently → P&L wrong |
| tikai-H15-pii-storage | tikai-v2.0.0 | v16.x | 7 | HIGH | HIGH | CONFIRMED | refund_reason_raw stored with potential buyer PII (name/address from Shopee export) |
| tikai-H16-error-leak | tikai-v2.0.0 | v16.x | 6 | MEDIUM | MEDIUM | CONFIRMED | str(e)[:200] in error_summary returned in API response → internal paths leaked |
| tikai-H22-billing | tikai-v2.0.0 | v16.x | 6 | MEDIUM | UNCERTAIN | OVERESTIMATED | Tier management may be intentional manual process — payment integration may exist outside codebase scope |
| tikai-H25-redis-degradation | tikai-v2.0.0 | v16.x | 6 | MEDIUM | **HIGH** | **UNDERESTIMATED** | Redis outage → AI budget check fails → 100% import failure. Pre-mortem PM-03 predicted this. QBR=6 undercounted because Detectability=2 (needs integration test) was too generous — in practice, only visible in prod. Should be D=1 → QBR=9. |
| tikai-H3-rate-limit-ip | tikai-v2.0.0 | v16.x | 5 | MEDIUM | MEDIUM | CONFIRMED | Rate limit per IP not per-shop — shared office IP burns shared limit |
| tikai-H17-vi-injection | tikai-v2.0.0 | v16.x | 5 | MEDIUM | MEDIUM | CONFIRMED | AI sanitization only checked EN injection patterns; Vietnamese not tested |

---

## Calibration Observations (after 1 audit cycle)

**Underestimation pattern identified:**
- tikai-H25: QBR=6 predicted MEDIUM but actual impact was HIGH/blocking
- Root cause: Detectability for Redis-based checks was coded as D=2 (needs integration test)
  but a Redis outage only becomes visible in production → should be D=1
- **Correction rule:** When dependency failure is only detectable in production
  (no integration test for the failure mode), set Detectability = 1 regardless of test suite size.

**Overestimation pattern identified:**
- tikai-H22: QBR=6 flagged as MEDIUM but finding may not apply
- Root cause: Billing/payment integration may exist outside audited codebase scope
- **Correction rule:** Add "scope confidence" field. When finding depends on "no code visible
  for X" and X could exist outside audit scope, downgrade confidence to UNCERTAIN before
  adding to calibration log.

**M.AT note:** Only 1 audit cycle of data. Threshold calibration requires 5+ cycles.
Do NOT adjust HIGH threshold yet. Log observations, revisit after cycle 5.

---

## Formula Version Reference

| VHEATM version | QBR formula | HIGH threshold |
|---|---|---|
| v8.0 (Apollos) | (user_facing×4) + (data_integrity×4) + (security×3) + (blast×2) | ≥ 20 |
| v16.x (Tikai, Aletheia) | (Severity × Blast-Radius) / Detectability | ≥ 6 |

**Do not mix scores across formula versions in calibration.**
