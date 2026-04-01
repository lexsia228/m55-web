#!/usr/bin/env python3
"""
M55 DOM Freeze checker
- Compares two HTML files (GM vs candidate)
- Ensures DOM tag order, nesting, id, class *string*, and selected tap-related attributes match.
- Ignores text nodes and whitespace.
Usage:
  python m55_dom_freeze_check.py GM.html CANDIDATE.html
Exit codes:
  0 PASS
  1 FAIL
"""
from __future__ import annotations
import sys, hashlib
from pathlib import Path

try:
    from bs4 import BeautifulSoup
except ImportError as e:
    print("ERROR: bs4 (BeautifulSoup) is required. Install with: pip install beautifulsoup4")
    raise

TAP_ATTRS = ("href", "onclick", "role", "aria-label", "tabindex", "type", "data-action")

def _read(p: Path) -> str:
    return p.read_text(encoding="utf-8", errors="replace")

def _norm_class(attr) -> str:
    # Preserve original class token order as much as possible.
    # BeautifulSoup returns list; we join with single spaces.
    if attr is None:
        return ""
    if isinstance(attr, list):
        return " ".join(attr)
    return str(attr)

def _sig(soup: BeautifulSoup):
    """
    Build a linear signature list from document order traversal.
    Each entry contains:
      (tag, id, class_str, tap_attrs_tuple, parent_depth)
    """
    sig = []
    for el in soup.find_all(True):
        if el.name == 'script':
            continue  # ignore utility JS container (does not affect GM UI structure)
  # all tags
        tag = el.name or ""
        _id = el.get("id", "")
        _class = _norm_class(el.get("class"))
        tap = tuple((a, el.get(a, "")) for a in TAP_ATTRS if el.has_attr(a))
        # depth
        d = 0
        p = el.parent
        while getattr(p, "name", None) is not None:
            d += 1
            p = p.parent
        sig.append((tag, _id, _class, tap, d))
    return sig

def _hash_sig(sig) -> str:
    h = hashlib.sha256()
    for row in sig:
        h.update(repr(row).encode("utf-8"))
        h.update(b"\n")
    return h.hexdigest()

def main():
    if len(sys.argv) != 3:
        print(__doc__.strip())
        sys.exit(2)

    gm_path = Path(sys.argv[1])
    cand_path = Path(sys.argv[2])

    gm_html = _read(gm_path)
    cand_html = _read(cand_path)

    gm_soup = BeautifulSoup(gm_html, "html.parser")
    cand_soup = BeautifulSoup(cand_html, "html.parser")

    gm_sig = _sig(gm_soup)
    cand_sig = _sig(cand_soup)

    ok = True
    issues = []

    if len(gm_sig) != len(cand_sig):
        ok = False
        issues.append(f"NODE_COUNT_MISMATCH: GM={len(gm_sig)} CANDIDATE={len(cand_sig)}")

    # Compare element-by-element up to min length
    n = min(len(gm_sig), len(cand_sig))
    for i in range(n):
        if gm_sig[i] != cand_sig[i]:
            ok = False
            issues.append(f"MISMATCH_AT_INDEX {i}:")
            issues.append(f"  GM       = {gm_sig[i]}")
            issues.append(f"  CANDIDATE= {cand_sig[i]}")
            break

    # If only count differs, show tail
    if len(gm_sig) < len(cand_sig):
        issues.append("CANDIDATE_HAS_EXTRA_ELEMENTS (showing up to 5):")
        for row in cand_sig[len(gm_sig):len(gm_sig)+5]:
            issues.append(f"  + {row}")
    elif len(gm_sig) > len(cand_sig):
        issues.append("CANDIDATE_IS_MISSING_ELEMENTS (showing up to 5 expected tail):")
        for row in gm_sig[len(cand_sig):len(cand_sig)+5]:
            issues.append(f"  - {row}")

    print("=== M55 DOM FREEZE CHECK ===")
    print(f"GM       : {gm_path.name}")
    print(f"CANDIDATE : {cand_path.name}")
    print(f"GM_SIG_HASH       : {_hash_sig(gm_sig)}")
    print(f"CANDIDATE_SIG_HASH: {_hash_sig(cand_sig)}")
    print(f"ELEMENTS: GM={len(gm_sig)} CANDIDATE={len(cand_sig)}")
    if ok:
        print("RESULT: PASS (DOM / class / id / order matched)")
        sys.exit(0)
    else:
        print("RESULT: FAIL")
        for line in issues:
            print(line)
        sys.exit(1)

if __name__ == "__main__":
    main()
