import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  buildUserHideSnapshotUpdateRow,
  DTR_USER_HIDDEN_REASON_USER_DELETE,
  DTR_USER_HIDDEN_SOURCE_MY_PANEL,
  hideVisibleDtrReportSnapshotForUser,
  isAllowedHideUpdatePayload,
} from './hideDtrReportSnapshot';

const HIDE_LIB = join(process.cwd(), 'lib/m55/hideDtrReportSnapshot.ts');
const HIDE_ROUTE = join(process.cwd(), 'app/api/dtr/report-snapshot/hide/route.ts');

describe('hideDtrReportSnapshot update payload', () => {
  it('sets only hide audit columns with non-PII slug reason', () => {
    const row = buildUserHideSnapshotUpdateRow(new Date('2026-05-21T12:00:00.000Z'));
    assert.equal(row.user_hidden_at, '2026-05-21T12:00:00.000Z');
    assert.equal(row.user_hidden_source, DTR_USER_HIDDEN_SOURCE_MY_PANEL);
    assert.equal(row.user_hidden_reason, DTR_USER_HIDDEN_REASON_USER_DELETE);
    assert.ok(isAllowedHideUpdatePayload(row));
    assert.equal(Object.keys(row).length, 3);
  });

  it('rejects payloads that touch forbidden snapshot body fields', () => {
    assert.equal(
      isAllowedHideUpdatePayload({
        user_hidden_at: '2026-05-21T12:00:00.000Z',
        user_hidden_source: 'my_panel',
        envelope_json: {},
      }),
      false,
    );
    assert.equal(
      isAllowedHideUpdatePayload({
        user_hidden_at: '2026-05-21T12:00:00.000Z',
        user_hidden_source: 'my_panel',
        user_hidden_reason: 'user_delete',
        profile_snapshot: { nickname: 'x', birthDate: '2000-01-01' },
      }),
      false,
    );
  });
});

describe('hideDtrReportSnapshot lib guards', () => {
  it('has no hard delete or DDL in lib', () => {
    const src = readFileSync(HIDE_LIB, 'utf8');
    assert.equal(src.includes('.delete('), false);
    assert.equal(src.includes('.truncate('), false);
    assert.equal(/DROP\s+TABLE/i.test(src), false);
  });

  it('UPDATE targets visible row with user_hidden_at IS NULL guard', () => {
    const src = readFileSync(HIDE_LIB, 'utf8');
    assert.ok(src.includes(".is('user_hidden_at', null)"));
    assert.ok(src.includes('getVisibleDtrReportSnapshot'));
    assert.ok(src.includes('getLatestDtrReportSnapshotIncludingHidden'));
  });

  it('exports hideVisibleDtrReportSnapshotForUser', () => {
    assert.equal(typeof hideVisibleDtrReportSnapshotForUser, 'function');
  });
});

describe('POST /api/dtr/report-snapshot/hide route', () => {
  it('requires Clerk auth and returns 401 when missing', () => {
    const src = readFileSync(HIDE_ROUTE, 'utf8');
    assert.ok(src.includes("from '@clerk/nextjs/server'"));
    assert.ok(src.includes('await auth()'));
    assert.ok(src.includes("status: 401"));
    assert.ok(src.includes("'unauthorized'"));
  });

  it('maps hide results without returning raw snapshot id', () => {
    const src = readFileSync(HIDE_ROUTE, 'utf8');
    assert.ok(src.includes('{ ok: true as const }'));
    assert.ok(src.includes("'no_visible_snapshot'"));
    assert.ok(src.includes("'already_hidden'"));
    assert.ok(src.includes("'hide_failed'"));
    assert.equal(src.includes('reportInstanceId'), false);
    assert.equal(src.includes('hiddenAt'), false);
  });

  it('logs safe summary with userIdHash only', () => {
    const src = readFileSync(HIDE_ROUTE, 'utf8');
    assert.ok(src.includes('hashUserIdForLedgerLog'));
    assert.ok(src.includes('userIdHash'));
    assert.equal(src.includes('userId: userId'), false);
    assert.equal(src.includes('JSON.stringify({ userId'), false);
  });

  it('route has no hard delete or DDL', () => {
    const src = readFileSync(HIDE_ROUTE, 'utf8');
    assert.equal(src.includes('.delete('), false);
    assert.equal(src.includes('.truncate('), false);
    assert.equal(/DROP\s+TABLE/i.test(src), false);
  });
});
