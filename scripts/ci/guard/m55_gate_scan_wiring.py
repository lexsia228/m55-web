import sys
import re
from pathlib import Path

# SSOT Violations (GatePlus v1.1.1)
FORBIDDEN_PATTERNS = [
    (r"document\.createElement", "DOM_CREATION_BAN"),
    (r"\.innerHTML\s*=", "INNER_HTML_BAN"),
    (r"insertAdjacentHTML", "INSERT_ADJACENT_HTML_BAN"),
    (r"outerHTML", "OUTER_HTML_BAN"),
    (r"window\.location", "DIRECT_NAV_BAN"),
    (r"getBoundingClientRect", "RECT_MEASURE_BAN"),
    (r"setTimeout\s*\([^)]*chat", "AUTO_CHAT_BAN"),
]

# Thanks View (Static DOM) requirements
THANKS_REQUIRED = [
    'id="dtr-thanks-view"',
    'data-testid="thanks-title"',
    'data-testid="thanks-rights"',
    'data-testid="btn-thanks-chat"',
    'data-testid="btn-thanks-home"',
]

# Chat context indicator must exist somewhere in templates
CONTEXT_REQUIRED_TOKEN = "context-indicator"

def scan_js_logic(root_path: Path):
    issues = []
    js_files = list(root_path.rglob("*.js"))
    for js in js_files:
        content = js.read_text(encoding="utf-8", errors="ignore")
        # Only scan routing / wiring related files for bans
        if ("phase3_wiring" in js.name) or ("routes_manifest" in js.name) or ("purchase" in js.name):
            for pattern, code in FORBIDDEN_PATTERNS:
                if not re.search(pattern, content):
                    continue
                # GM_SEAL: routes_manifest.js の navigateTo 内 .replace/.href のみ除外（正当ケース・広域除外禁止）
                if code == "DIRECT_NAV_BAN" and "routes_manifest" in js.name:
                    if not re.search(r"window\.location(?!\.(replace|href)\s*[=\(])", content):
                        continue  # 禁止形式が無い＝全利用が .replace / .href の正当使用
                issues.append(f"[FAIL] {js.name}: Found forbidden {code}")
    return issues

def scan_thanks_view_coverage(root_path: Path):
    issues = []
    html_files = list(root_path.rglob("*.html"))
    dtr_templates = [p for p in html_files if "DTR" in p.name or "dtr" in p.name.lower()]

    if not dtr_templates:
        issues.append("[FAIL] No DTR templates found (cannot verify Thanks View coverage).")
        return issues

    print(f"[Gate] Scanning {len(dtr_templates)} DTR templates for static Thanks View...")

    for html in dtr_templates:
        content = html.read_text(encoding="utf-8", errors="ignore")
        missing = [tok for tok in THANKS_REQUIRED if tok not in content]
        if missing:
            issues.append(f"[FAIL] {html.name}: Missing Thanks View tokens: {missing}")
    return issues

def scan_context_indicator(root_path: Path):
    issues = []
    html_files = list(root_path.rglob("*.html"))
    found = False
    for html in html_files:
        content = html.read_text(encoding="utf-8", errors="ignore")
        if CONTEXT_REQUIRED_TOKEN in content:
            found = True
            break
    if not found:
        issues.append(f"[FAIL] Missing static `{CONTEXT_REQUIRED_TOKEN}` in templates (Chat Context contract).")
    return issues

def scan(root_path: Path):
    issues = []
    issues.extend(scan_js_logic(root_path))
    issues.extend(scan_thanks_view_coverage(root_path))
    issues.extend(scan_context_indicator(root_path))
    return issues

if __name__ == "__main__":
    root = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(".")
    issues = scan(root)
    if issues:
        print("\n".join(issues))
        sys.exit(1)
    print("[PASS] Wiring Gate Cleared.")
    sys.exit(0)
