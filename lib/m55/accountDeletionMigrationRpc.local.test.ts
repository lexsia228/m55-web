import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';

import { splitAndTrim } from './transactionNormalized/splitAndTrim.ts';
import {
  compositeStreamSha256,
  statementSha256,
  statementUtf8ByteLength,
} from './transactionNormalized/statementStream.ts';

const M1 = join(
  process.cwd(),
  'supabase/migrations/20260615000002_m55_account_deletion_ledger_v1.sql'
);
const M2 = join(
  process.cwd(),
  'supabase/migrations/20260615000003_m55_account_deletion_process_rpc_v1.sql'
);
const REPLY_DATA_LAYER = join(
  process.cwd(),
  'supabase/migrations/20260416000000_reply_system_data_layer_v1.sql'
);

function readM1(): string {
  return readFileSync(M1, 'utf8');
}

function readM2(): string {
  return readFileSync(M2, 'utf8');
}

function rpcBody(sql: string): string {
  const marker = 'CREATE OR REPLACE FUNCTION public.m55_account_deletion_process_v1';
  const start = sql.indexOf(marker);
  const end = sql.indexOf('$$;', start);
  assert.ok(start >= 0, 'RPC body start missing');
  assert.ok(end > start, 'RPC body end missing');
  return sql.slice(start, end + 3);
}

/** Strip line comments for body-scope assertions (avoid comment-only false PASS). */
function rpcBodyWithoutComments(sql: string): string {
  return rpcBody(sql)
    .split('\n')
    .map((line) => line.replace(/--.*$/, ''))
    .join('\n');
}

function postValidationBody(sql: string): string {
  const body = rpcBodyWithoutComments(sql);
  const marker = 'PERFORM pg_advisory_xact_lock';
  const pos = body.indexOf(marker);
  assert.ok(pos >= 0, 'advisory lock marker missing');
  return body.slice(pos);
}

function verificationBody(sql: string): string {
  const raw = rpcBody(sql);
  const rawStart = raw.indexOf('-- targeted verification');
  const rawEnd = raw.indexOf('UPDATE public.clerk_webhook_events', rawStart);
  assert.ok(rawStart >= 0, 'verification section start missing');
  assert.ok(rawEnd > rawStart, 'verification section end missing');
  return raw
    .slice(rawStart, rawEnd)
    .split('\n')
    .map((line) => line.replace(/--.*$/, ''))
    .join('\n');
}

function deleteSectionBody(sql: string): string {
  const raw = rpcBody(sql);
  const rawStart = raw.indexOf('-- direct DELETE (fixed order)');
  const rawEnd = raw.indexOf('-- pseudonymize', rawStart);
  assert.ok(rawStart >= 0, 'DELETE section start missing');
  assert.ok(rawEnd > rawStart, 'DELETE section end missing');
  return raw
    .slice(rawStart, rawEnd)
    .split('\n')
    .map((line) => line.replace(/--.*$/, ''))
    .join('\n');
}

const DIRECT_DELETE_TABLES = [
  'consult_send_commits',
  'reply_wallet_ledgers',
  'reply_documents',
  'reply_sessions',
  'reply_ticket_wallets',
  'consult_threads',
  'dtr_guest_drafts',
  'dtr_report_snapshots',
  'entitlement_rights',
] as const;

describe('accountDeletionMigrationRpc — M1 ledger', () => {
  it('uses exact filename', () => {
    assert.ok(M1.endsWith('20260615000002_m55_account_deletion_ledger_v1.sql'));
  });

  it('defines clerk_webhook_events columns and PK', () => {
    const sql = readM1();
    assert.match(sql, /CREATE TABLE public\.clerk_webhook_events/);
    assert.match(sql, /svix_id text PRIMARY KEY/);
    assert.match(sql, /event_type text NOT NULL/);
    assert.match(sql, /deletion_subject_id text NULL/);
    assert.match(sql, /status text NOT NULL/);
    assert.match(sql, /attempt_count integer NOT NULL DEFAULT 0/);
    assert.match(sql, /error_code text NULL/);
    assert.match(sql, /created_at timestamptz NOT NULL DEFAULT now\(\)/);
    assert.match(sql, /updated_at timestamptz NOT NULL DEFAULT now\(\)/);
    assert.match(sql, /completed_at timestamptz NULL/);
  });

  it('defines status CHECK', () => {
    const sql = readM1();
    assert.match(sql, /clerk_webhook_events_status_check/);
    assert.match(sql, /'pending'/);
    assert.match(sql, /'processing'/);
    assert.match(sql, /'succeeded'/);
    assert.match(sql, /'failed'/);
  });

  it('defines deletion_subject_id CHECK', () => {
    const sql = readM1();
    assert.match(sql, /clerk_webhook_events_deletion_subject_id_check/);
    assert.match(sql, /\^m55-del:\[0-9a-f\]\{32\}\$/);
  });

  it('defines attempt_count CHECK', () => {
    const sql = readM1();
    assert.match(sql, /clerk_webhook_events_attempt_count_check/);
    assert.match(sql, /attempt_count >= 0/);
  });

  it('persists only three error_code values in CHECK', () => {
    const sql = readM1();
    assert.match(sql, /clerk_webhook_events_error_code_check/);
    assert.match(sql, /'INVALID_PROCESSING_STATE'/);
    assert.match(sql, /'CLEANUP_FAILED'/);
    assert.match(sql, /'VERIFICATION_FAILED'/);
    assert.doesNotMatch(sql, /'INVALID_INPUT'/);
    assert.doesNotMatch(sql, /'INVALID_EVENT_TYPE'/);
    assert.doesNotMatch(sql, /'LEDGER_CLAIM_FAILED'/);
  });

  it('enables RLS and revokes PUBLIC/anon/authenticated/service_role', () => {
    const sql = readM1();
    assert.match(sql, /ENABLE ROW LEVEL SECURITY/);
    assert.match(sql, /REVOKE ALL ON TABLE public\.clerk_webhook_events FROM PUBLIC/);
    assert.match(sql, /REVOKE ALL ON TABLE public\.clerk_webhook_events FROM anon/);
    assert.match(
      sql,
      /REVOKE ALL ON TABLE public\.clerk_webhook_events FROM authenticated, service_role/
    );
    assert.doesNotMatch(sql, /CREATE POLICY/i);
  });

  it('grants service_role SELECT/INSERT/UPDATE only', () => {
    const sql = readM1();
    assert.match(
      sql,
      /GRANT SELECT, INSERT, UPDATE ON TABLE public\.clerk_webhook_events TO service_role/
    );
    assert.doesNotMatch(sql, /DELETE/i);
    assert.doesNotMatch(sql, /GRANT ALL/i);
  });

  it('does not store raw identity columns', () => {
    const sql = readM1().split('COMMENT ON TABLE')[0];
    assert.doesNotMatch(sql, /clerk_user_id/i);
    assert.doesNotMatch(sql, /\buser_id\b/i);
    assert.doesNotMatch(sql, /user_ref_hash/i);
    assert.doesNotMatch(sql, /\bemail\b/i);
    assert.doesNotMatch(sql, /\bmetadata\b/i);
    assert.doesNotMatch(sql, /raw_metadata/i);
    assert.doesNotMatch(sql, /\bpayload\b/i);
  });

  it('keeps exactly seven executable statements', () => {
    const statements = splitAndTrim(readM1());
    assert.equal(statements.length, 7);
  });

  it('binds frozen P3 source identity and ordinal-4 statement identity', () => {
    const sql = readM1();
    const bytes = Buffer.byteLength(sql, 'utf8');
    const sha = createHash('sha256').update(sql, 'utf8').digest('hex');
    assert.equal(bytes, 1597);
    assert.equal(sha, '6d7bfdf798e1821d4e0b8189d19ac810d6c740e572be6f3ae91b22e66be87667');
    const statements = splitAndTrim(sql);
    assert.equal(statementUtf8ByteLength(statements[4]), 80);
    assert.equal(
      statementSha256(statements[4]),
      '4ba8fca94191e2a47449ba9bdca708d13821fba6b036e98e171a22bad6814f5e'
    );
    assert.equal(
      compositeStreamSha256(statements),
      '7c75ad01dc4b3f49c4b93ef75bcb68f30be90ddfeee8a2b96ab1e356c06b3436'
    );
  });
});

describe('accountDeletionMigrationRpc — M1 P3 privilege reset negative guards', () => {
  const GRANT_ONLY_SQL = readM1().replace(
    /REVOKE ALL ON TABLE public\.clerk_webhook_events FROM authenticated, service_role;/,
    'REVOKE ALL ON TABLE public.clerk_webhook_events FROM authenticated;'
  );

  const PRIVILEGE_CELLS = [
    'REFERENCES',
    'TRIGGER',
    'TRUNCATE',
  ] as const;

  function modelServiceRoleExtras(sql: string): string[] {
    const hasServiceRoleRevoke =
      /REVOKE ALL ON TABLE public\.clerk_webhook_events FROM authenticated, service_role/.test(sql);
    const hasGrant =
      /GRANT SELECT, INSERT, UPDATE ON TABLE public\.clerk_webhook_events TO service_role/.test(sql);
    if (!hasGrant) return [];
    if (hasServiceRoleRevoke) return [];
    return PRIVILEGE_CELLS.map((priv) => `priv.clerk_webhook_events.service_role.${priv}|1`);
  }

  it('rejects GRANT-only form that leaves default service_role extras', () => {
    const extras = modelServiceRoleExtras(GRANT_ONLY_SQL);
    assert.deepEqual(extras, [
      'priv.clerk_webhook_events.service_role.REFERENCES|1',
      'priv.clerk_webhook_events.service_role.TRIGGER|1',
      'priv.clerk_webhook_events.service_role.TRUNCATE|1',
    ]);
    assert.equal(modelServiceRoleExtras(readM1()).length, 0);
  });

  it('rejects authenticated-only REVOKE without service_role', () => {
    assert.doesNotMatch(
      GRANT_ONLY_SQL,
      /REVOKE ALL ON TABLE public\.clerk_webhook_events FROM authenticated, service_role/
    );
  });

  it('rejects DELETE grant additions', () => {
    const sql = readM1();
    assert.doesNotMatch(sql, /GRANT[\s\S]*DELETE[\s\S]*service_role/i);
  });

  it('rejects an eighth privilege statement', () => {
    const extra = `${readM1().trimEnd()}\nREVOKE ALL ON TABLE public.clerk_webhook_events FROM service_role;`;
    assert.equal(splitAndTrim(extra).length, 8);
    assert.equal(splitAndTrim(readM1()).length, 7);
  });

  it('keeps frozen P3 oracle privilege contract for clerk_webhook_events service_role', () => {
    const oraclePath = join(
      process.cwd(),
      'docs/planning/preview-baseline/preview_baseline_execution_oracle_v1.json'
    );
    const oracle = JSON.parse(readFileSync(oraclePath, 'utf8')) as {
      phases: Array<{ phase: string; privileges?: string[]; oracle_contract_hash?: string }>;
    };
    const p3 = oracle.phases.find((phase) => phase.phase === 'P3');
    assert.ok(p3);
    assert.equal(
      p3.oracle_contract_hash,
      '26d9eec63ea50365008298a4a62b931638dba2ad285ffff8a2ba371d25d296b5'
    );
    const priv = new Set(p3.privileges ?? []);
    assert.equal(priv.has('priv.clerk_webhook_events.service_role.SELECT|1'), true);
    assert.equal(priv.has('priv.clerk_webhook_events.service_role.INSERT|1'), true);
    assert.equal(priv.has('priv.clerk_webhook_events.service_role.UPDATE|1'), true);
    assert.equal(priv.has('priv.clerk_webhook_events.service_role.DELETE|0'), true);
    assert.equal(priv.has('priv.clerk_webhook_events.service_role.TRUNCATE|0'), true);
    assert.equal(priv.has('priv.clerk_webhook_events.service_role.REFERENCES|0'), true);
    assert.equal(priv.has('priv.clerk_webhook_events.service_role.TRIGGER|0'), true);
    assert.equal(priv.has('priv.clerk_webhook_events.service_role.TRUNCATE|1'), false);
  });
});

describe('accountDeletionMigrationRpc — M2 signature and security', () => {
  it('uses exact filename', () => {
    assert.ok(M2.endsWith('20260615000003_m55_account_deletion_process_rpc_v1.sql'));
  });

  it('declares four-argument signature returning jsonb', () => {
    const sql = readM2();
    assert.match(
      sql,
      /CREATE OR REPLACE FUNCTION public\.m55_account_deletion_process_v1\(\s*p_svix_id text,\s*p_event_type text,\s*p_clerk_user_id text,\s*p_user_ref_hash text\s*\)\s*RETURNS jsonb/
    );
  });

  it('is SECURITY DEFINER VOLATILE with search_path public, pg_temp', () => {
    const sql = readM2();
    assert.match(sql, /SECURITY DEFINER/);
    assert.match(sql, /VOLATILE/);
    assert.match(sql, /SET search_path = public, pg_temp/);
  });

  it('revokes function from PUBLIC/anon/authenticated and grants EXECUTE to service_role', () => {
    const sql = readM2();
    assert.match(
      sql,
      /REVOKE ALL ON FUNCTION public\.m55_account_deletion_process_v1\(text, text, text, text\)\s+FROM PUBLIC/
    );
    assert.match(
      sql,
      /REVOKE ALL ON FUNCTION public\.m55_account_deletion_process_v1\(text, text, text, text\)\s+FROM anon/
    );
    assert.match(
      sql,
      /REVOKE ALL ON FUNCTION public\.m55_account_deletion_process_v1\(text, text, text, text\)\s+FROM authenticated/
    );
    assert.match(
      sql,
      /GRANT EXECUTE ON FUNCTION public\.m55_account_deletion_process_v1\(text, text, text, text\)\s+TO service_role/
    );
    assert.doesNotMatch(sql, /OWNER TO service_role/i);
  });

  it('sets function owner via DO block dynamic SQL only', () => {
    const sql = readM2();
    assert.match(sql, /DO \$\$/);
    assert.match(sql, /ALTER FUNCTION public\.m55_account_deletion_process_v1/);
    assert.match(sql, /current_user/);
    const body = rpcBody(sql);
    assert.doesNotMatch(body, /EXECUTE format/i);
    assert.doesNotMatch(body, /EXECUTE /i);
  });
});

describe('accountDeletionMigrationRpc — M2 validation and lock', () => {
  it('validates inputs before advisory lock and ledger', () => {
    const body = rpcBody(readM2());
    const lockPos = body.indexOf('pg_advisory_xact_lock');
    const validationPos = body.indexOf("'INVALID_INPUT'");
    assert.ok(validationPos >= 0 && validationPos < lockPos, 'validation before lock');
    const ledgerPos = body.indexOf('INSERT INTO public.clerk_webhook_events');
    assert.ok(lockPos < ledgerPos, 'lock before ledger');
  });

  it('allows only user.deleted event type', () => {
    const body = rpcBody(readM2());
    assert.match(body, /p_event_type IS DISTINCT FROM 'user\.deleted'/);
    assert.match(body, /'INVALID_EVENT_TYPE'/);
  });

  it('does not add charset regex on svix_id beyond length', () => {
    const body = rpcBody(readM2());
    assert.match(body, /length\(v_svix_id\) > 128/);
    assert.doesNotMatch(body, /p_svix_id.*~ '/);
  });

  it('validates user_ref_hash as 16 lowercase hex', () => {
    const body = rpcBody(readM2());
    assert.match(body, /p_user_ref_hash !~ '\^\[0-9a-f\]\{16\}\$'/);
  });

  it('uses advisory lock with canonical clerk user id prefix', () => {
    const body = rpcBody(readM2());
    assert.match(body, /pg_advisory_xact_lock/);
    assert.match(body, /hashtextextended\(\s*'m55_acct_del:' \|\| v_clerk_user_id/);
  });
});

describe('accountDeletionMigrationRpc — M2 canonicalization', () => {
  it('declares canonical variables and assigns btrim at body start', () => {
    const body = rpcBody(readM2());
    assert.match(body, /v_svix_id text;/);
    assert.match(body, /v_clerk_user_id text;/);
    assert.match(body, /v_svix_id := btrim\(p_svix_id\)/);
    assert.match(body, /v_clerk_user_id := btrim\(p_clerk_user_id\)/);
  });

  it('rejects raw/canonical mismatch with IS DISTINCT FROM', () => {
    const body = rpcBody(readM2());
    assert.match(body, /p_svix_id IS DISTINCT FROM v_svix_id/);
    assert.match(body, /p_clerk_user_id IS DISTINCT FROM v_clerk_user_id/);
  });

  it('uses canonical variables for length validation', () => {
    const body = rpcBody(readM2());
    assert.match(body, /OR v_svix_id = ''/);
    assert.match(body, /OR length\(v_svix_id\) > 128/);
    assert.match(body, /OR v_clerk_user_id = ''/);
    assert.match(body, /OR length\(v_clerk_user_id\) > 128/);
  });

  it('uses v_svix_id for ledger keys and returns after validation', () => {
    const after = postValidationBody(readM2());
    assert.match(after, /svix_id = v_svix_id/);
    assert.match(after, /'svix_id', v_svix_id/);
    assert.doesNotMatch(after, /btrim\(p_svix_id\)/);
    assert.doesNotMatch(after, /'svix_id', p_svix_id/);
    assert.doesNotMatch(after, /svix_id = p_svix_id/);
  });

  it('uses v_clerk_user_id for lock capture delete and verification', () => {
    const after = postValidationBody(readM2());
    assert.match(after, /hashtextextended\('m55_acct_del:' \|\| v_clerk_user_id/);
    assert.match(after, /user_id = v_clerk_user_id/);
    assert.doesNotMatch(after, /user_id = p_clerk_user_id/);
    assert.doesNotMatch(after, /hashtextextended\([^)]*p_clerk_user_id/);
  });
});

describe('accountDeletionMigrationRpc — M2 SET NULL regression', () => {
  it('requires reply_wallet_ledgers.user_id NOT NULL in baseline migration', () => {
    const sql = readFileSync(REPLY_DATA_LAYER, 'utf8');
    const ledgerBlock = sql.slice(
      sql.indexOf('CREATE TABLE IF NOT EXISTS reply_wallet_ledgers'),
      sql.indexOf('CREATE INDEX IF NOT EXISTS idx_reply_wallet_ledgers_wallet_created')
    );
    assert.match(ledgerBlock, /user_id text NOT NULL/);
    assert.match(ledgerBlock, /CHECK \(length\(btrim\(user_id\)\) > 0\)/);
  });

  it('deletes and verifies reply_wallet_ledgers by canonical user_id', () => {
    const after = postValidationBody(readM2());
    assert.match(after, /DELETE FROM public\.reply_wallet_ledgers[\s\S]*user_id = v_clerk_user_id/);
    assert.match(
      after,
      /FROM public\.reply_wallet_ledgers[\s\S]*WHERE rwl\.user_id = v_clerk_user_id/
    );
  });
});

describe('accountDeletionMigrationRpc — M2 ledger claim', () => {
  it('generates deletion_subject_id with m55-del prefix', () => {
    const body = rpcBody(readM2());
    assert.match(body, /'m55-del:' \|\| replace\(gen_random_uuid\(\)::text, '-', ''\)/);
  });

  it('claims with INSERT ON CONFLICT DO NOTHING and FOR UPDATE', () => {
    const body = rpcBody(readM2());
    assert.match(body, /INSERT INTO public\.clerk_webhook_events/);
    assert.match(body, /ON CONFLICT \(svix_id\) DO NOTHING/);
    assert.match(body, /FOR UPDATE/);
    assert.match(body, /'processing',\s+1,/);
  });

  it('no-ops succeeded without cleanup', () => {
    const body = rpcBody(readM2());
    const succeededIdx = body.indexOf("v_ledger_status = 'succeeded'");
    const cleanupIdx = body.indexOf('cleanup block');
    assert.ok(succeededIdx >= 0 && succeededIdx < cleanupIdx);
    assert.match(body, /'ok', true,\s*'status', 'succeeded'/);
  });

  it('rejects processing and pending without cleanup', () => {
    const body = rpcBody(readM2());
    assert.match(body, /v_ledger_status = 'processing'/);
    assert.match(body, /v_ledger_status = 'pending'/);
    assert.match(body, /'INVALID_PROCESSING_STATE'/);
  });

  it('retries failed with attempt_count increment and subject reuse', () => {
    const body = rpcBody(readM2());
    assert.match(body, /v_ledger_status = 'failed'/);
    assert.match(body, /attempt_count = cwe\.attempt_count \+ 1/);
    assert.match(body, /RETURNING cwe\.deletion_subject_id/);
  });

  it('returns LEDGER_CLAIM_FAILED on claim exception without cleanup', () => {
    const body = rpcBody(readM2());
    const claimBlock = body.slice(
      body.indexOf('ledger claim'),
      body.indexOf('cleanup block')
    );
    assert.match(claimBlock, /'LEDGER_CLAIM_FAILED'/);
    assert.match(claimBlock, /EXCEPTION/);
    assert.doesNotMatch(claimBlock, /DELETE FROM public\./);
  });
});

describe('accountDeletionMigrationRpc — M2 cleanup order and pseudonymize', () => {
  it('deletes nine tables in fixed order without direct consult_messages DELETE', () => {
    const body = rpcBody(readM2());
    const deletes = [
      'DELETE FROM public.consult_send_commits',
      'DELETE FROM public.reply_wallet_ledgers',
      'DELETE FROM public.reply_documents',
      'DELETE FROM public.reply_sessions',
      'DELETE FROM public.reply_ticket_wallets',
      'DELETE FROM public.consult_threads',
      'DELETE FROM public.dtr_guest_drafts',
      'DELETE FROM public.dtr_report_snapshots',
      'DELETE FROM public.entitlement_rights',
    ];
    let last = 0;
    for (const d of deletes) {
      const pos = body.indexOf(d, last);
      assert.ok(pos >= 0, `missing ${d}`);
      assert.ok(pos >= last, `order violation at ${d}`);
      last = pos;
    }
    assert.doesNotMatch(body, /DELETE FROM public\.consult_messages/);
  });

  it('pseudonymizes entitlements and one_time_fulfillments only', () => {
    const body = rpcBody(readM2());
    assert.match(body, /UPDATE public\.entitlements/);
    assert.match(body, /SET user_id = v_deletion_subject_id/);
    assert.match(body, /UPDATE public\.one_time_fulfillments/);
    assert.doesNotMatch(body, /SET status = 'revoked'/i);
  });

  it('scrubs failed_fulfillments by captured IDs only', () => {
    const body = rpcBody(readM2());
    assert.match(body, /target_failed_fulfillment_ids/);
    assert.match(body, /SET\s+raw_metadata = NULL,\s+user_ref_hash = NULL/);
    assert.match(body, /WHERE ff\.id = ANY\(target_failed_fulfillment_ids\)/);
    assert.doesNotMatch(body, /UPDATE public\.failed_fulfillments[\s\S]*WHERE user_ref_hash = p_user_ref_hash/);
  });

  it('does not write retained stripe tables', () => {
    const body = rpcBody(readM2());
    assert.doesNotMatch(body, /INSERT INTO public\.stripe_events/i);
    assert.doesNotMatch(body, /UPDATE public\.stripe_events/i);
    assert.doesNotMatch(body, /DELETE FROM public\.stripe_events/i);
    assert.doesNotMatch(body, /INSERT INTO public\.stripe_processed_events/i);
    assert.doesNotMatch(body, /UPDATE public\.stripe_processed_events/i);
    assert.doesNotMatch(body, /DELETE FROM public\.stripe_processed_events/i);
  });

  it('does not reference removed v1 tables or subscription guards', () => {
    const sql = readM2();
    const forbidden = [
      'subscriptions',
      'purchases',
      'invoice_dtr_grants',
      'm55_user_identity_mappings',
      'app.user_profiles',
      'p_clerk_namespace',
      'blocked_stripe_customer_id',
      'blocked_stripe_subscription_id',
      'm55_account_deletion_prepare_subscription_v1',
      'failed_permanent',
    ];
    for (const term of forbidden) {
      assert.doesNotMatch(sql, new RegExp(term));
    }
  });
});

describe('accountDeletionMigrationRpc — M2 targeted verification scope', () => {
  const RAW_USER_VERIFICATIONS: Array<{ table: string; from: RegExp; where: RegExp }> = [
    {
      table: 'reply_sessions',
      from: /FROM public\.reply_sessions AS rs/,
      where: /WHERE rs\.user_id = v_clerk_user_id/,
    },
    {
      table: 'reply_ticket_wallets',
      from: /FROM public\.reply_ticket_wallets AS rtw/,
      where: /WHERE rtw\.user_id = v_clerk_user_id/,
    },
    {
      table: 'consult_threads',
      from: /FROM public\.consult_threads AS ct/,
      where: /WHERE ct\.user_id = v_clerk_user_id/,
    },
    {
      table: 'dtr_guest_drafts',
      from: /FROM public\.dtr_guest_drafts AS dgd/,
      where: /WHERE dgd\.user_id = v_clerk_user_id/,
    },
    {
      table: 'dtr_report_snapshots',
      from: /FROM public\.dtr_report_snapshots AS drs/,
      where: /WHERE drs\.user_id = v_clerk_user_id/,
    },
    {
      table: 'entitlement_rights',
      from: /FROM public\.entitlement_rights AS er/,
      where: /WHERE er\.user_id = v_clerk_user_id/,
    },
  ];

  for (const { table, from, where } of RAW_USER_VERIFICATIONS) {
    it(`verifies zero raw clerk rows remain in ${table}`, () => {
      const scope = verificationBody(readM2());
      assert.match(scope, from, `${table} FROM missing in verification scope`);
      assert.match(scope, where, `${table} user_id filter missing in verification scope`);
      const queryStart = scope.search(from);
      const nextFrom = scope.indexOf('FROM public.', queryStart + 1);
      const blockEnd = nextFrom >= 0 ? nextFrom : scope.length;
      const block = scope.slice(queryStart, blockEnd);
      assert.match(block, /v_error_code := 'VERIFICATION_FAILED'/);
      assert.match(block, /RAISE EXCEPTION 'verification_failed'/);
    });
  }

  it('covers all nine direct DELETE tables in DELETE section', () => {
    const scope = deleteSectionBody(readM2());
    for (const table of DIRECT_DELETE_TABLES) {
      assert.match(scope, new RegExp(`DELETE FROM public\\.${table}`), `DELETE missing for ${table}`);
    }
    assert.doesNotMatch(scope, /DELETE FROM public\.consult_messages/);
  });

  it('covers all nine direct DELETE tables in verification section', () => {
    const scope = verificationBody(readM2());
    const checks: Array<{ table: string; pattern: RegExp }> = [
      { table: 'consult_send_commits', pattern: /FROM public\.consult_send_commits[\s\S]*?WHERE csc\.user_id = v_clerk_user_id/ },
      {
        table: 'reply_wallet_ledgers',
        pattern: /FROM public\.reply_wallet_ledgers[\s\S]*?WHERE rwl\.user_id = v_clerk_user_id[\s\S]*?target_reply_wallet_ids/,
      },
      {
        table: 'reply_documents',
        pattern: /FROM public\.reply_documents[\s\S]*?WHERE rd\.user_id = v_clerk_user_id[\s\S]*?target_reply_session_ids/,
      },
      { table: 'reply_sessions', pattern: /FROM public\.reply_sessions[\s\S]*?WHERE rs\.user_id = v_clerk_user_id/ },
      { table: 'reply_ticket_wallets', pattern: /FROM public\.reply_ticket_wallets[\s\S]*?WHERE rtw\.user_id = v_clerk_user_id/ },
      { table: 'consult_threads', pattern: /FROM public\.consult_threads[\s\S]*?WHERE ct\.user_id = v_clerk_user_id/ },
      { table: 'dtr_guest_drafts', pattern: /FROM public\.dtr_guest_drafts[\s\S]*?WHERE dgd\.user_id = v_clerk_user_id/ },
      { table: 'dtr_report_snapshots', pattern: /FROM public\.dtr_report_snapshots[\s\S]*?WHERE drs\.user_id = v_clerk_user_id/ },
      { table: 'entitlement_rights', pattern: /FROM public\.entitlement_rights[\s\S]*?WHERE er\.user_id = v_clerk_user_id/ },
    ];
    for (const { table, pattern } of checks) {
      assert.match(scope, pattern, `verification missing for ${table}`);
    }
    assert.doesNotMatch(scope, /DELETE FROM public\./);
  });

  it('orders verification checks before ledger succeeded update', () => {
    const body = rpcBodyWithoutComments(readM2());
    const verifyStart = body.indexOf('FROM public.consult_send_commits AS csc', body.indexOf('WHERE ff.id = ANY(target_failed_fulfillment_ids)'));
    const succeeded = body.indexOf("status = 'succeeded'", verifyStart);
    assert.ok(verifyStart >= 0 && succeeded > verifyStart);
  });
});

describe('accountDeletionMigrationRpc — M2 verification and returns', () => {
  it('compares OTF jsonb snapshots with IS DISTINCT FROM', () => {
    const body = rpcBody(readM2());
    assert.match(body, /v_otf_before/);
    assert.match(body, /v_otf_after/);
    assert.match(body, /v_otf_before IS DISTINCT FROM v_otf_after/);
    assert.match(body, /jsonb_agg/);
    assert.match(body, /'checkout_session_id'/);
    assert.match(body, /'payment_intent_id'/);
    assert.match(body, /'event_id'/);
    assert.match(body, /'product_id'/);
    assert.match(body, /'fulfilled_at'/);
  });

  it('uses VERIFICATION_FAILED and cleanup exception boundary', () => {
    const body = rpcBody(readM2());
    assert.match(body, /v_error_code := 'VERIFICATION_FAILED'/);
    assert.match(body, /cleanup block/);
    assert.match(body, /COALESCE\(v_error_code, 'CLEANUP_FAILED'\)/);
    assert.match(body, /status = 'failed'/);
    assert.match(body, /status = 'succeeded'/);
  });

  it('returns fixed jsonb shapes without leaking identifiers', () => {
    const body = rpcBody(readM2());
    assert.match(body, /'ok', true/);
    assert.match(body, /'ok', false/);
    assert.match(body, /'svix_id', v_svix_id/);
    assert.doesNotMatch(body, /'clerk_user_id'/);
    assert.doesNotMatch(body, /'user_ref_hash'/);
    assert.doesNotMatch(body, /'deletion_subject_id'/);
    assert.doesNotMatch(body, /SQLSTATE/i);
  });

  it('does not persist raw clerk id in ledger columns', () => {
    const sql = readM2();
    const insert = sql.match(
      /INSERT INTO public\.clerk_webhook_events[\s\S]*?ON CONFLICT \(svix_id\) DO NOTHING;/
    )?.[0];
    assert.ok(insert, 'ledger INSERT missing');
    assert.doesNotMatch(insert, /p_clerk_user_id/);
    assert.doesNotMatch(readM1().split('COMMENT ON TABLE')[0], /clerk_user_id/i);
  });
});
