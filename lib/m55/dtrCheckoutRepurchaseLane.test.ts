import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { resolveDtrCoreCheckoutSnapshotGate } from './dtrCheckoutRepurchaseLane';
import type { DtrReportSnapshotRow } from './dtrDraftDb';

const CHECKOUT_ROUTE = join(process.cwd(), 'app/api/purchase/checkout/route.ts');

function mockRow(id: string): DtrReportSnapshotRow {
  return {
    reportInstanceId: id,
    user_id: 'user-1',
    product_id: 'DTR_CORE_STATIC_V1',
    checkout_session_id: 'cs_test',
    profile_snapshot: { nickname: 'A', birthDate: '1990-01-01' },
    draft_snapshot: null,
    envelope_json: {} as DtrReportSnapshotRow['envelope_json'],
    engine_version: null,
    engine_context_json: null,
  };
}

describe('resolveDtrCoreCheckoutSnapshotGate', () => {
  it('visible snapshot → block_already_purchased', async () => {
    const result = await resolveDtrCoreCheckoutSnapshotGate('user-1', {
      getVisible: async () => mockRow('vis-1'),
      getLatestIncludingHidden: async () => mockRow('vis-1'),
    });
    assert.deepEqual(result, { action: 'block_already_purchased' });
  });

  it('hidden-only → allow with repurchaseLane true', async () => {
    const result = await resolveDtrCoreCheckoutSnapshotGate('user-1', {
      getVisible: async () => null,
      getLatestIncludingHidden: async () => mockRow('hid-1'),
    });
    assert.deepEqual(result, { action: 'allow', repurchaseLane: true });
  });

  it('no snapshot rows → allow with repurchaseLane false', async () => {
    const result = await resolveDtrCoreCheckoutSnapshotGate('user-1', {
      getVisible: async () => null,
      getLatestIncludingHidden: async () => null,
    });
    assert.deepEqual(result, { action: 'allow', repurchaseLane: false });
  });
});

describe('checkout route repurchase wiring', () => {
  it('uses snapshot gate and skips fulfillment_pending when repurchaseLane', () => {
    const src = readFileSync(CHECKOUT_ROUTE, 'utf8');
    assert.ok(src.includes('resolveDtrCoreCheckoutSnapshotGate'));
    assert.ok(src.includes('repurchaseLane'));
    assert.ok(src.includes('block_already_purchased'));
    assert.equal(src.includes('getVisibleDtrReportSnapshot'), false);
    assert.equal(src.includes('getLatestDtrReportSnapshotIncludingHidden'), false);
    assert.ok(src.includes('repurchase_lane_hidden_only') || src.includes('repurchaseLane'));
  });

  it('has no hard delete or snapshot body mutation', () => {
    const src = readFileSync(CHECKOUT_ROUTE, 'utf8');
    assert.equal(src.includes('.delete('), false);
    assert.equal(src.includes('envelope_json'), false);
  });
});
