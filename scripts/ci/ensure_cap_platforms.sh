#!/bin/bash
set -euo pipefail

# M55 Mobile Strategy: Bundled Legacy
# - We do NOT use 'out' because Next.js runs in Server/Middleware mode.
# - Mobile bundles the pre-audited static assets under public/legacy.

ASSET_ROOT="public/legacy"

echo "Checking mobile asset root at: ${ASSET_ROOT} ..."

if [ ! -f "${ASSET_ROOT}/index.html" ]; then
  echo "❌ [FATAL] Missing ${ASSET_ROOT}/index.html"
  exit 1
fi

echo "✅ Mobile assets confirmed."

TARGET="${1:-}"

case "${TARGET}" in
  --android)
    echo "Ensuring Android platform..."
    if [ ! -d "android" ]; then
      npx cap add android
    fi
    npx cap sync android
    ;;
  --ios)
    echo "Ensuring iOS platform..."
    if [ ! -d "ios" ]; then
      npx cap add ios
    fi
    npx cap sync ios
    ;;
  *)
    # Default: Ensure both, then sync
    echo "Ensuring ALL platforms..."
    if [ ! -d "android" ]; then
      npx cap add android
    fi
    if [ ! -d "ios" ]; then
      npx cap add ios
    fi
    npx cap sync
    ;;
esac