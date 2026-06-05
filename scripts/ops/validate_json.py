#!/usr/bin/env python3
"""Wave 1: JSON parse validation only (not schema validation)."""
from __future__ import annotations

import json
import sys
from pathlib import Path


def collect_targets(argv: list[str]) -> list[Path]:
    if not argv:
        return sorted(Path("ops").rglob("*.json"))
    out: list[Path] = []
    for arg in argv:
        p = Path(arg)
        if p.is_dir():
            out.extend(sorted(p.rglob("*.json")))
        elif p.is_file():
            out.append(p)
    return out


def main() -> int:
    paths = collect_targets(sys.argv[1:])
    failed = False
    for path in paths:
        try:
            json.loads(path.read_text(encoding="utf-8"))
            print(f"OK {path}")
        except Exception as exc:
            failed = True
            print(f"FAIL {path}: {exc}")
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
