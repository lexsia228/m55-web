#!/usr/bin/env bash
set -euo pipefail

echo "[M55 GUARD] Turn 13-C regression guard (range-safe, fail-closed)"

EVENT_NAME="${GITHUB_EVENT_NAME:-local}"
EVENT_PATH="${GITHUB_EVENT_PATH:-}"

HEAD="$(git rev-parse HEAD)"
BASE=""

read_json() {
  python3 -c "import json, os, sys; p=os.environ.get('GITHUB_EVENT_PATH',''); key=sys.argv[1]; sys.exit(0) if not p or not os.path.isfile(p) else None; f=open(p,'r',encoding='utf-8'); e=json.load(f); cur=e; [cur:=cur[part] for part in key.split('.')]; print(cur)" "$1" 2>/dev/null
}

if [[ "$EVENT_NAME" == "pull_request" ]]; then
  BASE="$(read_json pull_request.base.sha 2>/dev/null || true)"
elif [[ "$EVENT_NAME" == "push" ]]; then
  BASE="$(read_json before 2>/dev/null || true)"
fi

# local fallback only
if [[ -z "${BASE:-}" || "${BASE:-}" == "null" ]]; then
  if [[ "$EVENT_NAME" == "local" ]]; then
    BASE="$(git rev-parse HEAD~1)"
  else
    echo "FAIL: cannot resolve BASE from event payload (CI must be deterministic)"
    exit 1
  fi
fi

echo "[M55 GUARD] diff base: $BASE"
echo "[M55 GUARD] head:      $HEAD"

# If push.before is all-zero or base is missing, use diff-tree for HEAD only (fail-closed if ambiguous)
CHANGED=""
if [[ "$BASE" =~ ^0+$ ]]; then
  echo "[M55 GUARD] base is all-zero; using diff-tree for HEAD"
  CHANGED="$(git diff-tree --no-commit-id --name-only -r "$HEAD" || true)"
else
  if ! git cat-file -e "$BASE^{commit}" >/dev/null 2>&1; then
    if [[ "$EVENT_NAME" == "local" ]]; then
      BASE="$(git rev-parse HEAD~1)"
    else
      echo "FAIL: BASE commit not present in checkout history (fetch-depth must be 0)"
      exit 1
    fi
  fi
  CHANGED="$(git diff --name-only "$BASE..$HEAD" || true)"
fi

# --- [A] .env.local must not be tracked ---
if git ls-files --error-unmatch .env.local >/dev/null 2>&1; then
  echo "FAIL: .env.local is tracked by git"
  exit 1
fi

# --- [B] postMessage must not use wildcard targetOrigin ---
if echo "$CHANGED" | grep -qE '^hooks/useSoulBridge\.ts$' ; then
  if grep -nE "postMessage\([^,]+,\s*['\"]\*['\"]\s*\)" hooks/useSoulBridge.ts >/dev/null 2>&1; then
    echo "FAIL: postMessage uses wildcard '*' in hooks/useSoulBridge.ts"
    exit 1
  fi
fi

# --- [C] binder must verify event.origin ---
if echo "$CHANGED" | grep -qE '^public/legacy/js/m55_soul_binder\.js$' ; then
  if ! grep -nE 'event\.origin\s*!==\s*window\.location\.origin' public/legacy/js/m55_soul_binder.js >/dev/null 2>&1; then
    echo "FAIL: missing event.origin verification in m55_soul_binder.js"
    exit 1
  fi
fi

# --- [D] legacy allowlist: only these files may change under public/legacy ---
LEGACY_CHANGED="$(echo "$CHANGED" | grep -E '^public/legacy/' || true)"
if [[ -n "$LEGACY_CHANGED" ]]; then
  BAD="$(echo "$LEGACY_CHANGED" | grep -vE '^public/legacy/page_chat\.html$|^public/legacy/js/m55_soul_binder\.js$' || true)"
  if [[ -n "$BAD" ]]; then
    echo "FAIL: unauthorized legacy changes detected:"
    echo "$BAD"
    exit 1
  fi
fi

echo "PASS: Turn 13-C regression guard OK"
