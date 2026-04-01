from __future__ import annotations

import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parents[2]

STORE_FRONT_FILES = [
    ROOT / "app" / "page.tsx",
    ROOT / "app" / "dtr" / "lp" / "page.tsx",
    ROOT / "app" / "support" / "page.tsx",
]

FORBIDDEN = ["占い", "鑑定", "運勢", "予言", "開運", "霊感", "当たる"]
SECRET_PATTERNS = [
    re.compile(r"sk_live_[A-Za-z0-9]+"),
    re.compile(r"sk_test_[A-Za-z0-9]+"),
    re.compile(r"SUPABASE_SERVICE_ROLE_KEY\s*=\s*.+"),
    re.compile(r"CLERK_SECRET_KEY\s*=\s*.+"),
]

errors: list[str] = []


def read(path: pathlib.Path) -> str:
    try:
        return path.read_text(encoding="utf-8")
    except FileNotFoundError:
        return ""


# 1) middleware matcher exists
middleware = read(ROOT / "middleware.ts")
if '"/prototype/:path*"' not in middleware and "'/prototype/:path*'" not in middleware:
    errors.append("middleware.ts missing /prototype/:path* matcher")

# 2) entitlements route no-store guard
entitlements = read(ROOT / "app" / "api" / "me" / "entitlements" / "route.ts")
if entitlements:
    if "force-dynamic" not in entitlements and "revalidate = 0" not in entitlements:
        errors.append("entitlements route missing dynamic/revalidate guard")
    if "no-store" not in entitlements.lower():
        errors.append("entitlements route missing no-store header")

# 3) webhook safety hints
webhook = read(ROOT / "app" / "api" / "stripe" / "webhook" / "route.ts")
if webhook:
    if "nodejs" not in webhook:
        errors.append("webhook route missing nodejs runtime")
    if "event_id" not in webhook and "idempot" not in webhook.lower():
        errors.append("webhook route missing idempotency marker")

# 4) public text forbidden scan (best-effort; lightweight)
public_targets = [
    ROOT / "app" / "page.tsx",
    ROOT / "app" / "dtr" / "lp" / "page.tsx",
    ROOT / "app" / "prototype" / "page.tsx",
]
for target in public_targets:
    text = read(target)
    if not text:
        continue
    for word in FORBIDDEN:
        if word in text:
            errors.append(f"forbidden term '{word}' found in {target.relative_to(ROOT)}")

# 5) secret-pattern scan (best-effort)
scan_roots = [ROOT / "docs", ROOT / "app", ROOT / ".cursorrules"]
files: list[pathlib.Path] = []
for item in scan_roots:
    if item.is_file():
        files.append(item)
    elif item.is_dir():
        files.extend(p for p in item.rglob("*") if p.is_file())
for file in files:
    try:
        text = file.read_text(encoding="utf-8")
    except Exception:
        continue
    for pattern in SECRET_PATTERNS:
        if pattern.search(text):
            errors.append(f"secret-like content detected in {file.relative_to(ROOT)}")
            break

# 6) system ssot top checkpoint hygiene
system_ssot = read(ROOT / "docs" / "ssot" / "M55_SYSTEM_SSOT.md")
if system_ssot:
    first_nonblank = next((line for line in system_ssot.splitlines() if line.strip()), "")
    if not first_nonblank.startswith("## "):
        errors.append("M55_SYSTEM_SSOT.md does not start with a checkpoint heading")

if errors:
    print("FAIL")
    for err in errors:
        print(f"- {err}")
    sys.exit(1)

print("PASS")
