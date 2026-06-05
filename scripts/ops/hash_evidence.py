#!/usr/bin/env python3
"""Generate SHA256 checksums for sanitized evidence files (no secrets/raw exports)."""
from __future__ import annotations

import hashlib
import sys
from pathlib import Path


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def main() -> int:
    root = Path(sys.argv[1] if len(sys.argv) > 1 else ".").resolve()
    out = Path(sys.argv[2] if len(sys.argv) > 2 else "checksums.sha256")

    rows: list[str] = []
    for path in sorted(p for p in root.rglob("*") if p.is_file() and p.resolve() != out.resolve()):
        rel = path.relative_to(root)
        rows.append(f"{sha256_file(path)}  {rel}")

    out.write_text("\n".join(rows) + ("\n" if rows else ""), encoding="utf-8")
    print(out)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
