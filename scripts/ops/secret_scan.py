#!/usr/bin/env python3
"""M55 Control Plane secret scan — reports path/type/position only; never secret values."""
from __future__ import annotations

import re
import sys
from pathlib import Path

SKIP_DIRS = {
    ".git",
    "node_modules",
    ".next",
    "dist",
    "build",
    "out",
    "coverage",
    "playwright-report",
    "test-results",
    "ops/runs/local",
}

SKIP_SUFFIXES = {".sha256", ".png", ".jpg", ".jpeg", ".gif", ".webp", ".zip", ".bundle"}

# Pattern names only — no sample secret values in this file.
PATTERNS: dict[str, re.Pattern[str]] = {
    "stripe_secret_key": re.compile(r"\bsk_(?:live|test)_[A-Za-z0-9]{12,}\b"),
    "stripe_restricted_key": re.compile(r"\brk_(?:live|test)_[A-Za-z0-9]{12,}\b"),
    "stripe_webhook_secret": re.compile(r"\bwhsec_[A-Za-z0-9]{12,}\b"),
    "openai_api_key": re.compile(r"\bsk-[A-Za-z0-9_-]{20,}\b"),
    "github_token": re.compile(r"\bghp_[A-Za-z0-9]{20,}\b"),
    "github_fine_grained": re.compile(r"\bgithub_pat_[A-Za-z0-9_]{20,}\b"),
    "vercel_token": re.compile(r"\bvercel_[A-Za-z0-9]{20,}\b"),
    "supabase_jwt_like": re.compile(r"\beyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\b"),
    "generic_bearer": re.compile(r"Bearer\s+[A-Za-z0-9._~-]{20,}"),
    "stripe_price_id": re.compile(r"\bprice_[A-Za-z0-9]{14,}\b"),
}

# Paths relative to repo root; entries are substring matches on normalized path.
FALSE_POSITIVE_ALLOWLIST = [
    "scripts/ops/secret_scan.py",
    "docs/ops/control-plane/SECRET_METADATA_POLICY.md",
]


def should_skip(path: Path) -> bool:
    if any(part in SKIP_DIRS for part in path.parts):
        return True
    if path.suffix.lower() in SKIP_SUFFIXES:
        return True
    return False


def is_allowlisted(rel: str) -> bool:
    norm = rel.replace("\\", "/")
    return any(token in norm for token in FALSE_POSITIVE_ALLOWLIST)


def is_binary(blob: bytes) -> bool:
    return b"\0" in blob[:8192]


def scan_file(path: Path, root: Path) -> list[tuple[str, str, int]]:
    rel = str(path.relative_to(root))
    if is_allowlisted(rel):
        return []
    try:
        blob = path.read_bytes()
    except OSError:
        return []
    if is_binary(blob):
        return []
    try:
        text = blob.decode("utf-8")
    except UnicodeDecodeError:
        return []
    hits: list[tuple[str, str, int]] = []
    for kind, pattern in PATTERNS.items():
        for match in pattern.finditer(text):
            hits.append((rel, kind, match.start()))
    return hits


def main() -> int:
    root = Path(sys.argv[1] if len(sys.argv) > 1 else ".").resolve()
    all_hits: list[tuple[str, str, int]] = []
    for path in sorted(root.rglob("*")):
        if not path.is_file() or should_skip(path):
            continue
        all_hits.extend(scan_file(path, root))

    if all_hits:
        print("Potential secret or sensitive config material found (values not printed):")
        for rel, kind, pos in all_hits:
            print(f"- {rel}: {kind} at offset {pos}")
        return 1

    print("No configured secret patterns found.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
