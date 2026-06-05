#!/usr/bin/env bash
# M55 Control Plane — sanitized git state capture (Public repo safe).
# Does not output pwd, absolute paths, usernames, or untracked file contents.
set -euo pipefail

OUT="${1:-ops/runs/local/git_state.txt}"
OUT_DIR="$(dirname "$OUT")"
mkdir -p "$OUT_DIR"

{
  echo "captured_at=$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo "branch=$(git branch --show-current 2>/dev/null || echo unknown)"
  echo "head=$(git rev-parse HEAD)"
  echo "origin_main=$(git rev-parse origin/main 2>/dev/null || echo unknown)"
  echo -n "left_right="
  git rev-list --left-right --count origin/main...HEAD 2>/dev/null || echo "0 0"
  echo "--- status_names_only ---"
  git status --short | awk '{print $2}' | sort -u
  echo "--- log_oneline_5 ---"
  git log --oneline -5
  echo "--- diff_stat_origin_main_HEAD ---"
  git diff --stat origin/main..HEAD 2>/dev/null || true
} > "$OUT"

echo "Wrote sanitized git state (relative path only)"
