/**
 * One-shot safe ops notification fixture harness (AS-B6-R-HARNESS-B).
 * Default: dry_run — no network send.
 * Real send requires ALL of:
 *   --send
 *   M55_OPS_FIXTURE_CONFIRM=SEND_ONE_SAFE_FIXTURE
 *   M55_OPS_NOTIFY_ENABLED=true|1|yes (local process only)
 *   M55_OPS_SLACK_WEBHOOK_URL=https://hooks.slack.com/...
 *
 * Run: node scripts/ops/send-m55-ops-notify-fixture.mjs
 * Selfcheck: node scripts/ops/send-m55-ops-notify-fixture.selfcheck.mjs
 */
import { fileURLToPath } from 'node:url';
import path from 'node:path';

export const FIXTURE_CONFIRM_VALUE = 'SEND_ONE_SAFE_FIXTURE';
export const FIXTURE_DEDUPE_KEY = 'as-b6-r-harness-fixture-20260520';

/** @returns {import('../../lib/m55/ops/m55OpsNotify.ts').M55OpsNotifyEvent} */
export function buildFixturePayload() {
  return {
    phase: 'AS-B6-R-R',
    environmentSafeLabel: 'production',
    severity: 'SEV-4',
    triggerCategory: 'notification_verification_test',
    countsOnlySummary: 'test-only/no-user-impact',
    nextRecommendedGate: 'AS-B1-MONITOR',
    timestampSafeLabel: new Date().toISOString(),
    sourceSafeLabel: 'm55_ops_notify_harness',
    dedupeSafeKey: FIXTURE_DEDUPE_KEY,
  };
}

function isNotifyEnabledFromEnv(env) {
  const raw = String(env.M55_OPS_NOTIFY_ENABLED ?? '')
    .trim()
    .toLowerCase();
  return raw === '1' || raw === 'true' || raw === 'yes';
}

function hasValidWebhookFromEnv(env) {
  const url = String(env.M55_OPS_SLACK_WEBHOOK_URL ?? '').trim();
  return url.startsWith('https://hooks.slack.com/');
}

/**
 * @param {string[]} argv
 * @param {NodeJS.ProcessEnv} env
 */
export function evaluateFixtureMode(argv, env) {
  const sendFlag = argv.includes('--send');
  if (!sendFlag) {
    return { status: 'dry_run', reason: 'no_send_flag' };
  }
  if (env.M55_OPS_FIXTURE_CONFIRM !== FIXTURE_CONFIRM_VALUE) {
    return { status: 'blocked', reason: 'missing_fixture_confirm' };
  }
  if (!isNotifyEnabledFromEnv(env)) {
    return { status: 'disabled', reason: 'notify_not_enabled' };
  }
  if (!hasValidWebhookFromEnv(env)) {
    return { status: 'blocked', reason: 'missing_or_invalid_webhook' };
  }
  return { status: 'send', reason: 'all_guards_pass' };
}

/** Safe stdout only — never print secrets. */
function printStatus(status) {
  const allowed = new Set([
    'dry_run',
    'blocked',
    'disabled',
    'sent',
    'failed',
    'validation_failed',
  ]);
  if (!allowed.has(status)) {
    console.log('blocked');
    return;
  }
  console.log(status);
}

async function loadNotifyModule() {
  return import('../../lib/m55/ops/m55OpsNotify.ts');
}

async function main() {
  const argv = process.argv.slice(2);
  const payload = buildFixturePayload();

  let notifyMod;
  try {
    notifyMod = await loadNotifyModule();
  } catch {
    printStatus('validation_failed');
    process.exit(1);
  }

  const { validateM55OpsNotifyEvent, notifyM55Ops } = notifyMod;
  const validated = validateM55OpsNotifyEvent(payload);
  if (!validated.ok) {
    printStatus('validation_failed');
    process.exit(1);
  }

  const mode = evaluateFixtureMode(argv, process.env);
  if (mode.status !== 'send') {
    printStatus(mode.status);
    process.exit(0);
  }

  const result = await notifyM55Ops(validated.event);
  if (result === 'sent') {
    printStatus('sent');
    process.exit(0);
  }
  if (result === 'disabled') {
    printStatus('disabled');
    process.exit(0);
  }
  if (result === 'skipped') {
    printStatus('blocked');
    process.exit(0);
  }
  printStatus('failed');
  process.exit(0);
}

const isMain =
  Boolean(process.argv[1]) &&
  path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));

if (isMain) {
  main().catch(() => {
    printStatus('failed');
    process.exit(1);
  });
}
