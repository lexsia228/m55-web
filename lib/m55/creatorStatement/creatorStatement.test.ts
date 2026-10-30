import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import { buildCreatorStatementBundleV1 } from './creatorStatementReadModel.ts';

describe('R8-D creator statement read model', () => {
  it('never marks funds as transferred and keeps cash off', () => {
    const bundle = buildCreatorStatementBundleV1({
      creatorEconomicIdentityId: '11111111-1111-4111-8111-111111111111',
      commissionLifecycleCounts: { COMMISSION_PAYABLE: 2 },
      payoutDueDateReliable: false,
    });
    assert.equal(bundle.productionCashActivation, false);
    assert.equal(bundle.payoutTransferNetworkEnabled, false);
    for (const row of bundle.lockedInstructions) {
      assert.equal(row.fundsTransferred, false);
    }
  });

  it('creator statement route rejects cross-creator economicIdentityId', () => {
    const src = readFileSync(join(process.cwd(), 'app/api/creator/statement/route.ts'), 'utf8');
    assert.match(src, /economicIdentityParam !== ctx\.creatorEconomicIdentityId/);
    assert.match(src, /dashboardHistoryReadable/);
  });

  it('operator payout exceptions route requires reviewer', () => {
    const src = readFileSync(
      join(process.cwd(), 'app/api/internal/creator-payout-exceptions/route.ts'),
      'utf8',
    );
    assert.match(src, /requireReviewerId/);
    assert.doesNotMatch(src, /getSupabaseAdmin\(\).*service_role/i);
  });
});
