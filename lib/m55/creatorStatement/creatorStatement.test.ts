import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildCreatorStatementBundleV1 } from './creatorStatementReadModel.ts';

describe('R8-D creator statement read model', () => {
  it('never marks funds as transferred and keeps cash off', () => {
    const bundle = buildCreatorStatementBundleV1({
      commissionLifecycleCounts: { COMMISSION_PAYABLE: 2 },
      lockedBundles: [],
      payoutDueDateReliable: false,
    });
    assert.equal(bundle.productionCashActivation, false);
    assert.equal(bundle.payoutTransferNetworkEnabled, false);
    for (const row of bundle.lockedInstructions) {
      assert.equal(row.fundsTransferred, false);
    }
  });

  it('creator statement route rejects cross-creator economicIdentityId', async () => {
    const { readFileSync } = await import('node:fs');
    const { join } = await import('node:path');
    const src = readFileSync(join(process.cwd(), 'app/api/creator/statement/route.ts'), 'utf8');
    assert.match(src, /economicIdentityParam !== ctx\.creatorEconomicIdentityId/);
    assert.match(src, /loadCreatorStatementBundleForSessionV1/);
  });

  it('operator payout exceptions route requires reviewer and loads service data', async () => {
    const { readFileSync } = await import('node:fs');
    const { join } = await import('node:path');
    const src = readFileSync(
      join(process.cwd(), 'app/api/internal/creator-payout-exceptions/route.ts'),
      'utf8',
    );
    assert.match(src, /requireReviewerId/);
    assert.match(src, /loadOperatorPayoutExceptionsV1/);
    assert.doesNotMatch(src, /rows:\s*\[\s*\]/);
  });
});
