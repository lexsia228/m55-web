import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('dtrCoreCheckoutFulfillment — FULL 1+4 grant wiring', () => {
  const src = readFileSync(
    join(process.cwd(), 'lib/m55/dtrCoreCheckoutFulfillment.ts'),
    'utf8'
  );

  it('grants FULL purchased top-up only for dtr_core_full_v1', () => {
    assert.ok(src.includes('DTR_CORE_FULL_V1'));
    assert.match(
      src,
      /if \(productId === DTR_CORE_FULL_V1\)[\s\S]*grantPurchasedTopUpToFullEquivalentIfNeeded/
    );
  });

  it('always grants initial included before FULL top-up', () => {
    assert.ok(src.includes('grantInitialIncludedReplyIfNeeded'));
    assert.ok(
      src.indexOf('grantInitialIncludedReplyIfNeeded') <
        src.indexOf('grantPurchasedTopUpToFullEquivalentIfNeeded')
    );
  });
});
