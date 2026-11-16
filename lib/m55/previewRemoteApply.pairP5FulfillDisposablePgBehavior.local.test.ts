import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { describe, it } from 'node:test';
import { Client } from 'pg';

import { PAIR_P5_FULFILL_ORCHESTRATION_PROBE_SUITE } from './previewRemoteApply/pairP5FulfillAuthorizationGatedRealExecutor.ts';
import { materializePairP5PostCheckoutPreviewHistory } from './previewRemoteApply/pairP5DisposablePgMigrationMaterialization.ts';
import {
  assertPairP5FulfillStructuralArtifactsAbsent,
  executePairP5FulfillSingleTransactionOnPgClient,
} from './previewRemoteApply/pairP5FulfillDisposablePgOrchestration.ts';
import {
  callFulfillCompatibilityReportInTransaction,
  materializePairP5FulfillDisposableBaseline,
  seedPendingCompatibilityPurchaseContext,
} from './previewRemoteApply/pairP5FulfillDisposablePgFixtures.ts';
import {
  PAIR_P5_FULFILL_POST_PROBE_SQL,
  validatePairP5FulfillPostProbeResult,
} from './previewRemoteApply/pairP5FulfillStepAuthority.ts';
import {
  validatePairP5FunctionBodyCatalogProbeResult,
} from './previewRemoteApply/pairP5IdentityAuthorizationGatedRealExecutor.ts';

const REPO_ROOT = process.cwd();
const PINNED_POSTGRES_IMAGE =
  'postgres@sha256:5d11ffb37e58a7c9a2285359e50f7674e216c99b9114e47b0e7f21187c11252c';

function dockerAvailable(): boolean {
  return spawnSync('docker', ['info'], { encoding: 'utf8' }).status === 0;
}

function docker(args: string[]): { status: number; stdout: string; stderr: string } {
  const result = spawnSync('docker', args, { encoding: 'utf8' });
  return { status: result.status ?? 1, stdout: result.stdout ?? '', stderr: result.stderr ?? '' };
}

function waitForPostgresReady(containerId: string): void {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    if (docker(['exec', containerId, 'pg_isready', '-U', 'postgres']).status === 0) return;
  }
  throw new Error('postgres_not_ready');
}

async function withDisposablePostgres(
  run: (port: number) => Promise<void>,
): Promise<void> {
  const containerName = `m55-p53b-${createHash('sha256').update(String(Date.now())).digest('hex').slice(0, 12)}`;
  const started = docker([
    'run',
    '-e',
    'POSTGRES_PASSWORD=m55local',
    '-p',
    '127.0.0.1:0:5432',
    '-d',
    '--name',
    containerName,
    PINNED_POSTGRES_IMAGE,
  ]);
  assert.equal(started.status, 0, started.stderr || started.stdout);
  const containerId = started.stdout.trim();
  waitForPostgresReady(containerId);
  await new Promise((resolve) => setTimeout(resolve, 2000));
  const portInspect = docker(['port', containerId, '5432/tcp']);
  assert.equal(portInspect.status, 0, portInspect.stderr);
  const portLine = portInspect.stdout.trim().split('\n')[0] ?? '';
  const hostPort = Number.parseInt(portLine.split(':').pop() ?? '', 10);
  try {
    await run(hostPort);
  } finally {
    const rm = docker(['rm', '-f', containerId]);
    assert.equal(rm.status, 0, rm.stderr || rm.stdout);
  }
}

function makeClient(port: number): Client {
  return new Client({
    host: '127.0.0.1',
    port,
    user: 'postgres',
    password: 'm55local',
    database: 'postgres',
    connectionTimeoutMillis: 15_000,
  });
}

describe('pairP5 fulfill disposable PostgreSQL behavior (P5-3)', () => {
  it(
    'post-apply function-body catalog probe on separate READ-ONLY connection',
    { skip: !dockerAvailable(), timeout: 1_800_000 },
    async () => {
      await withDisposablePostgres(async (port) => {
        const primary = makeClient(port);
        await primary.connect();
        try {
          await materializePairP5FulfillDisposableBaseline(primary, REPO_ROOT);
          const catalogSql = PAIR_P5_FULFILL_ORCHESTRATION_PROBE_SUITE.functionBodyCatalogProbeSql;
          assert.ok(catalogSql !== undefined);
          const inTxn = await primary.query(catalogSql);
          assert.equal(validatePairP5FunctionBodyCatalogProbeResult(inTxn).ok, true);
        } finally {
          await primary.end();
        }
        const readonly = makeClient(port);
        await readonly.connect();
        try {
          const catalogSql = PAIR_P5_FULFILL_ORCHESTRATION_PROBE_SUITE.functionBodyCatalogProbeSql;
          assert.ok(catalogSql !== undefined);
          const fresh = await readonly.query(catalogSql);
          assert.equal(validatePairP5FunctionBodyCatalogProbeResult(fresh).ok, true);
          const post = await readonly.query(PAIR_P5_FULFILL_POST_PROBE_SQL);
          assert.equal(validatePairP5FulfillPostProbeResult(post).ok, true);
        } finally {
          await readonly.end();
        }
      });
    },
  );

  it(
    'failed apply rolls back migration history and pre-apply fulfill prosrc',
    { skip: !dockerAvailable(), timeout: 1_800_000 },
    async () => {
      await withDisposablePostgres(async (port) => {
        const client = makeClient(port);
        await client.connect();
        try {
          await materializePairP5PostCheckoutPreviewHistory(client, REPO_ROOT);
          const failed = await executePairP5FulfillSingleTransactionOnPgClient(client, REPO_ROOT, {
            injectHardFailureAfterMutationStatements: 2,
          });
          assert.equal(failed.ok, false);
          await assertPairP5FulfillStructuralArtifactsAbsent(client);
        } finally {
          await client.end();
        }
      });
    },
  );

  it(
    'solo pending context fulfills without pair tuple columns',
    { skip: !dockerAvailable(), timeout: 1_800_000 },
    async () => {
      await withDisposablePostgres(async (port) => {
        const client = makeClient(port);
        await client.connect();
        try {
          await materializePairP5FulfillDisposableBaseline(client, REPO_ROOT);
          const ctx = await seedPendingCompatibilityPurchaseContext(client, {
            pairIdentityId: null,
            paidContextId: null,
          });
          const result = await callFulfillCompatibilityReportInTransaction(client, {
            purchaseContextId: ctx.id,
            checkoutSessionId: ctx.stripeCheckoutSessionId,
          });
          assert.equal(result.ok, true);
          assert.equal(result.duplicate, false);
          const repeat = await callFulfillCompatibilityReportInTransaction(client, {
            purchaseContextId: ctx.id,
            checkoutSessionId: ctx.stripeCheckoutSessionId,
          });
          assert.equal(repeat.ok, true);
          assert.equal(repeat.duplicate, true);
        } finally {
          await client.end();
        }
      });
    },
  );

  it(
    'parallel fulfill on same context yields one winner and one duplicate',
    { skip: !dockerAvailable(), timeout: 1_800_000 },
    async () => {
      await withDisposablePostgres(async (port) => {
        const clientA = makeClient(port);
        const clientB = makeClient(port);
        await clientA.connect();
        await clientB.connect();
        try {
          await materializePairP5FulfillDisposableBaseline(clientA, REPO_ROOT);
          const ctx = await seedPendingCompatibilityPurchaseContext(clientA, {
            pairIdentityId: randomUUID(),
            paidContextId: randomUUID(),
          });
          const [resultA, resultB] = await Promise.all([
            callFulfillCompatibilityReportInTransaction(clientA, {
              purchaseContextId: ctx.id,
              checkoutSessionId: ctx.stripeCheckoutSessionId,
            }),
            callFulfillCompatibilityReportInTransaction(clientB, {
              purchaseContextId: ctx.id,
              checkoutSessionId: ctx.stripeCheckoutSessionId,
            }),
          ]);
          const okResults = [resultA, resultB].filter((entry) => entry.ok === true);
          assert.equal(okResults.length, 2);
          assert.equal(okResults.filter((entry) => entry.duplicate === false).length, 1);
          assert.equal(okResults.filter((entry) => entry.duplicate === true).length, 1);
          const reportCount = await clientA.query<{ count: string }>(
            `SELECT count(*)::text AS count FROM public.compatibility_owned_reports WHERE purchase_context_id = $1::uuid`,
            [ctx.id],
          );
          assert.equal(Number.parseInt(reportCount.rows[0]?.count ?? '0', 10), 1);
        } finally {
          await clientA.end();
          await clientB.end();
        }
      });
    },
  );

  it(
    'second purchase context with same tuple cannot create duplicate identity link',
    { skip: !dockerAvailable(), timeout: 1_800_000 },
    async () => {
      await withDisposablePostgres(async (port) => {
        const client = makeClient(port);
        await client.connect();
        try {
          await materializePairP5FulfillDisposableBaseline(client, REPO_ROOT);
          const pairId = randomUUID();
          const paidId = randomUUID();
          const owner = `owner_${randomUUID().slice(0, 8)}`;
          const ctxA = await seedPendingCompatibilityPurchaseContext(client, {
            ownerUserId: owner,
            pairIdentityId: pairId,
            paidContextId: paidId,
          });
          const first = await callFulfillCompatibilityReportInTransaction(client, {
            purchaseContextId: ctxA.id,
            checkoutSessionId: ctxA.stripeCheckoutSessionId,
          });
          assert.equal(first.ok, true);
          assert.equal(first.duplicate, false);
          const ctxB = await seedPendingCompatibilityPurchaseContext(client, {
            ownerUserId: owner,
            pairIdentityId: pairId,
            paidContextId: paidId,
          });
          const second = await callFulfillCompatibilityReportInTransaction(client, {
            purchaseContextId: ctxB.id,
            checkoutSessionId: ctxB.stripeCheckoutSessionId,
          });
          assert.equal(second.ok, false);
          assert.equal(second.reason, 'identity_already_owned');
        } finally {
          await client.end();
        }
      });
    },
  );

  it(
    'advisory lock on tuple serializes concurrent fulfill attempts',
    { skip: !dockerAvailable(), timeout: 1_800_000 },
    async () => {
      await withDisposablePostgres(async (port) => {
        const holder = makeClient(port);
        const contender = makeClient(port);
        await holder.connect();
        await contender.connect();
        try {
          await materializePairP5FulfillDisposableBaseline(holder, REPO_ROOT);
          const ctx = await seedPendingCompatibilityPurchaseContext(holder, {
            pairIdentityId: randomUUID(),
            paidContextId: randomUUID(),
          });
          const lockKey = `m55_compat_ck:${ctx.ownerUserId}:${ctx.pairIdentityId}:${ctx.paidContextId}`;
          await holder.query('BEGIN');
          await holder.query(`SELECT pg_advisory_xact_lock(hashtextextended($1::text, 0))`, [lockKey]);
          const started = Date.now();
          const fulfillPromise = (async () => {
            await contender.query('BEGIN');
            await contender.query(`SET LOCAL lock_timeout = '5s'`);
            const result = await contender.query<{ result: { ok?: boolean } }>(
              `SELECT public.m55_fulfill_compatibility_report_v1($1::uuid, $2::text, $3::text) AS result`,
              [ctx.id, ctx.stripeCheckoutSessionId, 'pi_lock_test'],
            );
            await contender.query('COMMIT');
            return result;
          })();
          await new Promise((resolve) => setTimeout(resolve, 700));
          await holder.query('ROLLBACK');
          const fulfillResult = await fulfillPromise;
          const elapsedMs = Date.now() - started;
          assert.ok(elapsedMs >= 500, `expected contender to wait on advisory lock, elapsed=${elapsedMs}`);
          assert.equal(fulfillResult.rows[0]?.result.ok, true);
        } finally {
          await holder.end();
          await contender.end();
        }
      });
    },
  );
});
