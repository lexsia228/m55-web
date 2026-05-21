/**
 * Selfcheck for send-m55-ops-notify-fixture.mjs — no real Slack network calls.
 */
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE_SCRIPT = path.join(__dirname, 'send-m55-ops-notify-fixture.mjs');
const DUMMY_WEBHOOK = 'https://hooks.slack.com/services/TEST/TEST/TEST';

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
    /M55_OPS_FIXTURE_CONFIRM\s*=/,
    /M55_OPS_NOTIFY_ENABLED\s*=/,
  ];
  return !forbidden.some((re) => re.test(text));
}

function stdoutIsDiagnoseOnly(stdout) {
  const lines = stdout.split('\n').map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return false;
  return lines.every((line) => /^diagnose:(mode|validation|payload):[a-z0-9_]+$/.test(line));
}

function stdoutIncludes(stdout, label) {
  return stdout.split('\n').some((l) => l.trim() === label);
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
    buildDiagnoseLabels,
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

  // buildDiagnoseLabels unit checks
  {
    const labels = buildDiagnoseLabels([], {}, true);
    fail('diagnose unit dry_run mode', labels.includes('diagnose:mode:dry_run'));
    fail(
      'diagnose unit missing_send_flag',
      labels.includes('diagnose:validation:missing_send_flag'),
    );
    fail('diagnose unit payload valid', labels.includes('diagnose:payload:valid'));
  }

  {
    const labels = buildDiagnoseLabels(['--send'], {}, true);
    fail('diagnose unit send_requested', labels.includes('diagnose:mode:send_requested'));
    fail(
      'diagnose unit missing_confirm',
      labels.includes('diagnose:validation:missing_confirm'),
    );
    fail(
      'diagnose unit missing_enabled on --send',
      labels.includes('diagnose:validation:missing_enabled'),
    );
    fail(
      'diagnose unit missing_webhook on --send',
      labels.includes('diagnose:validation:missing_webhook'),
    );
  }

  {
    const labels = buildDiagnoseLabels(
      ['--send'],
      { M55_OPS_FIXTURE_CONFIRM: FIXTURE_CONFIRM_VALUE },
      true,
    );
    fail(
      'diagnose unit confirm only missing_enabled',
      labels.includes('diagnose:validation:missing_enabled'),
    );
    fail(
      'diagnose unit confirm only missing_webhook',
      labels.includes('diagnose:validation:missing_webhook'),
    );
    fail(
      'diagnose unit confirm only no missing_confirm',
      !labels.includes('diagnose:validation:missing_confirm'),
    );
  }

  {
    const labels = buildDiagnoseLabels(
      ['--send'],
      {
        M55_OPS_FIXTURE_CONFIRM: FIXTURE_CONFIRM_VALUE,
        M55_OPS_NOTIFY_ENABLED: 'true',
      },
      true,
    );
    fail(
      'diagnose unit enabled only missing_webhook',
      labels.includes('diagnose:validation:missing_webhook'),
    );
    fail(
      'diagnose unit enabled only send satisfied absent',
      !labels.includes('diagnose:validation:send_conditions_satisfied'),
    );
  }

  {
    const labels = buildDiagnoseLabels(
      ['--send'],
      {
        M55_OPS_FIXTURE_CONFIRM: FIXTURE_CONFIRM_VALUE,
        M55_OPS_NOTIFY_ENABLED: 'true',
        M55_OPS_SLACK_WEBHOOK_URL: DUMMY_WEBHOOK,
      },
      true,
    );
    fail(
      'diagnose unit all guards send_conditions_satisfied',
      labels.includes('diagnose:validation:send_conditions_satisfied'),
    );
  }

  {
    const labels = buildDiagnoseLabels(
      ['--send'],
      {
        M55_OPS_FIXTURE_CONFIRM: FIXTURE_CONFIRM_VALUE,
        M55_OPS_NOTIFY_ENABLED: 'true',
        M55_OPS_SLACK_WEBHOOK_URL: 'https://example.com/not-slack',
      },
      true,
    );
    fail(
      'diagnose unit invalid webhook prefix label',
      labels.includes('diagnose:validation:invalid_webhook_prefix'),
    );
  }

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

  // --diagnose CLI matrix — no notifyM55Ops / no fetch (spawn only)
  {
    const r = await runFixtureScript(['--diagnose'], {});
    fail('--diagnose exit 0', r.code === 0);
    fail('--diagnose stdout diagnose-only', stdoutIsDiagnoseOnly(r.stdout));
    fail('--diagnose mode dry_run', stdoutIncludes(r.stdout, 'diagnose:mode:dry_run'));
    fail(
      '--diagnose missing_send_flag',
      stdoutIncludes(r.stdout, 'diagnose:validation:missing_send_flag'),
    );
    fail('--diagnose payload valid', stdoutIncludes(r.stdout, 'diagnose:payload:valid'));
    fail('--diagnose not dry_run status word', r.stdout !== 'dry_run');
    fail('--diagnose no secrets', outputHasNoSecrets(r.stdout + r.stderr));
  }

  {
    const r = await runFixtureScript(['--diagnose', '--send'], {});
    fail('--diagnose --send exit 0', r.code === 0);
    fail('--diagnose --send diagnose-only', stdoutIsDiagnoseOnly(r.stdout));
    fail(
      '--diagnose --send send_requested',
      stdoutIncludes(r.stdout, 'diagnose:mode:send_requested'),
    );
    fail(
      '--diagnose --send missing_confirm',
      stdoutIncludes(r.stdout, 'diagnose:validation:missing_confirm'),
    );
    fail('--diagnose --send no sent stdout', r.stdout !== 'sent');
    fail('--diagnose --send no secrets', outputHasNoSecrets(r.stdout + r.stderr));
  }

  {
    const r = await runFixtureScript(['--diagnose', '--send'], {
      M55_OPS_FIXTURE_CONFIRM: FIXTURE_CONFIRM_VALUE,
    });
    fail('--diagnose confirm+send exit 0', r.code === 0);
    fail('--diagnose confirm+send diagnose-only', stdoutIsDiagnoseOnly(r.stdout));
    fail(
      '--diagnose confirm+send missing_enabled',
      stdoutIncludes(r.stdout, 'diagnose:validation:missing_enabled'),
    );
    fail(
      '--diagnose confirm+send missing_webhook',
      stdoutIncludes(r.stdout, 'diagnose:validation:missing_webhook'),
    );
    fail('--diagnose confirm+send no secrets', outputHasNoSecrets(r.stdout + r.stderr));
  }

  {
    const r = await runFixtureScript(['--diagnose', '--send'], {
      M55_OPS_NOTIFY_ENABLED: 'true',
    });
    fail('--diagnose enabled+send exit 0', r.code === 0);
    fail('--diagnose enabled+send diagnose-only', stdoutIsDiagnoseOnly(r.stdout));
    fail(
      '--diagnose enabled+send missing_confirm',
      stdoutIncludes(r.stdout, 'diagnose:validation:missing_confirm'),
    );
    fail('--diagnose enabled+send no secrets', outputHasNoSecrets(r.stdout + r.stderr));
  }

  {
    const r = await runFixtureScript(['--diagnose', '--send'], {
      M55_OPS_FIXTURE_CONFIRM: FIXTURE_CONFIRM_VALUE,
      M55_OPS_NOTIFY_ENABLED: 'true',
      M55_OPS_SLACK_WEBHOOK_URL: DUMMY_WEBHOOK,
    });
    fail('--diagnose full guards exit 0', r.code === 0);
    fail('--diagnose full guards diagnose-only', stdoutIsDiagnoseOnly(r.stdout));
    fail(
      '--diagnose full guards send_conditions_satisfied',
      stdoutIncludes(r.stdout, 'diagnose:validation:send_conditions_satisfied'),
    );
    fail('--diagnose full guards no sent stdout', r.stdout !== 'sent');
    fail('--diagnose full guards no secrets', outputHasNoSecrets(r.stdout + r.stderr));
  }

  // Full guards pass + mocked notify in-process (child spawn cannot inherit fetch mock)
  {
    const prevEn = process.env.M55_OPS_NOTIFY_ENABLED;
    const prevUrl = process.env.M55_OPS_SLACK_WEBHOOK_URL;
    const prevConfirm = process.env.M55_OPS_FIXTURE_CONFIRM;

    process.env.M55_OPS_FIXTURE_CONFIRM = FIXTURE_CONFIRM_VALUE;
    process.env.M55_OPS_NOTIFY_ENABLED = 'true';
    process.env.M55_OPS_SLACK_WEBHOOK_URL = DUMMY_WEBHOOK;

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
