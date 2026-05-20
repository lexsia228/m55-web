/**
 * Ops notify self-check (AS-B4). Run: node lib/m55/ops/m55OpsNotify.selfcheck.mjs
 * No real Slack network calls — fetch is mocked when testing send path.
 */
async function main() {
  let mod;
  try {
    mod = await import('./m55OpsNotify.ts');
  } catch (e) {
    console.error('FAIL: cannot import m55OpsNotify.ts', e);
    process.exit(1);
  }

  const {
    validateM55OpsNotifyEvent,
    buildM55OpsSlackPayload,
    notifyM55Ops,
    notifyM55OpsFireAndForget,
    m55OpsEventMissingClientReferenceId,
    m55OpsEventInternalProcessingFailed,
    m55OpsEventSnapshotSkip,
  } = mod;

  let failed = 0;

  function assert(label, cond) {
    if (!cond) {
      console.error(`FAIL ${label}`);
      failed += 1;
    } else {
      console.log(`OK ${label}`);
    }
  }

  const baseEvent = {
    phase: '5Z-I-V-AS-B4',
    environmentSafeLabel: 'm55-soul-core',
    severity: 'SEV-1',
    triggerCategory: 'test_trigger',
    countsOnlySummary: 'failed_total=7 delta_24h=0',
    nextRecommendedGate: 'AS-B1-MONITOR',
    timestampSafeLabel: '2026-05-20T09:00:00.000Z',
    sourceSafeLabel: 'selfcheck',
  };

  // Allowed payload validates
  {
    const r = validateM55OpsNotifyEvent(baseEvent);
    assert('allowed payload validates', r.ok === true);
  }

  // Prohibited user_id key
  {
    const r = validateM55OpsNotifyEvent({ ...baseEvent, user_id: 'u_123' });
    assert('prohibited user_id rejected', r.ok === false);
  }

  // Prohibited email in summary
  {
    const r = validateM55OpsNotifyEvent({
      ...baseEvent,
      countsOnlySummary: 'contact=ops@example.com',
    });
    assert('prohibited email pattern rejected', r.ok === false);
  }

  // Prohibited Stripe-like ID in summary
  {
    const r = validateM55OpsNotifyEvent({
      ...baseEvent,
      countsOnlySummary: 'session=cs_test_abc123',
    });
    assert('prohibited cs_ pattern rejected', r.ok === false);
  }

  // Severity mapping
  for (const sev of ['SEV-1', 'SEV-2', 'SEV-3', 'SEV-4']) {
    const r = validateM55OpsNotifyEvent({ ...baseEvent, severity: sev });
    assert(`severity ${sev}`, r.ok === true);
  }

  // Slack text has no secret-like substrings
  {
    const text = buildM55OpsSlackPayload(baseEvent).text;
    assert('slack text no whsec', !/whsec_/i.test(text));
    assert('slack text no sk_', !/\bsk_/i.test(text));
    assert('counts-only summary present', text.includes('failed_total=7'));
  }

  // Missing env / disabled flag → disabled
  {
    const prevEn = process.env.M55_OPS_NOTIFY_ENABLED;
    const prevUrl = process.env.M55_OPS_SLACK_WEBHOOK_URL;
    delete process.env.M55_OPS_NOTIFY_ENABLED;
    delete process.env.M55_OPS_SLACK_WEBHOOK_URL;
    const r = await notifyM55Ops(baseEvent);
    assert('missing env returns disabled', r === 'disabled');
    if (prevEn !== undefined) process.env.M55_OPS_NOTIFY_ENABLED = prevEn;
    if (prevUrl !== undefined) process.env.M55_OPS_SLACK_WEBHOOK_URL = prevUrl;
  }

  {
    const prevEn = process.env.M55_OPS_NOTIFY_ENABLED;
    const prevUrl = process.env.M55_OPS_SLACK_WEBHOOK_URL;
    process.env.M55_OPS_NOTIFY_ENABLED = 'false';
    process.env.M55_OPS_SLACK_WEBHOOK_URL = 'https://hooks.slack.com/services/T/B/X';
    const r = await notifyM55Ops(baseEvent);
    assert('disabled flag returns disabled', r === 'disabled');
    if (prevEn !== undefined) process.env.M55_OPS_NOTIFY_ENABLED = prevEn;
    else delete process.env.M55_OPS_NOTIFY_ENABLED;
    if (prevUrl !== undefined) process.env.M55_OPS_SLACK_WEBHOOK_URL = prevUrl;
    else delete process.env.M55_OPS_SLACK_WEBHOOK_URL;
  }

  // Mocked fetch send path (no real network)
  {
    const prevEn = process.env.M55_OPS_NOTIFY_ENABLED;
    const prevUrl = process.env.M55_OPS_SLACK_WEBHOOK_URL;
    process.env.M55_OPS_NOTIFY_ENABLED = 'true';
    process.env.M55_OPS_SLACK_WEBHOOK_URL = 'https://hooks.slack.com/services/TEST/TEST/TEST';

    const origFetch = globalThis.fetch;
    globalThis.fetch = async () => ({ ok: true, status: 200 });

    const r = await notifyM55Ops(baseEvent);
    assert('mocked enabled send returns sent', r === 'sent');

    globalThis.fetch = origFetch;
    if (prevEn !== undefined) process.env.M55_OPS_NOTIFY_ENABLED = prevEn;
    else delete process.env.M55_OPS_NOTIFY_ENABLED;
    if (prevUrl !== undefined) process.env.M55_OPS_SLACK_WEBHOOK_URL = prevUrl;
    else delete process.env.M55_OPS_SLACK_WEBHOOK_URL;
  }

  // Fire-and-forget never throws
  {
    let threw = false;
    try {
      notifyM55OpsFireAndForget({ ...baseEvent, user_id: 'bad' });
      notifyM55OpsFireAndForget(m55OpsEventMissingClientReferenceId());
      notifyM55OpsFireAndForget(m55OpsEventInternalProcessingFailed('db_error'));
      notifyM55OpsFireAndForget(m55OpsEventSnapshotSkip('missing_profile_for_snapshot'));
    } catch {
      threw = true;
    }
    assert('fireAndForget never throws', !threw);
  }

  // Builder events validate
  {
    const r1 = validateM55OpsNotifyEvent(m55OpsEventMissingClientReferenceId());
    const r2 = validateM55OpsNotifyEvent(m55OpsEventInternalProcessingFailed('retrieve_failed'));
    const r3 = validateM55OpsNotifyEvent(m55OpsEventSnapshotSkip('missing_profile_for_snapshot'));
    assert('builder missing_client_reference_id', r1.ok === true);
    assert('builder internal_processing_failed', r2.ok === true);
    assert('builder snapshot_skip', r3.ok === true);
  }

  if (failed > 0) {
    console.error(`FAILED ${failed} assertion(s)`);
    process.exit(1);
  }
  console.log('PASS m55OpsNotify.selfcheck');
}

main().catch((e) => {
  console.error('FAIL selfcheck runner', e);
  process.exit(1);
});
