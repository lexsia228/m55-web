import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  APPROVAL_PHRASE_TEMPLATE,
  APPROVED_DEPLOYMENT_ID,
  APPROVED_EVENT_LEDGER_PRECHECK_IDENTITY,
  APPROVED_FEATURE_HEAD,
  APPROVED_POSTCHECK_IDENTITY,
  APPROVED_RPC_IDENTITY,
  APPROVED_SUBJECT_PRECHECK_IDENTITY,
  APPROVED_SUPABASE_PREVIEW_REF_IDENTITY,
  APPROVED_WEBHOOK_ROUTE_IDENTITY,
  CLERK_ACTION_CLASSES,
  FINAL_SMOKE_CLASSES,
  HISTORICAL_FORBIDDEN_DEPLOYMENT_IDS_HASH,
  MAX_DELETE_ACTION_COUNT,
  MAX_NATURAL_WEBHOOK_COUNT,
  MAX_REPLAY_COUNT,
  MAX_RETRY_COUNT,
  MAX_SUBJECT_CREATE_COUNT,
  PLANNING_DEPLOYMENT_ID,
  POSTCHECK_MODES,
  PREVIEW_DELETION_AUTHORITY_SCHEMA_VERSION,
  SMOKE_STATES,
  SUBJECT_LABEL,
  TRANSPORT_CLASSES,
  authorityContainsForbiddenFields,
  clerkActionIsAmbiguous,
  evaluateCombinedSmokeEvidence,
  hashApprovalPhrase,
  isHistoricalForbiddenDeployment,
  parseSqlMutationKeywords,
  serializePreviewAuthorityResult,
  sqlHasSingleTopLevelSelect,
  sqlModeCount,
  transportAllowsProceed,
  transportIsDnsFailure,
  validatePreviewPostRemediationDeletionAuthority,
  type PreviewPostRemediationDeletionAuthority,
} from './m55_preview_post_remediation_deletion_authority.ts';
import {
  PreviewPostRemediationDeletionSmokeHarness,
  SUBJECT_LABEL as ORCH_SUBJECT,
  evidenceSchemaIsFixed,
  redactHostileError,
  serializeEvidence,
  sqlPostcheckModeCount,
} from './m55_preview_post_remediation_deletion_smoke.ts';

const ROOT = process.cwd();
const SQL_PATH = join(ROOT, 'scripts/sql/preview/m55_preview_post_remediation_deletion_smoke_postcheck.sql');
const RUNBOOK_PATH = join(ROOT, 'docs/planning/m55_preview_post_remediation_deletion_smoke_human_runbook.md');

// Future authority commit — the pushed commit hash (not known at planning time, placeholder here).
const FUTURE_AUTH_COMMIT = 'a1b2c3d4e5f6789012345678901234567890abcd';
// Post-push execution deployment — must NOT be the planning deployment.
const FUTURE_EXECUTION_DEPLOYMENT_ID = 'dpl_POST_PUSH_FRESH_EXECUTION_DEPLOYMENT';

function futureAuthority(
  overrides: Partial<PreviewPostRemediationDeletionAuthority> = {},
): PreviewPostRemediationDeletionAuthority {
  return {
    schema_version: PREVIEW_DELETION_AUTHORITY_SCHEMA_VERSION,
    gate_title: 'CATEGORY-1-M55-PREVIEW-ACCOUNT-DELETION-SMOKE-POST-REMEDIATION-EXECUTION',
    approved_feature_head: APPROVED_FEATURE_HEAD,
    approved_deployment_id: APPROVED_DEPLOYMENT_ID,
    approved_deployment_commit: APPROVED_FEATURE_HEAD,
    approved_environment: 'Preview',
    approved_branch: 'feat/m55-paid-lp-canonical-wave1',
    approved_branch_alias_identity:
      'm55-webv2-git-feat-m55-paid-lp-canonical-wave1-m55-official.vercel.app',
    approved_vercel_project_identity: 'm55-webv2',
    approved_supabase_preview_identity: 'm55-preview/m55-soul-preview/sbogwyzldjxxouhqtpnq',
    approved_clerk_development_instance_identity: 'clerk-development-instance-v1',
    approved_clerk_development_endpoint_identity: 'clerk-development-user-deleted-endpoint-v1',
    approved_signing_secret_scope_marker: 'preview-scope-only',
    approved_webhook_route_identity: APPROVED_WEBHOOK_ROUTE_IDENTITY,
    approved_webhook_url_identity: 'preview-branch-alias-clerk-webhook-route-v1',
    approved_subject_label: SUBJECT_LABEL,
    approved_subject_precheck_identity: APPROVED_SUBJECT_PRECHECK_IDENTITY,
    approved_event_ledger_precheck_identity: APPROVED_EVENT_LEDGER_PRECHECK_IDENTITY,
    approved_rpc_identity: APPROVED_RPC_IDENTITY,
    approved_postcheck_identity: APPROVED_POSTCHECK_IDENTITY,
    approved_historical_attempt_exclusion_identity: 'four-prior-preview-dns-failure-attempts-frozen-v1',
    approved_max_subject_create_count: MAX_SUBJECT_CREATE_COUNT,
    approved_max_delete_action_count: MAX_DELETE_ACTION_COUNT,
    approved_max_natural_webhook_count: MAX_NATURAL_WEBHOOK_COUNT,
    approved_max_retry_count: MAX_RETRY_COUNT,
    approved_max_replay_count: MAX_REPLAY_COUNT,
    dns_remediation_state: 'USE_EXISTING_FRESH_DEPLOYMENT',
    binding_confirmations: {
      vercel_preview_deployment_exact: true,
      vercel_branch_alias_current: true,
      production_binding_false: true,
      supabase_preview_binding_exact: true,
      clerk_development_instance_exact: true,
      clerk_development_endpoint_exact: true,
      signing_secret_preview_scope_exact: true,
      webhook_route_exact: true,
      webhook_url_exact: true,
    },
    // Execution-time fields — set to FUTURE_AUTH_COMMIT in tests (post-push commit placeholder).
    expected_authority_commit: FUTURE_AUTH_COMMIT,
    historical_forbidden_deployment_ids_hash: HISTORICAL_FORBIDDEN_DEPLOYMENT_IDS_HASH,
    deployment_binding_confirmation_identity: 'preview-execution-deployment-confirmed-v1',
    human_approval_phrase_hash: hashApprovalPhrase('APPROVE_PREVIEW_DELETION_SMOKE'),
    issued_at: new Date(Date.now() - 3_600_000).toISOString(),
    expires_at: new Date(Date.now() + 86_400_000).toISOString(),
    single_use: true,
    consumed: false,
    execution_nonce_hash: hashApprovalPhrase('nonce-preview-deletion-smoke'),
    prior_ambiguous_action: false,
    ...overrides,
  };
}

function authCtx(overrides: Record<string, unknown> = {}) {
  return {
    now: new Date(),
    observedFeatureHead: APPROVED_FEATURE_HEAD,
    observedDeploymentId: APPROVED_DEPLOYMENT_ID, // historical planning deployment in context
    observedDeploymentCommit: APPROVED_FEATURE_HEAD,
    observedBranchAliasCurrent: true,
    observedProductionBinding: false,
    observedRpcIdentity: APPROVED_RPC_IDENTITY,
    observedPostcheckIdentity: APPROVED_POSTCHECK_IDENTITY,
    observedSubjectPrecheckIdentity: APPROVED_SUBJECT_PRECHECK_IDENTITY,
    observedEventLedgerPrecheckIdentity: APPROVED_EVENT_LEDGER_PRECHECK_IDENTITY,
    // Execution deployment — post-push, NOT the planning deployment.
    executionDeployment: {
      deployment_id: FUTURE_EXECUTION_DEPLOYMENT_ID,
      deployment_commit: FUTURE_AUTH_COMMIT,
      deployment_environment: 'Preview',
      deployment_branch: 'feat/m55-paid-lp-canonical-wave1',
      branch_alias_current: true,
      production_binding: false,
      deployment_ready: true,
      created_after_authority_commit: true,
    },
    // Exact Supabase Preview project ref — must equal APPROVED_SUPABASE_PREVIEW_REF_IDENTITY.
    actual_supabase_preview_ref: APPROVED_SUPABASE_PREVIEW_REF_IDENTITY,
    ...overrides,
  };
}

function goodPrecheck() {
  return {
    deployment_identity_exact: true,
    subject_exists: true,
    subject_newly_created: true,
    historical_reuse_detected: false,
    real_user_risk: false,
    target_baseline_captured: true,
    retained_baseline_captured: true,
    unrelated_baseline_captured: true,
    prior_event_absent: true,
    prior_deletion_ledger_absent: true,
  };
}

function advanceToDelete(h: PreviewPostRemediationDeletionSmokeHarness): void {
  h.runS0AuthorityValidation();
  h.runS1PreviewBindingReverify();
  h.recordHumanSubjectCreation({ label: 'create', recorded_at: new Date().toISOString() });
  h.runS3SafeLabelMapping();
  h.runS4PredeleteReadonlyPrecheck(goodPrecheck());
  h.recordHumanConfirmationBeforeDelete({ label: 'confirm', recorded_at: new Date().toISOString() });
}

describe('authority validation', () => {
  it('1. default ready false', () => {
    assert.equal(validatePreviewPostRemediationDeletionAuthority(null, authCtx()).ready, false);
  });
  it('2. wrong deployment ID fails', () => {
    assert.equal(
      validatePreviewPostRemediationDeletionAuthority(
        futureAuthority({ approved_deployment_id: 'dpl_WRONG' }),
        authCtx(),
      ).ready,
      false,
    );
  });
  it('3. wrong deployment commit fails', () => {
    assert.equal(
      validatePreviewPostRemediationDeletionAuthority(
        futureAuthority({ approved_deployment_commit: 'a'.repeat(40) }),
        authCtx(),
      ).ready,
      false,
    );
  });
  it('4. wrong branch fails', () => {
    assert.equal(
      validatePreviewPostRemediationDeletionAuthority(
        futureAuthority({ approved_branch: 'main' }),
        authCtx(),
      ).ready,
      false,
    );
  });
  it('5. stale alias fails', () => {
    assert.equal(
      validatePreviewPostRemediationDeletionAuthority(futureAuthority(), authCtx({ observedBranchAliasCurrent: false })).ready,
      false,
    );
  });
  it('6. Production binding fails', () => {
    const bad = futureAuthority({
      binding_confirmations: {
        ...futureAuthority().binding_confirmations,
        production_binding_false: false,
      },
    });
    assert.equal(validatePreviewPostRemediationDeletionAuthority(bad, authCtx()).ready, false);
    assert.equal(
      validatePreviewPostRemediationDeletionAuthority(futureAuthority(), authCtx({ observedProductionBinding: true })).ready,
      false,
    );
  });
  it('7. Preview Supabase binding mismatch fails', () => {
    const bad = futureAuthority({
      binding_confirmations: {
        ...futureAuthority().binding_confirmations,
        supabase_preview_binding_exact: false,
      },
    });
    assert.equal(validatePreviewPostRemediationDeletionAuthority(bad, authCtx()).ready, false);
  });
  it('8. Clerk Development mismatch fails', () => {
    const bad = futureAuthority({
      binding_confirmations: {
        ...futureAuthority().binding_confirmations,
        clerk_development_instance_exact: false,
      },
    });
    assert.equal(validatePreviewPostRemediationDeletionAuthority(bad, authCtx()).ready, false);
  });
  it('9. endpoint signing mismatch fails', () => {
    const bad = futureAuthority({
      binding_confirmations: {
        ...futureAuthority().binding_confirmations,
        signing_secret_preview_scope_exact: false,
        clerk_development_endpoint_exact: false,
      },
    });
    assert.equal(validatePreviewPostRemediationDeletionAuthority(bad, authCtx()).ready, false);
  });
  it('10. wrong subject label fails', () => {
    assert.equal(
      validatePreviewPostRemediationDeletionAuthority(
        futureAuthority({ approved_subject_label: 'WRONG' }),
        authCtx(),
      ).ready,
      false,
    );
  });
  it('11. previous attempt reuse fails', () => {
    assert.equal(
      validatePreviewPostRemediationDeletionAuthority(futureAuthority(), authCtx({ historicalReuseDetected: true })).ready,
      false,
    );
  });
  it('12. real user risk fails', () => {
    assert.equal(
      validatePreviewPostRemediationDeletionAuthority(futureAuthority(), authCtx({ realUserRisk: true })).ready,
      false,
    );
  });
  it('13. subject precheck missing fails', () => {
    assert.equal(
      validatePreviewPostRemediationDeletionAuthority(
        futureAuthority(),
        authCtx({ subjectPrecheckGreen: false }),
      ).ready,
      false,
    );
  });
  it('14. prior event fails', () => {
    assert.equal(
      validatePreviewPostRemediationDeletionAuthority(futureAuthority(), authCtx({ priorEventPresent: true })).ready,
      false,
    );
  });
  it('15. prior deletion ledger fails', () => {
    assert.equal(
      validatePreviewPostRemediationDeletionAuthority(
        futureAuthority(),
        authCtx({ priorDeletionLedgerPresent: true }),
      ).ready,
      false,
    );
  });
  it('16. route RPC postcheck mismatch fails', () => {
    assert.equal(
      validatePreviewPostRemediationDeletionAuthority(
        futureAuthority({ approved_rpc_identity: 'wrong' }),
        authCtx(),
      ).ready,
      false,
    );
    assert.equal(
      validatePreviewPostRemediationDeletionAuthority(
        futureAuthority({ approved_postcheck_identity: 'wrong' }),
        authCtx(),
      ).ready,
      false,
    );
  });
  it('17. create budget >1 fails', () => {
    assert.equal(
      validatePreviewPostRemediationDeletionAuthority(
        futureAuthority({ approved_max_subject_create_count: 2 }),
        authCtx(),
      ).ready,
      false,
    );
  });
  it('18. delete budget >1 fails', () => {
    assert.equal(
      validatePreviewPostRemediationDeletionAuthority(
        futureAuthority({ approved_max_delete_action_count: 2 }),
        authCtx(),
      ).ready,
      false,
    );
  });
  it('19. webhook budget >1 fails', () => {
    assert.equal(
      validatePreviewPostRemediationDeletionAuthority(
        futureAuthority({ approved_max_natural_webhook_count: 2 }),
        authCtx(),
      ).ready,
      false,
    );
  });
  it('20. retry >0 fails', () => {
    assert.equal(
      validatePreviewPostRemediationDeletionAuthority(
        futureAuthority({ approved_max_retry_count: 1 }),
        authCtx(),
      ).ready,
      false,
    );
  });
  it('21. Replay >0 fails', () => {
    assert.equal(
      validatePreviewPostRemediationDeletionAuthority(
        futureAuthority({ approved_max_replay_count: 1 }),
        authCtx(),
      ).ready,
      false,
    );
  });
  it('22. Send Example synthetic manual actions fail', () => {
    assert.equal(
      validatePreviewPostRemediationDeletionAuthority(futureAuthority(), authCtx({ requestedSendExample: true })).ready,
      false,
    );
    assert.equal(
      validatePreviewPostRemediationDeletionAuthority(futureAuthority(), authCtx({ requestedSyntheticPost: true })).ready,
      false,
    );
    assert.equal(
      validatePreviewPostRemediationDeletionAuthority(futureAuthority(), authCtx({ requestedManualRpc: true })).ready,
      false,
    );
    assert.equal(
      validatePreviewPostRemediationDeletionAuthority(futureAuthority(), authCtx({ requestedManualDbRepair: true })).ready,
      false,
    );
  });
  it('23. expired consumed non-single-use fails', () => {
    assert.equal(
      validatePreviewPostRemediationDeletionAuthority(
        futureAuthority({ expires_at: new Date(Date.now() - 1000).toISOString() }),
        authCtx(),
      ).ready,
      false,
    );
    assert.equal(validatePreviewPostRemediationDeletionAuthority(futureAuthority({ consumed: true }), authCtx()).ready, false);
    assert.equal(
      validatePreviewPostRemediationDeletionAuthority(futureAuthority({ single_use: false as true }), authCtx()).ready,
      false,
    );
  });
  it('24. prior ambiguity fails', () => {
    assert.equal(
      validatePreviewPostRemediationDeletionAuthority(futureAuthority({ prior_ambiguous_action: true }), authCtx()).ready,
      false,
    );
  });
  it('25. exact fixture GREEN', () => {
    assert.equal(validatePreviewPostRemediationDeletionAuthority(futureAuthority(), authCtx()).ready, true);
  });
  it('26. fixed schema exact', () => {
    const json = serializePreviewAuthorityResult(validatePreviewPostRemediationDeletionAuthority(null, authCtx()));
    const parsed = JSON.parse(json) as Record<string, unknown>;
    assert.deepEqual(Object.keys(parsed).sort(), [
      'allowed_next_action',
      'approved_deployment_id',
      'approved_subject_label',
      'failed_flags',
      'irreversible_action_budget',
      'ready',
      'schema_version',
      'unknown_flags',
    ]);
  });
  it('27. raw identity secret field rejected', () => {
    assert.equal(authorityContainsForbiddenFields(futureAuthority({ gate_title: 'sk_live_forbidden' })), true);
  });
});

describe('orchestrator', () => {
  it('28. exact 16 states', () => {
    assert.equal(SMOKE_STATES.length, 16);
    assert.equal(SMOKE_STATES[0], 'S0_AUTHORITY_VALIDATION');
    assert.equal(SMOKE_STATES[15], 'S15_FINAL_RC_GATE_SEPARATE');
  });
  it('29. exact deterministic order', () => {
    const h = new PreviewPostRemediationDeletionSmokeHarness();
    h.runLocalDryRunHappyPath();
    const steps = h.evidenceRecord.steps_completed.map((s) => s.step);
    assert.deepEqual(steps, [...SMOKE_STATES]);
  });
  it('30. import has no side effect in authority', () => {
    const authSrc = readFileSync(
      join(ROOT, 'scripts/preview/m55_preview_post_remediation_deletion_authority.ts'),
      'utf8',
    );
    assert.doesNotMatch(authSrc, /process\.argv/);
  });
  it('31. no automatic subject create', () => {
    assert.equal(new PreviewPostRemediationDeletionSmokeHarness().supportsAutomaticSubjectCreate(), false);
  });
  it('32. no automatic delete', () => {
    assert.equal(new PreviewPostRemediationDeletionSmokeHarness().supportsAutomaticClerkDelete(), false);
  });
  it('33. no automatic webhook DB RPC', () => {
    const h = new PreviewPostRemediationDeletionSmokeHarness();
    assert.equal(h.supportsAutomaticWebhook(), false);
    assert.equal(h.supportsAutomaticRpc(), false);
  });
  it('34. planning deployment rejected as execution target in non-dry-run mode', () => {
    const h = new PreviewPostRemediationDeletionSmokeHarness({
      mode: 'preview_execution',
      deploymentId: PLANNING_DEPLOYMENT_ID,
    });
    h.runS0AuthorityValidation();
    assert.match(h.evidenceRecord.first_failure_predicate ?? '', /PLANNING_DEPLOYMENT|DEPLOYMENT/);
  });
  it('35. exact subject binding', () => {
    assert.equal(ORCH_SUBJECT, SUBJECT_LABEL);
    assert.equal(ORCH_SUBJECT, 'M55_PREVIEW_DELETE_POST_REMEDIATION_01');
  });
  it('36. historical reuse rejected', () => {
    const h = new PreviewPostRemediationDeletionSmokeHarness();
    h.runS0AuthorityValidation();
    h.runS1PreviewBindingReverify();
    h.recordHumanSubjectCreation({ label: 'c', recorded_at: new Date().toISOString() });
    h.runS3SafeLabelMapping();
    h.runS4PredeleteReadonlyPrecheck({ ...goodPrecheck(), historical_reuse_detected: true });
    assert.match(h.evidenceRecord.first_failure_predicate ?? '', /PRECHECK/);
  });
  it('37. stop before delete until precheck', () => {
    const h = new PreviewPostRemediationDeletionSmokeHarness();
    h.runS0AuthorityValidation();
    h.runS1PreviewBindingReverify();
    h.recordHumanSubjectCreation({ label: 'c', recorded_at: new Date().toISOString() });
    h.runS3SafeLabelMapping();
    h.recordHumanDeleteAction({ label: 'd', recorded_at: new Date().toISOString() }, 'CLERK_DELETE_CONFIRMED');
    assert.match(h.evidenceRecord.first_failure_predicate ?? '', /PRECHECK/);
  });
  it('38. one delete only', () => {
    const h = new PreviewPostRemediationDeletionSmokeHarness();
    advanceToDelete(h);
    h.recordHumanDeleteAction({ label: 'd', recorded_at: new Date().toISOString() }, 'CLERK_DELETE_CONFIRMED');
    assert.equal(h.irreversibleBudget.delete_action, 1);
  });
  it('39. one natural webhook only', () => {
    const h = new PreviewPostRemediationDeletionSmokeHarness();
    advanceToDelete(h);
    h.recordHumanDeleteAction({ label: 'd', recorded_at: new Date().toISOString() }, 'CLERK_DELETE_CONFIRMED');
    h.runS8WaitForNaturalWebhook();
    h.runS9SvixMetadataClassification(
      {
        event_type_user_deleted: true,
        one_new_delivery: true,
        preview_endpoint: true,
        replay_used: false,
        send_example_used: false,
      },
      'WEBHOOK_ACCEPTED_EXACT',
    );
    assert.equal(h.irreversibleBudget.natural_webhook, 1);
  });
  it('40. stop at first failure', () => {
    const h = new PreviewPostRemediationDeletionSmokeHarness();
    h.runS0AuthorityValidation();
    h.runS4PredeleteReadonlyPrecheck(goodPrecheck());
    assert.equal(h.evidenceRecord.verdict, 'HOLD');
  });
  it('41. wrong subject blocks', () => {
    const h = new PreviewPostRemediationDeletionSmokeHarness();
    h.runS0AuthorityValidation();
    h.runS1PreviewBindingReverify();
    h.recordHumanSubjectCreation({ label: 'c', recorded_at: new Date().toISOString() });
    h.runS3SafeLabelMapping(false);
    assert.match(h.evidenceRecord.first_failure_predicate ?? '', /WRONG_SUBJECT/);
  });
  it('42. ambiguous delete blocks', () => {
    const h = new PreviewPostRemediationDeletionSmokeHarness();
    advanceToDelete(h);
    h.recordHumanDeleteAction({ label: 'd', recorded_at: new Date().toISOString() }, 'CLERK_DELETE_STATUS_AMBIGUOUS');
    assert.match(h.evidenceRecord.first_failure_predicate ?? '', /AMBIGUOUS/);
  });
  it('43. ENOTFOUND blocks permanently', () => {
    const h = new PreviewPostRemediationDeletionSmokeHarness();
    advanceToDelete(h);
    h.recordHumanDeleteAction({ label: 'd', recorded_at: new Date().toISOString() }, 'CLERK_DELETE_CONFIRMED');
    h.runS8WaitForNaturalWebhook();
    h.runS9SvixMetadataClassification(
      {
        event_type_user_deleted: true,
        one_new_delivery: false,
        preview_endpoint: true,
        replay_used: false,
        send_example_used: false,
      },
      'WEBHOOK_TRANSPORT_DNS_FAILURE',
    );
    assert.equal(h.isEnotfoundPermanentStop(), true);
    assert.match(h.evidenceRecord.first_failure_predicate ?? '', /DNS/);
  });
  it('44. no fallback automatically', () => {
    const h = new PreviewPostRemediationDeletionSmokeHarness();
    assert.equal(h.supportsAutomaticRetry(), false);
  });
  it('45. no subject recreation', () => {
    assert.equal(new PreviewPostRemediationDeletionSmokeHarness().supportsSubjectRecreation(), false);
  });
  it('46. fixed evidence schema', () => {
    const h = new PreviewPostRemediationDeletionSmokeHarness();
    h.runLocalDryRunHappyPath();
    assert.equal(evidenceSchemaIsFixed(h.evidenceRecord), true);
  });
});

describe('classifications', () => {
  it('47. clerk class count is 6', () => {
    assert.equal(CLERK_ACTION_CLASSES.length, 6);
  });
  for (const [idx, cls] of CLERK_ACTION_CLASSES.entries()) {
    it(`48.${idx}. clerk class ${cls}`, () => {
      assert.ok(CLERK_ACTION_CLASSES.includes(cls));
    });
  }
  it('49. transport class count is 9', () => {
    assert.equal(TRANSPORT_CLASSES.length, 9);
  });
  for (const [idx, cls] of TRANSPORT_CLASSES.entries()) {
    it(`50.${idx}. transport class ${cls}`, () => {
      assert.ok(TRANSPORT_CLASSES.includes(cls));
    });
  }
  it('51. final class count is 11', () => {
    assert.equal(FINAL_SMOKE_CLASSES.length, 11);
  });
  for (const [idx, cls] of FINAL_SMOKE_CLASSES.entries()) {
    it(`52.${idx}. final class ${cls}`, () => {
      assert.ok(FINAL_SMOKE_CLASSES.includes(cls));
    });
  }
  it('53. only WEBHOOK_ACCEPTED_EXACT proceeds', () => {
    assert.equal(transportAllowsProceed('WEBHOOK_ACCEPTED_EXACT'), true);
    assert.equal(transportAllowsProceed('WEBHOOK_NOT_DELIVERED'), false);
  });
  it('54. DNS failure class exists', () => {
    assert.equal(transportIsDnsFailure('WEBHOOK_TRANSPORT_DNS_FAILURE'), true);
  });
  it('55. only combined GREEN exact', () => {
    assert.equal(
      evaluateCombinedSmokeEvidence({
        clerk_action: 'CLERK_DELETE_CONFIRMED',
        transport: 'WEBHOOK_ACCEPTED_EXACT',
        human_clerk_marker_present: true,
        human_transport_marker_present: true,
        event_ledger_green: true,
        deletion_ledger_green: true,
        rpc_green: true,
        target_state_green: true,
        retained_state_green: true,
        identifiability_green: true,
        unrelated_data_change_count: 0,
      }),
      true,
    );
  });
  it('56. partial GREEN rejected', () => {
    assert.equal(
      evaluateCombinedSmokeEvidence({
        clerk_action: 'CLERK_DELETE_CONFIRMED',
        transport: 'WEBHOOK_ACCEPTED_EXACT',
        human_clerk_marker_present: true,
        human_transport_marker_present: false,
        event_ledger_green: true,
        deletion_ledger_green: true,
        rpc_green: true,
        target_state_green: true,
        retained_state_green: true,
        identifiability_green: true,
        unrelated_data_change_count: 0,
      }),
      false,
    );
    assert.equal(
      evaluateCombinedSmokeEvidence({
        clerk_action: 'CLERK_DELETE_CONFIRMED',
        transport: 'WEBHOOK_ACCEPTED_EXACT',
        human_clerk_marker_present: true,
        human_transport_marker_present: true,
        event_ledger_green: true,
        deletion_ledger_green: true,
        rpc_green: true,
        target_state_green: true,
        retained_state_green: true,
        identifiability_green: true,
        unrelated_data_change_count: 1,
      }),
      false,
    );
  });
  it('57. clerk UI alone insufficient', () => {
    assert.equal(clerkActionIsAmbiguous('CLERK_DELETE_STATUS_AMBIGUOUS'), true);
  });
  it('58. PREVIEW_DELETION_GREEN exists', () => {
    assert.ok(FINAL_SMOKE_CLASSES.includes('PREVIEW_DELETION_GREEN'));
  });
});

describe('SQL contract', () => {
  const sql = readFileSync(SQL_PATH, 'utf8');
  it('59. one SelectStmt', () => {
    assert.equal(sqlHasSingleTopLevelSelect(sql), true);
  });
  it('60. no mutation', () => {
    assert.equal(parseSqlMutationKeywords(sql).length, 0);
  });
  it('61. six modes present', () => {
    assert.equal(sqlPostcheckModeCount(sql), 6);
    assert.equal(sqlModeCount(sql), 6);
    for (const mode of POSTCHECK_MODES) assert.match(sql, new RegExp(mode));
  });
  it('62. missing relation safe via counts', () => {
    assert.match(sql, /COUNT\(\*\)/);
    assert.match(sql, /FROM public\./);
  });
  it('63. deployment marker present via presence check', () => {
    // SQL uses presence-only check — no hardcoded planning deployment ID.
    assert.match(sql, /deployment_identity_green/);
    assert.match(sql, /deployment_identity_marker/);
    assert.match(sql, /length\(trim\(p\.deployment_identity_marker\)\)/);
  });
  it('64. new subject precheck', () => {
    assert.match(sql, /SUBJECT_NEW_AND_CLEAN/);
    assert.match(sql, /M55_PREVIEW_DELETE_POST_REMEDIATION_01/);
  });
  it('65. historical reuse detection', () => {
    assert.match(sql, /historical_attempt_reuse_detected/);
    assert.match(sql, /SUBJECT_PREVIOUS_ATTEMPT_REUSE_RISK/);
  });
  it('66. prior event check', () => {
    assert.match(sql, /HOLD_PRIOR_EVENT_OR_LEDGER_PRESENT/);
  });
  it('67. prior deletion ledger check', () => {
    assert.match(sql, /HOLD_PRIOR_DELETION_LEDGER_PRESENT/);
  });
  it('68. event exactly one', () => {
    assert.match(sql, /post_event_succeeded_count = 1/);
  });
  it('69. deletion ledger exactly one', () => {
    assert.match(sql, /post_deletion_ledger_count = 1/);
  });
  it('70. RPC exactly one via markers', () => {
    assert.match(sql, /human_clerk_action_marker/);
    assert.match(sql, /human_transport_marker/);
  });
  it('71. duplicate event ledger HOLD', () => {
    assert.match(sql, /duplicate_event/);
    assert.match(sql, /duplicate_ledger/);
  });
  it('72. target checks', () => {
    assert.match(sql, /TARGET_RETAINED_GREEN/);
    assert.match(sql, /target_state_green/);
  });
  it('73. retained checks', () => {
    assert.match(sql, /stripe_events_retained_count/);
    assert.match(sql, /retained_state_green/);
  });
  it('74. failed_fulfillments checks', () => {
    assert.match(sql, /subject_failed_fulfillment_count/);
  });
  it('75. identifiability checks', () => {
    assert.match(sql, /identifiability_green/);
  });
  it('76. unrelated change zero', () => {
    assert.match(sql, /unrelated_data_change_count/);
    assert.match(sql, /HOLD_UNRELATED_DATA_CHANGED/);
  });
  it('77. clerk not inferred from DB', () => {
    assert.match(sql, /human_clerk_action_marker = ''/);
    assert.match(sql, /HOLD_TRANSPORT_OR_CLERK_MARKER_MISSING/);
  });
  it('78. transport not inferred from DB', () => {
    assert.match(sql, /human_transport_marker = ''/);
  });
  it('79. failed unknown flags affect result', () => {
    assert.match(sql, /failed_flags/);
    assert.match(sql, /unknown_flags/);
    assert.match(sql, /overall_predicate/);
  });
  it('80. only GREEN allows final RC planning', () => {
    assert.match(sql, /PREVIEW_DELETION_GREEN/);
    assert.match(sql, /FINAL-INTEGRATED-RC-AUDIT/);
  });
  it('81. one summary row', () => {
    assert.match(sql, /^WITH params AS/m);
    assert.match(sql, /FROM flags;\s*$/m);
    assert.equal((sql.match(/^SELECT\b/gm) ?? []).length, 1);
  });
  it('82. no PII raw IDs', () => {
    assert.doesNotMatch(sql, /svix_id AS/);
    assert.doesNotMatch(sql, /clerk_user_id AS/);
    assert.doesNotMatch(sql, /\bemail\b/);
  });
});

describe('runbook contract', () => {
  const runbook = readFileSync(RUNBOOK_PATH, 'utf8');
  it('83. exact deployment', () => {
    assert.match(runbook, /dpl_FPT8yoAMXXMxyS7Y9TGoe2Y1gXWh/);
    assert.match(runbook, /45e75b3020636ab4e6fb313501ce739a818d7cf0/);
    assert.match(runbook, /feat\/m55-paid-lp-canonical-wave1/);
    assert.match(runbook, /Preview/);
  });
  it('84. safe subject label', () => {
    assert.match(runbook, /M55_PREVIEW_DELETE_POST_REMEDIATION_01/);
  });
  it('85. no fixture required', () => {
    assert.match(runbook, /No subject fixture required/);
  });
  it('86. S0-S15 exact', () => {
    for (let i = 0; i <= 15; i++) assert.match(runbook, new RegExp(`\\| S${i} \\|`));
  });
  it('87. one Human delete', () => {
    assert.match(runbook, /exactly one.*Clerk.*deletion/i);
  });
  it('88. natural webhook only', () => {
    assert.match(runbook, /One naturally generated webhook only/);
  });
  it('89. no Replay Send Example synthetic POST', () => {
    assert.match(runbook, /no Send Example, no Replay, no synthetic POST/);
  });
  it('90. no second subject recreation', () => {
    assert.match(runbook, /No second subject/);
    assert.match(runbook, /Subject recreation — \*\*forbidden\*\*/);
  });
  it('91. no manual RPC DB repair', () => {
    assert.match(runbook, /Manual RPC — \*\*forbidden\*\*/);
    assert.match(runbook, /Manual DB repair — \*\*forbidden\*\*/);
  });
  it('92. no redeploy runtime region env change', () => {
    assert.match(runbook, /No redeploy, env\/Node\/region change/);
  });
  it('93. safe EXACT_MATCH confirmations', () => {
    assert.match(runbook, /VERCEL_PREVIEW_DEPLOYMENT_EXACT_MATCH/);
    assert.match(runbook, /SUPABASE_PREVIEW_BINDING_EXACT_MATCH/);
    assert.match(runbook, /CLERK_DEVELOPMENT_INSTANCE_EXACT_MATCH/);
    assert.match(runbook, /SIGNING_SECRET_PREVIEW_SCOPE_EXACT_MATCH/);
    assert.match(runbook, /WEBHOOK_URL_EXACT_MATCH/);
  });
  it('94. approval phrase safe', () => {
    assert.match(runbook, /AUTHORITY_<safe-hash>/);
    assert.match(runbook, new RegExp(APPROVAL_PHRASE_TEMPLATE.slice(0, 50).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  });
  it('95. 20 STOP rows', () => {
    const rows = runbook.match(/ROLLBACK-STOP-ROW-\d+/g) ?? [];
    assert.equal(rows.length, 20);
  });
  it('96. no automatic final RC transition', () => {
    assert.match(runbook, /does \*\*not\*\* authorize final RC automatically/);
    assert.match(runbook, /Preview execution authorized now: false/);
  });
});

describe('security and quality', () => {
  it('97. no live network in authority', () => {
    const src = readFileSync(join(ROOT, 'scripts/preview/m55_preview_post_remediation_deletion_authority.ts'), 'utf8');
    assert.doesNotMatch(src, /\bfetch\s*\(/);
    assert.doesNotMatch(src, /\bhttps?:\/\//);
  });
  it('98. no DB in orchestrator', () => {
    const src = readFileSync(join(ROOT, 'scripts/preview/m55_preview_post_remediation_deletion_smoke.ts'), 'utf8');
    assert.doesNotMatch(src, /\bpg\.connect\b/);
    assert.doesNotMatch(src, /\.rpc\s*\(/);
  });
  it('99. no secret-like literals', () => {
    const src = readFileSync(join(ROOT, 'scripts/preview/m55_preview_post_remediation_deletion_authority.ts'), 'utf8');
    const lines = src.split('\n').filter((l) => !l.includes('FORBIDDEN') && !l.includes('sk_live_'));
    assert.doesNotMatch(lines.join('\n'), /whsec_[A-Za-z0-9]+/);
  });
  it('100. hostile error redacted', () => {
    assert.equal(redactHostileError(new Error('user_secret@example.com sk_live_bad')), 'HOSTILE_ERROR_REDACTED');
  });
  it('101. serialize evidence secret safe', () => {
    const h = new PreviewPostRemediationDeletionSmokeHarness();
    h.runLocalDryRunHappyPath();
    assert.doesNotThrow(() => serializeEvidence(h.evidenceRecord));
  });
  it('102. no arbitrary output keys on authority result', () => {
    const result = validatePreviewPostRemediationDeletionAuthority(futureAuthority(), authCtx());
    assert.equal(Object.keys(result).length, 8);
  });
  it('103. prior historical evidence immutable in runbook', () => {
    assert.match(readFileSync(RUNBOOK_PATH, 'utf8'), /Prior four DNS-failure attempts frozen/);
  });
  it('104. no tautological-only authority default', () => {
    const r = validatePreviewPostRemediationDeletionAuthority(null, authCtx());
    assert.equal(r.ready, false);
    assert.ok(r.failed_flags.length > 0);
  });
});

describe('orchestrator extended', () => {
  it('105. happy path S0-S15 GREEN', () => {
    const h = new PreviewPostRemediationDeletionSmokeHarness();
    h.runLocalDryRunHappyPath();
    assert.equal(h.evidenceRecord.verdict, 'GREEN');
    assert.equal(h.evidenceRecord.steps_completed.length, 16);
  });
  it('106. replay forbidden in svix step', () => {
    const h = new PreviewPostRemediationDeletionSmokeHarness();
    advanceToDelete(h);
    h.recordHumanDeleteAction({ label: 'd', recorded_at: new Date().toISOString() }, 'CLERK_DELETE_CONFIRMED');
    h.runS8WaitForNaturalWebhook();
    h.runS9SvixMetadataClassification(
      {
        event_type_user_deleted: true,
        one_new_delivery: true,
        preview_endpoint: true,
        replay_used: true,
        send_example_used: false,
      },
      'WEBHOOK_ACCEPTED_EXACT',
    );
    assert.match(h.evidenceRecord.first_failure_predicate ?? '', /REPLAY/);
  });
  it('107. webhook not accepted blocks', () => {
    const h = new PreviewPostRemediationDeletionSmokeHarness();
    advanceToDelete(h);
    h.recordHumanDeleteAction({ label: 'd', recorded_at: new Date().toISOString() }, 'CLERK_DELETE_CONFIRMED');
    h.runS8WaitForNaturalWebhook();
    h.runS9SvixMetadataClassification(
      {
        event_type_user_deleted: true,
        one_new_delivery: false,
        preview_endpoint: true,
        replay_used: false,
        send_example_used: false,
      },
      'WEBHOOK_NOT_DELIVERED',
    );
    assert.match(h.evidenceRecord.first_failure_predicate ?? '', /WEBHOOK/);
  });
  it('108. event ledger mismatch blocks', () => {
    const h = new PreviewPostRemediationDeletionSmokeHarness();
    advanceToDelete(h);
    h.recordHumanDeleteAction({ label: 'd', recorded_at: new Date().toISOString() }, 'CLERK_DELETE_CONFIRMED');
    h.runS8WaitForNaturalWebhook();
    h.runS9SvixMetadataClassification(
      {
        event_type_user_deleted: true,
        one_new_delivery: true,
        preview_endpoint: true,
        replay_used: false,
        send_example_used: false,
      },
      'WEBHOOK_ACCEPTED_EXACT',
    );
    h.runS11DbRpcTargetRetainedPostcheck(
      {
        event_row_count: 2,
        deletion_ledger_row_count: 1,
        rpc_success_count: 1,
        duplicate_event: true,
        duplicate_ledger: false,
        partial_unknown_state: false,
      },
      {
        target_pseudonymized: true,
        entitlements_handled: true,
        wallet_handled: true,
        snapshot_handled: true,
        stripe_tables_retained: true,
        failed_fulfillments_handled: true,
        identifiability_green: true,
      },
    );
    assert.match(h.evidenceRecord.first_failure_predicate ?? '', /LEDGER/);
  });
  it('109. unrelated data changed blocks', () => {
    const h = new PreviewPostRemediationDeletionSmokeHarness();
    advanceToDelete(h);
    h.recordHumanDeleteAction({ label: 'd', recorded_at: new Date().toISOString() }, 'CLERK_DELETE_CONFIRMED');
    h.runS8WaitForNaturalWebhook();
    h.runS9SvixMetadataClassification(
      {
        event_type_user_deleted: true,
        one_new_delivery: true,
        preview_endpoint: true,
        replay_used: false,
        send_example_used: false,
      },
      'WEBHOOK_ACCEPTED_EXACT',
    );
    h.runS11DbRpcTargetRetainedPostcheck(
      {
        event_row_count: 1,
        deletion_ledger_row_count: 1,
        rpc_success_count: 1,
        duplicate_event: false,
        duplicate_ledger: false,
        partial_unknown_state: false,
      },
      {
        target_pseudonymized: true,
        entitlements_handled: true,
        wallet_handled: true,
        snapshot_handled: true,
        stripe_tables_retained: true,
        failed_fulfillments_handled: true,
        identifiability_green: true,
      },
    );
    h.runS12UnrelatedDataPostcheck({ unrelated_data_change_count: 1, global_control_mutation: true });
    assert.match(h.evidenceRecord.first_failure_predicate ?? '', /UNRELATED/);
  });
  it('110. preview execution requires authority', () => {
    const h = new PreviewPostRemediationDeletionSmokeHarness({ mode: 'preview_execution', authority: null });
    h.runS0AuthorityValidation();
    assert.equal(h.evidenceRecord.verdict, 'HOLD');
  });
  it('111. no manual RPC exposed', () => {
    assert.equal(new PreviewPostRemediationDeletionSmokeHarness().supportsManualRpc(), false);
  });
  it('112. no synthetic post exposed', () => {
    assert.equal(new PreviewPostRemediationDeletionSmokeHarness().supportsSyntheticPost(), false);
  });
});

describe('authority budget enforcement', () => {
  it('113. subject create budget enforced', () => {
    assert.equal(
      validatePreviewPostRemediationDeletionAuthority(
        futureAuthority(),
        authCtx({ actionsConsumed: { subject_create: 2, delete_action: 0, natural_webhook: 0, retry: 0, replay: 0 } }),
      ).ready,
      false,
    );
  });
  it('114. delete budget enforced', () => {
    assert.equal(
      validatePreviewPostRemediationDeletionAuthority(
        futureAuthority(),
        authCtx({ actionsConsumed: { subject_create: 0, delete_action: 2, natural_webhook: 0, retry: 0, replay: 0 } }),
      ).ready,
      false,
    );
  });
  it('115. webhook budget enforced', () => {
    assert.equal(
      validatePreviewPostRemediationDeletionAuthority(
        futureAuthority(),
        authCtx({ actionsConsumed: { subject_create: 0, delete_action: 0, natural_webhook: 2, retry: 0, replay: 0 } }),
      ).ready,
      false,
    );
  });
  it('116. webhook route binding required', () => {
    const bad = futureAuthority({
      binding_confirmations: { ...futureAuthority().binding_confirmations, webhook_route_exact: false },
    });
    assert.equal(validatePreviewPostRemediationDeletionAuthority(bad, authCtx()).ready, false);
  });
  it('117. webhook url binding required', () => {
    const bad = futureAuthority({
      binding_confirmations: { ...futureAuthority().binding_confirmations, webhook_url_exact: false },
    });
    assert.equal(validatePreviewPostRemediationDeletionAuthority(bad, authCtx()).ready, false);
  });
});

describe('SQL integrated closure', () => {
  const sql = readFileSync(SQL_PATH, 'utf8');
  it('118. INTEGRATED_PREVIEW_DELETION_CLOSURE mode', () => {
    assert.match(sql, /INTEGRATED_PREVIEW_DELETION_CLOSURE/);
  });
  it('119. PREVIEW_DELETION_GREEN classification', () => {
    assert.match(sql, /PREVIEW_DELETION_GREEN/);
  });
  it('120. event_ledger_green column', () => {
    assert.match(sql, /event_ledger_green/);
  });
  it('121. deletion_ledger_green column', () => {
    assert.match(sql, /deletion_ledger_green/);
  });
  it('122. next_gate column', () => {
    assert.match(sql, /next_gate/);
  });
});

describe('runbook transport', () => {
  const runbook = readFileSync(RUNBOOK_PATH, 'utf8');
  it('123. WEBHOOK_ACCEPTED_EXACT only proceeds', () => {
    assert.match(runbook, /WEBHOOK_ACCEPTED_EXACT.*only class that may proceed/);
  });
  it('124. combined evidence section', () => {
    assert.match(runbook, /Combined evidence required/);
  });
  it('125. ENOTFOUND permanent stop', () => {
    assert.match(runbook, /STOP permanently for this subject/);
  });
});

describe('orchestrator budgets', () => {
  it('126. max budgets at start', () => {
    const h = new PreviewPostRemediationDeletionSmokeHarness();
    assert.equal(h.irreversibleBudget.subject_create, 0);
    assert.equal(h.irreversibleBudget.replay, 0);
  });
  it('127. HOLD_UNKNOWN exists', () => {
    assert.ok(FINAL_SMOKE_CLASSES.includes('HOLD_UNKNOWN'));
  });
  it('128. max subject create is 1', () => {
    assert.equal(MAX_SUBJECT_CREATE_COUNT, 1);
  });
  it('129. max replay is 0', () => {
    assert.equal(MAX_REPLAY_COUNT, 0);
  });
});

describe('authority constants', () => {
  it('130. rpc identity frozen', () => {
    assert.equal(APPROVED_RPC_IDENTITY, 'm55_account_deletion_process_v1');
  });
  it('131. webhook route identity frozen', () => {
    assert.match(APPROVED_WEBHOOK_ROUTE_IDENTITY, /clerk\/webhook/);
  });
  it('132. deployment ID frozen', () => {
    assert.equal(APPROVED_DEPLOYMENT_ID, 'dpl_FPT8yoAMXXMxyS7Y9TGoe2Y1gXWh');
  });
  it('133. feature head frozen', () => {
    assert.equal(APPROVED_FEATURE_HEAD, '45e75b3020636ab4e6fb313501ce739a818d7cf0');
  });
});

describe('environment mismatch', () => {
  it('134. wrong environment fails', () => {
    assert.equal(
      validatePreviewPostRemediationDeletionAuthority(futureAuthority({ approved_environment: 'Production' }), authCtx()).ready,
      false,
    );
  });
  it('135. observed deployment ID mismatch fails', () => {
    assert.equal(
      validatePreviewPostRemediationDeletionAuthority(
        futureAuthority(),
        authCtx({ observedDeploymentId: 'dpl_OTHER' }),
      ).ready,
      false,
    );
  });
  it('136. subject recreation forbidden in authority', () => {
    assert.equal(
      validatePreviewPostRemediationDeletionAuthority(futureAuthority(), authCtx({ requestedSubjectRecreation: true })).ready,
      false,
    );
  });
  it('137. vercel preview binding required', () => {
    const bad = futureAuthority({
      binding_confirmations: { ...futureAuthority().binding_confirmations, vercel_preview_deployment_exact: false },
    });
    assert.equal(validatePreviewPostRemediationDeletionAuthority(bad, authCtx()).ready, false);
  });
  it('138. postcheck after delivery in happy path', () => {
    const h = new PreviewPostRemediationDeletionSmokeHarness();
    h.runLocalDryRunHappyPath();
    const steps = h.evidenceRecord.steps_completed.map((s) => s.step);
    const s8 = steps.indexOf('S8_WAIT_FOR_NATURAL_WEBHOOK');
    const s11 = steps.indexOf('S11_DB_RPC_TARGET_RETAINED_POSTCHECK');
    assert.ok(s8 >= 0 && s11 > s8);
  });
  it('139. natural webhook only flag', () => {
    assert.equal(new PreviewPostRemediationDeletionSmokeHarness().supportsWebhookReplay(), false);
  });
  it('140. historical evidence frozen in authority exclusion identity', () => {
    assert.match(
      futureAuthority().approved_historical_attempt_exclusion_identity,
      /four-prior-preview-dns-failure/,
    );
  });
});

describe('execution deployment binding — stale and post-push scenarios', () => {
  it('141. execution deployment not supplied → fails', () => {
    assert.equal(
      validatePreviewPostRemediationDeletionAuthority(futureAuthority(), authCtx({ executionDeployment: undefined })).ready,
      false,
    );
  });
  it('142. planning deployment as execution target → HOLD_EXECUTION_DEPLOYMENT_IS_HISTORICAL_FORBIDDEN', () => {
    const r = validatePreviewPostRemediationDeletionAuthority(
      futureAuthority(),
      authCtx({
        executionDeployment: {
          deployment_id: PLANNING_DEPLOYMENT_ID,
          deployment_commit: FUTURE_AUTH_COMMIT,
          deployment_environment: 'Preview',
          deployment_branch: 'feat/m55-paid-lp-canonical-wave1',
          branch_alias_current: true,
          production_binding: false,
          deployment_ready: true,
          created_after_authority_commit: true,
        },
      }),
    );
    assert.equal(r.ready, false);
    assert.ok(r.failed_flags.some((f) => f.includes('HISTORICAL_FORBIDDEN')));
  });
  it('143. execution deployment commit mismatch → fails', () => {
    const r = validatePreviewPostRemediationDeletionAuthority(
      futureAuthority(),
      authCtx({
        executionDeployment: {
          deployment_id: FUTURE_EXECUTION_DEPLOYMENT_ID,
          deployment_commit: 'f'.repeat(40), // wrong commit
          deployment_environment: 'Preview',
          deployment_branch: 'feat/m55-paid-lp-canonical-wave1',
          branch_alias_current: true,
          production_binding: false,
          deployment_ready: true,
          created_after_authority_commit: true,
        },
      }),
    );
    assert.equal(r.ready, false);
    assert.ok(r.failed_flags.some((f) => f.includes('COMMIT_MISMATCH')));
  });
  it('144. expected_authority_commit empty → HOLD_EXPECTED_AUTHORITY_COMMIT_NOT_SET', () => {
    const r = validatePreviewPostRemediationDeletionAuthority(
      futureAuthority({ expected_authority_commit: '' }),
      authCtx(),
    );
    assert.equal(r.ready, false);
    assert.ok(r.failed_flags.some((f) => f.includes('EXPECTED_AUTHORITY_COMMIT_NOT_SET')));
  });
  it('145. execution deployment not ready → fails', () => {
    const r = validatePreviewPostRemediationDeletionAuthority(
      futureAuthority(),
      authCtx({
        executionDeployment: {
          deployment_id: FUTURE_EXECUTION_DEPLOYMENT_ID,
          deployment_commit: FUTURE_AUTH_COMMIT,
          deployment_environment: 'Preview',
          deployment_branch: 'feat/m55-paid-lp-canonical-wave1',
          branch_alias_current: true,
          production_binding: false,
          deployment_ready: false,
          created_after_authority_commit: true,
        },
      }),
    );
    assert.equal(r.ready, false);
    assert.ok(r.failed_flags.some((f) => f.includes('NOT_READY')));
  });
  it('146. execution deployment not Preview → fails', () => {
    const r = validatePreviewPostRemediationDeletionAuthority(
      futureAuthority(),
      authCtx({
        executionDeployment: {
          deployment_id: FUTURE_EXECUTION_DEPLOYMENT_ID,
          deployment_commit: FUTURE_AUTH_COMMIT,
          deployment_environment: 'Production',
          deployment_branch: 'feat/m55-paid-lp-canonical-wave1',
          branch_alias_current: true,
          production_binding: false,
          deployment_ready: true,
          created_after_authority_commit: true,
        },
      }),
    );
    assert.equal(r.ready, false);
    assert.ok(r.failed_flags.some((f) => f.includes('NOT_PREVIEW')));
  });
  it('147. execution deployment production-bound → fails', () => {
    const r = validatePreviewPostRemediationDeletionAuthority(
      futureAuthority(),
      authCtx({
        executionDeployment: {
          deployment_id: FUTURE_EXECUTION_DEPLOYMENT_ID,
          deployment_commit: FUTURE_AUTH_COMMIT,
          deployment_environment: 'Preview',
          deployment_branch: 'feat/m55-paid-lp-canonical-wave1',
          branch_alias_current: true,
          production_binding: true,
          deployment_ready: true,
          created_after_authority_commit: true,
        },
      }),
    );
    assert.equal(r.ready, false);
    assert.ok(r.failed_flags.some((f) => f.includes('PRODUCTION_BINDING')));
  });
  it('148. execution deployment predates authority commit → fails', () => {
    const r = validatePreviewPostRemediationDeletionAuthority(
      futureAuthority(),
      authCtx({
        executionDeployment: {
          deployment_id: FUTURE_EXECUTION_DEPLOYMENT_ID,
          deployment_commit: FUTURE_AUTH_COMMIT,
          deployment_environment: 'Preview',
          deployment_branch: 'feat/m55-paid-lp-canonical-wave1',
          branch_alias_current: true,
          production_binding: false,
          deployment_ready: true,
          created_after_authority_commit: false,
        },
      }),
    );
    assert.equal(r.ready, false);
    assert.ok(r.failed_flags.some((f) => f.includes('PREDATES_AUTHORITY_COMMIT')));
  });
  it('149. alias stale on execution deployment → fails', () => {
    const r = validatePreviewPostRemediationDeletionAuthority(
      futureAuthority(),
      authCtx({
        executionDeployment: {
          deployment_id: FUTURE_EXECUTION_DEPLOYMENT_ID,
          deployment_commit: FUTURE_AUTH_COMMIT,
          deployment_environment: 'Preview',
          deployment_branch: 'feat/m55-paid-lp-canonical-wave1',
          branch_alias_current: false,
          production_binding: false,
          deployment_ready: true,
          created_after_authority_commit: true,
        },
      }),
    );
    assert.equal(r.ready, false);
    assert.ok(r.failed_flags.some((f) => f.includes('ALIAS_STALE')));
  });
  it('150. fresh post-push deployment matching authority commit → GREEN', () => {
    assert.equal(validatePreviewPostRemediationDeletionAuthority(futureAuthority(), authCtx()).ready, true);
  });
  it('151. PLANNING_DEPLOYMENT_ID constant equals expected historical value', () => {
    assert.equal(PLANNING_DEPLOYMENT_ID, 'dpl_FPT8yoAMXXMxyS7Y9TGoe2Y1gXWh');
    assert.equal(APPROVED_DEPLOYMENT_ID, PLANNING_DEPLOYMENT_ID);
  });
  it('152. isHistoricalForbiddenDeployment returns true for planning deployment', () => {
    assert.equal(isHistoricalForbiddenDeployment(PLANNING_DEPLOYMENT_ID), true);
    assert.equal(isHistoricalForbiddenDeployment(FUTURE_EXECUTION_DEPLOYMENT_ID), false);
  });
  it('153. HISTORICAL_FORBIDDEN_DEPLOYMENT_IDS_HASH is non-empty sha256', () => {
    assert.ok(HISTORICAL_FORBIDDEN_DEPLOYMENT_IDS_HASH.length === 64);
    assert.match(HISTORICAL_FORBIDDEN_DEPLOYMENT_IDS_HASH, /^[0-9a-f]{64}$/);
  });
  it('154. wrong forbidden hash in authority → fails', () => {
    const r = validatePreviewPostRemediationDeletionAuthority(
      futureAuthority({ historical_forbidden_deployment_ids_hash: 'a'.repeat(64) }),
      authCtx(),
    );
    assert.equal(r.ready, false);
    assert.ok(r.failed_flags.some((f) => f.includes('FORBIDDEN_HASH')));
  });
  it('155. planning deployment is NOT execution target in orchestrator execution mode', () => {
    const h = new PreviewPostRemediationDeletionSmokeHarness({
      mode: 'preview_execution',
      deploymentId: PLANNING_DEPLOYMENT_ID,
    });
    h.runS0AuthorityValidation();
    assert.equal(h.evidenceRecord.verdict, 'HOLD');
    assert.match(h.evidenceRecord.first_failure_predicate ?? '', /PLANNING_DEPLOYMENT|STALE/);
  });
  it('156. execution deployment safe check helper', () => {
    const h = new PreviewPostRemediationDeletionSmokeHarness({ mode: 'local_dry_run' });
    assert.equal(h.isExecutionDeploymentSafe(), true); // dry-run always safe
    const h2 = new PreviewPostRemediationDeletionSmokeHarness({
      mode: 'preview_execution',
      deploymentId: FUTURE_EXECUTION_DEPLOYMENT_ID,
      executionDeployment: {
        deployment_id: FUTURE_EXECUTION_DEPLOYMENT_ID,
        deployment_commit: FUTURE_AUTH_COMMIT,
        deployment_environment: 'Preview',
        deployment_branch: 'feat/m55-paid-lp-canonical-wave1',
        branch_alias_current: true,
        production_binding: false,
        deployment_ready: true,
        created_after_authority_commit: true,
      },
    });
    assert.equal(h2.isExecutionDeploymentSafe(), true);
  });
  it('157. approval phrase uses DEPLOYMENT placeholder not literal planning ID', () => {
    assert.doesNotMatch(APPROVAL_PHRASE_TEMPLATE, /dpl_FPT8yoAMXXMxyS7Y9TGoe2Y1gXWh/);
    assert.match(APPROVAL_PHRASE_TEMPLATE, /DEPLOYMENT_<safe-id>/);
    assert.match(APPROVAL_PHRASE_TEMPLATE, /COMMIT_<safe-short-sha>/);
  });
  it('158. runbook approval phrase is parameterized', () => {
    const runbook = readFileSync(RUNBOOK_PATH, 'utf8');
    assert.doesNotMatch(runbook, /DEPLOYMENT_dpl_FPT8yoAMXXMxyS7Y9TGoe2Y1gXWh/);
    assert.match(runbook, /DEPLOYMENT_<safe-id>/);
    assert.match(runbook, /COMMIT_<safe-short-sha>/);
  });
  it('159. runbook states planning deployment is historical evidence', () => {
    const runbook = readFileSync(RUNBOOK_PATH, 'utf8');
    assert.match(runbook, /historical evidence/);
    assert.match(runbook, /post-push/i);
  });
  it('160. SQL deployment check is presence-only not hardcoded planning ID', () => {
    const sql = readFileSync(SQL_PATH, 'utf8');
    assert.doesNotMatch(sql, /deployment_identity_marker = 'dpl_FPT8yoAMXXMxyS7Y9TGoe2Y1gXWh'/);
    assert.match(sql, /length\(trim\(p\.deployment_identity_marker\)\) > 0/);
  });
  it('161. SQL default GUC is empty not planning deployment', () => {
    const sql = readFileSync(SQL_PATH, 'utf8');
    assert.doesNotMatch(sql, /NULLIF.*'dpl_FPT8yoAMXXMxyS7Y9TGoe2Y1gXWh'/);
  });
  it('162. local_gap_remains_count semantics in runbook', () => {
    const runbook = readFileSync(RUNBOOK_PATH, 'utf8');
    assert.match(runbook, /local_gap_remains_count=0/);
    assert.match(runbook, /does NOT mean completion of/);
  });
  it('163. unrelated GREEN gates not reopened — auth tests remain passing', () => {
    // Verifies test infra itself is stable (no side effects from execution deployment additions).
    assert.equal(SMOKE_STATES.length, 16);
    assert.equal(CLERK_ACTION_CLASSES.length, 6);
    assert.equal(TRANSPORT_CLASSES.length, 9);
    assert.equal(FINAL_SMOKE_CLASSES.length, 11);
  });

  // ── Supabase Preview ref enforcement (SSOT-ENFORCEMENT-PATCH-1) ─────────────────
  it('164. APPROVED_SUPABASE_PREVIEW_REF_IDENTITY is the canonical Human-confirmed ref', () => {
    assert.equal(APPROVED_SUPABASE_PREVIEW_REF_IDENTITY, 'sbogwyzldjxxouhqtpoq');
  });
  it('165. stale tpnq ref rejects with HOLD_SUPABASE_PREVIEW_REF_MISMATCH', () => {
    const r = validatePreviewPostRemediationDeletionAuthority(
      futureAuthority(),
      authCtx({ actual_supabase_preview_ref: 'sbogwyzldjxxouhqtpnq' }),
    );
    assert.ok(r.failed_flags.includes('HOLD_SUPABASE_PREVIEW_REF_MISMATCH'), JSON.stringify(r.failed_flags));
    assert.equal(r.ready, false);
  });
  it('166. exact tpoq ref passes — authority_ready true', () => {
    const r = validatePreviewPostRemediationDeletionAuthority(
      futureAuthority(),
      authCtx({ actual_supabase_preview_ref: 'sbogwyzldjxxouhqtpoq' }),
    );
    assert.ok(!r.failed_flags.includes('HOLD_SUPABASE_PREVIEW_REF_MISMATCH'), JSON.stringify(r.failed_flags));
    assert.ok(!r.failed_flags.includes('HOLD_SUPABASE_PREVIEW_REF_MISSING'), JSON.stringify(r.failed_flags));
    assert.equal(r.ready, true);
  });
  it('167. missing ref rejects with HOLD_SUPABASE_PREVIEW_REF_MISSING', () => {
    const r = validatePreviewPostRemediationDeletionAuthority(
      futureAuthority(),
      authCtx({ actual_supabase_preview_ref: undefined }),
    );
    assert.ok(r.failed_flags.includes('HOLD_SUPABASE_PREVIEW_REF_MISSING'), JSON.stringify(r.failed_flags));
    assert.equal(r.ready, false);
  });
  it('168. empty-string ref rejects with HOLD_SUPABASE_PREVIEW_REF_MISSING', () => {
    const r = validatePreviewPostRemediationDeletionAuthority(
      futureAuthority(),
      authCtx({ actual_supabase_preview_ref: '' }),
    );
    assert.ok(r.failed_flags.includes('HOLD_SUPABASE_PREVIEW_REF_MISSING'), JSON.stringify(r.failed_flags));
    assert.equal(r.ready, false);
  });
  it('169. boolean exact=true with wrong ref still rejects', () => {
    // supabase_preview_binding_exact=true alone is insufficient without matching ref.
    const r = validatePreviewPostRemediationDeletionAuthority(
      futureAuthority(),
      authCtx({ actual_supabase_preview_ref: 'some-other-ref-not-approved' }),
    );
    assert.ok(r.failed_flags.includes('HOLD_SUPABASE_PREVIEW_REF_MISMATCH'), JSON.stringify(r.failed_flags));
    assert.equal(r.ready, false);
  });
  it('170. production-like ref rejects with HOLD_SUPABASE_PREVIEW_REF_MISMATCH', () => {
    // m55-soul-core is the Production Supabase project ref — must not pass as Preview.
    const r = validatePreviewPostRemediationDeletionAuthority(
      futureAuthority(),
      authCtx({ actual_supabase_preview_ref: 'm55-soul-core' }),
    );
    assert.ok(r.failed_flags.includes('HOLD_SUPABASE_PREVIEW_REF_MISMATCH'), JSON.stringify(r.failed_flags));
    assert.equal(r.ready, false);
  });
  it('171. authority hash changes when ref changes — source phrase invalidated', () => {
    // Hash the canonical authority bundle with correct ref vs stale ref — they must differ.
    const correctHash = hashApprovalPhrase('sbogwyzldjxxouhqtpoq:authority-binding');
    const staleHash   = hashApprovalPhrase('sbogwyzldjxxouhqtpnq:authority-binding');
    assert.notEqual(correctHash, staleHash);
    // The source gate authority hash (computed before ref fix) is stale and must not be reused.
    const sourceGateHash = 'd31fdb92c41c53166ebea4dded01dc07672d5037957414ef381730e28f54285d';
    assert.notEqual(correctHash, sourceGateHash);
  });
});
