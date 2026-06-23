#!/usr/bin/env python3
"""Detect stale Super Skills knowledge in docs/superskills.

v5.2.1 adds cadence state so "after 5+ cycles" is enforceable without
relying only on agent memory. Standard library only.
"""
from __future__ import annotations

import argparse
import datetime as dt
import json
import re
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Any

DATE_RE = re.compile(r"(20\d{2}-\d{2}-\d{2})")
VOL_RE = re.compile(r"VOLATILITY\s*:\s*([A-Z_-]+)", re.I)
LAST_RE = re.compile(r"LAST\s+CONFIRMED\s*:\s*(20\d{2}-\d{2}-\d{2}|TBD|UNKNOWN|N/A)", re.I)
STATUS_RE = re.compile(r"status\s*:\s*(ACTIVE|WATCH|INACTIVE|RETIRED)", re.I)
LAST_SEEN_RE = re.compile(r"last_seen\s*:\s*(20\d{2}-\d{2}-\d{2}|TBD|UNKNOWN|N/A)", re.I)
RETIRE_RE = re.compile(r"retire_if\s*:\s*(.+)", re.I)
ASSUMED_RE = re.compile(r"\b(ASSUMED|T4)\b", re.I)
QBR_RE = re.compile(r"\b(QBR|M\.AT|calibration|predicted severity|actual outcome)\b", re.I)
LEGACY_GOTCHA_RE = re.compile(r"^- \[20\d{2}-\d{2}\].*\|.*\|", re.M)

WINDOWS = {
    "VOLATILE": 30,
    "WATCHFUL": 90,
    "STABLE": 180,
    "UNKNOWN": 120,
}

STATE_VERSION = 1
STATE_FILE = ".epistemic-health-state.json"

@dataclass
class Finding:
    severity: str
    kind: str
    path: str
    detail: str


def parse_date(value: str | None) -> dt.date | None:
    if not value:
        return None
    m = DATE_RE.search(value)
    if not m:
        return None
    try:
        return dt.date.fromisoformat(m.group(1))
    except ValueError:
        return None


def rel(path: Path, root: Path) -> str:
    try:
        return str(path.relative_to(root))
    except ValueError:
        return str(path)


def read(path: Path) -> str:
    return path.read_text(encoding="utf-8", errors="replace")


def default_state() -> dict[str, Any]:
    return {
        "schema_version": STATE_VERSION,
        "cycles_since_health_check": 0,
        "last_health_check": None,
        "last_cycle_recorded": None,
    }


def load_state(path: Path) -> dict[str, Any]:
    if not path.exists():
        return default_state()
    try:
        data = json.loads(read(path))
    except Exception:
        data = default_state()
        data["state_parse_error"] = True
        return data
    if not isinstance(data, dict):
        return default_state()
    state = default_state()
    state.update(data)
    return state


def save_state(path: Path, state: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(state, indent=2, sort_keys=True) + "\n", encoding="utf-8")


def get_state_path(root: Path, kb: Path, override: str | None) -> Path:
    if override:
        return Path(override).expanduser().resolve()
    return kb / STATE_FILE


def check_adrs(root: Path, kb: Path, today: dt.date) -> list[Finding]:
    findings: list[Finding] = []
    adr_paths: list[Path] = []
    adr_paths.extend(sorted((kb / "adrs").glob("*.md")))
    dps_adr = kb / "DPS_v5" / "ADR.md"
    if dps_adr.exists():
        adr_paths.append(dps_adr)

    for path in adr_paths:
        text = read(path)
        vol_m = VOL_RE.search(text)
        last_m = LAST_RE.search(text)
        volatility = (vol_m.group(1).upper() if vol_m else "UNKNOWN")
        last = parse_date(last_m.group(1) if last_m else None)
        window = WINDOWS.get(volatility, WINDOWS["UNKNOWN"])
        if not last:
            findings.append(Finding("WARN", "ADR_STALE", rel(path, root), f"missing/unknown LAST CONFIRMED; volatility={volatility}"))
            continue
        age = (today - last).days
        if age > window:
            sev = "FAIL" if volatility in {"VOLATILE", "WATCHFUL"} else "WARN"
            findings.append(Finding(sev, "ADR_STALE", rel(path, root), f"LAST CONFIRMED {last.isoformat()} is {age}d old; volatility={volatility}; window={window}d"))
    return findings


def check_assumptions(root: Path, kb: Path) -> list[Finding]:
    findings: list[Finding] = []
    for path in sorted(kb.rglob("*.md")):
        if path.name == STATE_FILE:
            continue
        text = read(path)
        for i, line in enumerate(text.splitlines(), 1):
            if ASSUMED_RE.search(line):
                findings.append(Finding("WARN", "UNRESOLVED_ASSUMPTION", rel(path, root), f"line {i}: {line.strip()[:180]}"))
    return findings


def check_gotchas(root: Path, today: dt.date) -> list[Finding]:
    findings: list[Finding] = []
    for path in sorted(root.glob("*/SKILL.md")):
        text = read(path)
        if "Gotchas" not in text:
            continue
        if LEGACY_GOTCHA_RE.search(text):
            findings.append(Finding("WARN", "GOTCHA_SCHEMA", rel(path, root), "legacy free-form Gotcha entry found; migrate to shared/gotcha-schema.md"))
        for m in STATUS_RE.finditer(text):
            block_start = max(0, m.start() - 500)
            block_end = min(len(text), m.end() + 1200)
            block = text[block_start:block_end]
            status = m.group(1).upper()
            last_m = LAST_SEEN_RE.search(block)
            retire_m = RETIRE_RE.search(block)
            last = parse_date(last_m.group(1) if last_m else None)
            if status in {"ACTIVE", "WATCH"} and not last:
                findings.append(Finding("WARN", "GOTCHA_STALE", rel(path, root), f"{status} Gotcha missing usable last_seen"))
            elif status in {"ACTIVE", "WATCH"} and last:
                age = (today - last).days
                if age > 180 and retire_m:
                    findings.append(Finding("WARN", "GOTCHA_STALE", rel(path, root), f"{status} Gotcha last_seen {last.isoformat()} is {age}d old; retire_if={retire_m.group(1).strip()[:120]}"))
    return findings


def check_qbr(root: Path, kb: Path, today: dt.date) -> list[Finding]:
    findings: list[Finding] = []
    qbr = kb / "qbr-calibration.md"
    if not qbr.exists():
        findings.append(Finding("WARN", "CALIBRATION", rel(qbr, root), "missing qbr-calibration.md; seed it after skill-init if risk scoring is used"))
        return findings
    text = read(qbr)
    dates = [parse_date(m.group(1)) for m in DATE_RE.finditer(text)]
    dates = [d for d in dates if d]
    if not dates:
        findings.append(Finding("WARN", "CALIBRATION", rel(qbr, root), "no dated calibration entries"))
        return findings
    latest = max(dates)
    age = (today - latest).days
    if age > 120 and QBR_RE.search(text):
        findings.append(Finding("WARN", "CALIBRATION", rel(qbr, root), f"latest calibration date {latest.isoformat()} is {age}d old"))
    return findings


def check_framework_docs(root: Path) -> list[Finding]:
    findings: list[Finding] = []
    stale_patterns = ["super-skills-v4.2", "19 skills"]
    for path in [root / "README.md", *sorted((root / "install").glob("*.md"))]:
        if not path.exists():
            continue
        text = read(path)
        for pat in stale_patterns:
            if pat in text:
                findings.append(Finding("FAIL", "FRAMEWORK_DOC_DRIFT", rel(path, root), f"stale reference: {pat}"))
    return findings


def check_cadence(root: Path, state_path: Path, state: dict[str, Any], today: dt.date, cycle_threshold: int, max_days: int) -> list[Finding]:
    findings: list[Finding] = []
    if state.get("state_parse_error"):
        findings.append(Finding("WARN", "CADENCE", rel(state_path, root), "state file could not be parsed; cadence may be unreliable"))
    cycles = int(state.get("cycles_since_health_check") or 0)
    if cycles >= cycle_threshold:
        findings.append(Finding("WARN", "CADENCE_DUE", rel(state_path, root), f"{cycles} cycles since last recorded health check; threshold={cycle_threshold}"))
    last = parse_date(str(state.get("last_health_check") or ""))
    if last:
        age = (today - last).days
        if age > max_days:
            findings.append(Finding("WARN", "CADENCE_DUE", rel(state_path, root), f"last health check {last.isoformat()} is {age}d old; max={max_days}d"))
    elif state_path.exists() or cycles:
        findings.append(Finding("WARN", "CADENCE", rel(state_path, root), "no last_health_check recorded"))
    return findings


def main() -> int:
    ap = argparse.ArgumentParser(description="Check Super Skills KB evidence staleness")
    ap.add_argument("root", nargs="?", default=".", help="project/framework root")
    ap.add_argument("--today", default=None, help="override date YYYY-MM-DD for tests")
    ap.add_argument("--strict", action="store_true", help="exit non-zero on WARN as well as FAIL")
    ap.add_argument("--record-cycle", action="store_true", help="increment persistent cycle counter after a knowledge/ADR cycle")
    ap.add_argument("--record-run", action="store_true", help="record this run as a completed epistemic health check and reset cycle counter")
    ap.add_argument("--cycle-threshold", type=int, default=5, help="warn when cycles since health check reaches this number")
    ap.add_argument("--max-days-since-run", type=int, default=30, help="warn when last recorded health check is older than this many days")
    ap.add_argument("--state-file", default=None, help="override cadence state file path")
    args = ap.parse_args()

    root = Path(args.root).resolve()
    today = dt.date.fromisoformat(args.today) if args.today else dt.date.today()
    kb = root / "docs" / "superskills"
    state_path = get_state_path(root, kb, args.state_file)
    state = load_state(state_path)

    if args.record_cycle:
        state["cycles_since_health_check"] = int(state.get("cycles_since_health_check") or 0) + 1
        state["last_cycle_recorded"] = today.isoformat()
        save_state(state_path, state)

    if args.record_run:
        state["cycles_since_health_check"] = 0
        state["last_health_check"] = today.isoformat()
        save_state(state_path, state)

    findings: list[Finding] = []
    if kb.exists():
        findings.extend(check_adrs(root, kb, today))
        findings.extend(check_assumptions(root, kb))
        findings.extend(check_qbr(root, kb, today))
        findings.extend(check_cadence(root, state_path, state, today, args.cycle_threshold, args.max_days_since_run))
    else:
        if (root / "README.md").exists() and any(root.glob("*/SKILL.md")):
            findings.extend(check_framework_docs(root))
        if args.record_cycle or args.record_run or state_path.exists():
            findings.extend(check_cadence(root, state_path, state, today, args.cycle_threshold, args.max_days_since_run))

    findings.extend(check_gotchas(root, today))
    findings.extend(check_framework_docs(root))

    fail_count = sum(1 for f in findings if f.severity == "FAIL")
    warn_count = sum(1 for f in findings if f.severity == "WARN")
    status = "FAIL" if fail_count else ("WARN" if warn_count else "PASS")

    print("EPISTEMIC HEALTH")
    print(f"Status: {status}")
    if kb.exists():
        print(f"KB: {rel(kb, root)}")
    else:
        print("KB: docs/superskills not found; project KB checks skipped")
    print(f"Cadence: cycles_since_health_check={state.get('cycles_since_health_check', 0)}, last_health_check={state.get('last_health_check') or 'none'}")
    print(f"Findings: fail={fail_count}, warn={warn_count}")
    for f in findings:
        print(f"{f.severity}: {f.kind}: {f.path}: {f.detail}")

    if fail_count or (args.strict and warn_count):
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
