import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { PUBLIC_REASON_FALLBACK, mapPublicReasonLabelV1 } from './publicReasonMap';

describe('publicReasonMap', () => {
  it('maps known codes and falls back safely', () => {
    assert.equal(mapPublicReasonLabelV1('COMPLIANCE_HOLD'), 'コンプライアンス確認中');
    assert.equal(mapPublicReasonLabelV1('unknown_internal_code'), PUBLIC_REASON_FALLBACK);
    assert.equal(mapPublicReasonLabelV1(null), PUBLIC_REASON_FALLBACK);
  });
});
