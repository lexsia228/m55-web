import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const DTR_DRAFT_DB = join(process.cwd(), 'lib/m55/dtrDraftDb.ts');
const FULFILLMENT = join(process.cwd(), 'lib/m55/dtrCoreCheckoutFulfillment.ts');

describe('fulfillment snapshot dedupe (soft-hide repurchase)', () => {
  it('upsert skips INSERT only when visible snapshot exists', () => {
    const upsertBlock = readFileSync(DTR_DRAFT_DB, 'utf8').slice(
      readFileSync(DTR_DRAFT_DB, 'utf8').indexOf('upsertDtrReportSnapshotAtFulfillment'),
    );
    assert.ok(upsertBlock.includes('getVisibleDtrReportSnapshot(params.userId, params.productId)'));
    assert.ok(upsertBlock.includes('existingVisible'));
    assert.equal(
      upsertBlock.includes('getLatestDtrReportSnapshotIncludingHidden(params.userId, params.productId);\n  if (existing)'),
      false,
    );
  });

  it('allows INSERT when hidden-only (repurchase log)', () => {
    const src = readFileSync(DTR_DRAFT_DB, 'utf8');
    assert.ok(src.includes('dtr_snapshot_repurchase_fulfillment_insert'));
    assert.ok(src.includes('hiddenOnlyPrior'));
  });

  it('23505 recovery reads visible row only', () => {
    const upsertBlock = readFileSync(DTR_DRAFT_DB, 'utf8').slice(
      readFileSync(DTR_DRAFT_DB, 'utf8').indexOf('if (error.code === \'23505\')'),
    );
    assert.ok(upsertBlock.includes('getVisibleDtrReportSnapshot'));
    assert.equal(
      upsertBlock.slice(0, 400).includes('getLatestDtrReportSnapshotIncludingHidden'),
      false,
    );
  });

  it('no UPDATE or DELETE on snapshot rows in dtrDraftDb', () => {
    const src = readFileSync(DTR_DRAFT_DB, 'utf8');
    assert.equal(src.includes('.delete('), false);
    const upsert = src.slice(src.indexOf('upsertDtrReportSnapshotAtFulfillment'));
    assert.equal(upsert.includes('.update('), false);
  });
});

describe('reply wallet on repurchase fulfillment', () => {
  it('links active wallet to new snapshot (not null-only)', () => {
    const block = readFileSync(FULFILLMENT, 'utf8').slice(
      readFileSync(FULFILLMENT, 'utf8').indexOf('reply_ticket_wallets'),
    );
    assert.ok(block.includes('report_instance_id: snap.snapshotId'));
    assert.equal(block.includes(".is('report_instance_id', null)"), false);
  });

  it('included reply grant remains idempotent via grantInitialIncludedReplyIfNeeded', () => {
    const src = readFileSync(FULFILLMENT, 'utf8');
    assert.ok(src.includes('grantInitialIncludedReplyIfNeeded'));
    assert.ok(src.indexOf('grantInitialIncludedReplyIfNeeded') < src.indexOf('upsertDtrReportSnapshotAtFulfillment'));
  });
});
