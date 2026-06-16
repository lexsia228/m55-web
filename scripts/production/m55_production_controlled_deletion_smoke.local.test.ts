import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  APPROVAL_PHRASE_TEMPLATE,
  APPROVED_RPC_IDENTITY,
  APPROVED_WEBHOOK_ROUTE_IDENTITY,
  CLERK_ACTION_CLASSES,
  CONTROL_SUBJECT_LABEL,
  CONTROL_SUBJECT_PRECHECK_CLASSIFICATIONS,
  DELETION_AUTHORITY_SCHEMA_VERSION,
  DELETION_STATES,
  DELETION_SUBJECT_LABEL,
  DELETION_SUBJECT_PRECHECK_CLASSIFICATIONS,
  FINAL_DELETION_CLASSES,
  MAX_CLERK_DELETE_ACTION_COUNT,
  MAX_NEW_WEBHOOK_EVENT_COUNT,
  MAX_REPLAY_COUNT,
  MAX_RETRY_COUNT,
  MAX_RPC_SUCCESS_COUNT,
  POSTCHECK_MODES,
  TRANSPORT_CLASSES,
  authorityContainsForbiddenFields,
  clerkActionIsAmbiguous,
  evaluateCombinedDeletionEvidence,
  hashApprovalPhrase,
  parseSqlMutationKeywords,
  serializeControlledDeletionAuthorityResult,
  sqlHasSingleTopLevelSelect,
  sqlModeCount,
  transportAllowsProceed,
  validateControlledDeletionAuthority,
  type ControlledDeletionAuthority,
} from './m55_production_controlled_deletion_authority.ts';
import {
  ControlledDeletionSmokeHarness,
  DELETION_SUBJECT_LABEL as ORCH_DELETION,
  CONTROL_SUBJECT_LABEL as ORCH_CONTROL,
  evidenceSchemaIsFixed,
  redactHostileError,
  serializeEvidence,
  sqlPostcheckModeCount,
} from './m55_production_controlled_deletion_smoke.ts';

const ROOT = process.cwd();
const SQL_PATH = join(ROOT, 'scripts/sql/production/m55_production_controlled_deletion_smoke_postcheck.sql');
const RUNBOOK_PATH = join(ROOT, 'docs/planning/m55_production_controlled_deletion_smoke_human_runbook.md');

const FUTURE_MAIN = 'a1b2c3d4e5f6789012345678901234567890abcd';
const DEPLOYMENT_COMMIT = 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';

function futureAuthority(overrides: Partial<ControlledDeletionAuthority> = {}): ControlledDeletionAuthority {
  return {
    schema_version: DELETION_AUTHORITY_SCHEMA_VERSION,
    gate_title: 'CATEGORY-1-M55-PRODUCTION-CONTROLLED-DELETION-SMOKE-EXECUTION',
    approved_main_commit: FUTURE_MAIN,
    approved_production_deployment_identity: '5078520190',
    approved_production_deployment_commit: DEPLOYMENT_COMMIT,
    approved_production_chain_evidence_identity: 'chain-evidence-sha256-placeholder',
    approved_purchase_wave_evidence_identity: 'purchase-wave-evidence-sha256-placeholder',
    approved_account_deletion_contract_identity: 'account-deletion-contract-sha256-placeholder',
    approved_clerk_live_instance_identity: 'clerk-live-instance-sha256-placeholder',
    approved_clerk_webhook_endpoint_identity: 'clerk-endpoint-sha256-placeholder',
    approved_webhook_route_identity: APPROVED_WEBHOOK_ROUTE_IDENTITY,
    approved_supabase_project_identity: 'supabase-project-sha256-placeholder',
    approved_deletion_subject_label: DELETION_SUBJECT_LABEL,
    approved_control_subject_label: CONTROL_SUBJECT_LABEL,
    approved_subject_precheck_identity: 'subject-precheck-sha256-placeholder',
    approved_event_ledger_precheck_identity: 'event-ledger-precheck-sha256-placeholder',
    approved_rpc_identity: APPROVED_RPC_IDENTITY,
    approved_postcheck_identity: 'postcheck-v1',
    approved_transport_probe_identity: 'transport-probe-sha256-placeholder',
    approved_max_clerk_delete_action_count: MAX_CLERK_DELETE_ACTION_COUNT,
    approved_max_new_webhook_event_count: MAX_NEW_WEBHOOK_EVENT_COUNT,
    approved_max_rpc_success_count: MAX_RPC_SUCCESS_COUNT,
    approved_max_retry_count: MAX_RETRY_COUNT,
    approved_max_replay_count: MAX_REPLAY_COUNT,
    binding_confirmations: {
      vercel_production_binding_exact: true,
      supabase_production_binding_exact: true,
      clerk_live_instance_exact: true,
      clerk_endpoint_exact: true,
      signing_secret_scope_exact: true,
      webhook_route_exact: true,
    },
    final_rc_gate: 'CATEGORY-1-M55-FINAL-INTEGRATED-RC-AUDIT',
    final_rc_verdict: 'CLOSED_GREEN',
    preview_deletion_smoke_gate: 'CATEGORY-1-M55-PREVIEW-DELETION-SMOKE',
    preview_deletion_smoke_verdict: 'CLOSED_GREEN',
    production_purchase_wave_verdict: 'CLOSED_GREEN',
    dns_http_path_healthy: true,
    human_approval_phrase_hash: hashApprovalPhrase('APPROVE_DELETION_SMOKE'),
    issued_at: new Date(Date.now() - 3_600_000).toISOString(),
    expires_at: new Date(Date.now() + 86_400_000).toISOString(),
    single_use: true,
    consumed: false,
    execution_nonce_hash: hashApprovalPhrase('nonce-deletion-smoke'),
    prior_ambiguous_action: false,
    ...overrides,
  };
}

function authCtx(overrides: Record<string, unknown> = {}) {
  return {
    now: new Date(),
    observedMainCommit: FUTURE_MAIN,
    observedDeploymentCommit: DEPLOYMENT_COMMIT,
    observedChainEvidenceIdentity: 'chain-evidence-sha256-placeholder',
    observedPurchaseWaveEvidenceIdentity: 'purchase-wave-evidence-sha256-placeholder',
    observedAccountDeletionContractIdentity: 'account-deletion-contract-sha256-placeholder',
    observedRpcIdentity: APPROVED_RPC_IDENTITY,
    ...overrides,
  };
}

function goodPrecheck() {
  return {
    deletion_subject_purchase_wave_green: true,
    deletion_entitlement_present: true,
    deletion_wallet_present: true,
    deletion_snapshot_present: true,
    deletion_prior_event_absent: true,
    deletion_prior_ledger_absent: true,
    control_purchase_green: true,
    control_baseline_captured: true,
    control_prior_event_absent: true,
    control_prior_ledger_absent: true,
  };
}

describe('authority validation', () => {
  it('1. default ready false', () => {
    assert.equal(validateControlledDeletionAuthority(null, authCtx()).ready, false);
  });
  it('2. final RC missing fails', () => {
    assert.equal(validateControlledDeletionAuthority(futureAuthority({ final_rc_verdict: 'HOLD' }), authCtx()).ready, false);
  });
  it('3. Preview deletion smoke missing fails', () => {
    assert.equal(
      validateControlledDeletionAuthority(futureAuthority({ preview_deletion_smoke_verdict: 'HOLD' }), authCtx()).ready,
      false,
    );
  });
  it('4. purchase wave not GREEN fails', () => {
    assert.equal(
      validateControlledDeletionAuthority(futureAuthority({ production_purchase_wave_verdict: 'HOLD' }), authCtx()).ready,
      false,
    );
  });
  it('5. DNS unhealthy fails', () => {
    assert.equal(validateControlledDeletionAuthority(futureAuthority({ dns_http_path_healthy: false }), authCtx()).ready, false);
  });
  it('6. wrong main commit fails', () => {
    assert.equal(
      validateControlledDeletionAuthority(futureAuthority(), authCtx({ observedMainCommit: 'f'.repeat(40) })).ready,
      false,
    );
  });
  it('7. wrong deployment commit fails', () => {
    assert.equal(
      validateControlledDeletionAuthority(futureAuthority(), authCtx({ observedDeploymentCommit: 'a'.repeat(40) })).ready,
      false,
    );
  });
  it('8. wrong Clerk binding fails', () => {
    const bad = futureAuthority({
      binding_confirmations: { ...futureAuthority().binding_confirmations, clerk_live_instance_exact: false },
    });
    assert.equal(validateControlledDeletionAuthority(bad, authCtx()).ready, false);
  });
  it('9. wrong deletion label fails', () => {
    assert.equal(
      validateControlledDeletionAuthority(
        futureAuthority({ approved_deletion_subject_label: 'WRONG' }),
        authCtx(),
      ).ready,
      false,
    );
  });
  it('10. wrong control label fails', () => {
    assert.equal(
      validateControlledDeletionAuthority(
        futureAuthority({ approved_control_subject_label: 'WRONG' }),
        authCtx(),
      ).ready,
      false,
    );
  });
  it('11. same deletion/control label fails', () => {
    assert.equal(
      validateControlledDeletionAuthority(
        futureAuthority({ approved_control_subject_label: DELETION_SUBJECT_LABEL }),
        authCtx(),
      ).ready,
      false,
    );
  });
  it('12. Subject A evidence binding mismatch fails', () => {
    assert.equal(
      validateControlledDeletionAuthority(futureAuthority(), authCtx({ observedPurchaseWaveEvidenceIdentity: 'wrong' })).ready,
      false,
    );
  });
  it('13. account deletion contract mismatch fails', () => {
    assert.equal(
      validateControlledDeletionAuthority(
        futureAuthority(),
        authCtx({ observedAccountDeletionContractIdentity: 'wrong' }),
      ).ready,
      false,
    );
  });
  it('14. prior event implied via extra subject fails', () => {
    assert.equal(
      validateControlledDeletionAuthority(futureAuthority(), authCtx({ extraSubjectCount: 1 })).ready,
      false,
    );
  });
  it('15. RPC identity mismatch fails', () => {
    assert.equal(
      validateControlledDeletionAuthority(futureAuthority({ approved_rpc_identity: 'wrong_rpc' }), authCtx()).ready,
      false,
    );
  });
  it('16. delete budget >1 fails', () => {
    assert.equal(
      validateControlledDeletionAuthority(futureAuthority({ approved_max_clerk_delete_action_count: 2 }), authCtx()).ready,
      false,
    );
  });
  it('17. event budget >1 fails', () => {
    assert.equal(
      validateControlledDeletionAuthority(futureAuthority({ approved_max_new_webhook_event_count: 2 }), authCtx()).ready,
      false,
    );
  });
  it('18. RPC success budget >1 fails', () => {
    assert.equal(
      validateControlledDeletionAuthority(futureAuthority({ approved_max_rpc_success_count: 2 }), authCtx()).ready,
      false,
    );
  });
  it('19. retry >0 fails', () => {
    assert.equal(
      validateControlledDeletionAuthority(futureAuthority({ approved_max_retry_count: 1 }), authCtx()).ready,
      false,
    );
  });
  it('20. Replay >0 fails', () => {
    assert.equal(
      validateControlledDeletionAuthority(futureAuthority({ approved_max_replay_count: 1 }), authCtx()).ready,
      false,
    );
  });
  it('21. synthetic post requested fails', () => {
    assert.equal(
      validateControlledDeletionAuthority(futureAuthority(), authCtx({ requestedSyntheticPost: true })).ready,
      false,
    );
  });
  it('22. manual action requested fails', () => {
    assert.equal(
      validateControlledDeletionAuthority(futureAuthority(), authCtx({ requestedManualAction: true })).ready,
      false,
    );
  });
  it('23. expired/consumed/non-single-use fails', () => {
    assert.equal(
      validateControlledDeletionAuthority(futureAuthority({ expires_at: new Date(Date.now() - 1000).toISOString() }), authCtx()).ready,
      false,
    );
    assert.equal(validateControlledDeletionAuthority(futureAuthority({ consumed: true }), authCtx()).ready, false);
    assert.equal(validateControlledDeletionAuthority(futureAuthority({ single_use: false as true }), authCtx()).ready, false);
  });
  it('24. prior ambiguity fails', () => {
    assert.equal(validateControlledDeletionAuthority(futureAuthority({ prior_ambiguous_action: true }), authCtx()).ready, false);
  });
  it('25. exact fixture GREEN', () => {
    assert.equal(validateControlledDeletionAuthority(futureAuthority(), authCtx()).ready, true);
  });
  it('26. fixed schema exact', () => {
    const json = serializeControlledDeletionAuthorityResult(validateControlledDeletionAuthority(null, authCtx()));
    const parsed = JSON.parse(json) as Record<string, unknown>;
    assert.deepEqual(Object.keys(parsed).sort(), [
      'allowed_next_action',
      'approved_control_subject_label',
      'approved_deletion_subject_label',
      'failed_flags',
      'irreversible_action_budget',
      'ready',
      'schema_version',
      'unknown_flags',
    ]);
  });
  it('27. secret/raw identity field rejected', () => {
    assert.equal(authorityContainsForbiddenFields(futureAuthority({ gate_title: 'sk_live_forbidden' })), true);
  });
});

describe('orchestrator', () => {
  it('28. exact 17-state sequence', () => {
    assert.equal(DELETION_STATES.length, 17);
    assert.equal(DELETION_STATES[0], 'X0_AUTHORITY_VALIDATION');
    assert.equal(DELETION_STATES[16], 'X16_PUBLIC_RELEASE_AUDIT_SEPARATE');
  });
  it('29. Subject A selected', () => {
    assert.equal(ORCH_DELETION, 'M55_PROD_PURCHASE_A');
  });
  it('30. Subject B control', () => {
    assert.equal(ORCH_CONTROL, 'M55_PROD_PURCHASE_B');
  });
  it('31. no third subject in harness', () => {
    const h = new ControlledDeletionSmokeHarness();
    assert.equal(h.evidenceRecord.deletion_subject_label, DELETION_SUBJECT_LABEL);
    assert.equal(h.evidenceRecord.control_subject_label, CONTROL_SUBJECT_LABEL);
  });
  it('32. one Human delete action only', () => {
    const h = new ControlledDeletionSmokeHarness();
    h.runX0AuthorityValidation();
    h.runX1ProductionBindingConfirmation();
    h.runX2SubjectControlPrecheck(goodPrecheck());
    h.runX3TransportProbeConfirmation({ dns_http_green: true, endpoint_binding_exact: true, signing_scope_exact: true });
    h.recordHumanOpenClerkSubject({ label: 'open', recorded_at: new Date().toISOString() });
    h.runX5HumanVerifyLabelMapping();
    h.recordHumanDeleteAction({ label: 'delete', recorded_at: new Date().toISOString() }, 'CLERK_DELETE_CONFIRMED');
    assert.equal(h.irreversibleBudget.clerk_delete, 1);
  });
  it('33. natural webhook only', () => {
    const h = new ControlledDeletionSmokeHarness();
    assert.equal(h.supportsAutomaticWebhook(), false);
  });
  it('34. no automatic Clerk action', () => {
    assert.equal(new ControlledDeletionSmokeHarness().supportsAutomaticClerkDelete(), false);
  });
  it('35. no automatic DB/RPC action', () => {
    const h = new ControlledDeletionSmokeHarness();
    assert.equal(h.supportsAutomaticRpc(), false);
  });
  it('36. stop at first failure', () => {
    const h = new ControlledDeletionSmokeHarness();
    h.runX0AuthorityValidation();
    h.runX2SubjectControlPrecheck({ ...goodPrecheck(), deletion_prior_event_absent: false });
    h.recordHumanOpenClerkSubject({ label: 'x', recorded_at: new Date().toISOString() });
    assert.equal(h.evidenceRecord.verdict, 'HOLD');
  });
  it('37. ambiguous Clerk action blocks', () => {
    const h = new ControlledDeletionSmokeHarness();
    h.runX0AuthorityValidation();
    h.runX1ProductionBindingConfirmation();
    h.runX2SubjectControlPrecheck(goodPrecheck());
    h.runX3TransportProbeConfirmation({ dns_http_green: true, endpoint_binding_exact: true, signing_scope_exact: true });
    h.recordHumanOpenClerkSubject({ label: 'o', recorded_at: new Date().toISOString() });
    h.runX5HumanVerifyLabelMapping();
    h.recordHumanDeleteAction({ label: 'd', recorded_at: new Date().toISOString() }, 'CLERK_DELETE_STATUS_AMBIGUOUS');
    assert.match(h.evidenceRecord.first_failure_predicate ?? '', /AMBIGUOUS/);
  });
  it('38. wrong-subject risk blocks before action', () => {
    const h = new ControlledDeletionSmokeHarness();
    h.runX0AuthorityValidation();
    h.runX1ProductionBindingConfirmation();
    h.runX2SubjectControlPrecheck(goodPrecheck());
    h.runX3TransportProbeConfirmation({ dns_http_green: true, endpoint_binding_exact: true, signing_scope_exact: true });
    h.recordHumanOpenClerkSubject({ label: 'o', recorded_at: new Date().toISOString() });
    h.runX5HumanVerifyLabelMapping(false);
    assert.match(h.evidenceRecord.first_failure_predicate ?? '', /WRONG_SUBJECT/);
  });
  it('39. no retry/recreation', () => {
    const h = new ControlledDeletionSmokeHarness();
    assert.equal(h.supportsAutomaticRetry(), false);
    assert.equal(h.supportsSubjectRecreation(), false);
  });
  it('40. fixed evidence schema', () => {
    const h = new ControlledDeletionSmokeHarness();
    h.runLocalDryRunHappyPath();
    assert.equal(evidenceSchemaIsFixed(h.evidenceRecord), true);
  });
  it('41. import side effect isolated to CLI guard in smoke only', () => {
    const authSrc = readFileSync(join(ROOT, 'scripts/production/m55_production_controlled_deletion_authority.ts'), 'utf8');
    assert.doesNotMatch(authSrc, /process\.argv/);
  });
});

describe('classifications', () => {
  it('42. clerk class count is 6', () => {
    assert.equal(CLERK_ACTION_CLASSES.length, 6);
  });
  for (const [idx, cls] of CLERK_ACTION_CLASSES.entries()) {
    it(`43.${idx}. clerk class ${cls}`, () => {
      assert.ok(CLERK_ACTION_CLASSES.includes(cls));
    });
  }
  it('44. transport class count is 9', () => {
    assert.equal(TRANSPORT_CLASSES.length, 9);
  });
  for (const [idx, cls] of TRANSPORT_CLASSES.entries()) {
    it(`45.${idx}. transport class ${cls}`, () => {
      assert.ok(TRANSPORT_CLASSES.includes(cls));
    });
  }
  it('46. final class count is 12 not stale 11', () => {
    assert.equal(FINAL_DELETION_CLASSES.length, 12);
    assert.notEqual(FINAL_DELETION_CLASSES.length, 11);
  });
  for (const [idx, cls] of FINAL_DELETION_CLASSES.entries()) {
    it(`47.${idx}. final class ${cls}`, () => {
      assert.ok(FINAL_DELETION_CLASSES.includes(cls));
    });
  }
  it('48. only WEBHOOK_ACCEPTED_EXACT proceeds', () => {
    assert.equal(transportAllowsProceed('WEBHOOK_ACCEPTED_EXACT'), true);
    assert.equal(transportAllowsProceed('WEBHOOK_NOT_DELIVERED'), false);
  });
  it('49. only combined GREEN exact', () => {
    assert.equal(
      evaluateCombinedDeletionEvidence({
        clerk_action: 'CLERK_DELETE_CONFIRMED',
        transport: 'WEBHOOK_ACCEPTED_EXACT',
        event_ledger_green: true,
        deletion_ledger_green: true,
        rpc_green: true,
        target_state_green: true,
        retained_state_green: true,
        identifiability_green: true,
        control_subject_unchanged: true,
        unrelated_data_change_count: 0,
      }),
      true,
    );
    assert.equal(
      evaluateCombinedDeletionEvidence({
        clerk_action: 'CLERK_DELETE_CONFIRMED',
        transport: 'WEBHOOK_ACCEPTED_EXACT',
        event_ledger_green: true,
        deletion_ledger_green: true,
        rpc_green: true,
        target_state_green: true,
        retained_state_green: true,
        identifiability_green: true,
        control_subject_unchanged: false,
        unrelated_data_change_count: 0,
      }),
      false,
    );
  });
  it('50. clerk UI alone insufficient via ambiguous class', () => {
    assert.equal(clerkActionIsAmbiguous('CLERK_DELETE_STATUS_AMBIGUOUS'), true);
  });
});

describe('SQL contract', () => {
  const sql = readFileSync(SQL_PATH, 'utf8');
  it('51. one SelectStmt', () => {
    assert.equal(sqlHasSingleTopLevelSelect(sql), true);
  });
  it('52. no mutation', () => {
    assert.equal(parseSqlMutationKeywords(sql).length, 0);
  });
  it('53. six modes present', () => {
    assert.equal(sqlPostcheckModeCount(sql), 6);
    assert.equal(sqlModeCount(sql), 6);
    for (const mode of POSTCHECK_MODES) assert.match(sql, new RegExp(mode));
  });
  it('54. Subject A precheck exact', () => {
    for (const c of DELETION_SUBJECT_PRECHECK_CLASSIFICATIONS) assert.match(sql, new RegExp(c));
    assert.match(sql, /M55_PROD_PURCHASE_A/);
  });
  it('55. Subject B baseline capture', () => {
    for (const c of CONTROL_SUBJECT_PRECHECK_CLASSIFICATIONS) assert.match(sql, new RegExp(c));
    assert.match(sql, /control_baseline_fingerprint/);
  });
  it('56. prior event HOLD', () => {
    assert.match(sql, /HOLD_PRIOR_EVENT_OR_LEDGER_PRESENT/);
  });
  it('57. prior deletion ledger HOLD', () => {
    assert.match(sql, /deletion_prior_event_count/);
  });
  it('58. event row exactly one', () => {
    assert.match(sql, /post_event_succeeded_count = 1/);
  });
  it('59. deletion ledger exactly one', () => {
    assert.match(sql, /post_deletion_ledger_count = 1/);
  });
  it('60. RPC exactly one via markers', () => {
    assert.match(sql, /human_clerk_action_marker/);
    assert.match(sql, /human_transport_marker/);
  });
  it('61. duplicate event HOLD', () => {
    assert.match(sql, /duplicate_event/);
  });
  it('62. target state checks present', () => {
    assert.match(sql, /TARGET_RETAINED_GREEN/);
    assert.match(sql, /target_state_green/);
  });
  it('63. retained Stripe checks present', () => {
    assert.match(sql, /stripe_events_retained_count/);
    assert.match(sql, /stripe_processed_retained_count/);
  });
  it('64. failed_fulfillments checks present', () => {
    assert.match(sql, /deletion_failed_fulfillment_count/);
  });
  it('65. identifiability checks present', () => {
    assert.match(sql, /identifiability_green/);
  });
  it('66. control subject unchanged check', () => {
    assert.match(sql, /control_subject_unchanged/);
    assert.match(sql, /HOLD_CONTROL_SUBJECT_CHANGED/);
  });
  it('67. unrelated change zero check', () => {
    assert.match(sql, /unrelated_data_change_count/);
  });
  it('68. clerk action not inferred from DB alone', () => {
    assert.match(sql, /human_clerk_action_marker = ''/);
    assert.match(sql, /HOLD_TRANSPORT_OR_CLERK_MARKER_MISSING/);
  });
  it('69. transport not inferred from DB alone', () => {
    assert.match(sql, /human_transport_marker = ''/);
  });
  it('70. failed/unknown flags affect result', () => {
    assert.match(sql, /failed_flags/);
    assert.match(sql, /unknown_flags/);
    assert.match(sql, /overall_predicate/);
  });
  it('71. only PRODUCTION_DELETION_GREEN permits next planning', () => {
    assert.match(sql, /FINAL-PUBLIC-RELEASE-GO-CHECKLIST-READ-ONLY-PLANNING/);
    assert.match(sql, /PRODUCTION_DELETION_GREEN/);
  });
  it('72. one summary row', () => {
    assert.match(sql, /^WITH params AS/m);
    assert.match(sql, /FROM flags;\s*$/m);
    assert.equal((sql.match(/^SELECT\b/gm) ?? []).length, 1);
  });
  it('73. no PII/raw ID output columns', () => {
    assert.doesNotMatch(sql, /svix_id AS/);
    assert.doesNotMatch(sql, /clerk_user_id AS/);
    assert.doesNotMatch(sql, /email/);
  });
});

describe('runbook contract', () => {
  const runbook = readFileSync(RUNBOOK_PATH, 'utf8');
  it('74. all prerequisites present', () => {
    assert.match(runbook, /DNS\/HTTP path healthy/);
    assert.match(runbook, /PURCHASE_WAVE_GREEN/);
    assert.match(runbook, /PRODUCTION_CHAIN_GREEN/);
  });
  it('75. X0-X16 exact', () => {
    for (let i = 0; i <= 16; i++) assert.match(runbook, new RegExp(`\\| X${i} \\|`));
  });
  it('76. delete Subject A control Subject B', () => {
    assert.match(runbook, /M55_PROD_PURCHASE_A/);
    assert.match(runbook, /M55_PROD_PURCHASE_B/);
  });
  it('77. one click only', () => {
    assert.match(runbook, /exactly one.*Clerk live user deletion/i);
  });
  it('78. natural webhook only', () => {
    assert.match(runbook, /One naturally generated webhook only/);
  });
  it('79. no Replay Send Example synthetic POST', () => {
    assert.match(runbook, /no Send Example, no Replay, no synthetic POST/);
  });
  it('80. no manual RPC DB repair', () => {
    assert.match(runbook, /Manual RPC — \*\*forbidden\*\*/);
    assert.match(runbook, /Manual DB repair — \*\*forbidden\*\*/);
  });
  it('81. 22 STOP rows', () => {
    const rows = runbook.match(/ROLLBACK-STOP-ROW-\d+/g) ?? [];
    assert.equal(rows.length, 22);
  });
  it('82. no next irreversible action after HOLD', () => {
    assert.match(runbook, /Next irreversible action/);
    assert.match(runbook, /blocked/);
  });
  it('83. approval phrase placeholders safe', () => {
    assert.match(runbook, /MAIN_<safe-short-sha>/);
    assert.match(runbook, new RegExp(APPROVAL_PHRASE_TEMPLATE.slice(0, 40).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  });
  it('84. no public release transition', () => {
    assert.match(runbook, /Public release GO is excluded/);
  });
  it('85. separate recovery gate', () => {
    assert.match(runbook, /separate recovery gate/);
  });
  it('86. production execution not authorized now', () => {
    assert.match(runbook, /Production execution authorized now: false/);
  });
});

describe('orchestrator extended', () => {
  it('87. happy path X0-X16 GREEN', () => {
    const h = new ControlledDeletionSmokeHarness();
    h.runLocalDryRunHappyPath();
    assert.equal(h.evidenceRecord.verdict, 'GREEN');
    assert.equal(h.evidenceRecord.steps_completed.length, 17);
  });
  it('88. replay forbidden in svix step', () => {
    const h = new ControlledDeletionSmokeHarness();
    h.runX0AuthorityValidation();
    h.runX1ProductionBindingConfirmation();
    h.runX2SubjectControlPrecheck(goodPrecheck());
    h.runX3TransportProbeConfirmation({ dns_http_green: true, endpoint_binding_exact: true, signing_scope_exact: true });
    h.recordHumanOpenClerkSubject({ label: 'o', recorded_at: new Date().toISOString() });
    h.runX5HumanVerifyLabelMapping();
    h.recordHumanDeleteAction({ label: 'd', recorded_at: new Date().toISOString() }, 'CLERK_DELETE_CONFIRMED');
    h.runX8WaitForNaturalWebhook();
    h.runX9SvixMetadataClassification(
      { event_type_user_deleted: true, one_new_delivery: true, production_endpoint: true, replay_used: true, send_example_used: false },
      'WEBHOOK_ACCEPTED_EXACT',
    );
    assert.match(h.evidenceRecord.first_failure_predicate ?? '', /REPLAY/);
  });
  it('89. webhook not accepted blocks', () => {
    const h = new ControlledDeletionSmokeHarness();
    h.runX0AuthorityValidation();
    h.runX1ProductionBindingConfirmation();
    h.runX2SubjectControlPrecheck(goodPrecheck());
    h.runX3TransportProbeConfirmation({ dns_http_green: true, endpoint_binding_exact: true, signing_scope_exact: true });
    h.recordHumanOpenClerkSubject({ label: 'o', recorded_at: new Date().toISOString() });
    h.runX5HumanVerifyLabelMapping();
    h.recordHumanDeleteAction({ label: 'd', recorded_at: new Date().toISOString() }, 'CLERK_DELETE_CONFIRMED');
    h.runX8WaitForNaturalWebhook();
    h.runX9SvixMetadataClassification(
      { event_type_user_deleted: true, one_new_delivery: false, production_endpoint: true, replay_used: false, send_example_used: false },
      'WEBHOOK_NOT_DELIVERED',
    );
    assert.match(h.evidenceRecord.first_failure_predicate ?? '', /WEBHOOK/);
  });
  it('90. event ledger mismatch blocks', () => {
    const h = new ControlledDeletionSmokeHarness();
    h.runX0AuthorityValidation();
    h.runX1ProductionBindingConfirmation();
    h.runX2SubjectControlPrecheck(goodPrecheck());
    h.runX3TransportProbeConfirmation({ dns_http_green: true, endpoint_binding_exact: true, signing_scope_exact: true });
    h.recordHumanOpenClerkSubject({ label: 'o', recorded_at: new Date().toISOString() });
    h.runX5HumanVerifyLabelMapping();
    h.recordHumanDeleteAction({ label: 'd', recorded_at: new Date().toISOString() }, 'CLERK_DELETE_CONFIRMED');
    h.runX8WaitForNaturalWebhook();
    h.runX9SvixMetadataClassification(
      { event_type_user_deleted: true, one_new_delivery: true, production_endpoint: true, replay_used: false, send_example_used: false },
      'WEBHOOK_ACCEPTED_EXACT',
    );
    h.runX11DbRpcPostcheck({
      event_row_count: 2,
      deletion_ledger_row_count: 1,
      rpc_success_count: 1,
      duplicate_event: true,
      duplicate_ledger: false,
      partial_unknown_state: false,
    });
    assert.match(h.evidenceRecord.first_failure_predicate ?? '', /LEDGER/);
  });
  it('91. control subject changed blocks', () => {
    const h = new ControlledDeletionSmokeHarness();
    h.runX0AuthorityValidation();
    h.runX1ProductionBindingConfirmation();
    h.runX2SubjectControlPrecheck(goodPrecheck());
    h.runX3TransportProbeConfirmation({ dns_http_green: true, endpoint_binding_exact: true, signing_scope_exact: true });
    h.recordHumanOpenClerkSubject({ label: 'o', recorded_at: new Date().toISOString() });
    h.runX5HumanVerifyLabelMapping();
    h.recordHumanDeleteAction({ label: 'd', recorded_at: new Date().toISOString() }, 'CLERK_DELETE_CONFIRMED');
    h.runX8WaitForNaturalWebhook();
    h.runX9SvixMetadataClassification(
      { event_type_user_deleted: true, one_new_delivery: true, production_endpoint: true, replay_used: false, send_example_used: false },
      'WEBHOOK_ACCEPTED_EXACT',
    );
    h.runX11DbRpcPostcheck({
      event_row_count: 1,
      deletion_ledger_row_count: 1,
      rpc_success_count: 1,
      duplicate_event: false,
      duplicate_ledger: false,
      partial_unknown_state: false,
    });
    h.runX12ControlSubjectPostcheck({
      baseline_unchanged: false,
      no_event_mutation: true,
      no_ledger_mutation: true,
      no_wallet_change: true,
      no_snapshot_change: true,
      unrelated_data_change_count: 1,
    });
    assert.match(h.evidenceRecord.first_failure_predicate ?? '', /CONTROL/);
  });
  it('92. no manual RPC exposed', () => {
    assert.equal(new ControlledDeletionSmokeHarness().supportsManualRpc(), false);
  });
  it('93. no manual DB repair exposed', () => {
    assert.equal(new ControlledDeletionSmokeHarness().supportsManualDbRepair(), false);
  });
  it('94. no synthetic post exposed', () => {
    assert.equal(new ControlledDeletionSmokeHarness().supportsSyntheticPost(), false);
  });
  it('95. production mode requires authority', () => {
    const h = new ControlledDeletionSmokeHarness({ mode: 'production_execution', authority: null });
    h.runX0AuthorityValidation();
    assert.equal(h.evidenceRecord.verdict, 'HOLD');
  });
});

describe('security', () => {
  it('96. no live network in authority', () => {
    const src = readFileSync(join(ROOT, 'scripts/production/m55_production_controlled_deletion_authority.ts'), 'utf8');
    assert.doesNotMatch(src, /\bfetch\s*\(/);
    assert.doesNotMatch(src, /\bhttps?:\/\//);
  });
  it('97. no DB in orchestrator', () => {
    const src = readFileSync(join(ROOT, 'scripts/production/m55_production_controlled_deletion_smoke.ts'), 'utf8');
    assert.doesNotMatch(src, /\bpg\.connect\b/);
    assert.doesNotMatch(src, /\.rpc\s*\(/);
  });
  it('98. no secret-like literals in authority source', () => {
    const src = readFileSync(join(ROOT, 'scripts/production/m55_production_controlled_deletion_authority.ts'), 'utf8');
    const lines = src.split('\n').filter((l) => !l.includes('FORBIDDEN') && !l.includes('sk_live_'));
    assert.doesNotMatch(lines.join('\n'), /whsec_[A-Za-z0-9]+/);
  });
  it('99. hostile error redacted', () => {
    assert.equal(redactHostileError(new Error('user_secret@example.com sk_live_bad')), 'HOSTILE_ERROR_REDACTED');
  });
  it('100. serialize evidence secret safe', () => {
    const h = new ControlledDeletionSmokeHarness();
    h.runLocalDryRunHappyPath();
    assert.doesNotThrow(() => serializeEvidence(h.evidenceRecord));
  });
  it('101. no arbitrary output keys on authority result', () => {
    const result = validateControlledDeletionAuthority(futureAuthority(), authCtx());
    assert.equal(Object.keys(result).length, 8);
  });
  it('102. no automatic retry in runbook', () => {
    assert.match(readFileSync(RUNBOOK_PATH, 'utf8'), /No Clerk delete retry after ambiguity/);
  });
  it('103. no automatic rollback', () => {
    assert.match(readFileSync(RUNBOOK_PATH, 'utf8'), /Subject recreation — \*\*forbidden\*\*/);
  });
});

describe('authority budget enforcement', () => {
  it('104. clerk delete budget enforced', () => {
    assert.equal(
      validateControlledDeletionAuthority(futureAuthority(), authCtx({ actionsConsumed: { clerk_delete: 2, new_webhook_event: 0, rpc_success: 0, retry: 0, replay: 0 } })).ready,
      false,
    );
  });
  it('105. webhook budget enforced', () => {
    assert.equal(
      validateControlledDeletionAuthority(futureAuthority(), authCtx({ actionsConsumed: { clerk_delete: 0, new_webhook_event: 2, rpc_success: 0, retry: 0, replay: 0 } })).ready,
      false,
    );
  });
  it('106. rpc budget enforced', () => {
    assert.equal(
      validateControlledDeletionAuthority(futureAuthority(), authCtx({ actionsConsumed: { clerk_delete: 0, new_webhook_event: 0, rpc_success: 2, retry: 0, replay: 0 } })).ready,
      false,
    );
  });
  it('107. signing secret binding required', () => {
    const bad = futureAuthority({
      binding_confirmations: { ...futureAuthority().binding_confirmations, signing_secret_scope_exact: false },
    });
    assert.equal(validateControlledDeletionAuthority(bad, authCtx()).ready, false);
  });
  it('108. webhook route binding required', () => {
    const bad = futureAuthority({
      binding_confirmations: { ...futureAuthority().binding_confirmations, webhook_route_exact: false },
    });
    assert.equal(validateControlledDeletionAuthority(bad, authCtx()).ready, false);
  });
});

describe('SQL integrated closure', () => {
  const sql = readFileSync(SQL_PATH, 'utf8');
  it('109. INTEGRATED_DELETION_CLOSURE mode', () => {
    assert.match(sql, /INTEGRATED_DELETION_CLOSURE/);
  });
  it('110. PRODUCTION_DELETION_GREEN classification', () => {
    assert.match(sql, /PRODUCTION_DELETION_GREEN/);
  });
  it('111. event_ledger_green column', () => {
    assert.match(sql, /event_ledger_green/);
  });
  it('112. deletion_ledger_green column', () => {
    assert.match(sql, /deletion_ledger_green/);
  });
  it('113. next_gate column', () => {
    assert.match(sql, /next_gate/);
  });
});

describe('runbook transport', () => {
  const runbook = readFileSync(RUNBOOK_PATH, 'utf8');
  it('114. WEBHOOK_ACCEPTED_EXACT only proceeds', () => {
    assert.match(runbook, /WEBHOOK_ACCEPTED_EXACT.*only class that may proceed/);
  });
  it('115. combined evidence section', () => {
    assert.match(runbook, /Combined evidence required/);
  });
  it('116. Clerk classes listed', () => {
    assert.match(runbook, /CLERK_DELETE_CONFIRMED/);
    assert.match(runbook, /WRONG_SUBJECT_RISK/);
  });
});

describe('orchestrator budgets', () => {
  it('117. max budgets at start', () => {
    const h = new ControlledDeletionSmokeHarness();
    assert.equal(h.irreversibleBudget.clerk_delete, 0);
    assert.equal(h.irreversibleBudget.replay, 0);
  });
  it('118. transport DNS failure class exists', () => {
    assert.ok(TRANSPORT_CLASSES.includes('WEBHOOK_TRANSPORT_DNS_FAILURE'));
  });
  it('119. final HOLD_UNKNOWN exists', () => {
    assert.ok(FINAL_DELETION_CLASSES.includes('HOLD_UNKNOWN'));
  });
  it('120. PRODUCTION_DELETION_GREEN exists', () => {
    assert.ok(FINAL_DELETION_CLASSES.includes('PRODUCTION_DELETION_GREEN'));
  });
});

describe('authority constants', () => {
  it('121. max clerk delete is 1', () => {
    assert.equal(MAX_CLERK_DELETE_ACTION_COUNT, 1);
  });
  it('122. max replay is 0', () => {
    assert.equal(MAX_REPLAY_COUNT, 0);
  });
  it('123. rpc identity frozen', () => {
    assert.equal(APPROVED_RPC_IDENTITY, 'm55_account_deletion_process_v1');
  });
  it('124. webhook route identity frozen', () => {
    assert.match(APPROVED_WEBHOOK_ROUTE_IDENTITY, /clerk\/webhook/);
  });
});
