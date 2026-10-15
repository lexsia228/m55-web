import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

const ROOT = join(import.meta.dirname, '../../..');

const SUCCESSOR_REL = 'supabase/migrations/20261013110000_m55_pair_fulfill_tuple_advisory_v1.sql';
const P2_REL = 'supabase/migrations/20261009000000_m55_pair_owned_state_identity_v1.sql';
const P3_REL = 'supabase/migrations/20261010000000_m55_pair_checkout_reservation_v1.sql';

const PIN_SUCCESSOR =
  '82b74bfee724ef231062644dd9d5d51b0c5b68060ed0a05da28337d64bb42e75';
const PIN_P2 = '193dee681b3e96c092729e563a69b3d3c47e6971a46928c7eddedf42849182fe';
const PIN_P3 = 'f68bf6438267713ea0c14583191a6614a7a602a003b43e814c4d34561dae6640';

const FULFILL_ADVISORY_KEY =
  "'m55_compat_ck:' || v_owner || ':' || v_probe_pair::text || ':' || v_probe_paid::text";

function read(rel: string): string {
  return readFileSync(join(ROOT, rel), 'utf8');
}

function sha256(rel: string): string {
  return createHash('sha256').update(read(rel)).digest('hex');
}

function stripSqlNoise(sql: string): string {
  return sql.replace(/--[^\n]*/g, '').replace(/\s+/g, ' ').trim();
}

function fulfillFunctionBody(sql: string): string {
  const anchor = 'CREATE OR REPLACE FUNCTION public.m55_fulfill_compatibility_report_v1';
  const start = sql.indexOf(anchor);
  assert.ok(start >= 0, 'fulfill function missing');
  const asOpen = sql.indexOf('AS $$', start);
  assert.ok(asOpen >= 0, 'fulfill AS $$ missing');
  const bodyStart = asOpen + 'AS $$'.length;
  const end = sql.indexOf('END;\n$$', bodyStart);
  assert.ok(end > bodyStart, 'fulfill END; $$ missing');
  return sql.slice(bodyStart, end);
}

function firstIndex(haystack: string, needle: string, from = 0): number {
  const idx = haystack.indexOf(needle, from);
  assert.ok(idx >= 0, `required fragment missing: ${needle.slice(0, 60)}`);
  return idx;
}

function assertOrdered(body: string, labels: Record<string, string>): void {
  let cursor = 0;
  let last = -1;
  for (const [name, fragment] of Object.entries(labels)) {
    const idx = firstIndex(body, fragment, cursor);
    assert.ok(idx > last, `order violation: ${name} must follow prior markers`);
    last = idx;
    cursor = idx + fragment.length;
  }
}

function reserveAdvisoryFragment(p3: string): string {
  const block = p3.slice(p3.indexOf('m55_reserve_compatibility_checkout_v1'));
  const m = block.match(
    /PERFORM pg_advisory_xact_lock\(\s*hashtextextended\(\s*'m55_compat_ck:' \|\| v_owner \|\| ':' \|\| p_pair_identity_id::text \|\| ':' \|\| p_paid_context_id::text,\s*0\s*\)\s*\)/,
  );
  assert.ok(m, 'reserve advisory fragment not extractable from P3');
  return stripSqlNoise(m[0]);
}

function fulfillAdvisoryFragment(body: string): string {
  const m = body.match(
    /PERFORM pg_advisory_xact_lock\(\s*hashtextextended\(\s*'m55_compat_ck:' \|\| v_owner \|\| ':' \|\| v_probe_pair::text \|\| ':' \|\| v_probe_paid::text,\s*0\s*\)\s*\)/,
  );
  assert.ok(m, 'fulfill advisory fragment not extractable');
  return stripSqlNoise(m[0]);
}

describe('frozen migration SHA pins (immutable contract)', () => {
  it('P2/P3/successor bytes match pinned SHA-256', () => {
    assert.equal(sha256(P2_REL), PIN_P2);
    assert.equal(sha256(P3_REL), PIN_P3);
    assert.equal(sha256(SUCCESSOR_REL), PIN_SUCCESSOR);
  });
});

describe('m55_pair_fulfill_tuple_advisory_v1 successor migration', () => {
  const sql = read(SUCCESSOR_REL);
  const body = fulfillFunctionBody(sql);

  it('preserves fulfill signature, SECURITY DEFINER, search_path, and service_role ACL', () => {
    assert.match(
      sql,
      /CREATE OR REPLACE FUNCTION public\.m55_fulfill_compatibility_report_v1\(\s*p_purchase_context_id uuid,\s*p_checkout_session_id text,\s*p_payment_intent_id text\s*\)/,
    );
    assert.match(sql, /RETURNS jsonb/);
    assert.match(sql, /LANGUAGE plpgsql/);
    assert.match(sql, /VOLATILE/);
    assert.match(sql, /SECURITY DEFINER/);
    assert.match(sql, /SET search_path = public, pg_temp/);
    assert.match(
      sql,
      /REVOKE ALL ON FUNCTION public\.m55_fulfill_compatibility_report_v1\(uuid, text, text\)\s+FROM PUBLIC, anon, authenticated;/,
    );
    assert.match(
      sql,
      /GRANT EXECUTE ON FUNCTION public\.m55_fulfill_compatibility_report_v1\(uuid, text, text\)\s+TO service_role;/,
    );
    assert.doesNotMatch(sql, /GRANT EXECUTE ON FUNCTION public\.m55_fulfill_compatibility_report_v1[\s\S]*TO anon/);
  });

  it('mandatory non-locking probe exits context_not_found before advisory and FOR UPDATE', () => {
    const probeSelect = firstIndex(body, 'FROM public.compatibility_purchase_contexts');
    const probeWhere = firstIndex(body, 'WHERE id = p_purchase_context_id', probeSelect);
    assert.doesNotMatch(body.slice(probeSelect, probeWhere + 40), /FOR UPDATE/);
    const notFound = firstIndex(body, "reason', 'context_not_found'");
    const advisory = firstIndex(body, 'pg_advisory_xact_lock');
    const forUpdate = firstIndex(body, 'FOR UPDATE');
    assert.ok(notFound < advisory, 'context_not_found handling must precede advisory');
    assert.ok(advisory < forUpdate, 'advisory must precede first FOR UPDATE');
    assert.doesNotMatch(body, /probe_missing/i);
  });

  it('fulfill advisory namespace and seed 0 match frozen P3 reserve expression shape', () => {
    const p3 = read(P3_REL);
    const reserveNorm = reserveAdvisoryFragment(p3)
      .replace(/p_pair_identity_id/g, 'PAIR')
      .replace(/p_paid_context_id/g, 'PAID');
    const fulfillNorm = fulfillAdvisoryFragment(body)
      .replace(/v_probe_pair/g, 'PAIR')
      .replace(/v_probe_paid/g, 'PAID');
    assert.equal(fulfillNorm, reserveNorm);
    assert.match(body, new RegExp(FULFILL_ADVISORY_KEY.replace(/\|/g, '\\|').replace(/\./g, '\\.')));
    assert.match(body, /hashtextextended\([^)]+,\s*0\s*\)/);
  });

  it('tuple revalidation, status gate, and link lookup precede delivery DML', () => {
    assertOrdered(body, {
      tuple_revalidate: "reason', 'tuple_mismatch_after_lock'",
      fulfilled_branch: "reason', 'invalid_fulfilled_state'",
      status_gate: "reason', 'context_not_pending'",
      link_lookup: 'FROM public.compatibility_owned_report_identity_links',
      link_deny: "reason', 'identity_already_owned'",
      report_insert: 'INSERT INTO public.compatibility_owned_reports',
      link_insert: 'INSERT INTO public.compatibility_owned_report_identity_links',
      status_update: "status = 'fulfilled'",
      cas_raise: "RAISE EXCEPTION 'm55_fulfill_cas_failed'",
    });
    const linkLookup = firstIndex(body, 'FROM public.compatibility_owned_report_identity_links');
    const reportInsert = firstIndex(body, 'INSERT INTO public.compatibility_owned_reports');
    assert.ok(linkLookup < reportInsert, 'identity link lookup must precede report insert');
  });

  it('CAS failure uses uncaught P0001 RAISE (no context_update_failed JSON path)', () => {
    assert.match(body, /RAISE EXCEPTION 'm55_fulfill_cas_failed' USING ERRCODE = 'P0001'/);
    assert.doesNotMatch(body, /reason', 'context_update_failed'/);
    assert.doesNotMatch(body, /EXCEPTION\s+WHEN/i);
  });

  it('does not alter reserve or slot RPC definitions in successor file', () => {
    assert.doesNotMatch(sql, /CREATE OR REPLACE FUNCTION public\.m55_reserve_compatibility_checkout_v1/);
    assert.doesNotMatch(sql, /m55_acquire_compatibility_checkout_create_slot_v1/);
  });
});

describe('contract regression guards (in-memory negative fixtures)', () => {
  const sql = read(SUCCESSOR_REL);
  const body = fulfillFunctionBody(sql);

  function advisoryPrecedesForUpdate(mutated: string): boolean {
    const adv = mutated.indexOf('pg_advisory_xact_lock');
    const fu = mutated.indexOf('FOR UPDATE');
    return adv >= 0 && fu >= 0 && adv < fu;
  }

  function detectSwallowedCas(mutated: string): boolean {
    return /EXCEPTION[\s\S]*m55_fulfill_cas_failed/.test(mutated) && /WHEN/i.test(mutated);
  }

  function detectWrongSeed(mutated: string): boolean {
    return !/hashtextextended\([^)]+,\s*0\s*\)/.test(mutated);
  }

  function detectMissingRevoke(mutated: string): boolean {
    return !/REVOKE ALL ON FUNCTION public\.m55_fulfill_compatibility_report_v1/.test(mutated);
  }

  it('rejects representative wrong-order advisory after FOR UPDATE', () => {
    assert.ok(advisoryPrecedesForUpdate(body));
    const wrongOrder = body.replace(
      'IF v_is_pair THEN',
      "SELECT 1 FROM public.compatibility_purchase_contexts WHERE id = p_purchase_context_id FOR UPDATE;\n  IF v_is_pair THEN",
    );
    assert.ok(!advisoryPrecedesForUpdate(wrongOrder));
  });

  it('rejects representative wrong hashtext seed', () => {
    const wrongSeed = body.replace(/hashtextextended\(([^)]+),\s*0\s*\)/, 'hashtextextended($1, 1)');
    assert.ok(detectWrongSeed(wrongSeed));
    assert.ok(!detectWrongSeed(body));
  });

  it('rejects representative swallowed CAS exception handler', () => {
    const swallowed = body.replace(
      "RAISE EXCEPTION 'm55_fulfill_cas_failed' USING ERRCODE = 'P0001';",
      "BEGIN RAISE EXCEPTION 'm55_fulfill_cas_failed' USING ERRCODE = 'P0001'; EXCEPTION WHEN OTHERS THEN RETURN jsonb_build_object('ok', false); END;",
    );
    assert.ok(detectSwallowedCas(swallowed));
    assert.ok(!detectSwallowedCas(body));
  });

  it('rejects representative missing REVOKE ACL block', () => {
    const noRevoke = sql.replace(
      /REVOKE ALL ON FUNCTION public\.m55_fulfill_compatibility_report_v1\(uuid, text, text\)\s+FROM PUBLIC, anon, authenticated;\s*/,
      '',
    );
    assert.ok(detectMissingRevoke(noRevoke));
    assert.ok(!detectMissingRevoke(sql));
  });

  it('rejects delivery DML before context_not_pending gate', () => {
    const gate = body.indexOf("reason', 'context_not_pending'");
    const insert = body.indexOf('INSERT INTO public.compatibility_owned_reports');
    assert.ok(gate > 0 && insert > gate, 'source must keep gate before report insert');
    const wrongOrder =
      "INSERT INTO public.compatibility_owned_reports (x) VALUES (1); IF v_context.status <> 'pending' THEN RETURN jsonb_build_object('ok', false, 'reason', 'context_not_pending'); END IF;";
    assert.ok(
      wrongOrder.indexOf('INSERT INTO public.compatibility_owned_reports') <
        wrongOrder.indexOf("reason', 'context_not_pending'"),
    );
  });
});
