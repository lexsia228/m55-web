import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';

import {
  buildUnitTestAlignedExactCatalogQueryResults,
  deriveExactCatalogObservationQueryPlanDigestSha256,
  R7_D1_REAL_PG_OBSERVATION_PROVENANCE_ESTABLISHED_FOR_TRUSTED_REGISTRATION,
  registerTrustedCatalogQueryExecutionContextFromOwnedReadonlyCollector,
} from './r7D1ExactCatalogContract.ts';
import { R7_PREVIEW_TARGET_PROJECT_REF, R7_PR249_FROZEN_REPO_ROOT } from './r7D1D5OfflinePlan.ts';
import {
  evaluateR7D1ReadonlyPgObservationRuntimeAuthorization,
  isR7D1ReadonlyPgObservationIoPermitted,
  R7_D1_READONLY_PG_OBSERVATION_CHANNEL_ENV,
  R7_D1_READONLY_PG_OBSERVATION_CHANNEL_V1,
} from './r7D1ReadonlyPgObservationRuntimeAuthorization.ts';
import {
  finalizeR7D1ReadonlyPgObservationFromTrustedCollected,
  parseR7D1ReadonlyPgObservationWireV1,
  teardownR7D1ReadonlyPgObservationSession,
} from './r7D1ReadonlyPgObservationOrchestration.ts';
import {
  buildTrustedCollectedCatalogObservationFromQueryResults,
  R7_D1_PG_CATALOG_OBSERVATION_QUERIES,
} from './r7D1TrustedCatalogVerifier.ts';
import type { R7D1TrustedCollectedCatalogObservation } from './r7D1TrustedCatalogVerifier.ts';
import {
  bindR7D1ReadonlyPgVerifiedSessionProvenanceFromEstablishedAdapter,
  isR7D1ReadonlyPgVerifiedSession,
} from './r7D1ReadonlyPgSessionProvenance.ts';
import {
  establishFreshReadOnlyPgSession,
  R7_D1_SET_TRANSACTION_READ_ONLY_SQL,
  R7_D1_TRANSACTION_READ_ONLY_ASSERT_SQL,
  wrapExecutionPgClientAsR7LiveBridgeSession,
  type R7LiveBridgePgSessionShape,
} from './r7D1RealPgAdapter.ts';
import {
  FakeExecutionPgClient,
  type ExecutionPgClientConfig,
  type ExecutionPgQueryResult,
} from './remoteExecutionPgTransport.ts';
import {
  expectedConnectionUserForProjectRef,
  POST_CONNECT_GUARD_BINDING,
  POST_CONNECT_GUARD_SQL,
  SESSION_POOLER_HOST,
  SESSION_POOLER_TLS_SERVER_NAME,
  TLS_TRUST_PROFILE,
} from './remoteConnectionAuthority.ts';

const ORIGINAL_CHANNEL = process.env[R7_D1_READONLY_PG_OBSERVATION_CHANNEL_ENV];

const TEST_PG_CONFIG: ExecutionPgClientConfig = {
  host: SESSION_POOLER_HOST,
  port: 5432,
  database: 'postgres',
  user: expectedConnectionUserForProjectRef(R7_PREVIEW_TARGET_PROJECT_REF),
  password: 'redacted',
  sslmode: 'require',
  tlsCaPem: 'TEST',
  tlsTrustProfile: TLS_TRUST_PROFILE,
  tlsServerName: SESSION_POOLER_TLS_SERVER_NAME,
  connectionTimeoutMillis: 1000,
};

afterEach(() => {
  if (ORIGINAL_CHANNEL === undefined) {
    delete process.env[R7_D1_READONLY_PG_OBSERVATION_CHANNEL_ENV];
  } else {
    process.env[R7_D1_READONLY_PG_OBSERVATION_CHANNEL_ENV] = ORIGINAL_CHANNEL;
  }
});

function buildReadonlyObservationQueryHandler(
  aligned: ReturnType<typeof buildUnitTestAlignedExactCatalogQueryResults>,
): (sql: string) => ExecutionPgQueryResult {
  const sqlToKey = new Map(R7_D1_PG_CATALOG_OBSERVATION_QUERIES.map((entry) => [entry.sql, entry.key]));
  return (sql: string) => {
    if (sql === POST_CONNECT_GUARD_SQL) {
      return {
        rows: [
          {
            current_database_name: POST_CONNECT_GUARD_BINDING.expected.current_database_name,
            current_user_name: POST_CONNECT_GUARD_BINDING.expected.current_user_name,
          },
        ],
        rowCount: 1,
      };
    }
    if (sql === R7_D1_TRANSACTION_READ_ONLY_ASSERT_SQL) {
      return { rows: [{ transaction_read_only: 'on' }], rowCount: 1 };
    }
    if (sql === R7_D1_SET_TRANSACTION_READ_ONLY_SQL) {
      return { rows: [], rowCount: 0 };
    }
    const key = sqlToKey.get(sql);
    if (key) {
      const rows = aligned[key] ?? [];
      return { rows: [...rows], rowCount: rows.length };
    }
    return { rows: [], rowCount: 0 };
  };
}

describe('r7D1 readonly PG observation runtime authorization', () => {
  it('fails closed without operator channel env', () => {
    delete process.env[R7_D1_READONLY_PG_OBSERVATION_CHANNEL_ENV];
    assert.equal(isR7D1ReadonlyPgObservationIoPermitted(), false);
    const denied = evaluateR7D1ReadonlyPgObservationRuntimeAuthorization();
    assert.equal(denied.ok, false);
    if (!denied.ok) {
      assert.equal(denied.holdReasonCode, 'HOLD_READONLY_PG_OBSERVATION_NOT_AUTHORIZED');
    }
  });

  it('permits IO only when channel v1 is set and mutation gate remains closed', () => {
    process.env[R7_D1_READONLY_PG_OBSERVATION_CHANNEL_ENV] = R7_D1_READONLY_PG_OBSERVATION_CHANNEL_V1;
    assert.equal(evaluateR7D1ReadonlyPgObservationRuntimeAuthorization().ok, true);
    assert.equal(isR7D1ReadonlyPgObservationIoPermitted(), true);
  });
});

describe('r7D1 readonly_pg_verified session provenance (no global flag flip)', () => {
  it('still rejects forged readonly_pg_verified without session binding', () => {
    assert.equal(R7_D1_REAL_PG_OBSERVATION_PROVENANCE_ESTABLISHED_FOR_TRUSTED_REGISTRATION, false);
    const forged = registerTrustedCatalogQueryExecutionContextFromOwnedReadonlyCollector(
      { forged: true },
      deriveExactCatalogObservationQueryPlanDigestSha256(),
      'readonly_pg_verified',
    );
    assert.equal(forged, null);
  });

  it('rejects forged verified bind without real pg transport client', () => {
    const digest = deriveExactCatalogObservationQueryPlanDigestSha256();
    const locator = 'a'.repeat(64);
    const fakeClient = new FakeExecutionPgClient(TEST_PG_CONFIG);
    const bound = bindR7D1ReadonlyPgVerifiedSessionProvenanceFromEstablishedAdapter(
      { forged: true },
      fakeClient,
      {
        previewProjectRef: R7_PREVIEW_TARGET_PROJECT_REF,
        queryPlanDigestSha256: digest,
        physicalBackendLocatorSha256: locator,
      },
      locator,
    );
    assert.equal(bound.ok, false);
  });

  it('cannot establish readonly_pg_verified on fake transport even with operator channel', async () => {
    process.env[R7_D1_READONLY_PG_OBSERVATION_CHANNEL_ENV] = R7_D1_READONLY_PG_OBSERVATION_CHANNEL_V1;
    const aligned = buildUnitTestAlignedExactCatalogQueryResults(R7_PR249_FROZEN_REPO_ROOT, 'PRE_READONLY');
    const client = new FakeExecutionPgClient(TEST_PG_CONFIG, {
      queryHandler: buildReadonlyObservationQueryHandler(aligned),
    });
    const session = wrapExecutionPgClientAsR7LiveBridgeSession(client);
    const established = await establishFreshReadOnlyPgSession(session);
    assert.equal(established.ok, false);
    if (!established.ok) {
      assert.equal(established.holdReasonCode, 'HOLD_PHYSICAL_BACKEND_DISTINCTNESS_UNVERIFIED');
    }
    assert.equal(isR7D1ReadonlyPgVerifiedSession(session), false);
    const digest = deriveExactCatalogObservationQueryPlanDigestSha256();
    assert.equal(
      registerTrustedCatalogQueryExecutionContextFromOwnedReadonlyCollector(session, digest, 'readonly_pg_verified'),
      null,
    );
  });
});

function buildTrustedPreObservationFromMockRows(
  results: ReturnType<typeof buildUnitTestAlignedExactCatalogQueryResults>,
): R7D1TrustedCollectedCatalogObservation {
  const session = { testSession: 'pre-readonly-finalize' };
  const digest = deriveExactCatalogObservationQueryPlanDigestSha256();
  const ctx = registerTrustedCatalogQueryExecutionContextFromOwnedReadonlyCollector(
    session,
    digest,
    'local_code_only_mock',
  );
  assert.notEqual(ctx, null);
  const built = buildTrustedCollectedCatalogObservationFromQueryResults(R7_PR249_FROZEN_REPO_ROOT, results, {
    trustedQueryExecutionContext: ctx!,
    phase: 'PRE_READONLY',
  });
  assert.equal(built.ok, true);
  if (!built.ok) {
    throw new Error('expected trusted observation build');
  }
  return built.trusted;
}

describe('r7D1 readonly PG observation PRE finalize (negative)', () => {
  it('holds when producer-bound evidence is missing from trusted collected', () => {
    const orphan = {
      provenance: 'D1_READONLY_QUERY_COLLECTOR_INTERNAL_V1',
      observationProvenanceTier: 'readonly_pg_verified',
      observationDigestSha256: 'a'.repeat(64),
      nameObservation: Object.freeze({
        anchorTableCount: 0,
        tablesPresent: [],
        functionsPresent: [],
        triggersPresent: [],
        explicitIndexesPresent: [],
        rlsEnabledTablesPresent: [],
      }),
      supabaseMigrationVersion: null,
      categoryOutcomes: Object.freeze({}),
    } as R7D1TrustedCollectedCatalogObservation;
    const result = finalizeR7D1ReadonlyPgObservationFromTrustedCollected(R7_PR249_FROZEN_REPO_ROOT, orphan);
    assert.equal(result.mode, 'R7_D1_READONLY_PG_OBSERVATION_HOLD');
    if (result.mode === 'R7_D1_READONLY_PG_OBSERVATION_HOLD') {
      assert.equal(result.holdReasonCode, 'HOLD_PRODUCER_BOUND_EVIDENCE_MISSING');
    }
  });

  it('holds on PRE migration history mismatch', () => {
    const rows = buildUnitTestAlignedExactCatalogQueryResults(R7_PR249_FROZEN_REPO_ROOT, 'PRE_READONLY');
    const bad = { ...rows, MIGRATION_HISTORY_ROW: [{ version: '19990101000000' }] };
    const trusted = buildTrustedPreObservationFromMockRows(bad);
    const result = finalizeR7D1ReadonlyPgObservationFromTrustedCollected(R7_PR249_FROZEN_REPO_ROOT, trusted);
    assert.equal(result.mode, 'R7_D1_READONLY_PG_OBSERVATION_HOLD');
    if (result.mode === 'R7_D1_READONLY_PG_OBSERVATION_HOLD') {
      assert.equal(result.holdReasonCode, 'HOLD_PRE_READONLY_CATALOG_EVALUATION_FAILED');
    }
  });

  it('holds when compliance objects exist before D1 (PRE_STATE_ABSENCE)', () => {
    const rows = buildUnitTestAlignedExactCatalogQueryResults(R7_PR249_FROZEN_REPO_ROOT, 'PRE_READONLY');
    const bad = { ...rows, TABLES: [{ name: 'm55_r5_compliance_anchor_v1' }] };
    const trusted = buildTrustedPreObservationFromMockRows(bad);
    const result = finalizeR7D1ReadonlyPgObservationFromTrustedCollected(R7_PR249_FROZEN_REPO_ROOT, trusted);
    assert.equal(result.mode, 'R7_D1_READONLY_PG_OBSERVATION_HOLD');
    if (result.mode === 'R7_D1_READONLY_PG_OBSERVATION_HOLD') {
      assert.equal(result.holdReasonCode, 'HOLD_PRE_READONLY_CATALOG_EVALUATION_FAILED');
    }
  });

  it('holds when mock-tier PRE categories all pass (verified SUCCESS forbidden)', () => {
    const trusted = buildTrustedPreObservationFromMockRows(
      buildUnitTestAlignedExactCatalogQueryResults(R7_PR249_FROZEN_REPO_ROOT, 'PRE_READONLY'),
    );
    const result = finalizeR7D1ReadonlyPgObservationFromTrustedCollected(R7_PR249_FROZEN_REPO_ROOT, trusted);
    assert.equal(result.mode, 'R7_D1_READONLY_PG_OBSERVATION_HOLD');
    if (result.mode === 'R7_D1_READONLY_PG_OBSERVATION_HOLD') {
      assert.equal(result.holdReasonCode, 'HOLD_READONLY_PG_OBSERVATION_PROVENANCE_TIER_INSUFFICIENT');
    }
  });

});

describe('r7D1 readonly PG observation session teardown', () => {
  it('runs close after rollback failure and holds', async () => {
    let closed = false;
    const session = {
      async rollback() {
        return { acknowledged: false };
      },
      async close() {
        closed = true;
      },
    } as unknown as R7LiveBridgePgSessionShape;
    const result = await teardownR7D1ReadonlyPgObservationSession(session);
    assert.equal(closed, true);
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.holdReasonCode, 'HOLD_READONLY_SESSION_CLEANUP_UNCERTAIN');
    }
  });

  it('holds when close fails even if rollback succeeded', async () => {
    const session = {
      async rollback() {
        return { acknowledged: true };
      },
      async close() {
        throw new Error('HOLD_UNEXPECTED_INTERNAL');
      },
    } as unknown as R7LiveBridgePgSessionShape;
    const result = await teardownR7D1ReadonlyPgObservationSession(session);
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.holdReasonCode, 'HOLD_READONLY_SESSION_CLEANUP_UNCERTAIN');
    }
  });
});

describe('r7D1 readonly PG observation wire', () => {
  it('rejects wire missing tlsCaPem', () => {
    const parsed = parseR7D1ReadonlyPgObservationWireV1({
      wireVersion: 'R7_D1_READONLY_PG_OBSERVATION_WIRE_v1',
      host: 'x',
      port: 5432,
      database: 'postgres',
      user: 'u',
      password: 'p',
      sslmode: 'require',
      tlsTrustProfile: 't',
      tlsServerName: 's',
    });
    assert.equal(parsed.ok, false);
  });
});
