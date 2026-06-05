#!/usr/bin/env python3
"""Create a local draft run under ops/runs/local/ (Git-excluded). Public repo safe."""
from __future__ import annotations

import json
import re
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

JST = timezone(timedelta(hours=9))


def main() -> int:
    gate = sys.argv[1] if len(sys.argv) > 1 else "UNNAMED-GATE"
    short = re.sub(r"[^A-Za-z0-9]+", "-", gate).strip("-")[:48]
    now = datetime.now(JST)
    run_id = f"M55-RUN-{now:%Y%m%d-%H%M%S}-JST-{short}"

    root = Path("ops/runs/local") / run_id
    root.mkdir(parents=True, exist_ok=False)

    manifest = {
        "schema_version": "1.1",
        "public_repo_mode": True,
        "run_id": run_id,
        "gate_name": gate,
        "created_at": now.isoformat(),
        "status": "DRAFT",
        "storage": "ops/runs/local",
        "promotion": "Human review required before ops/releases/",
        "evidence_refs": [],
        "human_signoff": {},
        "ai_review": {},
        "forbidden_fields": [
            "secret_full_value",
            "secret_suffix",
            "price_id_full_value",
            "raw_evidence",
        ],
    }
    (root / "run_manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(run_id)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
