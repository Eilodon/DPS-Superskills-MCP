#!/usr/bin/env python3
"""Self-audit DPS Super Skills without changing its existing package format.

v5.2 expands coverage from hygiene checks to automation readiness:
- framework scripts compile;
- executable fixture runner is present;
- release gate docs reference staleness and KB-index automation;
- registry references are checked more broadly while allowing documented deprecations.
"""
from __future__ import annotations

import ast
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(sys.argv[1] if len(sys.argv) > 1 else ".").resolve()
errors: list[str] = []
warnings: list[str] = []

SKILL_REF_RE = re.compile(r"`([a-z0-9][a-z0-9-]+)`")
DEPRECATED_SKILL_REFS = {"finishing-a-development-branch"}
ALLOW_REFS = {
    "docs-superskills", "super-skills", "dps-v5", "readme", "contribute",
    "agentmemory", "mcp", "todo", "claude", "codex", "gemini", "python3",
    "skill-init", "dps", "task", "none", "git", "github", "openapi", "json-schema",
    "general-purpose", "design-review", "architecture-change", "dependency-change",
    "fix-path-owner", "async-no-await", "missing-null-guard", "kb-index",
}
REQUIRED_SHARED = [
    "shared/claim-grammar.md",
    "shared/gotcha-schema.md",
    "shared/subagent-evidence.md",
    "shared/epistemic-health.md",
    "shared/pattern-debt-schema.md",
    "shared/tool-compatibility.md",
]
REQUIRED_TOOLS = [
    "tools/framework_doctor.py",
    "tools/build_kb_index.py",
    "tools/epistemic_health_check.py",
    "tools/run_framework_fixtures.py",
]
REQUIRED_FIXTURES = {"readme-stub", "comment-lies", "pattern-bug", "spec-conflict", "kb-alias", "long-session", "privacy-secrets"}
REQUIRED_QUICKSTARTS = {"quickstarts/solo-c1.md", "quickstarts/team-c2.md", "quickstarts/high-assurance-c4.md", "quickstarts/cheatsheet.md"}


def err(msg: str) -> None:
    errors.append(msg)


def warn(msg: str) -> None:
    warnings.append(msg)


def read(path: Path) -> str:
    return path.read_text(encoding="utf-8", errors="replace")


def rel(path: Path) -> str:
    try:
        return str(path.relative_to(ROOT))
    except ValueError:
        return str(path)


def parse_frontmatter(path: Path) -> dict[str, str]:
    text = read(path)
    m = re.match(r"^---\n(.*?)\n---\n", text, re.S)
    if not m:
        err(f"missing frontmatter: {rel(path)}")
        return {}
    raw = m.group(1)
    # Prefer PyYAML when present; fall back to strict simple parser.
    try:
        import yaml  # type: ignore
        data = yaml.safe_load(raw) or {}
        if not isinstance(data, dict):
            err(f"frontmatter is not a mapping: {rel(path)}")
            return {}
        data = {str(k): str(v) for k, v in data.items()}
    except Exception:
        data: dict[str, str] = {}
        for line in raw.splitlines():
            if not line.strip():
                continue
            if ":" not in line:
                err(f"invalid frontmatter line in {rel(path)}: {line}")
                continue
            key, value = line.split(":", 1)
            key = key.strip()
            value = value.strip().strip('"').strip("'")
            data[key] = value
    if set(data) != {"name", "description"}:
        err(f"frontmatter must contain only name + description: {rel(path)} -> {sorted(data)}")
    if "name" in data and data["name"] != path.parent.name:
        err(f"frontmatter name mismatch: {rel(path)} name={data['name']} folder={path.parent.name}")
    if not data.get("description"):
        err(f"empty description: {rel(path)}")
    return data


def check_skills() -> tuple[list[Path], set[str]]:
    skill_files = sorted(ROOT.glob("*/SKILL.md"))
    skill_dirs = {p.parent.name for p in skill_files}
    for path in skill_files:
        data = parse_frontmatter(path)
        nanos = list(path.parent.glob("*.nano.md"))
        if len(nanos) != 1:
            err(f"expected exactly one nano file in {rel(path.parent)}, found {len(nanos)}")
        elif data.get("name") and not nanos[0].name.startswith(data["name"]):
            err(f"nano file name should start with skill name in {rel(path.parent)}: {nanos[0].name}")
    return skill_files, skill_dirs


def check_readme(skill_files: list[Path], skill_dirs: set[str]) -> None:
    readme = ROOT / "README.md"
    if not readme.exists():
        err("missing README.md")
        return
    txt = read(readme)
    m = re.search(r"##\s+(\d+)\s+Skills", txt)
    if not m:
        err("README missing '## N Skills' heading")
    elif int(m.group(1)) != len(skill_files):
        err(f"README count {m.group(1)} != actual SKILL.md count {len(skill_files)}")
    for skill in sorted(skill_dirs):
        if f"`{skill}`" not in txt:
            warn(f"README does not mention skill `{skill}`")
    if "v5.2" not in txt and len(skill_files) >= 30:
        warn("README may not reflect v5.2 automation release")


def check_stale_refs() -> None:
    stale_patterns = ["super-skills-v4.2", "19 skills"]
    paths = list((ROOT / "install").glob("*.md")) + [ROOT / "README.md"]
    for path in paths:
        if not path.exists():
            continue
        txt = read(path)
        for pat in stale_patterns:
            if pat in txt:
                err(f"stale reference '{pat}' in {rel(path)}")


def check_skill_refs(skill_dirs: set[str]) -> None:
    # Check high-signal docs broadly. Deprecated skill references are allowed only when explicitly negated.
    docs = [ROOT / "README.md", ROOT / "using-super-skills" / "SKILL.md"]
    docs += list((ROOT / "install").glob("*.md"))
    docs += list(ROOT.glob("*/SKILL.md"))
    for path in docs:
        if not path.exists():
            continue
        txt = read(path)
        for ref in SKILL_REF_RE.findall(txt):
            if ref in skill_dirs or ref in ALLOW_REFS:
                continue
            if ref in DEPRECATED_SKILL_REFS:
                # Require explicit NOT/never/deprecated context nearby.
                idx = txt.find(f"`{ref}`")
                nearby = txt[max(0, idx - 80): idx + 120].lower()
                if any(word in nearby for word in ["not", "never", "replaces", "deprecated"]):
                    continue
                err(f"deprecated skill `{ref}` referenced without negation in {rel(path)}")
                continue
            # Backticked slugs that look like skill names and appear in control prose are suspicious.
            if "-" in ref and not ref.endswith("-owner"):
                warn(f"unknown backticked slug `{ref}` in {rel(path)}")


def check_shell_traps() -> None:
    for path in ROOT.rglob("*.md"):
        txt = read(path)
        if re.search(r"\|\|\s*echo[^\n]*&&\s*exit", txt):
            err(f"shell precedence trap in {rel(path)}")



def check_legacy_gotchas() -> None:
    legacy = re.compile(r"^- \[20\d{2}-\d{2}\].*\|.*\|", re.M)
    for path in ROOT.glob("*/SKILL.md"):
        if legacy.search(read(path)):
            err(f"legacy free-form Gotcha entry found; migrate to schema: {rel(path)}")


def check_quickstarts_and_privacy(skill_dirs: set[str]) -> None:
    for rel_path in REQUIRED_QUICKSTARTS:
        path = ROOT / rel_path
        if not path.exists():
            err(f"missing quickstart: {rel_path}")
            continue
        txt = read(path)
        if "CLAIM:" not in txt and "Completion grammar" not in txt:
            warn(f"quickstart may not show claim grammar: {rel_path}")
    if "privacy-secrets-gate" not in skill_dirs:
        err("missing privacy-secrets-gate skill")
    required_mentions = {
        "README.md": "privacy-secrets-gate",
        "complexity-gate/SKILL.md": "privacy-secrets-gate",
        "using-super-skills/SKILL.md": "privacy-secrets-gate",
        "release-readiness/SKILL.md": "privacy-secrets-gate",
        "specialist-review/SKILL.md": "PRIVACY/SECRETS",
    }
    for rel_path, needle in required_mentions.items():
        path = ROOT / rel_path
        if not path.exists() or needle not in read(path):
            err(f"missing privacy/secrets integration mention `{needle}` in {rel_path}")


def check_epistemic_cadence_support() -> None:
    path = ROOT / "tools" / "epistemic_health_check.py"
    if not path.exists():
        return
    txt = read(path)
    for needle in ["--record-cycle", "--record-run", ".epistemic-health-state.json"]:
        if needle not in txt:
            err(f"epistemic health tool missing cadence support: {needle}")


def check_shared_and_tools() -> None:
    for path in REQUIRED_SHARED + REQUIRED_TOOLS:
        if not (ROOT / path).exists():
            err(f"missing required file: {path}")
    for path in REQUIRED_TOOLS:
        p = ROOT / path
        if not p.exists():
            continue
        try:
            ast.parse(read(p), filename=str(p))
        except SyntaxError as exc:
            err(f"python syntax error in {path}: {exc}")


def check_dps_help() -> None:
    script = ROOT / "dps-tools" / "dps.py"
    if not script.exists():
        err("missing dps-tools/dps.py")
        return
    try:
        subprocess.run([sys.executable, str(script), "--help"], cwd=str(ROOT), check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, timeout=10)
    except Exception as exc:
        err(f"dps.py --help failed: {exc}")


def check_framework_tests() -> None:
    fixture_root = ROOT / "framework-tests" / "fixtures"
    if not fixture_root.exists():
        err("missing framework-tests/fixtures")
        return
    found = {p.name for p in fixture_root.iterdir() if p.is_dir()}
    missing = REQUIRED_FIXTURES - found
    if missing:
        err(f"missing framework fixtures: {sorted(missing)}")
    for name in found & REQUIRED_FIXTURES:
        manifest = fixture_root / name / "fixture.md"
        if not manifest.exists():
            err(f"missing fixture manifest: {rel(manifest)}")
        elif "Expected:" not in read(manifest):
            err(f"fixture missing Expected section: {rel(manifest)}")


def check_release_docs() -> None:
    required_mentions = {
        "using-super-skills/SKILL.md": ["complexity-gate", "epistemic-health-check"],
        "kb-query/SKILL.md": ["build_kb_index.py", "kb-index.md"],
        "framework-doctor/SKILL.md": ["run_framework_fixtures.py", "epistemic_health_check.py"],
        "knowledge-compound/SKILL.md": ["epistemic_health_check.py"],
    }
    for rel_path, needles in required_mentions.items():
        path = ROOT / rel_path
        if not path.exists():
            err(f"missing release doc: {rel_path}")
            continue
        txt = read(path)
        for needle in needles:
            if needle not in txt:
                warn(f"{rel_path} does not mention {needle}")


def main() -> int:
    skill_files, skill_dirs = check_skills()
    check_readme(skill_files, skill_dirs)
    check_stale_refs()
    check_skill_refs(skill_dirs)
    check_shell_traps()
    check_shared_and_tools()
    check_dps_help()
    check_framework_tests()
    check_quickstarts_and_privacy(skill_dirs)
    check_epistemic_cadence_support()
    check_release_docs()

    print(f"Skills: {len(skill_files)}")
    print(f"Warnings: {len(warnings)}")
    for w in warnings:
        print(f"WARN: {w}")
    if errors:
        print(f"Errors: {len(errors)}")
        for e in errors:
            print(f"ERROR: {e}")
        sys.exit(1)
    print("framework-doctor: PASS")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
