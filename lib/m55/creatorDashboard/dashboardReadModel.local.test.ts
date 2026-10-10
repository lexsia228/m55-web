import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';
describe('dashboardReadModel unavailable metrics', () => {
  it('keeps visit-based metrics typed unavailable', () => {
    const src = readFileSync(join(process.cwd(), 'lib/m55/creatorDashboard/dashboardReadModel.ts'), 'utf8');
    for (const key of [
      'unique_tracked_visits',
      'valid_Free_completions',
      'visit_based_conversion_rate',
    ]) {
      assert.match(src, new RegExp(`${key}:[\\s\\S]*kind: 'UNAVAILABLE'`));
      assert.match(src, /UNAVAILABLE_METRIC_EXPLANATION_JA/);
    }
  });

  it('uses composite ledger keyset pagination and bounded sums', () => {
    const src = readFileSync(join(process.cwd(), 'lib/m55/creatorDashboard/dashboardReadModel.ts'), 'utf8');
    assert.match(src, /ledger_event_seq/);
    assert.match(src, /DASHBOARD_READ_INCOMPLETE/);
    assert.match(src, /sumLedgerNumericColumnV1/);
    assert.match(src, /countDistinctCommissionAccrualPurchasesV1/);
  });

});
