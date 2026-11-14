import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { describe, it } from 'node:test';
import { Client } from 'pg';

import {
  assertPairP5FulfillStructuralArtifactsAbsent,
  countSchemaMigrationVersion,
  executePairP5FulfillSingleTransactionOnPgClient,
} from './previewRemoteApply/pairP5FulfillDisposablePgOrchestration.ts';
import {
  PAIR_P5_CHECKOUT_POST_PROBE_SQL,
  validatePairP5CheckoutPostProbeResult,
} from './previewRemoteApply/pairP5CheckoutStepAuthority.ts';
import {
  PAIR_P5_FULFILL_MIGRATION_VERSION,
  PAIR_P5_FULFILL_POST_PROBE_SQL,
  PAIR_P5_FULFILL_POST_PROBE_SQL_SHA256_LITERAL,
  validatePairP5FulfillPostProbeResult,
} from './previewRemoteApply/pairP5FulfillStepAuthority.ts';
import {
  materializePairP5PostCheckoutPreviewHistory,
  PAIR_P5_POST_CHECKOUT_HISTORY_VERSION_COUNT,
} from './previewRemoteApply/pairP5DisposablePgMigrationMaterialization.ts';

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

describe('pairP5 fulfill POST probe SHA pin (static)', () => {
  it('POST probe SQL digest matches independently frozen literal', () => {
    const digest = createHash('sha256').update(PAIR_P5_FULFILL_POST_PROBE_SQL, 'utf8').digest('hex');
    assert.equal(digest, PAIR_P5_FULFILL_POST_PROBE_SQL_SHA256_LITERAL);
  });
});

describe('pairP5 fulfill disposable PostgreSQL single-transaction proof', () => {
  it(
    'loopback bind, 24-version checkout baseline, rollback, success apply, container rm',
    { skip: !dockerAvailable(), timeout: 1_800_000 },
    async () => {
      const containerName = `m55-p53-${createHash('sha256').update(String(Date.now())).digest('hex').slice(0, 12)}`;
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
        await materializePairP5PostCheckoutPreviewHistory(client, REPO_ROOT);
        const historyCount = await client.query<{ count: string }>(
          'SELECT count(*)::text AS count FROM supabase_migrations.schema_migrations',
        );
        assert.equal(
          Number.parseInt(historyCount.rows[0]?.count ?? '0', 10),
          PAIR_P5_POST_CHECKOUT_HISTORY_VERSION_COUNT,
        );
        const checkoutPost = await client.query(PAIR_P5_CHECKOUT_POST_PROBE_SQL);
        assert.equal(validatePairP5CheckoutPostProbeResult(checkoutPost).ok, true);
        assert.equal(await countSchemaMigrationVersion(client, PAIR_P5_FULFILL_MIGRATION_VERSION), 0);

        const rollbackProof = await executePairP5FulfillSingleTransactionOnPgClient(client, REPO_ROOT, {
          injectHardFailureAfterMutationStatements: 2,
        });
        assert.equal(rollbackProof.ok, false);
        assert.equal(rollbackProof.phase, 'MUTATION');
        await assertPairP5FulfillStructuralArtifactsAbsent(client);

        const success = await executePairP5FulfillSingleTransactionOnPgClient(client, REPO_ROOT);
        assert.equal(success.ok, true);
        assert.equal(await countSchemaMigrationVersion(client, PAIR_P5_FULFILL_MIGRATION_VERSION), 1);
        const post = await client.query(PAIR_P5_FULFILL_POST_PROBE_SQL);
        assert.equal(validatePairP5FulfillPostProbeResult(post).ok, true);

        const invalidInput = await client.query(
          `SELECT public.m55_fulfill_compatibility_report_v1(NULL, 'cs_test', '') AS result`,
        );
        const invalidPayload = invalidInput.rows[0]?.result as { ok?: boolean; reason?: string };
        assert.equal(invalidPayload?.ok, false);
        assert.equal(invalidPayload?.reason, 'invalid_input');

        const advisoryPresent = await client.query<{ has_lock: boolean }>(
          `SELECT position('pg_advisory_xact_lock' in p.prosrc) > 0 AS has_lock
           FROM pg_catalog.pg_proc p
           WHERE p.oid = to_regprocedure('public.m55_fulfill_compatibility_report_v1(uuid, text, text)')`,
        );
        assert.equal(advisoryPresent.rows[0]?.has_lock, true);
      } finally {
        await client.end();
        const rm = docker(['rm', '-f', containerId]);
        assert.equal(rm.status, 0, rm.stderr || rm.stdout);
        assert.notEqual(docker(['inspect', containerId]).status, 0);
      }
    },
  );
});

describe('pairP5 fulfill disposable rollback contract (unit)', () => {
  it('assertPairP5FulfillStructuralArtifactsAbsent throws when migration version present', async () => {
    const fake = {
      query: async (sql: string) => {
        if (sql.includes('schema_migrations')) {
          return { rows: [{ count: '1' }] };
        }
        if (sql.includes('md5(p.prosrc)')) {
          return { rows: [{ md5: '034a38e15248a40b801075444a5cc462' }] };
        }
        return { rows: [{ count: '0' }] };
      },
    } as unknown as Client;
    await assert.rejects(
      () => assertPairP5FulfillStructuralArtifactsAbsent(fake),
      /PARTIAL_HISTORY/,
    );
  });
});
