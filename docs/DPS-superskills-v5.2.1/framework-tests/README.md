# Framework Fixtures

These fixtures provide executable checks for the Super Skills methodology itself.
They are intentionally lightweight and local: no external APIs, no model calls, no vector DB.

Run:

```bash
python3 tools/run_framework_fixtures.py .
```

The runner validates automation added in v5.2:
- `framework-doctor` detects framework drift;
- `build_kb_index.py` generates a structured `kb-index.md` from a sample KB;
- `epistemic_health_check.py` flags stale ADRs and unresolved T4/ASSUMED claims;
- fixture manifests document expected behavioral responses for classic failure modes.
