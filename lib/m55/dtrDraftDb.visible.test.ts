import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const DTR_DRAFT_DB = join(process.cwd(), 'lib/m55/dtrDraftDb.ts');

describe('getVisibleDtrReportSnapshot read path', () => {
  it('visible fetch requires user_hidden_at IS NULL', () => {
    const src = readFileSync(DTR_DRAFT_DB, 'utf8');
    assert.ok(src.includes("query.is('user_hidden_at', null)"));
    assert.ok(src.includes('visibleOnly: true'));
  });

  it('visible fetch orders by created_at desc and limits 1', () => {
    const src = readFileSync(DTR_DRAFT_DB, 'utf8');
    assert.ok(src.includes(".order('created_at', { ascending: false })"));
    assert.ok(src.includes('.limit(1)'));
  });

  it('getDtrReportSnapshot delegates to visible helper', () => {
    const src = readFileSync(DTR_DRAFT_DB, 'utf8');
    assert.ok(src.includes('return getVisibleDtrReportSnapshot(userId, productId)'));
  });

  it('fulfillment dedupe uses visible-only; hidden-only allows INSERT', () => {
    const src = readFileSync(DTR_DRAFT_DB, 'utf8');
    assert.ok(src.includes('getLatestDtrReportSnapshotIncludingHidden'));
    const upsertBlock = src.slice(src.indexOf('upsertDtrReportSnapshotAtFulfillment'));
    assert.ok(upsertBlock.includes('getVisibleDtrReportSnapshot'));
    assert.ok(upsertBlock.includes('hiddenOnlyPrior'));
    assert.equal(
      upsertBlock.includes('getLatestDtrReportSnapshotIncludingHidden(params.userId, params.productId);\n  if (existing)'),
      false,
    );
  });

  it('no hide UPDATE or hard DELETE in dtrDraftDb', () => {
    const src = readFileSync(DTR_DRAFT_DB, 'utf8');
    assert.equal(src.includes('.delete('), false);
    assert.equal(src.includes('.update('), false);
    assert.equal(src.includes('user_hidden_source'), false);
  });
});

describe('consumer read paths use visible snapshot', () => {
  const visibleConsumers = [
    'app/dtr/core/page.tsx',
    'app/dtr/processing/page.tsx',
    'lib/m55/dtrOwnershipGate.ts',
  ];

  for (const rel of visibleConsumers) {
    it(`${rel} imports getVisibleDtrReportSnapshot`, () => {
      const src = readFileSync(join(process.cwd(), rel), 'utf8');
      assert.ok(src.includes('getVisibleDtrReportSnapshot'));
      assert.equal(src.includes('getLatestDtrReportSnapshotIncludingHidden'), false);
    });
  }

  it('dtrShelfAccess uses visible for shelf and including-hidden for hidden-only gate only', () => {
    const src = readFileSync(join(process.cwd(), 'lib/m55/dtrShelfAccess.ts'), 'utf8');
    assert.ok(src.includes('getVisibleDtrReportSnapshot'));
    assert.ok(src.includes('getLatestDtrReportSnapshotIncludingHidden'));
    assert.ok(src.includes('isDtrOwnedHiddenOnlyState'));
    assert.equal(src.includes('resolveStoredEnvelopeRead'), false);
  });

  it('checkout repurchase lane delegated to dtrCheckoutRepurchaseLane', () => {
    const src = readFileSync(join(process.cwd(), 'app/api/purchase/checkout/route.ts'), 'utf8');
    assert.ok(src.includes('resolveDtrCoreCheckoutSnapshotGate'));
    assert.equal(src.includes('getLatestDtrReportSnapshotIncludingHidden'), false);
  });

  it('reply ticket ownership probe requires visible snapshot', () => {
    const src = readFileSync(
      join(process.cwd(), 'lib/m55/reply/replyTicketCheckoutValidate.ts'),
      'utf8',
    );
    assert.ok(src.includes(".is('user_hidden_at', null)"));
  });
});

describe('stored envelope read contract', () => {
  it('/dtr/core still uses resolveStoredEnvelopeRead with visible snapshot fetch', () => {
    const src = readFileSync(join(process.cwd(), 'app/dtr/core/page.tsx'), 'utf8');
    assert.ok(src.includes('getVisibleDtrReportSnapshot'));
    assert.ok(src.includes('resolveStoredEnvelopeRead'));
    assert.equal(src.includes('runDtrEngine'), false);
  });
});
