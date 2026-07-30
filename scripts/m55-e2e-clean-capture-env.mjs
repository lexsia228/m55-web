/**
 * Local E2E clean-capture environment builder.
 *
 * Enabled only when process.env.M55_E2E_CLEAN_CAPTURE === '1'.
 * Fail-closed otherwise. Never applies under Vercel Preview/Production.
 *
 * Strategy:
 * - Reuse the gitignored local Clerk keyless instance keys in `.clerk/.tmp/keyless.json`
 *   (already created by `@clerk/nextjs` keyless mode on this machine).
 * - Export them as explicit NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY / CLERK_SECRET_KEY so
 *   middleware can boot.
 * - Set NEXT_PUBLIC_CLERK_KEYLESS_DISABLED=1 so the "Configure your application"
 *   panel is never created.
 * - Set NEXT_DISABLE_DEV_INDICATOR=1 (compat) and rely on next.config.mjs
 *   `devIndicators: false` when M55_E2E_CLEAN_CAPTURE=1 so the Next.js
 *   `[data-nextjs-dev-tools-button]` control is never generated (Next 15.5).
 *
 * This does not fabricate Production accounts or entitlements and does not weaken
 * Preview/Production auth. Secrets stay in gitignored `.clerk/` and are never written
 * back into the repo.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const KEYLESS_PATH = join(ROOT, '.clerk', '.tmp', 'keyless.json');

export const M55_E2E_CLEAN_CAPTURE_ENV = 'M55_E2E_CLEAN_CAPTURE';

/**
 * @param {NodeJS.ProcessEnv} [baseEnv]
 * @returns {NodeJS.ProcessEnv}
 */
export function buildCleanCaptureServerEnv(baseEnv = process.env) {
  if (baseEnv.VERCEL === '1' || baseEnv.VERCEL_ENV) {
    throw new Error(
      'm55-e2e-clean-capture-env: refused under Vercel Preview/Production (STOP_AUTH_SCOPE)',
    );
  }
  if (baseEnv[M55_E2E_CLEAN_CAPTURE_ENV] !== '1') {
    throw new Error(
      `m55-e2e-clean-capture-env: ${M55_E2E_CLEAN_CAPTURE_ENV}=1 is required (fail-closed)`,
    );
  }
  // Prefer already-provided local test keys (CI secrets / shell). Otherwise load
  // the gitignored keyless instance file created by ordinary local `next dev`.
  let publishableKey = String(baseEnv.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || '').trim();
  let secretKey = String(baseEnv.CLERK_SECRET_KEY || '').trim();

  if (!publishableKey || !secretKey) {
    if (!existsSync(KEYLESS_PATH)) {
      throw new Error(
        `m55-e2e-clean-capture-env: missing Clerk test keys. Provide pk_test_/sk_test_ via env, ` +
          `or start the app once in ordinary local keyless mode so ${KEYLESS_PATH} is created.`,
      );
    }
    /** @type {{ publishableKey?: string, secretKey?: string }} */
    let parsed;
    try {
      parsed = JSON.parse(readFileSync(KEYLESS_PATH, 'utf8'));
    } catch (error) {
      throw new Error(`m55-e2e-clean-capture-env: unreadable keyless.json (${error})`);
    }
    publishableKey = String(parsed.publishableKey || '').trim();
    secretKey = String(parsed.secretKey || '').trim();
  }

  if (!publishableKey.startsWith('pk_test_') || publishableKey.length < 20) {
    throw new Error('m55-e2e-clean-capture-env: publishableKey missing or not pk_test_');
  }
  if (!secretKey.startsWith('sk_test_') || secretKey.length < 20) {
    throw new Error('m55-e2e-clean-capture-env: secretKey missing or not sk_test_');
  }

  return {
    ...baseEnv,
    [M55_E2E_CLEAN_CAPTURE_ENV]: '1',
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: publishableKey,
    CLERK_SECRET_KEY: secretKey,
    NEXT_PUBLIC_CLERK_KEYLESS_DISABLED: '1',
    NEXT_DISABLE_DEV_INDICATOR: '1',
  };
}

/** CLI: print whether the clean-capture env can be built (never prints secrets). */
const isDirectRun = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isDirectRun) {
  try {
    const env = buildCleanCaptureServerEnv(process.env);
    const report = {
      ok: true,
      cleanCapture: env[M55_E2E_CLEAN_CAPTURE_ENV] === '1',
      keylessDisabled: env.NEXT_PUBLIC_CLERK_KEYLESS_DISABLED === '1',
      nextDevIndicatorDisabled: env.NEXT_DISABLE_DEV_INDICATOR === '1',
      publishableKeyLen: String(env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || '').length,
      secretKeyLen: String(env.CLERK_SECRET_KEY || '').length,
      keylessPath: KEYLESS_PATH,
    };
    console.log(JSON.stringify(report, null, 2));
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
