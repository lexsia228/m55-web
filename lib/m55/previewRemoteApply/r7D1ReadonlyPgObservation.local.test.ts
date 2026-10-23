import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';

import {
  deriveExactCatalogObservationQueryPlanDigestSha256,
  R7_D1_REAL_PG_OBSERVATION_PROVENANCE_ESTABLISHED_FOR_TRUSTED_REGISTRATION,
  registerTrustedCatalogQueryExecutionContextFromOwnedReadonlyCollector,
} from './r7D1ExactCatalogContract.ts';
import { R7_PREVIEW_TARGET_PROJECT_REF } from './r7D1D5OfflinePlan.ts';
import {
  evaluateR7D1ReadonlyPgObservationRuntimeAuthorization,
  isR7D1ReadonlyPgObservationIoPermitted,
  R7_D1_READONLY_PG_OBSERVATION_CHANNEL_ENV,
  R7_D1_READONLY_PG_OBSERVATION_CHANNEL_V1,
} from './r7D1ReadonlyPgObservationRuntimeAuthorization.ts';
import { parseR7D1ReadonlyPgObservationWireV1 } from './r7D1ReadonlyPgObservationOrchestration.ts';
import { bindR7D1ReadonlyPgVerifiedSessionProvenanceForTestsOnly } from './r7D1ReadonlyPgSessionProvenance.ts';

const ORIGINAL_CHANNEL = process.env[R7_D1_READONLY_PG_OBSERVATION_CHANNEL_ENV];

afterEach(() => {
  if (ORIGINAL_CHANNEL === undefined) {
    delete process.env[R7_D1_READONLY_PG_OBSERVATION_CHANNEL_ENV];
  } else {
    process.env[R7_D1_READONLY_PG_OBSERVATION_CHANNEL_ENV] = ORIGINAL_CHANNEL;
  }
});

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

  it('allows readonly_pg_verified registration when session provenance is bound', () => {
    const session = { sessionId: 'test-readonly-pg' };
    const digest = deriveExactCatalogObservationQueryPlanDigestSha256();
    const bound = bindR7D1ReadonlyPgVerifiedSessionProvenanceForTestsOnly(session, {
      previewProjectRef: R7_PREVIEW_TARGET_PROJECT_REF,
      queryPlanDigestSha256: digest,
      physicalBackendLocatorSha256: 'a'.repeat(64),
    });
    assert.equal(bound, true);
    const trusted = registerTrustedCatalogQueryExecutionContextFromOwnedReadonlyCollector(
      session,
      digest,
      'readonly_pg_verified',
    );
    assert.notEqual(trusted, null);
    assert.equal(trusted?.observationProvenanceTier, 'readonly_pg_verified');
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
