/**
 * Selfcheck for send-m55-ops-notify-fixture.mjs — no real Slack network calls.
 */
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE_SCRIPT = path.join(__dirname, 'send-m55-ops-notify-fixture.mjs');

async function importFixture() {
  return import('./send-m55-ops-notify-fixture.mjs');
}

function assert(label, cond) {
  if (!cond) {
    console.error(`FAIL ${label}`);
    return false;
  }
  console.log(`OK ${label}`);
  return true;
}

function outputHasNoSecrets(text) {
  const forbidden = [
    /whsec_/i,
    /\bsk_(live|test)_/i,
    /hooks\.slack\.com\/services\/[A-Za-z0-9/]+/,
    /process\.env/,
    /M55_OPS_SLACK_WEBHOOK_URL\s*=/,
  ];
  return !forbidden.some((re) => re.test(text));
}

function runFixtureScript(argv, env = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [FIXTURE_SCRIPT, ...argv], {
      cwd: path.join(__dirname, '../..'),
      env: { ...process.env, ...env },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => {
      stdout += d.toString();
    });
    child.stderr.on('data', (d) => {
      stderr += d.toString();
    });
    child.on('close', (code) => {
      resolve({
        code: code ?? 1,
        stdout: stdout.trim(),
        stderr: stderr.trim(),
      });
    });
    child.on('error', reject);
  });
}

async function main() {
  let failed = 0;
  const fail = (label, cond) => {
    if (!assert(label, cond)) failed += 1;
  };

  const {
    buildFixturePayload,
    evaluateFixtureMode,
    FIXTURE_CONFIRM_VALUE,
    FIXTURE_DEDUPE_KEY,
  } = await importFixture();

  let notifyMod;
  try {
    notifyMod = await import('../../lib/m55/ops/m55OpsNotify.ts');
  } catch (e) {
    console.error('FAIL cannot import m55OpsNotify.ts', e);
    process.exit(1);
  }

  const payload = buildFixturePayload();
  fail('fixture severity SEV-4', payload.severity === 'SEV-4');
  fail('fixture phase AS-B6-R-R', payload.phase === 'AS-B6-R-R');
  fail('fixture dedupe key', payload.dedupeSafeKey === FIXTURE_DEDUPE_KEY);
  fail('no TEST severity', payload.severity !== 'TEST');

  const v = notifyMod.validateM55OpsNotifyEvent(payload);
  fail('fixture payload validates', v.ok === true);

  fail('default mode dry_run', evaluateFixtureMode([], {}).status === 'dry_run');
  fail(
    '--send without confirm blocked',
    evaluateFixtureMode(['--send'], {}).status === 'blocked',
  );
  fail(
    'send+confirm without enabled disabled',
    evaluateFixtureMode(['--send'], {
      M55_OPS_FIXTURE_CONFIRM: FIXTURE_CONFIRM_VALUE,
    }).status === 'disabled',
  );
  fail(
    'send+confirm+enabled without webhook blocked',
    evaluateFixtureMode(['--send'], {
      M55_OPS_FIXTURE_CONFIRM: FIXTURE_CONFIRM_VALUE,
      M55_OPS_NOTIFY_ENABLED: 'true',
    }).status === 'blocked',
  );

  // Default CLI run — no send
  {
    const prevEn = process.env.M55_OPS_NOTIFY_ENABLED;
    const prevUrl = process.env.M55_OPS_SLACK_WEBHOOK_URL;
    const prevConfirm = process.env.M55_OPS_FIXTURE_CONFIRM;
    delete process.env.M55_OPS_NOTIFY_ENABLED;
    delete process.env.M55_OPS_SLACK_WEBHOOK_URL;
    delete process.env.M55_OPS_FIXTURE_CONFIRM;

    const r = await runFixtureScript([]);
    fail('default CLI exit 0', r.code === 0);
    fail('default CLI stdout dry_run', r.stdout === 'dry_run');
    fail('default CLI no secrets in output', outputHasNoSecrets(r.stdout + r.stderr));

    if (prevEn !== undefined) process.env.M55_OPS_NOTIFY_ENABLED = prevEn;
    else delete process.env.M55_OPS_NOTIFY_ENABLED;
    if (prevUrl !== undefined) process.env.M55_OPS_SLACK_WEBHOOK_URL = prevUrl;
    else delete process.env.M55_OPS_SLACK_WEBHOOK_URL;
    if (prevConfirm !== undefined) process.env.M55_OPS_FIXTURE_CONFIRM = prevConfirm;
    else delete process.env.M55_OPS_FIXTURE_CONFIRM;
  }

  // --send without confirm — blocked, no network
  {
    const r = await runFixtureScript(['--send'], {});
    fail('--send no confirm exit 0', r.code === 0);
    fail('--send no confirm stdout blocked', r.stdout === 'blocked');
    fail('--send no confirm no secrets', outputHasNoSecrets(r.stdout + r.stderr));
  }

  // Full guards pass + mocked notify in-process (child spawn cannot inherit fetch mock)
  {
    const prevEn = process.env.M55_OPS_NOTIFY_ENABLED;
    const prevUrl = process.env.M55_OPS_SLACK_WEBHOOK_URL;
    const prevConfirm = process.env.M55_OPS_FIXTURE_CONFIRM;

    process.env.M55_OPS_FIXTURE_CONFIRM = FIXTURE_CONFIRM_VALUE;
    process.env.M55_OPS_NOTIFY_ENABLED = 'true';
    process.env.M55_OPS_SLACK_WEBHOOK_URL = 'https://hooks.slack.com/services/TEST/TEST/TEST';

    fail(
      'all guards pass in-process',
      evaluateFixtureMode(['--send'], process.env).status === 'send',
    );

    const origFetch = globalThis.fetch;
    globalThis.fetch = async () => ({ ok: true, status: 200 });
    const uniquePayload = {
      ...buildFixturePayload(),
      dedupeSafeKey: `as-b6-r-harness-selfcheck-${Date.now()}`,
    };
    const validated = notifyMod.validateM55OpsNotifyEvent(uniquePayload);
    fail('unique payload validates', validated.ok === true);
    if (validated.ok) {
      const r = await notifyMod.notifyM55Ops(validated.event);
      fail('in-process mocked notify returns sent', r === 'sent');
    }

    globalThis.fetch = origFetch;
    if (prevEn !== undefined) process.env.M55_OPS_NOTIFY_ENABLED = prevEn;
    else delete process.env.M55_OPS_NOTIFY_ENABLED;
    if (prevUrl !== undefined) process.env.M55_OPS_SLACK_WEBHOOK_URL = prevUrl;
    else delete process.env.M55_OPS_SLACK_WEBHOOK_URL;
    if (prevConfirm !== undefined) process.env.M55_OPS_FIXTURE_CONFIRM = prevConfirm;
    else delete process.env.M55_OPS_FIXTURE_CONFIRM;
  }

  if (failed > 0) {
    console.error(`FAILED ${failed} assertion(s)`);
    process.exit(1);
  }
  console.log('PASS send-m55-ops-notify-fixture.selfcheck');
}

main().catch((e) => {
  console.error('FAIL selfcheck runner', e);
  process.exit(1);
});
