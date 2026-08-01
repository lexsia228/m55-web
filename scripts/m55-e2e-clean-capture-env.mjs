/**
 * Local E2E clean-capture environment builder.
 *
 * Enabled only when process.env.M55_E2E_CLEAN_CAPTURE === '1'.
 * Fail-closed otherwise. Never applies under Vercel Preview/Production.
 *
 * Key resolution order:
 * 1. Process env NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY + CLERK_SECRET_KEY
 *    (CI maps dedicated GitHub secrets here at step scope)
 * 2. Gitignored local `.clerk/.tmp/keyless.json` fallback (local dev only)
 *
 * Dedicated CI secret names (GitHub Actions only, never logged):
 *   M55_E2E_CLERK_PUBLISHABLE_KEY → NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
 *   M55_E2E_CLERK_SECRET_KEY → CLERK_SECRET_KEY
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const KEYLESS_PATH = join(ROOT, '.clerk', '.tmp', 'keyless.json');

export const M55_E2E_CLEAN_CAPTURE_ENV = 'M55_E2E_CLEAN_CAPTURE';

const UNRESOLVED_EXPRESSION = /\$\{\{/;

/**
 * Fail-closed Clerk test-key classification. Never logs key material.
 *
 * @param {string} publishableKey
 * @param {string} secretKey
 */
export function validateClerkTestKeyMaterial(publishableKey, secretKey) {
  const pk = String(publishableKey || '').trim();
  const sk = String(secretKey || '').trim();

  if (!pk || !sk) {
    throw new Error('m55-e2e-clean-capture-env: Clerk test keys missing');
  }
  if (UNRESOLVED_EXPRESSION.test(pk) || UNRESOLVED_EXPRESSION.test(sk)) {
    throw new Error('m55-e2e-clean-capture-env: unresolved Clerk secret expression');
  }
  if (pk.startsWith('pk_live_')) {
    throw new Error('m55-e2e-clean-capture-env: publishableKey must not be pk_live_');
  }
  if (sk.startsWith('sk_live_')) {
    throw new Error('m55-e2e-clean-capture-env: secretKey must not be sk_live_');
  }
  if (!pk.startsWith('pk_test_') || pk.length < 20) {
    throw new Error('m55-e2e-clean-capture-env: publishableKey missing or not pk_test_');
  }
  if (!sk.startsWith('sk_test_') || sk.length < 20) {
    throw new Error('m55-e2e-clean-capture-env: secretKey missing or not sk_test_');
  }
}

/**
 * Resolve Clerk test keys from process env (CI) or gitignored keyless file (local).
 *
 * @param {NodeJS.ProcessEnv} baseEnv
 * @returns {{ publishableKey: string, secretKey: string, source: 'env' | 'keyless-file' }}
 */
export function resolveClerkTestKeys(baseEnv) {
  let publishableKey = String(
    baseEnv.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || baseEnv.M55_E2E_CLERK_PUBLISHABLE_KEY || '',
  ).trim();
  let secretKey = String(baseEnv.CLERK_SECRET_KEY || baseEnv.M55_E2E_CLERK_SECRET_KEY || '').trim();

  if (publishableKey && secretKey) {
    validateClerkTestKeyMaterial(publishableKey, secretKey);
    return { publishableKey, secretKey, source: 'env' };
  }

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
  validateClerkTestKeyMaterial(publishableKey, secretKey);
  return { publishableKey, secretKey, source: 'keyless-file' };
}

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

  const { publishableKey, secretKey } = resolveClerkTestKeys(baseEnv);

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
    const source =
      resolveClerkTestKeys(process.env).source === 'env' ? 'process-env' : 'keyless-file';
    const report = {
      ok: true,
      cleanCapture: env[M55_E2E_CLEAN_CAPTURE_ENV] === '1',
      keylessDisabled: env.NEXT_PUBLIC_CLERK_KEYLESS_DISABLED === '1',
      nextDevIndicatorDisabled: env.NEXT_DISABLE_DEV_INDICATOR === '1',
      keySource: source,
      keylessPath: KEYLESS_PATH,
    };
    console.log(JSON.stringify(report, null, 2));
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
