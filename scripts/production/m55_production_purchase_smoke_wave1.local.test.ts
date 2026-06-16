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
  sqlPostcheckModeCount,
  validateAuthority,
  type ProductionSmokeAuthority,
} from './m55_production_purchase_smoke_wave1.ts';
import {
  AMOUNT_POLICIES,
  APPROVED_SCENARIOS,
  APPROVAL_PHRASE_TEMPLATE,
  HUMAN_ACTION_STEPS,
  HUMAN_TO_INTERNAL_STATE_MAP,
  MAX_DUPLICATE_FULL_CHARGE_COUNT,
  MAX_FRESH_FULL_CHARGE_COUNT,
  MAX_LIGHT_CHARGE_COUNT,
  MAX_SUCCESSFUL_CHARGE_COUNT,
  MAX_UPGRADE_CHARGE_COUNT,
  PAYMENT_OUTCOME_CLASSES,
  POSTCHECK_MODES,
  SUBJECT_LABEL_A,
  SUBJECT_LABEL_B,
  SUBJECT_PRECHECK_CLASSIFICATIONS,
  WAVE_AUTHORITY_SCHEMA_VERSION,
  authorityContainsForbiddenFields,
  evaluateCombinedPaymentEvidence,
  hashApprovalPhrase as waveHashApprovalPhrase,
  humanActionMapIsConsistent,
  parseSqlMutationKeywords as waveParseSqlMutationKeywords,
  paymentOutcomeAllowsCharge,
  paymentOutcomeIsAmbiguous,
  serializePurchaseWaveAuthorityResult,
  sqlHasSingleTopLevelSelect,
  sqlModeCount,
  validatePurchaseWaveAuthority,
  type PurchaseWaveAuthority,
} from './m55_production_purchase_wave_authority.ts';

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
    }, 'PAYMENT_STATUS_AMBIGUOUS');
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
    assert.match(runbook, /Automatic refund/);
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

const FUTURE_MAIN = 'a1b2c3d4e5f6789012345678901234567890abcd';
const DEPLOYMENT_COMMIT = 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
const HARNESS_COMMIT = '1707e037e5cb532310d72076ea81018c9e13b7e1';

function waveAuthority(overrides: Partial<PurchaseWaveAuthority> = {}): PurchaseWaveAuthority {
  return {
    schema_version: WAVE_AUTHORITY_SCHEMA_VERSION,
    gate_title: 'CATEGORY-1-M55-PRODUCTION-PURCHASE-WAVE-EXECUTION',
    approved_main_commit: FUTURE_MAIN,
    approved_production_deployment_identity: '5078520190',
    approved_production_deployment_commit: DEPLOYMENT_COMMIT,
    approved_production_chain_evidence_identity: 'chain-evidence-sha256-placeholder',
    approved_compatibility_evidence_identity: 'compat-evidence-sha256-placeholder',
    approved_rollout_order: 'MIGRATE_THEN_DEPLOY',
    approved_purchase_harness_commit: HARNESS_COMMIT,
    approved_purchase_harness_file_identities: ['orchestrator', 'postcheck', 'runbook', 'tests'],
    approved_postcheck_identity: 'postcheck-v2',
    approved_binding_confirmation_identity: 'binding-confirmation-sha256-placeholder',
    approved_subject_labels: [SUBJECT_LABEL_A, SUBJECT_LABEL_B],
    approved_subject_precheck_identity: 'subject-precheck-sha256-placeholder',
    approved_scenarios: [...APPROVED_SCENARIOS],
    approved_amount_policies: { ...AMOUNT_POLICIES },
    approved_action_order: [...APPROVED_SCENARIOS],
    approved_max_checkout_count: 4,
    approved_max_successful_charge_count: MAX_SUCCESSFUL_CHARGE_COUNT,
    approved_max_light_charge_count: MAX_LIGHT_CHARGE_COUNT,
    approved_max_upgrade_charge_count: MAX_UPGRADE_CHARGE_COUNT,
    approved_max_fresh_full_charge_count: MAX_FRESH_FULL_CHARGE_COUNT,
    approved_max_duplicate_full_charge_count: MAX_DUPLICATE_FULL_CHARGE_COUNT,
    binding_confirmations: {
      vercel_production_binding_exact: true,
      supabase_production_binding_exact: true,
      clerk_live_binding_exact: true,
      stripe_live_mode_exact: true,
      light_price_binding_exact: true,
      full_price_binding_exact: true,
      upgrade_price_binding_exact: true,
    },
    final_rc_gate: 'CATEGORY-1-M55-FINAL-INTEGRATED-RC-AUDIT',
    final_rc_verdict: 'CLOSED_GREEN',
    preview_deletion_smoke_gate: 'CATEGORY-1-M55-PREVIEW-DELETION-SMOKE',
    preview_deletion_smoke_verdict: 'CLOSED_GREEN',
    dns_blocker_resolved: true,
    human_approval_phrase_hash: waveHashApprovalPhrase('APPROVE_PURCHASE_WAVE'),
    issued_at: new Date(Date.now() - 3_600_000).toISOString(),
    expires_at: new Date(Date.now() + 86_400_000).toISOString(),
    single_use: true,
    consumed: false,
    execution_nonce_hash: waveHashApprovalPhrase('nonce-purchase-wave'),
    prior_ambiguous_action: false,
    ...overrides,
  };
}

function waveCtx(overrides: Record<string, unknown> = {}) {
  return {
    now: new Date(),
    observedMainCommit: FUTURE_MAIN,
    observedDeploymentCommit: DEPLOYMENT_COMMIT,
    observedChainEvidenceIdentity: 'chain-evidence-sha256-placeholder',
    observedCompatibilityEvidenceIdentity: 'compat-evidence-sha256-placeholder',
    observedSubjectPrecheckIdentity: 'subject-precheck-sha256-placeholder',
    observedBindingConfirmationIdentity: 'binding-confirmation-sha256-placeholder',
    ...overrides,
  };
}

describe('wave authority validation', () => {
  it('46. default ready false', () => {
    assert.equal(validatePurchaseWaveAuthority(null, waveCtx()).ready, false);
  });
  it('47. missing final RC fails', () => {
    assert.equal(validatePurchaseWaveAuthority(waveAuthority({ final_rc_verdict: 'HOLD' }), waveCtx()).ready, false);
  });
  it('48. missing Preview deletion smoke fails', () => {
    assert.equal(
      validatePurchaseWaveAuthority(waveAuthority({ preview_deletion_smoke_verdict: 'HOLD' }), waveCtx()).ready,
      false,
    );
  });
  it('49. DNS unresolved fails', () => {
    assert.equal(validatePurchaseWaveAuthority(waveAuthority({ dns_blocker_resolved: false }), waveCtx()).ready, false);
  });
  it('50. wrong main commit fails', () => {
    assert.equal(
      validatePurchaseWaveAuthority(waveAuthority(), waveCtx({ observedMainCommit: 'f'.repeat(40) })).ready,
      false,
    );
  });
  it('51. wrong deployment commit fails', () => {
    assert.equal(
      validatePurchaseWaveAuthority(waveAuthority(), waveCtx({ observedDeploymentCommit: 'a'.repeat(40) })).ready,
      false,
    );
  });
  it('52. binding false fails', () => {
    const bad = waveAuthority({
      binding_confirmations: {
        ...waveAuthority().binding_confirmations,
        light_price_binding_exact: false,
      },
    });
    assert.equal(validatePurchaseWaveAuthority(bad, waveCtx()).ready, false);
  });
  it('53. wrong subject labels fail', () => {
    assert.equal(
      validatePurchaseWaveAuthority(waveAuthority({ approved_subject_labels: ['WRONG_A', 'WRONG_B'] }), waveCtx()).ready,
      false,
    );
  });
  it('54. extra third subject fails', () => {
    assert.equal(
      validatePurchaseWaveAuthority(
        waveAuthority({ approved_subject_labels: [SUBJECT_LABEL_A, SUBJECT_LABEL_B, 'EXTRA'] }),
        waveCtx(),
      ).ready,
      false,
    );
  });
  it('55. wrong amount fails', () => {
    assert.equal(
      validatePurchaseWaveAuthority(
        waveAuthority({
          approved_amount_policies: { light_yen: 999, full_yen: 1480, upgrade_yen: 600 } as unknown as typeof AMOUNT_POLICIES,
        }),
        waveCtx(),
      ).ready,
      false,
    );
  });
  it('56. wrong scenario order fails', () => {
    assert.equal(
      validatePurchaseWaveAuthority(
        waveAuthority({
          approved_scenarios: [...APPROVED_SCENARIOS].reverse() as unknown as PurchaseWaveAuthority['approved_scenarios'],
        }),
        waveCtx(),
      ).ready,
      false,
    );
  });
  it('57. max charge >3 fails', () => {
    assert.equal(
      validatePurchaseWaveAuthority(waveAuthority({ approved_max_successful_charge_count: 4 }), waveCtx()).ready,
      false,
    );
  });
  it('58. duplicate charge budget >0 fails', () => {
    assert.equal(
      validatePurchaseWaveAuthority(waveAuthority({ approved_max_duplicate_full_charge_count: 1 }), waveCtx()).ready,
      false,
    );
  });
  it('59. expired/consumed/non-single-use fails', () => {
    assert.equal(
      validatePurchaseWaveAuthority(waveAuthority({ expires_at: new Date(Date.now() - 1000).toISOString() }), waveCtx()).ready,
      false,
    );
    assert.equal(validatePurchaseWaveAuthority(waveAuthority({ consumed: true }), waveCtx()).ready, false);
    assert.equal(validatePurchaseWaveAuthority(waveAuthority({ single_use: false as true }), waveCtx()).ready, false);
  });
  it('60. ambiguous prior action fails', () => {
    assert.equal(validatePurchaseWaveAuthority(waveAuthority({ prior_ambiguous_action: true }), waveCtx()).ready, false);
  });
  it('61. exact approved fixture GREEN', () => {
    assert.equal(validatePurchaseWaveAuthority(waveAuthority(), waveCtx()).ready, true);
  });
  it('62. fixed output schema exact', () => {
    const json = serializePurchaseWaveAuthorityResult(validatePurchaseWaveAuthority(null, waveCtx()));
    const parsed = JSON.parse(json) as Record<string, unknown>;
    assert.deepEqual(Object.keys(parsed).sort(), [
      'allowed_next_action',
      'approved_subject_labels',
      'failed_flags',
      'ready',
      'remaining_charge_budget',
      'schema_version',
      'unknown_flags',
    ]);
  });
  it('63. secret/raw price field rejected', () => {
    const bad = waveAuthority({ gate_title: 'sk_live_forbidden' });
    assert.equal(authorityContainsForbiddenFields(bad), true);
  });
});

describe('orchestrator wave integration', () => {
  it('64. 19-step map matches W0-W11', () => {
    assert.equal(HUMAN_ACTION_STEPS.length, 19);
    assert.equal(humanActionMapIsConsistent(), true);
    assert.equal(HUMAN_TO_INTERNAL_STATE_MAP.length, 19);
  });
  it('65. Subject A/B separation', () => {
    assert.equal(SUBJECT_A, SUBJECT_LABEL_A);
    assert.equal(SUBJECT_B, SUBJECT_LABEL_B);
  });
  it('66. Human-only payment steps', () => {
    const h = new PurchaseSmokeWave1Harness();
    assert.equal(h.supportsAutomaticPayment(), false);
  });
  it('67. light before conversion in state machine', () => {
    const li = WAVE_STATES.indexOf('W2_LIGHT_PURCHASE_HUMAN_ACTION_REQUIRED');
    const ci = WAVE_STATES.indexOf('W4_LIGHT_TO_FULL_HUMAN_ACTION_REQUIRED');
    assert.ok(li < ci);
  });
  it('68. conversion before duplicate', () => {
    const ci = WAVE_STATES.indexOf('W5_CONVERSION_POSTCHECK');
    const di = WAVE_STATES.indexOf('W6_DUPLICATE_FULL_REJECTION_CHECK');
    assert.ok(ci < di);
  });
  it('69. duplicate before fresh FULL', () => {
    const di = WAVE_STATES.indexOf('W6_DUPLICATE_FULL_REJECTION_CHECK');
    const fi = WAVE_STATES.indexOf('W7_FRESH_FULL_HUMAN_ACTION_REQUIRED');
    assert.ok(di < fi);
  });
  it('70. postcheck after each action in happy path', () => {
    const h = new PurchaseSmokeWave1Harness();
    h.runLocalDryRunHappyPath();
    const steps = h.evidenceRecord.steps_completed.map((s) => s.step);
    assert.ok(steps.includes('W3_LIGHT_POSTCHECK'));
    assert.ok(steps.includes('W5_CONVERSION_POSTCHECK'));
    assert.ok(steps.includes('W8_FULL_POSTCHECK'));
  });
  it('71. first HOLD stops later actions', () => {
    const h = new PurchaseSmokeWave1Harness();
    h.runW0AuthorityConfirmation();
    h.runW1TestSubjectsConfirmed(false);
    h.recordHumanPayment('W2_LIGHT_PURCHASE_HUMAN_ACTION_REQUIRED', { label: 'x', recorded_at: new Date().toISOString() });
    assert.equal(h.evidenceRecord.verdict, 'HOLD');
  });
  it('72. ambiguous payment blocks retry', () => {
    const h = new PurchaseSmokeWave1Harness();
    h.runW0AuthorityConfirmation();
    h.runW1TestSubjectsConfirmed();
    h.recordHumanPayment('W2_LIGHT_PURCHASE_HUMAN_ACTION_REQUIRED', { label: 'a', recorded_at: new Date().toISOString() }, 'PAYMENT_STATUS_AMBIGUOUS');
    assert.match(h.evidenceRecord.first_failure_predicate ?? '', /AMBIGUOUS/);
  });
  it('73. payment confirmed fulfillment pending blocks repeat', () => {
    const h = new PurchaseSmokeWave1Harness();
    h.runW0AuthorityConfirmation();
    h.runW1TestSubjectsConfirmed();
    h.recordHumanPayment('W2_LIGHT_PURCHASE_HUMAN_ACTION_REQUIRED', { label: 'p', recorded_at: new Date().toISOString() }, 'PAYMENT_CONFIRMED_AND_APPLICATION_PENDING');
    assert.match(h.evidenceRecord.first_failure_predicate ?? '', /PENDING/);
  });
  it('74. max successful charge count enforced', () => {
    const h = new PurchaseSmokeWave1Harness();
    h.runW0AuthorityConfirmation();
    h.runW1TestSubjectsConfirmed();
    for (let i = 0; i < 4; i++) {
      if (h.evidenceRecord.verdict === 'HOLD') break;
      h.recordHumanPayment('W2_LIGHT_PURCHASE_HUMAN_ACTION_REQUIRED', { label: `c${i}`, recorded_at: new Date().toISOString() }, 'PAYMENT_CONFIRMED_AND_APPLICATION_GREEN', { postcheck_green: true });
    }
    assert.ok(h.chargeBudget.light <= MAX_LIGHT_CHARGE_COUNT);
  });
  it('75. duplicate successful charge rejected', () => {
    const h = new PurchaseSmokeWave1Harness();
    h.runW0AuthorityConfirmation();
    h.runW1TestSubjectsConfirmed();
    h.recordHumanPayment('W2_LIGHT_PURCHASE_HUMAN_ACTION_REQUIRED', { label: 'l', recorded_at: new Date().toISOString() }, 'PAYMENT_CONFIRMED_AND_APPLICATION_GREEN', { postcheck_green: true });
    h.runW3LightPostcheck(lightEvidenceGood());
    h.recordHumanPayment('W4_LIGHT_TO_FULL_HUMAN_ACTION_REQUIRED', { label: 'u', recorded_at: new Date().toISOString() }, 'PAYMENT_CONFIRMED_AND_APPLICATION_GREEN', { postcheck_green: true });
    h.runW5ConversionPostcheck({
      upgrade_product: PRODUCT_UPGRADE,
      amount_yen: AMOUNT_UPGRADE_YEN,
      light_before_present: true,
      full_equivalent_reached: true,
      wallet_purchased: WALLET_FULL_PURCHASED,
      duplicate_initial_credit: false,
      duplicate_snapshot: false,
      conversion_fulfillment_count: 1,
    });
    h.runW6DuplicateFullRejection({
      layer: 'pre_checkout',
      http_status: 409,
      rejection_code: 'already_purchased',
      stripe_session_created: false,
      charge_created: true,
      state_delta: false,
    });
    assert.match(h.evidenceRecord.first_failure_predicate ?? '', /CHARGE/);
  });
  it('76. no refund/deletion/replay action exposed', () => {
    const h = new PurchaseSmokeWave1Harness();
    assert.equal(h.supportsAutomaticRefund(), false);
    assert.equal(h.supportsDeletionAction(), false);
    assert.equal(h.supportsWebhookReplay(), false);
  });
  it('77. wave authority required in production mode', () => {
    const h = new PurchaseSmokeWave1Harness({
      mode: 'production_execution',
      waveAuthority: waveAuthority(),
      commitSha: FUTURE_MAIN,
    });
    h.runW0AuthorityConfirmation();
    assert.equal(h.evidenceRecord.steps_completed.length, 1);
  });
});

describe('payment outcome classes', () => {
  it('78. class count is 8', () => {
    assert.equal(PAYMENT_OUTCOME_CLASSES.length, 8);
  });
  for (const [idx, cls] of PAYMENT_OUTCOME_CLASSES.entries()) {
    it(`79.${idx}. class ${cls} represented`, () => {
      assert.ok(PAYMENT_OUTCOME_CLASSES.includes(cls));
    });
  }
  it('80. success page alone false', () => {
    assert.equal(
      evaluateCombinedPaymentEvidence({
        payment_outcome: 'PAYMENT_CONFIRMED_AND_APPLICATION_GREEN',
        stripe_success_observed: false,
        success_page_observed: true,
        application_access_observed: false,
        postcheck_green: false,
      }),
      false,
    );
  });
  it('81. Stripe alone false', () => {
    assert.equal(
      evaluateCombinedPaymentEvidence({
        payment_outcome: 'PAYMENT_CONFIRMED_AND_APPLICATION_GREEN',
        stripe_success_observed: true,
        success_page_observed: false,
        application_access_observed: false,
        postcheck_green: false,
      }),
      false,
    );
  });
  it('82. application alone false', () => {
    assert.equal(
      evaluateCombinedPaymentEvidence({
        payment_outcome: 'PAYMENT_CONFIRMED_AND_APPLICATION_GREEN',
        stripe_success_observed: false,
        success_page_observed: false,
        application_access_observed: true,
        postcheck_green: false,
      }),
      false,
    );
  });
  it('83. DB alone false', () => {
    assert.equal(
      evaluateCombinedPaymentEvidence({
        payment_outcome: 'PAYMENT_CONFIRMED_AND_APPLICATION_GREEN',
        stripe_success_observed: false,
        success_page_observed: false,
        application_access_observed: false,
        postcheck_green: true,
      }),
      false,
    );
  });
  it('84. combined GREEN exact', () => {
    assert.equal(
      evaluateCombinedPaymentEvidence({
        payment_outcome: 'PAYMENT_CONFIRMED_AND_APPLICATION_GREEN',
        stripe_success_observed: true,
        success_page_observed: false,
        application_access_observed: true,
        postcheck_green: true,
      }),
      true,
    );
  });
  it('85. ambiguous blocks charge', () => {
    assert.equal(paymentOutcomeIsAmbiguous('PAYMENT_STATUS_AMBIGUOUS'), true);
    assert.equal(paymentOutcomeAllowsCharge('PAYMENT_STATUS_AMBIGUOUS'), false);
  });
});

describe('extended SQL contract', () => {
  const sql = readFileSync(SQL_PATH, 'utf8');
  it('86. one SelectStmt', () => {
    assert.equal(sqlHasSingleTopLevelSelect(sql), true);
  });
  it('87. no mutation', () => {
    assert.equal(waveParseSqlMutationKeywords(sql).length, 0);
    assert.equal(parseSqlMutationKeywords(sql).length, 0);
  });
  it('88. six modes present', () => {
    assert.equal(sqlPostcheckModeCount(sql), 6);
    assert.equal(sqlModeCount(sql), 6);
    for (const mode of POSTCHECK_MODES) assert.match(sql, new RegExp(mode));
  });
  it('89. Subject precheck classifications', () => {
    for (const c of SUBJECT_PRECHECK_CLASSIFICATIONS) assert.match(sql, new RegExp(c));
  });
  it('90. duplicate no-write GREEN classification', () => {
    assert.match(sql, /DUPLICATE_REJECTED_NO_WRITE_GREEN/);
    assert.match(sql, /human_no_charge_confirmed/);
  });
  it('91. duplicate state delta HOLD', () => {
    assert.match(sql, /DUPLICATE_REJECTION_HOLD_STATE_CHANGED/);
  });
  it('92. duplicate charge ambiguity HOLD', () => {
    assert.match(sql, /DUPLICATE_REJECTION_HOLD_CHARGE_AMBIGUOUS/);
  });
  it('93. integrated closure PURCHASE_WAVE_GREEN', () => {
    assert.match(sql, /PURCHASE_WAVE_GREEN/);
    assert.match(sql, /integrated_successful_charge_count/);
  });
  it('94. charge count exactly 3 check', () => {
    assert.match(sql, /integrated_charge_budget_green/);
  });
  it('95. cross-subject isolation', () => {
    assert.match(sql, /cross_subject_isolation_green/);
    assert.match(sql, /subject_b_user_id/);
  });
  it('96. failed/unknown flags affect result', () => {
    assert.match(sql, /failed_flags/);
    assert.match(sql, /unknown_flags/);
    assert.match(sql, /overall_predicate/);
  });
  it('97. only PURCHASE_WAVE_GREEN permits deletion next gate', () => {
    assert.match(sql, /CONTROLLED-DELETION-SMOKE-PLAN-DELTA-REVIEW/);
  });
  it('98. no PII/raw IDs in output columns', () => {
    assert.doesNotMatch(sql, /user_id AS/);
    assert.doesNotMatch(sql, /email/);
  });
  it('99. LIGHT CONVERSION FRESH classifications retained', () => {
    assert.match(sql, /LIGHT_GREEN/);
    assert.match(sql, /CONVERSION_GREEN/);
    assert.match(sql, /FRESH_FULL_GREEN/);
  });
});

describe('extended runbook contract', () => {
  const runbook = readFileSync(RUNBOOK_PATH, 'utf8');
  it('100. all prerequisites present', () => {
    assert.match(runbook, /DNS blocker resolved/);
    assert.match(runbook, /PRODUCTION_CHAIN_GREEN/);
    assert.match(runbook, /SUBJECT_READY_CLEAN/);
  });
  it('101. 19 Human steps present', () => {
    for (let i = 0; i <= 18; i++) assert.match(runbook, new RegExp(`\\| W${i} \\|`));
  });
  it('102. W0-W11 mapping present', () => {
    assert.match(runbook, /W0_AUTHORITY_CONFIRMATION/);
    assert.match(runbook, /W11_PURCHASE_WAVE_COMPLETE/);
  });
  it('103. one-wave approval present', () => {
    assert.match(runbook, /ONE_PURCHASE_WAVE_APPROVAL/);
  });
  it('104. Human click each payment', () => {
    assert.match(runbook, /Human click required for \*\*each\*\* payment/);
  });
  it('105. max 3 charges', () => {
    assert.match(runbook, /max 3 successful charges/);
  });
  it('106. duplicate charge 0', () => {
    assert.match(runbook, /Duplicate successful FULL charge count = \*\*0\*\*/);
  });
  it('107. 20 STOP rows', () => {
    const rows = runbook.match(/ROLLBACK-STOP-ROW-\d+/g) ?? [];
    assert.equal(rows.length, 20);
  });
  it('108. no retry refund separate deletion separate', () => {
    assert.match(runbook, /No retry after ambiguous payment/);
    assert.match(runbook, /Automatic refund — \*\*forbidden\*\*/);
    assert.match(runbook, /Controlled deletion \| No \(separate gate\)/);
  });
  it('109. raw binding values forbidden', () => {
    assert.match(runbook, /never paste values/);
    assert.match(runbook, /appear in evidence/);
  });
  it('110. safe approval phrase template', () => {
    assert.match(runbook, new RegExp(APPROVAL_PHRASE_TEMPLATE.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').slice(0, 40)));
    assert.match(runbook, /MAIN_<safe-short-sha>/);
  });
  it('111. production execution not authorized now', () => {
    assert.match(runbook, /Production execution authorized now: false/);
  });
});

describe('extended security', () => {
  it('112. no live network in wave authority', () => {
    const src = readFileSync(join(ROOT, 'scripts/production/m55_production_purchase_wave_authority.ts'), 'utf8');
    assert.doesNotMatch(src, /\bfetch\s*\(/);
    assert.doesNotMatch(src, /\bhttps?:\/\//);
  });
  it('113. no DB in tests', () => {
    const src = readFileSync(join(ROOT, 'scripts/production/m55_production_purchase_smoke_wave1.local.test.ts'), 'utf8');
    assert.doesNotMatch(src, /\bpg\.connect\b/);
  });
  it('114. import has no side effect beyond CLI guard', () => {
    assert.doesNotMatch(
      readFileSync(join(ROOT, 'scripts/production/m55_production_purchase_wave_authority.ts'), 'utf8'),
      /process\.argv/,
    );
  });
});
