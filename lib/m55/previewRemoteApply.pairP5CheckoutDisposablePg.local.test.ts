import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { describe, it } from 'node:test';
import { Client } from 'pg';

import {
  assertPairP5CheckoutStructuralArtifactsAbsent,
  countSchemaMigrationVersion,
  executePairP5CheckoutSingleTransactionOnPgClient,
  queryPairP5CheckoutStructuralArtifactCounts,
} from './previewRemoteApply/pairP5CheckoutDisposablePgOrchestration.ts';
import {
  PAIR_P5_CHECKOUT_MIGRATION_VERSION,
  PAIR_P5_CHECKOUT_POST_PROBE_SQL,
  PAIR_P5_CHECKOUT_POST_PROBE_SQL_SHA256_LITERAL,
  validatePairP5CheckoutPostProbeResult,
} from './previewRemoteApply/pairP5CheckoutStepAuthority.ts';
import {
  materializePairP5PostIdentityPreviewHistory,
  PAIR_P5_POST_IDENTITY_HISTORY_VERSION_COUNT,
} from './previewRemoteApply/pairP5DisposablePgMigrationMaterialization.ts';
import {
  PAIR_P5_POST_PROBE_SQL,
  validatePairP5PostProbeResult,
} from './previewRemoteApply/pairP5IdentityStepAuthority.ts';

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

describe('pairP5 checkout POST probe SHA pin (static)', () => {
  it('POST probe SQL digest matches independently frozen literal', () => {
    const digest = createHash('sha256').update(PAIR_P5_CHECKOUT_POST_PROBE_SQL, 'utf8').digest('hex');
    assert.equal(digest, PAIR_P5_CHECKOUT_POST_PROBE_SQL_SHA256_LITERAL);
    assert.notEqual(
      PAIR_P5_CHECKOUT_POST_PROBE_SQL_SHA256_LITERAL,
      '807a523f2980548b64f2767f5f05a694fdd2c247be0ef64198afedd5d1209338',
    );
  });
});

describe('pairP5 checkout disposable PostgreSQL single-transaction proof', () => {
  it(
    'loopback bind, 23-version baseline, sentinel negative, rollback, success apply, container rm',
    { skip: !dockerAvailable(), timeout: 1_800_000 },
    async () => {
      const containerName = `m55-p52-${createHash('sha256').update(String(Date.now())).digest('hex').slice(0, 12)}`;
      const run = docker([
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
      assert.equal(run.status, 0, run.stderr || run.stdout);
      const containerId = run.stdout.trim();
      waitForPostgresReady(containerId);
      await new Promise((resolve) => setTimeout(resolve, 3000));

      const portInspect = docker(['port', containerId, '5432/tcp']);
      assert.equal(portInspect.status, 0, portInspect.stderr);
      const portLine = portInspect.stdout.trim().split('\n')[0] ?? '';
      assert.match(portLine, /^127\.0\.0\.1:/);
      const hostPort = Number.parseInt(portLine.split(':').pop() ?? '', 10);

      const client = new Client({
        host: '127.0.0.1',
        port: hostPort,
        user: 'postgres',
        password: 'm55local',
        database: 'postgres',
        connectionTimeoutMillis: 15_000,
      });
      await client.connect();

      try {
        await materializePairP5PostIdentityPreviewHistory(client, REPO_ROOT);
        const historyCount = await client.query<{ count: string }>(
          'SELECT count(*)::text AS count FROM supabase_migrations.schema_migrations',
        );
        assert.equal(
          Number.parseInt(historyCount.rows[0]?.count ?? '0', 10),
          PAIR_P5_POST_IDENTITY_HISTORY_VERSION_COUNT,
        );
        const p5_1Post = await client.query(PAIR_P5_POST_PROBE_SQL);
        assert.equal(validatePairP5PostProbeResult(p5_1Post).ok, true);
        assert.equal(await countSchemaMigrationVersion(client, PAIR_P5_CHECKOUT_MIGRATION_VERSION), 0);

        const sentinel = await executePairP5CheckoutSingleTransactionOnPgClient(client, REPO_ROOT, {
          skipTxnSentinelFirstStatement: true,
        });
        assert.equal(sentinel.ok, false);
        assert.match(sentinel.error, /PRECONDITION_TXN_SENTINEL/);
        await assertPairP5CheckoutStructuralArtifactsAbsent(client);

        const rollbackProof = await executePairP5CheckoutSingleTransactionOnPgClient(client, REPO_ROOT, {
          injectHardFailureAfterMutationStatements: 12,
        });
        assert.equal(rollbackProof.ok, false);
        assert.equal(rollbackProof.phase, 'MUTATION');
        await assertPairP5CheckoutStructuralArtifactsAbsent(client);

        const success = await executePairP5CheckoutSingleTransactionOnPgClient(client, REPO_ROOT);
        assert.equal(success.ok, true);
        assert.equal(await countSchemaMigrationVersion(client, PAIR_P5_CHECKOUT_MIGRATION_VERSION), 1);
        const post = await client.query(PAIR_P5_CHECKOUT_POST_PROBE_SQL);
        assert.equal(validatePairP5CheckoutPostProbeResult(post).ok, true);
        const counts = await queryPairP5CheckoutStructuralArtifactCounts(client);
        assert.equal(counts.checkoutColumnCount, 2);
        assert.equal(counts.pendingTupleIndexCount, 1);
        assert.equal(counts.reservationRpcCount, 5);
      } finally {
        await client.end();
        const rm = docker(['rm', '-f', containerId]);
        assert.equal(rm.status, 0, rm.stderr || rm.stdout);
        assert.notEqual(docker(['inspect', containerId]).status, 0);
      }
    },
  );
});

describe('pairP5 checkout disposable rollback contract (unit)', () => {
  it('assertPairP5CheckoutStructuralArtifactsAbsent throws when migration version present', async () => {
    const fake = {
      query: async (sql: string) => {
        if (sql.includes('schema_migrations')) {
          return { rows: [{ count: '1' }] };
        }
        return { rows: [{ count: '0' }] };
      },
    } as unknown as Client;
    await assert.rejects(
      () => assertPairP5CheckoutStructuralArtifactsAbsent(fake),
      /PARTIAL_HISTORY/,
    );
  });
});
