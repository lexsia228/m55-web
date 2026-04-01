#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

DATA_PATH="${ROOT_DIR}/data/m55_name_analysis_81_sanitized.json"
EXPECTED_SHA256="94d58be9bc925103235ace9f06f9363cf82ecdc46c3bf4370809486b9bfe6918"

if [[ ! -f "${DATA_PATH}" ]]; then
  echo "ERROR: required data file missing: $DATA_PATH" >&2
  exit 10
fi

# sha256 (cross-platform)
if command -v sha256sum >/dev/null 2>&1; then
  ACTUAL_SHA256="$(sha256sum "${DATA_PATH}" | awk '{print $1}')"
elif command -v shasum >/dev/null 2>&1; then
  ACTUAL_SHA256="$(shasum -a 256 "${DATA_PATH}" | awk '{print $1}')"
else
  echo "ERROR: sha256 tool missing (sha256sum or shasum required)" >&2
  exit 11
fi

if [[ "${ACTUAL_SHA256}" != "${EXPECTED_SHA256}" ]]; then
  echo "ERROR: data file hash mismatch" >&2
  echo " expected=${EXPECTED_SHA256}" >&2
  echo " actual=${ACTUAL_SHA256}" >&2
  exit 12
fi
# --- Layer1 Contracts (policies/*.json) MUST exist and be consistent ---
POL_ENT="${ROOT_DIR}/policies/m55_entitlements_v1_0.json"
POL_RET="${ROOT_DIR}/policies/m55_retention_v1_0.json"
POL_COO="${ROOT_DIR}/policies/m55_dtr_cooldowns_v1_0.json"

for f in "${POL_ENT}" "${POL_RET}" "${POL_COO}"; do
  if [[ ! -f "${f}" ]]; then
    echo "ERROR: Layer1 policy missing: ${f}" >&2
    exit 20
  fi
done

# Minimal key integrity (prevents key-name drift between contract and code)
grep -q "ai_chat_send_per_day" "${POL_ENT}" || { echo "ERROR: entitlements missing ai_chat_send_per_day" >&2; exit 21; }
grep -q "tarot_draws_per_day" "${POL_ENT}" || { echo "ERROR: entitlements missing tarot_draws_per_day" >&2; exit 21; }
grep -q "dtr_monthly_included" "${POL_ENT}" || { echo "ERROR: entitlements missing dtr_monthly_included" >&2; exit 21; }
grep -q "\"weekly_view\"" "${POL_ENT}" || { echo "ERROR: entitlements missing weekly_view" >&2; exit 21; }

grep -q "free_days" "${POL_RET}" || { echo "ERROR: retention missing free_days" >&2; exit 22; }
grep -q "standard_days" "${POL_RET}" || { echo "ERROR: retention missing standard_days" >&2; exit 22; }
grep -q "premium_days" "${POL_RET}" || { echo "ERROR: retention missing premium_days" >&2; exit 22; }

grep -q "generation_limits" "${POL_COO}" || { echo "ERROR: cooldowns missing generation_limits" >&2; exit 23; }

# Runtime SSOT / legacy entitlement sources are forbidden
if grep -R "M55_RUNTIME_SSOT.json" "${ROOT_DIR}" -n --exclude-dir=node_modules --exclude-dir=.git --exclude=prebuild_guard.sh >/dev/null 2>&1; then
  echo "ERROR: forbidden RuntimeSSOT reference detected (M55_RUNTIME_SSOT.json)" >&2
  exit 24
fi
if grep -R "m55_runtime_ssot" "${ROOT_DIR}" -n --exclude-dir=node_modules --exclude-dir=.git --exclude=prebuild_guard.sh >/dev/null 2>&1; then
  echo "ERROR: forbidden runtime ssot module reference detected (m55_runtime_ssot)" >&2
  exit 24
fi
# --- end Layer1 checks ---


# Banned features (mechanical block)
BANNED=(
  "serviceWorker.register"
  "navigator.serviceWorker"
  "Notification.requestPermission"
  "new Notification"
  "firebase/messaging"
  "pushManager"
  "showNotification"
  "react-hot-toast"
  "m55_name_analysis.js"
  "M55_GOLD_MASTER"
  "M55_SYSTEM_COMPLETE_GOD"
  "M55_INTEGRATED_V3"
)

for pat in "${BANNED[@]}"; do
  if grep -RIn --exclude-dir=.git --exclude="*.zip" --exclude-dir=ci --exclude-dir=data --exclude-dir=docs --exclude='*.md' --exclude='*.txt' "${pat}" "${ROOT_DIR}" >/dev/null 2>&1; then
    echo "ERROR: banned pattern detected: $pat" >&2
    grep -RIn --exclude-dir=.git --exclude="*.zip" --exclude-dir=ci --exclude-dir=data --exclude-dir=docs --exclude='*.md' --exclude='*.txt' "${pat}" "${ROOT_DIR}" | head -n 20 >&2
    exit 20
  fi
done

echo "OK: prebuild guard passed"


