#!/usr/bin/env python3
"""
M55 App Store Language Gate (JP)
- Flags risky "言い切り/診断/医療効能" expressions that can trigger review friction.
- This is a conservative linter: it reports matches; it does NOT rewrite text.
Usage:
  python m55_appstore_language_gate.py target.html
Exit code:
  0: no findings
  1: findings present
"""
from __future__ import annotations
import re, sys
from pathlib import Path
from bs4 import BeautifulSoup

def extract_visible_text(html: str) -> str:
    soup = BeautifulSoup(html, "html.parser")
    for t in soup(["script", "style", "noscript"]):
        t.decompose()
    body = soup.body or soup
    text = body.get_text("\n", strip=True)
    text = re.sub(r"[\u00A0\t ]+", " ", text)
    return text


RISK_PATTERNS = [
    # Overclaim / certainty
    r"必ず(当たる|的中|成功|叶う)",
    r"(驚異|驚愕|圧倒的)の?(的中|効果)",
    r"当たりすぎ",
    r"100%|絶対|確実|保証",
    # Medical / diagnostic framing
    r"(診断|治る|治療|改善|効能|医学|医療|処方|症状|うつ|不眠|パニック)",
    r"(科学的に証明|臨床|エビデンス)",
    # Manipulative dependency
    r"これ(を|し)ないと(不幸|危険|終わり)|今すぐ|手遅れ",
]

ALLOW_SOFTENERS = [
    r"目安", r"参考", r"ヒント", r"気づき", r"ふり返り", r"整える", r"静かに",
]

def main():
    if len(sys.argv) != 2:
        print(__doc__.strip())
        sys.exit(2)

    p = Path(sys.argv[1])
    raw = p.read_text(encoding="utf-8", errors="replace")
    txt = extract_visible_text(raw)

    findings = []
    for pat in RISK_PATTERNS:
        for m in re.finditer(pat, txt):
            # Grab small context
            s = max(0, m.start()-20)
            e = min(len(txt), m.end()+20)
            findings.append((pat, m.group(0), txt[s:e].replace("\n", " ")))

    print("=== M55 APP STORE LANGUAGE GATE (JP) ===")
    print("Target:", p.name)
    if not findings:
        print("RESULT: PASS [OK]  (no risky phrases detected by this gate)")
        sys.exit(0)

    print(f"RESULT: WARN [!]  findings={len(findings)}")
    for i,(pat,hit,ctx) in enumerate(findings[:50], 1):
        print(f"{i}. HIT='{hit}'  PATTERN='{pat}'")
        print(f"   CTX: ...{ctx}...")
    print("\nNotes:")
    print("- This gate is conservative: review context still matters.")
    print("- Prefer softeners like: " + " / ".join(ALLOW_SOFTENERS))
    sys.exit(1)

if __name__ == "__main__":
    main()
