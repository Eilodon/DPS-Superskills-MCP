# epistemic-health-check nano

Use before major releases, after repeated cycles, or when relying on old ADRs/Gotchas/ASSUMED claims.

Run:
```bash
python3 tools/epistemic_health_check.py .
```

Check:
- ADR `LAST CONFIRMED` vs `VOLATILITY`;
- Gotcha `status`, `last_seen`, and `retire_if`;
- unresolved T4 / ASSUMED claims;
- QBR/M.AT calibration freshness;
- stale framework docs if modifying Super Skills itself.

Output claim grammar with stale items as residual risk. WARN findings must be revalidated, downgraded, retired, or explicitly carried forward.
