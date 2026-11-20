import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import { parseOwnedComplianceCasesRpcPageV1 } from './ownedComplianceCasesRpcPage';

describe('parseOwnedComplianceCasesRpcPageV1', () => {
  const pageSize = 50;
  const sampleRow = {
    case_id: 'a1b2c3d4-e5f6-4789-a012-3456789abcde',
    case_kind: 'PURCHASE_REVIEW',
    status: 'OPEN',
    opened_at: '2026-01-01T00:00:00.000Z',
    resolved_at: null,
    decision: null,
    decision_reason: null,
  };

  it('accepts normal empty page', () => {
    const parsed = parseOwnedComplianceCasesRpcPageV1({ rows: [], has_more: false }, pageSize);
    assert.deepEqual(parsed, { rows: [], hasMore: false });
  });

  it('rejects null and malformed envelopes', () => {
    assert.throws(() => parseOwnedComplianceCasesRpcPageV1(null, pageSize));
    assert.throws(() => parseOwnedComplianceCasesRpcPageV1([], pageSize));
    assert.throws(() => parseOwnedComplianceCasesRpcPageV1({}, pageSize));
    assert.throws(() => parseOwnedComplianceCasesRpcPageV1({ rows: [], has_more: 'no' }, pageSize));
    assert.throws(() => parseOwnedComplianceCasesRpcPageV1({ rows: 'x', has_more: false }, pageSize));
  });

  it('rejects has_more contradictions and oversize rows', () => {
    assert.throws(() =>
      parseOwnedComplianceCasesRpcPageV1({ rows: [sampleRow], has_more: true }, pageSize),
    );
    const many = Array.from({ length: 51 }, () => sampleRow);
    assert.throws(() => parseOwnedComplianceCasesRpcPageV1({ rows: many, has_more: false }, pageSize));
  });

  it('requires cursor fields on valid rows', () => {
    const parsed = parseOwnedComplianceCasesRpcPageV1(
      { rows: [sampleRow], has_more: false },
      pageSize,
    );
    assert.equal(parsed.rows[0].case_id, sampleRow.case_id);
    assert.throws(() =>
      parseOwnedComplianceCasesRpcPageV1(
        { rows: [{ ...sampleRow, case_id: 'not-uuid' }], has_more: false },
        pageSize,
      ),
    );
  });

  it('accepts full page with has_more true', () => {
    const full = Array.from({ length: pageSize }, () => sampleRow);
    const parsed = parseOwnedComplianceCasesRpcPageV1({ rows: full, has_more: true }, pageSize);
    assert.equal(parsed.rows.length, pageSize);
    assert.equal(parsed.hasMore, true);
  });
});

describe('owned compliance RPC migration contract', () => {
  const root = process.cwd();
  const sql = readFileSync(
    join(root, 'supabase/migrations/20261119170000_m55_r7_creator_compliance_cases_owned_read_fix_v1.sql'),
    'utf8',
  );

  it('orders jsonb_agg and rejects partial cursor', () => {
    assert.match(sql, /jsonb_agg\(to_jsonb\(n\) - 'rn' order by n\.opened_at desc, n\.case_id desc\)/i);
    assert.match(sql, /\(p_cursor_opened_at is null\) <> \(p_cursor_case_id is null\)/);
    assert.match(sql, /security definer/i);
    assert.match(sql, /set search_path = ''/i);
    assert.doesNotMatch(sql, /grant .* on public\.m55_r5_compliance_cases/i);
  });
});