from __future__ import annotations

import json
import pathlib
from datetime import datetime, timezone

ROOT = pathlib.Path(__file__).resolve().parents[2]
AUDIT = ROOT / "docs" / "audit"
SSOT = ROOT / "docs" / "ssot"

records = []
for base, category in [(SSOT, "ssot"), (AUDIT, "audit")]:
    if not base.exists():
        continue
    for path in sorted(p for p in base.rglob("*") if p.is_file() and p.suffix.lower() in {".md", ".txt", ".json", ".yml", ".yaml"}):
        rel = path.relative_to(ROOT).as_posix()
        records.append({
            "path": rel,
            "category": category,
            "bytes": path.stat().st_size,
        })

json_path = AUDIT / "M55_REPO_ASSET_INDEX.json"
md_path = AUDIT / "M55_REPO_ASSET_INDEX.md"
AUDIT.mkdir(parents=True, exist_ok=True)
json_path.write_text(json.dumps({
    "generated_at_utc": datetime.now(timezone.utc).isoformat(),
    "count": len(records),
    "records": records,
}, ensure_ascii=False, indent=2), encoding="utf-8")

lines = [
    "# M55_REPO_ASSET_INDEX",
    "",
    f"Generated: {datetime.now(timezone.utc).isoformat()}",
    f"Total records: {len(records)}",
    "",
]
for rec in records:
    lines.append(f"- [{rec['category']}] `{rec['path']}` ({rec['bytes']} bytes)")
md_path.write_text("\n".join(lines) + "\n", encoding="utf-8")
