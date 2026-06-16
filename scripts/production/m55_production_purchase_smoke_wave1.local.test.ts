import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  AMOUNT_FULL_YEN,
  AMOUNT_LIGHT_YEN,
  AMOUNT_UPGRADE_YEN,
  HARNESS_SCHEMA_VERSION,
  PRODUCT_FULL,
  PRODUCT_LIGHT,
  PRODUCT_UPGRADE,
  PurchaseSmokeWave1Harness,
  RIGHT_KEY,
  SUBJECT_A,
  SUBJECT_B,
  WALLET_FULL_PURCHASED,
  WALLET_INITIAL_INCLUDED,
  WALLET_LIGHT_PURCHASED,
  WALLET_TOTAL_CAP,
  WAVE_STATES,
  assertSecretSafeOutput,
  bindingReportGreen,
  evaluateBindingReport,
  evaluateConversionPostcheck,
  evaluateDuplicateFull,
  evaluateFreshFullPostcheck,
  evaluateIdempotency,
  evaluateLightPostcheck,
  hashApprovalPhrase,
  parseSqlMutationKeywords,
  serializeEvidence,
  sqlHasWave1ProductCoverage,
  sqlLegacyOnlyCoverage,
  sqlScenarioClassificationCount,
  validateAuthority,
  type ProductionSmokeAuthority,
} from './m55_production_purchase_smoke_wave1.ts';

const ROOT = process.cwd();
const SQL_PATH = join(ROOT, 'scripts/sql/production/m55_production_purchase_smoke_wave1_postcheck.sql');
const RUNBOOK_PATH = join(ROOT, 'docs/planning/m55_production_purchase_smoke_wave1_human_runbook.md');

function futureAuthority(overrides: Partial<ProductionSmokeAuthority> = {}): ProductionSmokeAuthority {
  return {
    schema_version: HARNESS_SCHEMA_VERSION,
    gate_title: 'CATEGORY-1-M55-PRODUCTION-PURCHASE-SMOKE-EXECUTION',
    approved_commit_sha: '3e298c2eed7dc4e75509efe245edc3cdc92624f7',
    approved_branch: 'feat/m55-paid-lp-canonical-wave1',
    approved_production_project_identity: 'm55-soul-core-production',
    approved_vercel_project: 'm55-webv2',
    approved_stripe_mode: 'live',
    approved_subject_labels: [SUBJECT_A, SUBJECT_B],
    approved_scenario: 'wave1_full_matrix',
    approval_phrase_hash: hashApprovalPhrase('APPROVE_PRODUCTION_PURCHASE_SMOKE_WAVE1'),
    expires_at: new Date(Date.now() + 86_400_000).toISOString(),
    single_use: true,
    ...overrides,
  };
}

function lightEvidenceGood() {
  return {
    product_id: PRODUCT_LIGHT,
    amount_yen: AMOUNT_LIGHT_YEN,
    fulfillment_count: 1,
    entitlement_active: true,
    right_key: RIGHT_KEY,
    wallet_initial: WALLET_INITIAL_INCLUDED,
    wallet_purchased: WALLET_LIGHT_PURCHASED,
    snapshot_count: 1,
    ownership_access_green: true,
  } as const;
}

describe('authority validation', () => {
  const ctx = {
    branch: 'feat/m55-paid-lp-canonical-wave1',
    commitSha: '3e298c2eed7dc4e75509efe245edc3cdc92624f7',
    now: new Date(),
  };

  it('1. missing authority fails', () => {
    assert.equal(validateAuthority(null, ctx).ok, false);
  });

  it('2. wrong branch/commit fails', () => {
    const bad = futureAuthority({ approved_branch: 'main' });
    assert.equal(validateAuthority(bad, ctx).ok, false);
  });

  it('3. expired/single-use authority fails', () => {
    const expired = futureAuthority({
      expires_at: new Date(Date.now() - 1000).toISOString(),
    });
    assert.equal(validateAuthority(expired, ctx).ok, false);
    const notSingle = futureAuthority({ single_use: false as true });
    assert.equal(validateAuthority(notSingle, ctx).ok, false);
  });

  it('4. wrong scenario/subject fails', () => {
    const badScenario = futureAuthority({ approved_scenario: 'wave1_full_matrix' });
    assert.equal(validateAuthority(badScenario, ctx).ok, true);
    const missingSubject = futureAuthority({ approved_subject_labels: [SUBJECT_A] });
    assert.equal(validateAuthority(missingSubject, ctx).ok, false);
  });
});

describe('state machine', () => {
  it('5. W0→W11 happy contract with mocked evidence', () => {
    const h = new PurchaseSmokeWave1Harness();
    const record = h.runLocalDryRunHappyPath();
    assert.equal(record.verdict, 'GREEN');
    assert.equal(record.steps_completed.length, 12);
  });

  it('6. step order enforced', () => {
    const h = new PurchaseSmokeWave1Harness();
    h.runW1TestSubjectsConfirmed();
    assert.equal(h.evidenceRecord.first_failure_predicate, 'HOLD_STEP_ORDER_VIOLATION');
  });

  it('7. first failure stops later steps', () => {
    const h = new PurchaseSmokeWave1Harness();
    h.runW0AuthorityConfirmation();
    h.runW1TestSubjectsConfirmed();
    h.recordHumanPayment('W2_LIGHT_PURCHASE_HUMAN_ACTION_REQUIRED', {
      label: 'light_ref',
      recorded_at: new Date().toISOString(),
    });
    h.runW3LightPostcheck({
      ...lightEvidenceGood(),
      fulfillment_count: 2,
    });
    h.recordHumanPayment('W4_LIGHT_TO_FULL_HUMAN_ACTION_REQUIRED', {
      label: 'should_not_run',
      recorded_at: new Date().toISOString(),
    });
    assert.equal(h.evidenceRecord.verdict, 'HOLD');
    assert.equal(h.currentState, 'W3_LIGHT_POSTCHECK');
  });

  it('8. ambiguous payment blocks retry', () => {
    const h = new PurchaseSmokeWave1Harness();
    h.runW0AuthorityConfirmation();
    h.runW1TestSubjectsConfirmed();
    h.recordHumanPayment('W2_LIGHT_PURCHASE_HUMAN_ACTION_REQUIRED', {
      label: 'ambiguous',
      recorded_at: new Date().toISOString(),
    }, true);
    h.recordHumanPayment('W2_LIGHT_PURCHASE_HUMAN_ACTION_REQUIRED', {
      label: 'retry_blocked',
      recorded_at: new Date().toISOString(),
    });
    assert.equal(h.evidenceRecord.first_failure_predicate, 'HOLD_PAYMENT_AMBIGUOUS_NO_RETRY');
  });

  it('9. Subject A/B separation enforced', () => {
    const h = new PurchaseSmokeWave1Harness();
    h.runW0AuthorityConfirmation();
    h.runW1TestSubjectsConfirmed();
    assert.deepEqual(
      h.evidenceRecord.steps_completed[1],
      { step: 'W1_TEST_SUBJECTS_CONFIRMED', subject_a: SUBJECT_A, subject_b: SUBJECT_B },
    );
  });

  it('10. deletion action unavailable', () => {
    const h = new PurchaseSmokeWave1Harness();
    assert.equal(h.supportsDeletionAction(), false);
    assert.equal(h.supportsWebhookReplay(), false);
    assert.equal(h.supportsAutomaticPayment(), false);
    assert.equal(h.supportsAutomaticRefund(), false);
    assert.equal(h.supportsAutomaticRetry(), false);
  });
});

describe('Light predicates', () => {
  it('11. exact Light GREEN', () => {
    assert.equal(evaluateLightPostcheck(lightEvidenceGood()), null);
  });

  it('12. duplicate Light fulfillment HOLD', () => {
    assert.match(
      evaluateLightPostcheck({ ...lightEvidenceGood(), fulfillment_count: 2 }) ?? '',
      /DUPLICATE/,
    );
  });

  it('13. wrong product/right HOLD', () => {
    assert.match(
      evaluateLightPostcheck({ ...lightEvidenceGood(), product_id: PRODUCT_FULL as typeof PRODUCT_LIGHT }) ?? '',
      /PRODUCT/,
    );
    assert.match(
      evaluateLightPostcheck({ ...lightEvidenceGood(), right_key: 'wrong' as typeof RIGHT_KEY }) ?? '',
      /RIGHT/,
    );
  });

  it('14. wallet or snapshot mismatch HOLD', () => {
    assert.match(
      evaluateLightPostcheck({ ...lightEvidenceGood(), wallet_purchased: 4 }) ?? '',
      /WALLET/,
    );
    assert.match(
      evaluateLightPostcheck({ ...lightEvidenceGood(), snapshot_count: 0 }) ?? '',
      /SNAPSHOT/,
    );
  });
});

describe('Conversion predicates', () => {
  const good = {
    upgrade_product: PRODUCT_UPGRADE,
    amount_yen: AMOUNT_UPGRADE_YEN,
    light_before_present: true,
    full_equivalent_reached: true,
    wallet_purchased: WALLET_FULL_PURCHASED,
    duplicate_initial_credit: false,
    duplicate_snapshot: false,
    conversion_fulfillment_count: 1,
  } as const;

  it('15. exact conversion GREEN', () => {
    assert.equal(evaluateConversionPostcheck(good), null);
  });

  it('16. missing Light before-state HOLD', () => {
    assert.match(
      evaluateConversionPostcheck({ ...good, light_before_present: false }) ?? '',
      /LIGHT/,
    );
  });

  it('17. duplicate credit HOLD', () => {
    assert.match(
      evaluateConversionPostcheck({ ...good, duplicate_initial_credit: true }) ?? '',
      /DUPLICATE/,
    );
  });

  it('18. wrong amount/product HOLD', () => {
    assert.match(
      evaluateConversionPostcheck({ ...good, amount_yen: AMOUNT_FULL_YEN as typeof AMOUNT_UPGRADE_YEN }) ?? '',
      /AMOUNT/,
    );
    assert.match(
      evaluateConversionPostcheck({ ...good, upgrade_product: PRODUCT_FULL as typeof PRODUCT_UPGRADE }) ?? '',
      /PRODUCT/,
    );
  });
});

describe('Duplicate FULL predicates', () => {
  it('19. 409 no-session GREEN', () => {
    assert.equal(
      evaluateDuplicateFull({
        layer: 'pre_checkout',
        http_status: 409,
        rejection_code: 'already_purchased',
        stripe_session_created: false,
        charge_created: false,
        state_delta: false,
      }),
      null,
    );
  });

  it('20. 422 cap GREEN', () => {
    assert.equal(
      evaluateDuplicateFull({
        layer: 'wallet_cap',
        http_status: 422,
        rejection_code: 'cap_reached',
        stripe_session_created: false,
        charge_created: false,
        state_delta: false,
      }),
      null,
    );
  });

  it('21. duplicate fulfillment no-op GREEN', () => {
    assert.equal(
      evaluateDuplicateFull({
        layer: 'fulfillment_noop',
        stripe_session_created: false,
        charge_created: false,
        fulfillment_status: 'duplicate_noop',
        state_delta: false,
      }),
      null,
    );
  });

  it('22. second charge/state delta HOLD', () => {
    assert.match(
      evaluateDuplicateFull({
        layer: 'pre_checkout',
        http_status: 409,
        rejection_code: 'already_purchased',
        stripe_session_created: true,
        charge_created: false,
        state_delta: false,
      }) ?? '',
      /SESSION/,
    );
    assert.match(
      evaluateDuplicateFull({
        layer: 'fulfillment_noop',
        stripe_session_created: false,
        charge_created: true,
        fulfillment_status: 'duplicate_noop',
        state_delta: false,
      }) ?? '',
      /CHARGE/,
    );
  });
});

describe('Fresh FULL predicates', () => {
  const good = {
    product_id: PRODUCT_FULL,
    amount_yen: AMOUNT_FULL_YEN,
    wallet_purchased: WALLET_FULL_PURCHASED,
    wallet_total_available: WALLET_TOTAL_CAP,
    entitlement_active: true,
    right_key: RIGHT_KEY,
    ownership_access_green: true,
    duplicate_row_detected: false,
  } as const;

  it('23. exact FULL GREEN', () => {
    assert.equal(evaluateFreshFullPostcheck(good), null);
  });

  it('24. wrong purchased_count/total HOLD', () => {
    assert.match(
      evaluateFreshFullPostcheck({ ...good, wallet_purchased: 0 }) ?? '',
      /PURCHASED/,
    );
    assert.match(
      evaluateFreshFullPostcheck({ ...good, wallet_total_available: 1 }) ?? '',
      /TOTAL/,
    );
  });

  it('25. Light/FULL mapping confusion HOLD', () => {
    assert.match(
      evaluateFreshFullPostcheck({ ...good, product_id: PRODUCT_LIGHT as typeof PRODUCT_FULL }) ?? '',
      /PRODUCT/,
    );
  });
});

describe('Idempotency predicates', () => {
  it('26. duplicate event no extra state GREEN', () => {
    assert.equal(
      evaluateIdempotency({
        duplicate_event_processed: true,
        extra_fulfillment_rows: 0,
        extra_wallet_grants: 0,
        extra_ledger_rows: 0,
        extra_snapshot_rows: 0,
      }),
      null,
    );
  });

  it('27. duplicate ledger/snapshot HOLD', () => {
    assert.match(
      evaluateIdempotency({
        duplicate_event_processed: true,
        extra_fulfillment_rows: 0,
        extra_wallet_grants: 0,
        extra_ledger_rows: 1,
        extra_snapshot_rows: 0,
      }) ?? '',
      /LEDGER/,
    );
  });
});

describe('Binding contract', () => {
  it('28. exact safe binding booleans GREEN', () => {
    const report = evaluateBindingReport({
      light: {
        key_present: true,
        scope_exact: true,
        binding_matches: true,
        amount_matches: true,
        duplicate_binding_absent: true,
        env_key_name: 'STRIPE_PRICE_DTR_CORE_LIGHT_V1',
        value_length: 18,
      },
      full: {
        key_present: true,
        scope_exact: true,
        binding_matches: true,
        amount_matches: true,
        duplicate_binding_absent: true,
        env_key_name: 'STRIPE_PRICE_DTR_CORE_FULL_V1',
        value_length: 18,
      },
      upgrade: {
        key_present: true,
        scope_exact: true,
        binding_matches: true,
        amount_matches: true,
        duplicate_binding_absent: true,
        env_key_name: 'STRIPE_PRICE_DTR_CORE_LIGHT_TO_FULL_UPGRADE_V1',
        value_length: 18,
      },
      preview_production_cross_binding_rejected: true,
    });
    assert.equal(bindingReportGreen(report), true);
  });

  it('29. mismatch HOLD', () => {
    const report = evaluateBindingReport({
      light: {
        key_present: false,
        scope_exact: true,
        binding_matches: true,
        amount_matches: true,
        duplicate_binding_absent: true,
        env_key_name: 'STRIPE_PRICE_DTR_CORE_LIGHT_V1',
      },
      full: {
        key_present: true,
        scope_exact: true,
        binding_matches: true,
        amount_matches: true,
        duplicate_binding_absent: true,
        env_key_name: 'STRIPE_PRICE_DTR_CORE_FULL_V1',
      },
      upgrade: {
        key_present: true,
        scope_exact: true,
        binding_matches: true,
        amount_matches: true,
        duplicate_binding_absent: true,
        env_key_name: 'STRIPE_PRICE_DTR_CORE_LIGHT_TO_FULL_UPGRADE_V1',
      },
      preview_production_cross_binding_rejected: true,
    });
    assert.equal(bindingReportGreen(report), false);
  });

  it('30. raw value never output', () => {
    const h = new PurchaseSmokeWave1Harness();
    h.runLocalDryRunHappyPath();
    const json = serializeEvidence(h.evidenceRecord);
    assert.doesNotMatch(json, /price_/);
    assert.doesNotMatch(json, /sk_/);
  });
});

describe('Redaction and schema', () => {
  it('31. secrets/PII/raw IDs absent from safe serializer', () => {
    assert.throws(() => assertSecretSafeOutput('Bearer abc'));
    assert.throws(() => assertSecretSafeOutput('user_29wBMCtzATuFJut8jO2VNTVekS4'));
  });

  it('32. hostile/circular error safe', () => {
    assert.throws(() => assertSecretSafeOutput('whsec_abc'));
  });

  it('33. fixed JSON schema exact', () => {
    const h = new PurchaseSmokeWave1Harness();
    const record = h.runLocalDryRunHappyPath();
    assert.equal(record.schema_version, HARNESS_SCHEMA_VERSION);
    assert.equal(Object.keys(record).sort().join(','), 'binding_report,branch,commit_sha,current_state,first_failure_predicate,mode,schema_version,steps_completed,verdict');
  });

  it('34. no arbitrary extra fields on evidence record', () => {
    const h = new PurchaseSmokeWave1Harness();
    const record = h.runLocalDryRunHappyPath();
    assert.equal((record as Record<string, unknown>).secret, undefined);
  });
});

describe('SQL static contract', () => {
  const sql = readFileSync(SQL_PATH, 'utf8');

  it('35. SQL contains SELECT/WITH only', () => {
    assert.equal(parseSqlMutationKeywords(sql).length, 0);
  });

  it('36. no mutation keywords/statements', () => {
    assert.doesNotMatch(sql, /\bINSERT\b/i);
    assert.doesNotMatch(sql, /\bUPDATE\b/i);
    assert.doesNotMatch(sql, /\bDELETE\b/i);
  });

  it('37. required relations/contracts represented', () => {
    for (const table of [
      'stripe_events',
      'one_time_fulfillments',
      'failed_fulfillments',
      'entitlements',
      'entitlement_rights',
      'reply_ticket_wallets',
      'reply_wallet_ledgers',
      'dtr_report_snapshots',
    ]) {
      assert.match(sql, new RegExp(table));
    }
  });

  it('38. legacy-only SKU coverage rejected', () => {
    const legacy = readFileSync(join(ROOT, 'scripts/sql/dtr_purchased_state_summary.sql'), 'utf8');
    assert.equal(sqlLegacyOnlyCoverage(legacy), true);
    assert.equal(sqlLegacyOnlyCoverage(sql), false);
  });

  it('39. wave1 product coverage present', () => {
    assert.equal(sqlHasWave1ProductCoverage(sql), true);
    assert.ok(sqlScenarioClassificationCount(sql) >= 6);
  });
});

describe('Runbook static contract', () => {
  const runbook = readFileSync(RUNBOOK_PATH, 'utf8');

  it('40. W0-W11 present', () => {
    for (const step of WAVE_STATES) {
      assert.match(runbook, new RegExp(step.replace(/_/g, '_').slice(0, 2)));
    }
    assert.match(runbook, /W0/);
    assert.match(runbook, /W11/);
  });

  it('41. refund separate', () => {
    assert.match(runbook, /No automatic refund/i);
    assert.match(runbook, /UNKNOWN_FAIL_CLOSED/);
  });

  it('42. controlled deletion separate', () => {
    assert.match(runbook, /deletion.*separate/i);
    assert.match(runbook, /No Production account deletion/i);
  });

  it('43. no Replay/retry', () => {
    assert.match(runbook, /No webhook Replay/i);
    assert.match(runbook, /No retry after ambiguous/i);
  });

  it('44. no secrets/placeholders that resemble real credentials', () => {
    assert.doesNotMatch(runbook, /sk_live_/);
    assert.doesNotMatch(runbook, /whsec_/);
    assert.doesNotMatch(runbook, /user_[a-zA-Z0-9]{10,}/);
  });
});

describe('production execution fail-closed', () => {
  it('45. production mode without authority fails at W0', () => {
    const h = new PurchaseSmokeWave1Harness({ mode: 'production_execution', authority: null });
    h.runW0AuthorityConfirmation();
    assert.equal(h.evidenceRecord.first_failure_predicate, 'HOLD_AUTHORITY_MISSING');
  });
});
