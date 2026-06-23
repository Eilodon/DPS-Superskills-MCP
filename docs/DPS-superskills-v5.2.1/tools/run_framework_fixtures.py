#!/usr/bin/env python3
"""Executable fixture checks for DPS Super Skills automation.

The runner intentionally tests deterministic framework tooling, not LLM behavior.
"""
from __future__ import annotations

import shutil
import subprocess
import sys
import tempfile
from pathlib import Path


def run(cmd: list[str], cwd: Path, expect: int = 0) -> subprocess.CompletedProcess[str]:
    proc = subprocess.run(cmd, cwd=str(cwd), text=True, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, timeout=30)
    if proc.returncode != expect:
        print("COMMAND FAILED")
        print("cwd:", cwd)
        print("cmd:", " ".join(cmd))
        print("expected:", expect, "actual:", proc.returncode)
        print(proc.stdout)
        raise AssertionError("unexpected command result")
    return proc


def copy_framework(root: Path, tmp: Path) -> Path:
    dest = tmp / "framework"
    ignore = shutil.ignore_patterns("*.zip", "__pycache__", ".git")
    shutil.copytree(root, dest, ignore=ignore)
    return dest


def test_framework_doctor_pass(root: Path) -> None:
    out = run([sys.executable, "tools/framework_doctor.py", "."], root).stdout
    assert "framework-doctor: PASS" in out


def test_framework_doctor_negative(root: Path, tmp: Path) -> None:
    fw = copy_framework(root, tmp)
    # Inject a stale install ref; doctor must fail.
    install = fw / "install" / "README-install.md"
    install.write_text(install.read_text(encoding="utf-8") + "\nsuper-skills-v4.2\n", encoding="utf-8")
    out = run([sys.executable, "tools/framework_doctor.py", "."], fw, expect=1).stdout
    assert "stale reference" in out


def build_sample_project(tmp: Path) -> Path:
    project = tmp / "project"
    kb = project / "docs" / "superskills"
    (kb / "adrs").mkdir(parents=True)
    (kb / "specs").mkdir()
    (kb / "plans").mkdir()
    (kb / "CONTEXT.md").write_text(
        "# Context\n\n"
        "## Synonyms / Alias Map\n\n"
        "auth: authentication, token, session, credential, renewal\n"
        "release: deploy, rollout, enable traffic\n",
        encoding="utf-8",
    )
    (kb / "adrs" / "ADR-001-auth-renewal.md").write_text(
        "# ADR-001 Auth Session Credential Renewal\n\n"
        "VOLATILITY: WATCHFUL\n"
        "LAST CONFIRMED: 2025-01-01\n\n"
        "CLAIM: Auth session credential renewal handles expired tokens.\n"
        "EVIDENCE: T2 — reviewed CI artifact from prior release.\n"
        "SOURCE: old-ci-run-123\n"
        "SCOPE: mocked provider only.\n"
        "RESIDUAL RISK: live provider behavior is ASSUMED.\n",
        encoding="utf-8",
    )
    (kb / "qbr-calibration.md").write_text("# QBR Calibration\n\n2025-01-01 predicted severity vs actual outcome\n", encoding="utf-8")
    return project


def test_kb_index_and_staleness(root: Path, tmp: Path) -> None:
    project = build_sample_project(tmp)
    out = run([sys.executable, str(root / "tools" / "build_kb_index.py"), str(project)], project).stdout
    assert "wrote" in out
    index = project / "docs" / "superskills" / "kb-index.md"
    txt = index.read_text(encoding="utf-8")
    assert "token" in txt.lower() or "credential" in txt.lower()
    assert "ADR-001" in txt

    # Use a deterministic date so the stale ADR must be flagged.
    out = run([sys.executable, str(root / "tools" / "epistemic_health_check.py"), str(project), "--today", "2026-06-09"], project, expect=1).stdout
    assert "Status: FAIL" in out or "Status: WARN" in out
    assert "ADR_STALE" in out
    assert "UNRESOLVED_ASSUMPTION" in out




def test_epistemic_cadence(root: Path, tmp: Path) -> None:
    project = tmp / "cadence-project"
    kb = project / "docs" / "superskills"
    kb.mkdir(parents=True)
    # Seed state directly so the fixture checks cadence enforcement deterministically
    # without depending on agent memory or multiple prior subprocess invocations.
    (kb / ".epistemic-health-state.json").write_text(
        '{"schema_version": 1, "cycles_since_health_check": 5, "last_health_check": null, "last_cycle_recorded": "2026-06-09"}\n',
        encoding="utf-8",
    )
    out = run([sys.executable, str(root / "tools" / "epistemic_health_check.py"), str(project), "--today", "2026-06-09"], project).stdout
    assert "CADENCE_DUE" in out
    out = run([sys.executable, str(root / "tools" / "epistemic_health_check.py"), str(project), "--today", "2026-06-09", "--record-run"], project).stdout
    assert "cycles_since_health_check=0" in out

def test_fixture_manifests(root: Path) -> None:
    fixtures = root / "framework-tests" / "fixtures"
    expected = {"readme-stub", "comment-lies", "pattern-bug", "spec-conflict", "kb-alias", "long-session", "privacy-secrets"}
    found = {p.name for p in fixtures.iterdir() if p.is_dir()}
    missing = expected - found
    assert not missing, f"missing fixtures: {sorted(missing)}"
    for name in expected:
        text = (fixtures / name / "fixture.md").read_text(encoding="utf-8")
        assert "Expected:" in text


def main() -> int:
    root = Path(sys.argv[1] if len(sys.argv) > 1 else ".").resolve()
    tests = [
        ("framework_doctor_pass", lambda tmp: test_framework_doctor_pass(root)),
        ("framework_doctor_negative", lambda tmp: test_framework_doctor_negative(root, tmp)),
        ("kb_index_and_staleness", lambda tmp: test_kb_index_and_staleness(root, tmp)),
        ("epistemic_cadence", lambda tmp: test_epistemic_cadence(root, tmp)),
        ("fixture_manifests", lambda tmp: test_fixture_manifests(root)),
    ]
    passed = 0
    with tempfile.TemporaryDirectory(prefix="superskills-fixtures-") as td:
        tmp = Path(td)
        for name, fn in tests:
            print(f"RUN {name}")
            fn(tmp)
            print(f"PASS {name}")
            passed += 1
    print(f"framework-fixtures: PASS ({passed}/{len(tests)})")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
