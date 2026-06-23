#!/usr/bin/env python3
"""DPS sync/check/lint tool.

Canonical inputs:
- README.md
- CONTRACTS.md
- BLUEPRINT.md
- ADR.md

Generated outputs:
- DPS_INDEX.yml
- .agent/*.md
- .dps/DPS_LOCK.yml

Usage:
  ./tools/dps.py sync
  ./tools/dps.py check
  ./tools/dps.py lint --strict
  ./tools/dps.py doctor
"""
from __future__ import annotations

import argparse
import difflib
import hashlib
import json
import os
import re
import sys
import tempfile
from dataclasses import dataclass, field
from datetime import date, datetime, timedelta
from pathlib import Path
from typing import Dict, Iterable, List, Optional, Sequence, Tuple

TOOL_VERSION = "dps-tools-v1.1-audit-sync"
TOOL_COMMAND = "./tools/dps.py"
CANONICAL_FILES = ["README.md", "CONTRACTS.md", "BLUEPRINT.md", "ADR.md"]
GENERATED_FILES = [
    "DPS_INDEX.yml",
    ".agent/AGENTS.md",
    ".agent/CONTEXT.md",
    ".agent/INVARIANTS.md",
    ".agent/STACK.md",
    ".agent/TASKS.md",
    ".agent/REVIEW_CHECKS.md",
    ".dps/DPS_LOCK.yml",
]
IMPLEMENTATION_READY_STATUSES = {"APPROVED-SSOT", "IMPLEMENTATION-ACTIVE", "LIVING-SPEC"}
VALID_STATUSES = {"DRAFT", "PROOF-READY", "APPROVED-SSOT", "IMPLEMENTATION-ACTIVE", "LIVING-SPEC", "SUPERSEDED"}


@dataclass
class Metadata:
    version: str = "5.0-template"
    profile: str = "DPS-Standard"
    status: str = "DRAFT"
    promoted_by: str = "{{WHO}}"
    promoted_at: str = "{{YYYY-MM-DD}}"
    promotion_basis: str = "{{review / stress-test / spike / audit / validation evidence}}"
    current_authority: str = "DPS"


@dataclass
class Entity:
    id: str
    title: str
    source: str
    anchor: str = ""
    extra: Dict[str, str] = field(default_factory=dict)



@dataclass
class TaskItem:
    id: str
    description: str
    depends_on: str = ""


@dataclass
class Phase:
    label: str
    tasks: List[TaskItem] = field(default_factory=list)
    gate: str = ""

@dataclass
class DPSModel:
    meta: Metadata
    schemas: List[Entity]
    invariants: List[Entity]
    components: List[Entity]
    dependencies: List[Entity]
    external_contracts: List[Entity]
    adrs: List[Entity]
    trace_rows: List[List[str]]
    intent: Dict[str, str]
    build_phases: List[Phase]
    mode_routes: List[Tuple[str, str]]
    smell_indicators: List[str]
    raw_hashes: Dict[str, str]


def read_text(root: Path, rel: str) -> str:
    p = root / rel
    if not p.exists():
        raise FileNotFoundError(f"Missing required file: {rel}")
    return p.read_text(encoding="utf-8")


def write_text(root: Path, rel: str, content: str) -> None:
    p = root / rel
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(content, encoding="utf-8", newline="\n")


def sha256_text(text: str) -> str:
    return "sha256:" + hashlib.sha256(text.encode("utf-8")).hexdigest()


def is_placeholder(value: str) -> bool:
    return "{{" in value or "}}" in value or value.strip() in {"", "—", "-", "📝"}


def clean_inline_md(value: str) -> str:
    value = value.strip()
    value = re.sub(r"`([^`]*)`", r"\1", value)
    value = re.sub(r"\*\*([^*]*)\*\*", r"\1", value)
    value = value.replace("✅", "").replace("🟡", "").replace("❌", "").replace("🔄", "").replace("⏸️", "")
    return value.strip()


def slugify(text: str) -> str:
    text = clean_inline_md(text).lower()
    text = re.sub(r"<[^>]+>", "", text)
    text = re.sub(r"[^a-z0-9\s-]", "", text)
    text = re.sub(r"\s+", "-", text).strip("-")
    return text or "section"


def extract_meta_from(text: str) -> Metadata:
    meta = Metadata()
    patterns = {
        "version": r"\*\*DPS VERSION:\*\*\s*`?([^`\n]+)`?",
        "profile": r"\*\*DPS PROFILE:\*\*\s*`?([^`\n]+)`?",
        "status": r"\*\*DPS STATUS:\*\*\s*`?([^`\n]+)`?",
        "promoted_by": r"\*\*PROMOTED BY:\*\*\s*([^·\n]+)",
        "promoted_at": r"\*\*PROMOTED AT:\*\*\s*([^\n]+)",
        "promotion_basis": r"\*\*PROMOTION BASIS:\*\*\s*([^\n]+)",
        "current_authority": r"\*\*CURRENT AUTHORITY:\*\*\s*`?([^`\n]+)`?",
    }
    for field_name, pattern in patterns.items():
        m = re.search(pattern, text, re.IGNORECASE)
        if m:
            value = clean_inline_md(m.group(1))
            if field_name == "promoted_at":
                value = value.split(" ")[0].strip()
            setattr(meta, field_name, value)
    return meta



def merge_metadata(texts: Dict[str, str]) -> Tuple[Metadata, List[str]]:
    metas = {name: extract_meta_from(text) for name, text in texts.items()}
    base = metas["README.md"]
    problems: List[str] = []
    # Header metadata must remain aligned across all four canonical files.
    # Audit fix F6: promoted_by / promoted_at / promotion_basis are now included,
    # not only version/profile/status/current_authority.
    for attr in ["version", "profile", "status", "current_authority", "promoted_by", "promoted_at", "promotion_basis"]:
        values = {name: getattr(meta, attr) for name, meta in metas.items()}
        unique = set(values.values())
        if len(unique) > 1:
            problems.append(f"metadata drift: {attr} differs across canonical files: {values}")
    if base.status not in VALID_STATUSES:
        problems.append(f"invalid DPS status: {base.status}")
    if not is_placeholder(base.promoted_by) or not is_placeholder(base.promoted_at):
        for name, meta in metas.items():
            if name == "README.md":
                continue
            if is_placeholder(meta.promoted_by) or is_placeholder(meta.promoted_at):
                problems.append(f"promotion metadata drift: README is promoted but {name} still has placeholder promoted_by/promoted_at")
    return base, problems

def section_between(text: str, start_pattern: str, end_pattern: Optional[str] = None) -> str:
    m = re.search(start_pattern, text, re.IGNORECASE | re.MULTILINE)
    if not m:
        return ""
    start = m.end()
    if end_pattern:
        n = re.search(end_pattern, text[start:], re.IGNORECASE | re.MULTILINE)
        if n:
            return text[start : start + n.start()]
    n = re.search(r"^##\s+", text[start:], re.MULTILINE)
    if n:
        return text[start : start + n.start()]
    return text[start:]


def parse_table_rows(section: str) -> List[List[str]]:
    rows: List[List[str]] = []
    for raw in section.splitlines():
        line = raw.strip()
        if not (line.startswith("|") and line.endswith("|")):
            continue
        cells = [clean_inline_md(c.strip()) for c in line.strip("|").split("|")]
        if not cells:
            continue
        joined = " ".join(cells)
        if set(joined.replace(" ", "")) <= {"-", ":"}:
            continue
        if any(c.lower() in {"component", "file/module", "invariant", "dependency", "adr"} for c in cells[:1]):
            continue
        rows.append(cells)
    return rows


def parse_explicit_markers(text: str, source: str) -> Dict[str, List[Entity]]:
    result: Dict[str, List[Entity]] = {
        "schemas": [],
        "invariants": [],
        "components": [],
        "dependencies": [],
        "external_contracts": [],
        "adrs": [],
    }
    marker_re = re.compile(r"<!--\s*dps:id=([^\s]+)\s*-->(?P<near>(?:.|\n){0,600})", re.IGNORECASE)
    for match in marker_re.finditer(text):
        entity_id = match.group(1).strip()
        near = match.group("near")
        type_match = re.search(r"<!--\s*dps:type=([^\s]+)\s*-->", near, re.IGNORECASE)
        explicit_type = type_match.group(1).strip().lower() if type_match else ""
        heading_before = text[: match.start()].splitlines()[-8:]
        title = entity_id
        for line in reversed(heading_before):
            hm = re.match(r"^#{2,6}\s+(.+)$", line.strip())
            if hm:
                title = clean_inline_md(hm.group(1))
                break
        anchor = slugify(title)
        if entity_id.startswith("schema.") or explicit_type == "schema":
            result["schemas"].append(Entity(entity_id, title, source, anchor))
        elif entity_id.startswith("invariant.") or explicit_type == "invariant":
            result["invariants"].append(Entity(entity_id, title, source, anchor))
        elif entity_id.startswith("component.") or explicit_type == "component":
            result["components"].append(Entity(entity_id, title, source, anchor))
        elif entity_id.startswith("dependency.") or explicit_type == "dependency":
            result["dependencies"].append(Entity(entity_id, title, source, anchor))
        elif entity_id.startswith("external.") or explicit_type == "external_contract":
            result["external_contracts"].append(Entity(entity_id, title, source, anchor))
        elif entity_id.startswith("ADR-") or explicit_type == "adr":
            result["adrs"].append(Entity(entity_id, title, source, anchor))
    return result


def parse_schemas(contracts: str) -> List[Entity]:
    explicit = parse_explicit_markers(contracts, "CONTRACTS.md")["schemas"]
    if explicit:
        return unique_entities(explicit)
    sec = section_between(contracts, r"^##\s+3\.\s+CORE SCHEMAS\s*$", r"^##\s+4\.")
    entities: List[Entity] = []
    for m in re.finditer(r"^###\s+(.+)$", sec, re.MULTILINE):
        title = clean_inline_md(m.group(1))
        if is_placeholder(title) or "SYSTEM INVARIANT" in title.upper():
            continue
        entities.append(Entity(f"schema.{title}", title, "CONTRACTS.md", slugify(title)))
    return unique_entities(entities)



def first_field_line(block: str, label: str) -> str:
    m = re.search(rf"^{re.escape(label)}\s*:\s*(.+)$", block, re.MULTILINE | re.IGNORECASE)
    if not m:
        return ""
    return clean_inline_md(m.group(1))


def parse_invariants(contracts: str) -> List[Entity]:
    explicit = parse_explicit_markers(contracts, "CONTRACTS.md")["invariants"]
    if explicit:
        return unique_entities(explicit)
    sec = section_between(contracts, r"^##\s+3\.X\.\s+SYSTEM INVARIANTS\s*$", r"^##\s+4\.")
    entities: List[Entity] = []
    for m in re.finditer(r"^###\s+(.+)$", sec, re.MULTILINE):
        title = clean_inline_md(m.group(1))
        if is_placeholder(title):
            continue
        block = sec[m.end() :]
        next_h = re.search(r"^###\s+", block, re.MULTILINE)
        if next_h:
            block = block[: next_h.start()]
        enforce = first_field_line(block, "ENFORCE BY")
        scope = first_field_line(block, "SCOPE")
        test = first_field_line(block, "TEST REQUIRED")
        entities.append(
            Entity(
                f"invariant.{slugify(title).replace('-', '_')}",
                title,
                "CONTRACTS.md",
                slugify(title),
                {"enforce_by": enforce, "scope": scope, "test": test},
            )
        )
    return unique_entities(entities)


def parse_external_contracts(contracts: str) -> List[Entity]:
    explicit = parse_explicit_markers(contracts, "CONTRACTS.md")["external_contracts"]
    if explicit:
        return unique_entities(explicit)
    sec = section_between(contracts, r"^##\s+6\.\s+EXTERNAL CONTRACTS\s*$", r"^##\s+7\.")
    entities: List[Entity] = []
    for m in re.finditer(r"^###\s+(.+)$", sec, re.MULTILINE):
        title = clean_inline_md(m.group(1))
        if is_placeholder(title):
            continue
        block = sec[m.end() :]
        next_h = re.search(r"^###\s+", block, re.MULTILINE)
        if next_h:
            block = block[: next_h.start()]
        def md_field(label: str) -> str:
            fm = re.search(rf"(?:\*\*)?{re.escape(label)}:?\*\*\s*:\s*([^\n]+)", block, re.IGNORECASE)
            if not fm:
                fm = re.search(rf"{re.escape(label)}\s*:\s*([^\n]+)", block, re.IGNORECASE)
            return clean_inline_md(fm.group(1)) if fm else ""
        extra = {
            "api_version": md_field("API Version expected"),
            "sla": md_field("SLA expected"),
            "last_verified": md_field("Last verified"),
            "contact_docs": md_field("Contact / Docs"),
        }
        entities.append(Entity(f"external.{slugify(title).replace('-', '_')}", title, "CONTRACTS.md", slugify(title), extra))
    return unique_entities(entities)


def parse_components(blueprint: str) -> List[Entity]:
    explicit = parse_explicit_markers(blueprint, "BLUEPRINT.md")["components"]
    if explicit:
        return unique_entities(explicit)
    sec = section_between(blueprint, r"^##\s+2\.\s+COMPONENT REGISTRY\s*$", r"^##\s+3\.")
    entities: List[Entity] = []
    for row in parse_table_rows(sec):
        if not row:
            continue
        title = clean_inline_md(row[0]).strip("*")
        if is_placeholder(title):
            continue
        extra = {}
        column_names = ["module", "responsibility", "input", "output", "stateful", "break_pattern", "business_impact", "proof_standard", "adr"]
        for idx, key in enumerate(column_names, start=1):
            if len(row) > idx and row[idx]:
                extra[key] = row[idx]
        if len(row) < 10:
            extra["registry_columns_present"] = str(len(row))
        entities.append(Entity(f"component.{title}", title, "BLUEPRINT.md", slugify(title), extra))
    return unique_entities(entities)


def parse_dependencies(blueprint: str) -> List[Entity]:
    explicit = parse_explicit_markers(blueprint, "BLUEPRINT.md")["dependencies"]
    if explicit:
        return unique_entities(explicit)
    sec = section_between(blueprint, r"^###\s+Dependency Fitness Registry\s*$", r"^###\s+|^##\s+8\.")
    entities: List[Entity] = []
    for row in parse_table_rows(sec):
        if not row:
            continue
        title = clean_inline_md(row[0])
        if is_placeholder(title):
            continue
        extra = {}
        if len(row) >= 7:
            extra = {"purpose": row[1], "constraint": row[2], "adr": row[3], "fit_assumption": row[4], "last_verified": row[5], "reconsider_if": row[6]}
        elif len(row) >= 6:
            extra = {"purpose": row[1], "constraint": row[2], "adr": row[3], "last_verified": row[4], "reconsider_if": row[5]}
        entities.append(Entity(f"dependency.{slugify(title).replace('-', '_')}", title, "BLUEPRINT.md", slugify(title), extra))
    return unique_entities(entities)


def parse_adrs(adr: str) -> List[Entity]:
    explicit = parse_explicit_markers(adr, "ADR.md")["adrs"]
    entities: List[Entity] = []
    if explicit:
        entities.extend(explicit)
    for m in re.finditer(r"^##\s+(ADR-\d+)\s+[—-]\s+(.+)$", adr, re.MULTILINE):
        adr_id = m.group(1)
        title = clean_inline_md(m.group(2))
        block = adr[m.end() :]
        next_h = re.search(r"^##\s+ADR-\d+", block, re.MULTILINE)
        if next_h:
            block = block[: next_h.start()]
        extra = {}
        fields = {
            "status": r"\*\*Status:\*\*\s*([^\n]+)",
            "confidence": r"\*\*CONFIDENCE\s*:\*\*\s*`?([^`\n]+)`?",
            "volatility": r"\*\*VOLATILITY\s*:\*\*\s*`?([^`\n]+)`?",
            "change_classification": r"\*\*Change Classification:\*\*\s*`?([^`\n]+)`?",
            "supersedes": r"\*\*Supersedes:\*\*\s*([^\n]+)",
            "superseded_by": r"\*\*Superseded by:\*\*\s*([^\n]+)",
            "last_confirmed": r"\*\*LAST CONFIRMED:\*\*\s*([^\n]+)",
        }
        for key, pattern in fields.items():
            fm = re.search(pattern, block, re.IGNORECASE)
            if fm:
                extra[key] = clean_inline_md(fm.group(1)).split("—")[0].strip()
        entities.append(Entity(adr_id, title, "ADR.md", adr_id.lower(), extra))
    return unique_entities(entities)

def parse_trace_rows(blueprint: str) -> List[List[str]]:
    sec = section_between(blueprint, r"^###\s+TRACE INDEX\s*$", r"^###\s+Proof Handoff Snapshot\s*$")
    rows = parse_table_rows(sec)
    clean_rows: List[List[str]] = []
    for row in rows:
        if len(row) >= 6 and not any(c.lower().startswith("intent") or c.lower() == "signal" for c in row[:1]):
            clean_rows.append(row[:6])
    return clean_rows



def parse_intent(blueprint: str) -> Dict[str, str]:
    sec = section_between(blueprint, r"^###\s+SYSTEM INTENT\s*$", r"^###\s+SUCCESS CRITERIA\s*$")
    result = {"PROBLEM": "{{summary}}", "FOR": "{{summary}}", "ASSUMING": "{{summary}}", "WILL_DRIFT_IF": "{{summary}}", "NON_GOALS": "{{summary}}", "ANTI_REQUIREMENTS": "{{summary}}"}
    label_map = {
        "PROBLEM": re.compile(r"^PROBLEM\s*:\s*(.*)$"),
        "FOR": re.compile(r"^FOR\s*:\s*(.*)$"),
        "ASSUMING": re.compile(r"^ASSUMING\s*:\s*(.*)$"),
        "WILL_DRIFT_IF": re.compile(r"^WILL[-_ ]DRIFT[-_ ]IF\s*:\s*(.*)$"),
        "NON_GOALS": re.compile(r"^NON[-_ ]GOALS\s*:\s*(.*)$"),
        "ANTI_REQUIREMENTS": re.compile(r"^ANTI[-_ ]REQUIREMENTS\s*:\s*(.*)$"),
    }
    key_order = list(label_map)
    lines = sec.splitlines()
    i = 0
    while i < len(lines):
        line = lines[i].rstrip()
        matched_key = None
        value = ""
        for key, pat in label_map.items():
            m = pat.match(line.strip())
            if m:
                matched_key = key
                value = m.group(1).strip()
                break
        if not matched_key:
            i += 1
            continue
        collected = [value] if value else []
        i += 1
        while i < len(lines):
            nxt = lines[i].rstrip()
            stripped = nxt.strip()
            if any(pat.match(stripped) for pat in label_map.values()):
                break
            if stripped.startswith("```"):
                break
            if stripped:
                collected.append(stripped)
            i += 1
        if collected:
            result[matched_key] = clean_inline_md(" ".join(collected))[:600]
    return result

def parse_build_phases(blueprint: str) -> List[Phase]:
    sec = section_between(blueprint, r"^##\s+8\.\s+SCAFFOLDING & BUILD ORDER\s*$", r"^##\s+9\.")
    phases: List[Phase] = []
    phase_re = re.compile(r"^(?:#{2,6}\s+)?(PHASE\s+[^\n]+)$", re.MULTILINE)
    matches = list(phase_re.finditer(sec))
    for idx, m in enumerate(matches):
        label = clean_inline_md(m.group(1))
        block_start = m.end()
        block_end = matches[idx + 1].start() if idx + 1 < len(matches) else len(sec)
        block = sec[block_start:block_end]
        tasks: List[TaskItem] = []
        for tm in re.finditer(r"^\s*\[([^\]]+)\]\s+(.+)$", block, re.MULTILINE):
            task_id = clean_inline_md(tm.group(1))
            desc = clean_inline_md(tm.group(2))
            depends = ""
            dm = re.search(r"depends on:\s*(\[[^\]]+\](?:\s*,\s*\[[^\]]+\])*)", desc, re.IGNORECASE)
            if dm:
                depends = dm.group(1)
            tasks.append(TaskItem(task_id, desc, depends))
        gate = ""
        gm = re.search(r"^\s*Gate\s*:\s*(.+)$", block, re.MULTILINE)
        if gm:
            gate = clean_inline_md(gm.group(1))
        if label and tasks:
            phases.append(Phase(label, tasks, gate))
    return phases


def parse_mode_routes(readme: str) -> List[Tuple[str, str]]:
    sec = section_between(readme, r"\*\*Load profile theo mode:\*\*", r"^---\s*$")
    routes: List[Tuple[str, str]] = []
    for row in parse_table_rows(sec):
        if len(row) >= 2:
            mode = clean_inline_md(row[0]).strip("`")
            load = clean_inline_md(row[1])
            if mode and not is_placeholder(mode) and mode.lower() != "agent mode":
                routes.append((mode, load))
    return routes


def parse_smell_indicators(readme: str) -> List[str]:
    sec = section_between(readme, r"^##\s+⚠️\s+DPS Smell Indicators\s*$", None)
    smells: List[str] = []
    for line in sec.splitlines():
        stripped = line.strip()
        if stripped.startswith("❌"):
            item = stripped.lstrip("❌").strip()
            if item:
                smells.append(clean_inline_md(item))
    return smells


def unique_entities(entities: Iterable[Entity]) -> List[Entity]:
    seen = set()
    out: List[Entity] = []
    for e in entities:
        if e.id in seen:
            continue
        seen.add(e.id)
        out.append(e)
    return out



def collect_model(root: Path) -> Tuple[DPSModel, List[str]]:
    texts = {rel: read_text(root, rel) for rel in CANONICAL_FILES}
    meta, problems = merge_metadata(texts)
    raw_hashes = {rel: sha256_text(texts[rel]) for rel in CANONICAL_FILES}
    contracts = texts["CONTRACTS.md"]
    blueprint = texts["BLUEPRINT.md"]
    adr = texts["ADR.md"]
    readme = texts["README.md"]
    model = DPSModel(
        meta=meta,
        schemas=parse_schemas(contracts),
        invariants=parse_invariants(contracts),
        components=parse_components(blueprint),
        dependencies=parse_dependencies(blueprint),
        external_contracts=parse_external_contracts(contracts),
        adrs=parse_adrs(adr),
        trace_rows=parse_trace_rows(blueprint),
        intent=parse_intent(blueprint),
        build_phases=parse_build_phases(blueprint),
        mode_routes=parse_mode_routes(readme),
        smell_indicators=parse_smell_indicators(readme),
        raw_hashes=raw_hashes,
    )
    return model, problems

def yq(s: str) -> str:
    escaped = s.replace("\\", "\\\\").replace('"', '\\"')
    return f'"{escaped}"'


def generated_header(kind: str, comment: str = "#") -> str:
    if comment == "#":
        return (
            f"# {kind}\n"
            f"# @generated by tools/dps.py ({TOOL_VERSION})\n"
            f"# DO NOT EDIT BY HAND. Edit README.md, CONTRACTS.md, BLUEPRINT.md, or ADR.md, then run: {TOOL_COMMAND} sync\n"
            "# Canonical wins on conflict.\n\n"
        )
    return (
        "<!--\n"
        f"{kind}\n"
        f"@generated by tools/dps.py ({TOOL_VERSION})\n"
        f"DO NOT EDIT BY HAND. Edit README.md, CONTRACTS.md, BLUEPRINT.md, or ADR.md, then run: {TOOL_COMMAND} sync.\n"
        "Canonical wins on conflict.\n"
        "-->\n\n"
    )


def render_entity_yaml(entities: Sequence[Entity], indent: int = 4) -> List[str]:
    sp = " " * indent
    lines: List[str] = []
    if not entities:
        lines.append(f"{sp}[]")
        return lines
    for e in entities:
        lines.append(f"{sp}- id: {yq(e.id)}")
        lines.append(f"{sp}  title: {yq(e.title)}")
        lines.append(f"{sp}  source: {yq(e.source)}")
        lines.append(f"{sp}  anchor: {yq(e.anchor)}")
        for k, v in sorted(e.extra.items()):
            if v:
                lines.append(f"{sp}  {k}: {yq(v)}")
    return lines


def render_index(model: DPSModel) -> str:
    m = model.meta
    lines = [generated_header("DPS_INDEX.yml - machine-readable projection", "#").rstrip()]
    lines += [
        "dps:",
        f"  version: {yq(m.version)}",
        f"  profile: {yq(m.profile)}",
        f"  status: {yq(m.status)}",
        f"  current_authority: {yq(m.current_authority)}",
        f"  implementation_authority: {yq('active' if m.status in IMPLEMENTATION_READY_STATUSES else 'inactive while ' + m.status)}",
        f"  promoted_by: {yq(m.promoted_by)}",
        f"  promoted_at: {yq(m.promoted_at)}",
        "  promotion_basis:",
        f"    - {yq(m.promotion_basis)}",
        "",
        "canonical_files:",
        "  readme: \"README.md\"",
        "  contracts: \"CONTRACTS.md\"",
        "  blueprint: \"BLUEPRINT.md\"",
        "  adr: \"ADR.md\"",
        "",
        "generation:",
        f"  tool_version: {yq(TOOL_VERSION)}",
        "  generated_outputs:",
    ]
    for rel in GENERATED_FILES:
        lines.append(f"    - {yq(rel)}")
    lines += [
        "  canonical_wins_on_conflict: true",
        "  manual_edit_policy: \"Do not edit generated sidecars by hand.\"",
        "",
        "agent_projection:",
        "  directory: \".agent\"",
        "  source: \"generated_from_canonical\"",
        "  files:",
        "    - \".agent/AGENTS.md\"",
        "    - \".agent/CONTEXT.md\"",
        "    - \".agent/INVARIANTS.md\"",
        "    - \".agent/STACK.md\"",
        "    - \".agent/TASKS.md\"",
        "    - \".agent/REVIEW_CHECKS.md\"",
        "",
        "trace_index:",
    ]
    if model.trace_rows:
        for row in model.trace_rows:
            if any("{{" in c for c in row):
                continue
            lines.append(f"  - intent_or_signal: {yq(row[0])}")
            lines.append(f"    adr_origin: [{yq(row[1])}]")
            lines.append(f"    contracts: [{yq(row[2])}]")
            lines.append(f"    components: [{yq(row[3])}]")
            lines.append(f"    phase: {yq(row[4])}")
            lines.append(f"    evidence: [{yq(row[5])}]")
    if not any(model.trace_rows) or all(any("{{" in c for c in row) for row in model.trace_rows):
        lines.append("  []")
    lines += ["", "registries:", "  schemas:"]
    lines += render_entity_yaml(model.schemas, 4)
    lines += ["  components:"] + render_entity_yaml(model.components, 4)
    lines += ["  invariants:"] + render_entity_yaml(model.invariants, 4)
    lines += ["  dependencies:"] + render_entity_yaml(model.dependencies, 4)
    lines += ["  external_contracts:"] + render_entity_yaml(model.external_contracts, 4)
    lines += ["  adrs:"] + render_entity_yaml(model.adrs, 4)
    lines += [
        "",
        "lint_categories:",
        "  mechanical:",
        "    - \"broken Ref<X>\"",
        "    - \"version drift\"",
        "    - \"generated sidecar drift\"",
        "    - \"orphaned schema\"",
        "    - \"dead error code\"",
        "    - \"registered component missing §5 spec\"",
        "    - \"missing ENFORCE BY owner\"",
        "  judgment:",
        "    - \"dummy alternative\"",
        "    - \"low confidence with deep impact radius\"",
        "    - \"intent drift\"",
        "  runtime:",
        "    - \"metrics alert without ADR Ref\"",
        "    - \"external contract stale\"",
        "    - \"dependency last_verified stale\"",
        "    - \"stale ADR LAST CONFIRMED\"",
        "    - \"pending Scope Boundary review\"",
    ]
    return "\n".join(lines).rstrip() + "\n"



def render_agents(model: DPSModel) -> str:
    dont_map = {
        "design-review": "Không write implementation code",
        "implementation": "Không redefine schema trong code",
        "refactor": "Không rename/remove owner mà không update DPS",
        "bugfix": "Không workaround rồi backfill spec sau",
        "architecture-change": "Không change architecture trực tiếp trong code trước khi update/accept DPS decision",
        "dependency-change": "Không add architecture-relevant dependency ngoài registry",
    }
    rows = model.mode_routes or [
        ("design-review", "README Proof Handoff, BLUEPRINT Trace Index, ADR index"),
        ("implementation", "CONTRACTS, BLUEPRINT Section 5/8, relevant ADRs"),
        ("refactor", "Component Registry, System Invariants, ADR Impact Radius"),
        ("bugfix", "Error Registry, Component Spec, tests, relevant ADRs"),
        ("architecture-change", "SYSTEM INTENT, Scope Boundary Log, ADR template, Change Classification"),
        ("dependency-change", "BLUEPRINT Dependency Fitness, CONTRACTS External Contracts, relevant ADRs"),
    ]
    table = ["| Mode | Load first | Không được làm |", "|---|---|---|"]
    for mode, load_first in rows:
        table.append(f"| `{mode}` | {load_first} | {dont_map.get(mode, 'Không modify ngoài phạm vi mode nếu chưa update DPS canonical')} |")
    return generated_header("AGENTS.md - DPS agent behavior projection", "<!--") + f"""# AGENTS.md — DPS Agent Behavior Contract

> Projection từ DPS canonical files. Không phải canonical truth. Nếu file này conflict với README.md / CONTRACTS.md / BLUEPRINT.md / ADR.md, canonical thắng.

## Mandatory first check

1. Đọc `README.md` lifecycle status.
2. Current DPS STATUS: `{model.meta.status}`.
3. Nếu `DPS STATUS = DRAFT`, không implement production code. Chỉ được critique, ask for missing info, hoặc help promote to `PROOF-READY`.
4. Nếu `.agent/` conflict với DPS canonical files, dừng và chạy `{TOOL_COMMAND} sync && {TOOL_COMMAND} check`.

## Mode routing

{chr(10).join(table)}

## Output discipline

- Mọi module boundary chính nên có DPS trace anchor.
- Mọi deviation phải classify theo README Change Classification Protocol.
- Phase gate không pass nếu Learning Loop chưa respond.
- Sau mọi canonical change: chạy `{TOOL_COMMAND} sync` rồi `{TOOL_COMMAND} check`.
"""

def render_context(model: DPSModel) -> str:
    impl = "active" if model.meta.status in IMPLEMENTATION_READY_STATUSES else f"inactive while {model.meta.status}"
    trace_lines = []
    trace_lines.append("| Signal | Component | Contract | ADR | Phase | Evidence |")
    trace_lines.append("|---|---|---|---|---|---|")
    rows = [r for r in model.trace_rows if not any("{{" in c for c in r)]
    if not rows:
        trace_lines.append("| {{SIGNAL}} | {{COMP}} | Ref<{{SCHEMA}}> | ADR-{{N}} | Phase {{N}} | {{TEST/METRIC}} |")
    else:
        for r in rows:
            trace_lines.append("| " + " | ".join(r[:6]) + " |")
    return generated_header("CONTEXT.md - DPS compact context projection", "<!--") + f"""# CONTEXT.md — DPS Context Projection

> Projection compact từ DPS cho agent context. Không phải canonical truth. Generated từ 4 canonical files.

## Active lifecycle

- DPS VERSION: `{model.meta.version}`
- DPS STATUS: `{model.meta.status}`
- Profile: `{model.meta.profile}`
- Current authority: `{model.meta.current_authority}`
- Implementation authority: `{impl}`

## System intent summary

> Source: `BLUEPRINT.md` Section 1 / `SYSTEM INTENT`. Edit canonical source, then run `{TOOL_COMMAND} sync`.

- PROBLEM: {model.intent.get('PROBLEM', '{{summary}}')}
- FOR: {model.intent.get('FOR', '{{summary}}')}
- ASSUMING: {model.intent.get('ASSUMING', '{{summary}}')}
- WILL_DRIFT_IF: {model.intent.get('WILL_DRIFT_IF', '{{summary}}')}
- NON-GOALS: {model.intent.get('NON_GOALS', '{{summary}}')}
- ANTI-REQUIREMENTS: {model.intent.get('ANTI_REQUIREMENTS', '{{summary}}')}

## Active trace map

{"\n".join(trace_lines)}
"""


def render_invariants(model: DPSModel) -> str:
    lines = [generated_header("INVARIANTS.md - DPS invariant projection", "<!--").rstrip(), "# INVARIANTS.md — Extracted System Invariants", "", "> Canonical source: `CONTRACTS.md` Section 3.X. Generated; do not edit by hand.", "", "| Invariant | Scope | Enforce by | Test required | DPS Ref |", "|---|---|---|---|---|"]
    if not model.invariants:
        lines.append("| {{INVARIANT_NAME}} | {{COMPONENTS / SCHEMAS}} | {{COMP}} | {{TEST}} | CONTRACTS §3.X |")
    else:
        for inv in model.invariants:
            lines.append(f"| {inv.title} | {inv.extra.get('scope', '—')} | {inv.extra.get('enforce_by', '—')} | {inv.extra.get('test', '—')} | {inv.source}#{inv.anchor} |")
    lines += ["", "## Agent rule", "", "Do not remove/rename `ENFORCE BY` component without updating CONTRACTS §3.X and BLUEPRINT §5 `Enforces:` annotation, then regenerating sidecars."]
    return "\n".join(lines).rstrip() + "\n"



def render_stack(model: DPSModel) -> str:
    lines = [generated_header("STACK.md - DPS dependency projection", "<!--").rstrip(), "# STACK.md — Extracted Dependency Fitness", "", "> Canonical source: `BLUEPRINT.md` Section 7 Dependency Fitness Registry and `CONTRACTS.md` Section 6 External Contracts. Generated; do not edit by hand.", "", "| Dependency | Purpose | Constraint | ADR | Last verified | Reconsider if |", "|---|---|---|---|---|---|"]
    if not model.dependencies:
        lines.append("| {{LIB}} | {{PURPOSE}} | {{VERSION}} | ADR-{{N}} | {{YYYY-MM-DD}} | {{TRIGGER}} |")
    else:
        for dep in model.dependencies:
            lines.append(f"| {dep.title} | {dep.extra.get('purpose', '—')} | {dep.extra.get('constraint', '—')} | {dep.extra.get('adr', '—')} | {dep.extra.get('last_verified', '—')} | {dep.extra.get('reconsider_if', '—')} |")
    lines += ["", "## External contracts", "", "| External contract | API Version | SLA | Last verified | Contact / Docs | Source |", "|---|---|---|---|---|---|"]
    if not model.external_contracts:
        lines.append("| {{EXTERNAL_SYSTEM}} | {{API_VERSION}} | {{SLA}} | {{YYYY-MM-DD}} | {{URL/TEAM}} | CONTRACTS §6 |")
    else:
        for ext in model.external_contracts:
            lines.append(f"| {ext.title} | {ext.extra.get('api_version', '—')} | {ext.extra.get('sla', '—')} | {ext.extra.get('last_verified', '—')} | {ext.extra.get('contact_docs', '—')} | {ext.source}#{ext.anchor} |")
    lines += ["", "## Agent rule", "", "Do not add architecture-relevant dependency unless it has registry coverage or the change is explicitly classified and routed through DPS."]
    return "\n".join(lines).rstrip() + "\n"


def render_tasks(model: DPSModel) -> str:
    lines = [generated_header("TASKS.md - DPS build-order projection", "<!--").rstrip(), "# TASKS.md — Extracted Build Order", "", "> Canonical source: `BLUEPRINT.md` Section 8. Generated; do not edit by hand.", "", "| Phase | Task | Depends on | Gate | DPS Ref |", "|---|---|---|---|---|"]
    if not model.build_phases:
        lines.append("| Phase {{N}} | {{TASK}} | {{DEP}} | {{GATE}} | BLUEPRINT §8 |")
    else:
        for phase in model.build_phases:
            for task in phase.tasks:
                lines.append(f"| {phase.label} | [{task.id}] {task.description} | {task.depends_on or '—'} | {phase.gate or '—'} | BLUEPRINT §8 |")
    lines += ["", "## Agent rule", "", "Do not start phase N+1 until phase N gate passes, including Learning Loop artifacts."]
    return "\n".join(lines).rstrip() + "\n"


def render_review_checks(model: DPSModel) -> str:
    status_line = "DPS STATUS is implementation-authorized." if model.meta.status in IMPLEMENTATION_READY_STATUSES else f"DPS STATUS is `{model.meta.status}`; implementation is blocked until promotion."
    judgment = model.smell_indicators or ["{{README Smell Indicator}}"]
    auto_items = [
        status_line,
        f"`{TOOL_COMMAND} check` passes.",
        f"`{TOOL_COMMAND} lint --strict` passes.",
        "No broken `Ref<X>` from BLUEPRINT/ADR to CONTRACTS.",
        "No dead error codes from CONTRACTS §5 missing in BLUEPRINT §5.",
        "Every BLUEPRINT §2 registered component has a matching §5 spec section.",
        "All referenced ADRs, including Supersedes/Superseded by, exist.",
        "Every STRICT/CRITICAL component has failure-condition tests.",
        "ENFORCE BY components still exist and match BLUEPRINT `Enforces:` annotations.",
        "CONTRACTS §6 External Contracts and BLUEPRINT §7 Dependency Fitness cross-reference each other when non-empty.",
        "CONFIDENCE=LOW has VALIDATION TARGET; VOLATILITY=WATCHFUL/VOLATILE has WATCH SIGNAL.",
        "WATCHFUL/VOLATILE ADRs have fresh LAST CONFIRMED evidence.",
        "Scope Boundary Log has no pending Review Status rows.",
        "External contracts and dependencies are not stale beyond 3 months without explicit plan.",
        "Metrics rows with alerts include ADR Ref.",
    ]
    lines = [generated_header("REVIEW_CHECKS.md - DPS review checklist projection", "<!--").rstrip(), "# REVIEW_CHECKS.md — Extracted DPS Smells", "", "> Canonical source: `README.md` Smell Indicators + generated lint categories. Generated; do not edit by hand.", "", "## Automated (tooling)", ""]
    lines += [f"- [ ] {item}" for item in auto_items]
    lines += ["", "## Requires judgment — read README Smell Indicators", ""]
    for item in judgment:
        lines.append(f"- [ ] {item}")
    lines += ["", "## Arc 2 / Living Spec", "", "- [ ] If DPS STATUS = `LIVING-SPEC`, verify metrics, LAST CONFIRMED, external-contract freshness, scope-boundary review status, and phase Learning Loop artifacts before accepting implementation drift."]
    return "\n".join(lines).rstrip() + "\n"

def render_lock(model: DPSModel, generated_without_lock: Dict[str, str]) -> str:
    lines = [generated_header("DPS_LOCK.yml - generated checksum lock", "#").rstrip(), "schema_version: \"dps-lock-v1\"", f"tool_version: {yq(TOOL_VERSION)}", "", "canonical_hashes:"]
    for rel in CANONICAL_FILES:
        lines.append(f"  {rel}: {yq(model.raw_hashes[rel])}")
    lines += ["", "generated_hashes:"]
    for rel in GENERATED_FILES:
        if rel == ".dps/DPS_LOCK.yml":
            continue
        lines.append(f"  {rel}: {yq(sha256_text(generated_without_lock[rel]))}")
    lines += ["", "policy:", "  canonical_files_are_hand_editable: true", "  generated_sidecars_are_hand_editable: false", "  canonical_wins_on_conflict: true", "  required_commands:", f"    - \"{TOOL_COMMAND} sync\"", f"    - \"{TOOL_COMMAND} check\""]
    return "\n".join(lines).rstrip() + "\n"


def render_all(model: DPSModel) -> Dict[str, str]:
    out: Dict[str, str] = {
        "DPS_INDEX.yml": render_index(model),
        ".agent/AGENTS.md": render_agents(model),
        ".agent/CONTEXT.md": render_context(model),
        ".agent/INVARIANTS.md": render_invariants(model),
        ".agent/STACK.md": render_stack(model),
        ".agent/TASKS.md": render_tasks(model),
        ".agent/REVIEW_CHECKS.md": render_review_checks(model),
    }
    out[".dps/DPS_LOCK.yml"] = render_lock(model, out)
    return out


def sync(root: Path) -> int:
    model, problems = collect_model(root)
    if problems:
        for p in problems:
            print(f"WARN: {p}", file=sys.stderr)
    for rel, content in render_all(model).items():
        write_text(root, rel, content)
    print("DPS sync complete: generated sidecars and lockfile refreshed.")
    return 0


def check_generated_headers(root: Path) -> List[str]:
    problems = []
    for rel in GENERATED_FILES:
        p = root / rel
        if not p.exists():
            problems.append(f"missing generated output: {rel}")
            continue
        text = p.read_text(encoding="utf-8")
        if "@generated by tools/dps.py" not in text or "DO NOT EDIT BY HAND" not in text:
            problems.append(f"generated header missing or invalid: {rel}")
    return problems


def check(root: Path, show_diff: bool = True) -> int:
    model, meta_problems = collect_model(root)
    expected = render_all(model)
    problems = []
    problems.extend(meta_problems)
    problems.extend(check_generated_headers(root))
    for rel, expected_text in expected.items():
        p = root / rel
        if not p.exists():
            problems.append(f"missing generated output: {rel}")
            continue
        actual = p.read_text(encoding="utf-8")
        if actual != expected_text:
            problems.append(f"generated drift: {rel}")
            if show_diff:
                diff = difflib.unified_diff(actual.splitlines(True), expected_text.splitlines(True), fromfile=f"actual/{rel}", tofile=f"expected/{rel}")
                sys.stdout.writelines(diff)
    lint_problems = lint_model(root, strict=True)
    problems.extend(lint_problems)
    if problems:
        print("DPS CHECK FAILED", file=sys.stderr)
        for p in problems:
            print(f"- {p}", file=sys.stderr)
        return 1
    print("DPS CHECK PASSED")
    return 0


def collect_schema_names(model: DPSModel) -> set:
    names = set()
    for e in model.schemas:
        names.add(e.title)
        if e.id.startswith("schema."):
            names.add(e.id.split(".", 1)[1])
    return names


def collect_component_names(model: DPSModel) -> set:
    names = set()
    for e in model.components:
        names.add(e.title)
        if e.id.startswith("component."):
            names.add(e.id.split(".", 1)[1])
    return names



def strip_fenced_code(text: str) -> str:
    return re.sub(r"```.*?```", "", text, flags=re.DOTALL)

def refs_in(text: str) -> List[str]:
    return re.findall(r"Ref<([^>]+)>", text)


def adr_refs_in(text: str) -> List[str]:
    return re.findall(r"\bADR-\d+\b", text)


def parse_yyyy_mm_dd(value: str) -> Optional[date]:
    if not value or is_placeholder(value):
        return None
    m = re.search(r"(\d{4}-\d{2}-\d{2})", value)
    if not m:
        return None
    try:
        return datetime.strptime(m.group(1), "%Y-%m-%d").date()
    except ValueError:
        return None


def is_stale_date(value: str, days: int = 92) -> bool:
    d = parse_yyyy_mm_dd(value)
    if not d:
        return False
    return d < (date.today() - timedelta(days=days))


def adr_blocks(adr_text: str) -> Dict[str, str]:
    blocks: Dict[str, str] = {}
    matches = list(re.finditer(r"^##\s+(ADR-\d+)\s+[—-]\s+.*$", adr_text, re.MULTILINE))
    for idx, m in enumerate(matches):
        end = matches[idx + 1].start() if idx + 1 < len(matches) else len(adr_text)
        blocks[m.group(1)] = adr_text[m.start():end]
    return blocks


def component_spec_sections(blueprint: str) -> Dict[str, str]:
    sec = section_between(blueprint, r"^##\s+5\.\s+COMPONENT SPECIFICATIONS\s*$", r"^##\s+6\.")
    sections: Dict[str, str] = {}
    matches = list(re.finditer(r"^###\s+(.+)$", sec, re.MULTILINE))
    for idx, m in enumerate(matches):
        title = clean_inline_md(m.group(1)).strip("*")
        if is_placeholder(title):
            continue
        end = matches[idx + 1].start() if idx + 1 < len(matches) else len(sec)
        sections[title] = sec[m.start():end]
    return sections


def schema_blocks(contracts: str) -> Dict[str, str]:
    sec = section_between(contracts, r"^##\s+3\.\s+CORE SCHEMAS\s*$", r"^##\s+3\.X\.")
    blocks: Dict[str, str] = {}
    matches = list(re.finditer(r"^###\s+(.+)$", sec, re.MULTILINE))
    for idx, m in enumerate(matches):
        title = clean_inline_md(m.group(1)).strip("*")
        if is_placeholder(title) or "SYSTEM INVARIANT" in title.upper():
            continue
        end = matches[idx + 1].start() if idx + 1 < len(matches) else len(sec)
        blocks[title] = sec[m.start():end]
    return blocks


def parse_error_codes(contracts: str) -> List[str]:
    rows = table_after_heading(contracts, r"^##\s+5\.\s+ERROR REGISTRY\s*$", r"^##\s+6\.")
    codes: List[str] = []
    for row in rows:
        if not row:
            continue
        code = clean_inline_md(row[0]).strip("`").strip()
        if code.lower() == "code":
            continue
        if code and not is_placeholder(code):
            codes.append(code)
    return codes


def table_after_heading(text: str, heading_pattern: str, end_pattern: str) -> List[List[str]]:
    sec = section_between(text, heading_pattern, end_pattern)
    return parse_table_rows(sec)


def compatible_versions(text: str) -> Dict[str, str]:
    m = re.search(r"^###\s+.+?compatible with:\s*\[([^\]]+)\]", text, re.MULTILINE)
    if not m:
        return {}
    out: Dict[str, str] = {}
    for part in m.group(1).split(","):
        pm = re.search(r"(README|CONTRACTS|BLUEPRINT|ADR)\s+v([^,\]]+)", part.strip(), re.IGNORECASE)
        if pm:
            out[pm.group(1).upper()] = clean_inline_md(pm.group(2).strip())
    return out



def lint_model(root: Path, strict: bool = False, project_mode: bool = False) -> List[str]:
    model, meta_problems = collect_model(root)
    texts = {rel: read_text(root, rel) for rel in CANONICAL_FILES}
    problems = list(meta_problems)

    readme = texts["README.md"]
    contracts = texts["CONTRACTS.md"]
    blueprint = texts["BLUEPRINT.md"]
    adr_text = texts["ADR.md"]
    blueprint_stripped = strip_fenced_code(blueprint)
    adr_stripped = strip_fenced_code(adr_text)

    # Template wording consistency.
    if re.search(r"\bBa files\b|\b3 files\b|CẢ 3 files", readme, re.IGNORECASE):
        problems.append("README still uses 3-file wording; expected 4 canonical file wording.")

    # F8: live compatible-with header should exist in every canonical file.
    compat_re = re.compile(r"^###\s+.+?·\s+v[^\n]+compatible with:\s*\[[^\]]+\]", re.MULTILINE)
    for rel, text in texts.items():
        if not compat_re.search(text):
            problems.append(f"compatible-with live header missing in {rel}")
    # F8: when compatible-with headers contain concrete versions, validate them.
    canonical_versions = {name.replace(".md", "").upper(): extract_meta_from(text).version for name, text in texts.items()}
    for rel, text in texts.items():
        for target, version in compatible_versions(text).items():
            if is_placeholder(version):
                continue
            expected_version = canonical_versions.get(target)
            if expected_version and not is_placeholder(expected_version) and version != expected_version:
                problems.append(f"compatible-with version drift in {rel}: {target} v{version} != {expected_version}")

    # Ref<X> checks. Ignore template placeholders.
    schema_names = collect_schema_names(model)
    schema_ids = {e.id for e in model.schemas}
    for ref in refs_in(blueprint_stripped + "\n" + adr_stripped):
        if "{{" in ref or "}}" in ref:
            continue
        if ref.startswith("ERR_") or re.fullmatch(r"[A-Z0-9_]+", ref):
            continue
        if schema_names and ref not in schema_names and f"schema.{ref}" not in schema_ids:
            problems.append(f"broken schema reference: Ref<{ref}> not found in CONTRACTS schemas")

    # ADR refs checks across all canonical files, including ADR.md itself (F11).
    known_adrs = {e.id for e in model.adrs}
    for rel in CANONICAL_FILES:
        text_to_check = strip_fenced_code(texts[rel])
        for adr_ref in adr_refs_in(text_to_check):
            if "{{" in adr_ref or "}}" in adr_ref:
                continue
            if known_adrs and adr_ref not in known_adrs:
                problems.append(f"broken ADR reference in {rel}: {adr_ref} not found in ADR.md")

    blocks = adr_blocks(adr_text)
    for adr_id, block in blocks.items():
        # F2/B1: CONFIDENCE LOW requires VALIDATION TARGET.
        cm = re.search(r"\*\*CONFIDENCE\s*:\*\*\s*`?([^`\n]+)`?", block, re.IGNORECASE)
        if cm:
            confidence = clean_inline_md(cm.group(1)).upper()
            if confidence.startswith("LOW") and "{{" not in confidence and not re.search(r"VALIDATION TARGET\s*:\s*(?!\{\{)(?!—)(?!-)\S", block, re.IGNORECASE):
                problems.append(f"ADR {adr_id} has CONFIDENCE=LOW without VALIDATION TARGET")
        # F2/B1: WATCHFUL/VOLATILE requires WATCH SIGNAL.
        vm = re.search(r"\*\*VOLATILITY\s*:\*\*\s*`?([^`\n]+)`?", block, re.IGNORECASE)
        if vm:
            volatility = clean_inline_md(vm.group(1)).upper()
            if (volatility.startswith("WATCHFUL") or volatility.startswith("VOLATILE")) and "{{" not in volatility and not re.search(r"WATCH SIGNAL\s*:\s*(?!\{\{)(?!—)(?!-)\S", block, re.IGNORECASE):
                problems.append(f"ADR {adr_id} has VOLATILITY={volatility.split()[0]} without WATCH SIGNAL")
            if (volatility.startswith("WATCHFUL") or volatility.startswith("VOLATILE")) and "{{" not in volatility:
                lm = re.search(r"\*\*LAST CONFIRMED:\*\*\s*([^\n]+)", block, re.IGNORECASE)
                last_confirmed = clean_inline_md(lm.group(1)) if lm else ""
                if is_stale_date(last_confirmed):
                    problems.append(f"ADR {adr_id} has stale LAST CONFIRMED for {volatility.split()[0]} volatility: {last_confirmed}")
        # F2/B1: SUPERSEDED needs cascade review evidence.
        sm = re.search(r"\*\*Status:\*\*\s*([^\n]+)", block, re.IGNORECASE)
        if sm and "SUPERSEDED" in clean_inline_md(sm.group(1)).upper() and "{{" not in sm.group(1):
            if not re.search(r"cascade|impact radius|review status|scope boundary", block, re.IGNORECASE):
                problems.append(f"ADR {adr_id} is SUPERSEDED without Cascade/Impact Radius review evidence")
        # F11: Supersedes/Superseded by targets must exist.
        for field_name in ["Supersedes", "Superseded by"]:
            fm = re.search(rf"\*\*{field_name}:\*\*\s*([^\n]+)", block, re.IGNORECASE)
            if not fm:
                continue
            for target in adr_refs_in(fm.group(1)):
                if known_adrs and target not in known_adrs:
                    problems.append(f"broken ADR {field_name} reference in {adr_id}: {target} not found in ADR.md")

    # Invariant enforcement checks when explicit registries exist.
    component_names = collect_component_names(model)
    invariant_titles = {e.title for e in model.invariants}
    for inv in model.invariants:
        owner = inv.extra.get("enforce_by", "")
        if owner and not is_placeholder(owner) and component_names and owner not in component_names:
            problems.append(f"broken invariant owner: {inv.title} ENFORCE BY {owner} not found in BLUEPRINT components")
    # F12: reverse check: BLUEPRINT §5 Enforces annotation must reference CONTRACTS §3.X.
    for comp, spec in component_spec_sections(blueprint).items():
        for enforced in re.findall(r"\*\*Enforces:\*\*\s*([^\n]+)", spec, re.IGNORECASE):
            refs = [clean_inline_md(x).strip() for x in re.split(r",|/|;", enforced) if clean_inline_md(x).strip()]
            for ref in refs:
                if is_placeholder(ref):
                    continue
                if invariant_titles and ref not in invariant_titles:
                    problems.append(f"broken invariant reference: BLUEPRINT §5 {comp} Enforces {ref} not found in CONTRACTS §3.X")

    # F2/B1/F16: stale external contracts and dependencies.
    for ext in model.external_contracts:
        lv = ext.extra.get("last_verified", "")
        if is_stale_date(lv):
            problems.append(f"external contract stale >3 months: {ext.title} Last verified {lv}")
    for dep in model.dependencies:
        lv = dep.extra.get("last_verified", "")
        if is_stale_date(lv):
            problems.append(f"dependency stale >3 months: {dep.title} Last verified {lv}")

    # F7: CONTRACTS §6 <-> BLUEPRINT §7 cross-reference when both registries are non-empty.
    ext_titles = {slugify(e.title) for e in model.external_contracts if not is_placeholder(e.title)}
    dep_titles = {slugify(e.title) for e in model.dependencies if not is_placeholder(e.title)}
    if ext_titles and dep_titles:
        for ext in ext_titles:
            if ext not in dep_titles and not any(ext in d or d in ext for d in dep_titles):
                problems.append(f"external contract missing dependency cross-ref in BLUEPRINT §7: {ext}")
        for dep in dep_titles:
            # Only require reverse for service/db/api-like dependencies, not generic libs.
            if any(word in dep for word in ["api", "service", "db", "database", "vendor", "external"]):
                if dep not in ext_titles and not any(dep in e or e in dep for e in ext_titles):
                    problems.append(f"external dependency missing CONTRACTS §6 cross-ref: {dep}")

    # Arc 2: concrete Scope Boundary rows must not remain pending.
    scope_rows = table_after_heading(blueprint, r"^###\s+SCOPE BOUNDARY LOG\s*$", r"^##\s+2\.")
    for row in scope_rows:
        if len(row) < 6 or is_placeholder(row[0]):
            continue
        review_status = row[5]
        if "pending" in review_status.lower() and not is_placeholder(review_status):
            problems.append(f"scope boundary review pending: {row[0]} {row[1]} {review_status}")

    # F2/B1: STRICT/CRITICAL components need failure-condition tests in §5 spec.
    specs = component_spec_sections(blueprint)
    for comp in model.components:
        if comp.title not in specs:
            problems.append(f"component registered in §2 without matching §5 spec section: {comp.title}")
        ps = comp.extra.get("proof_standard", "").upper()
        if ("STRICT" in ps or "CRITICAL" in ps) and "{{" not in ps:
            spec = specs.get(comp.title, "")
            if not spec:
                problems.append(f"STRICT/CRITICAL component missing §5 spec section: {comp.title}")
            elif not re.search(r"failure[- ]condition|failure profile|negative test|contract test|error path|fail", spec, re.IGNORECASE):
                problems.append(f"STRICT/CRITICAL component missing failure-condition tests in §5: {comp.title}")

    # F2/B1: orphaned schema detection.
    blueprint_refs = set(refs_in(blueprint_stripped))
    for schema, block in schema_blocks(contracts).items():
        if schema not in blueprint_refs and not re.search(r"External consumer\s*:", block, re.IGNORECASE):
            problems.append(f"orphaned schema: {schema} is not referenced by BLUEPRINT and has no External consumer annotation")

    # F2: dead error codes must be referenced by a component spec path.
    component_specs_text = strip_fenced_code("\n".join(specs.values()))
    for code in parse_error_codes(contracts):
        if code not in component_specs_text:
            problems.append(f"dead error code: {code} is defined in CONTRACTS §5 but not referenced in BLUEPRINT §5")

    # F13: metrics with alert threshold need ADR Ref.
    metrics_rows = table_after_heading(blueprint, r"^###\s+Metrics\s*$", r"^###\s+")
    for row in metrics_rows:
        if len(row) < 7:
            continue
        metric, alert, adr_ref = row[0], row[5], row[6]
        if is_placeholder(metric):
            continue
        if alert and not is_placeholder(alert) and alert != "—":
            if not adr_ref or is_placeholder(adr_ref) or adr_ref == "—":
                problems.append(f"metrics alert without ADR Ref: {metric}")

    # Project-mode strictness.
    if project_mode:
        for rel, text in texts.items():
            if "{{" in text or "}}" in text:
                problems.append(f"project-mode placeholder remains in {rel}")
        if model.meta.status == "DRAFT":
            problems.append("project-mode DPS must not remain DRAFT")
        if not model.schemas:
            problems.append("project-mode DPS has no parsed schemas")
        if not model.components:
            problems.append("project-mode DPS has no parsed components")
        if not model.adrs:
            problems.append("project-mode DPS has no parsed ADRs")

    # Strict still allows blank template placeholders, but checks generated outputs exist.
    if strict:
        for rel in GENERATED_FILES:
            if not (root / rel).exists():
                problems.append(f"strict mode missing generated file: {rel}")

    return unique_messages(problems)

def unique_messages(messages: Iterable[str]) -> List[str]:
    seen = set()
    out = []
    for m in messages:
        if m not in seen:
            seen.add(m)
            out.append(m)
    return out


def lint_cmd(root: Path, strict: bool, project_mode: bool) -> int:
    problems = lint_model(root, strict=strict, project_mode=project_mode)
    if problems:
        print("DPS LINT FAILED", file=sys.stderr)
        for p in problems:
            print(f"- {p}", file=sys.stderr)
        return 1
    print("DPS LINT PASSED")
    return 0


def doctor(root: Path) -> int:
    model, problems = collect_model(root)
    lint_problems = lint_model(root, strict=True)
    print("DPS Doctor")
    print("==========")
    print(f"Version: {model.meta.version}")
    print(f"Profile: {model.meta.profile}")
    print(f"Status: {model.meta.status}")
    print(f"Current authority: {model.meta.current_authority}")
    print(f"Schemas: {len(model.schemas)}")
    print(f"Components: {len(model.components)}")
    print(f"Invariants: {len(model.invariants)}")
    print(f"Dependencies: {len(model.dependencies)}")
    print(f"External contracts: {len(model.external_contracts)}")
    print(f"ADRs: {len(model.adrs)}")
    all_problems = unique_messages(problems + lint_problems)
    if all_problems:
        print("\nProblems:")
        for p in all_problems:
            print(f"- {p}")
        return 1
    print("\nNo deterministic sync/lint problems found.")
    return 0


def main(argv: Optional[Sequence[str]] = None) -> int:
    parser = argparse.ArgumentParser(description="DPS sync/check/lint tool")
    sub = parser.add_subparsers(dest="cmd", required=True)
    p_sync = sub.add_parser("sync", help="Regenerate generated sidecars from canonical DPS files")
    p_check = sub.add_parser("check", help="Verify generated sidecars and cross-file consistency")
    p_check.add_argument("--no-diff", action="store_true", help="Do not print unified diffs")
    p_lint = sub.add_parser("lint", help="Run cross-canonical lint checks")
    p_lint.add_argument("--strict", action="store_true", help="Require generated outputs to exist")
    p_lint.add_argument("--project-mode", action="store_true", help="Disallow blank-template placeholders and DRAFT status")
    sub.add_parser("doctor", help="Print parsed DPS model summary and problems")
    args = parser.parse_args(argv)
    root = Path.cwd()
    try:
        if args.cmd == "sync":
            return sync(root)
        if args.cmd == "check":
            return check(root, show_diff=not args.no_diff)
        if args.cmd == "lint":
            return lint_cmd(root, strict=args.strict, project_mode=args.project_mode)
        if args.cmd == "doctor":
            return doctor(root)
    except Exception as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 2
    return 2


if __name__ == "__main__":
    raise SystemExit(main())
