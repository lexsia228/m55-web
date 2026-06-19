import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const DTR_CORE_FULL_V1 = 'dtr_core_full_v1';
const DTR_CORE_LIGHT_V1 = 'dtr_core_light_v1';
const DTR_CORE_STATIC_V1 = 'DTR_CORE_STATIC_V1';

function read(rel: string): string {
  return readFileSync(join(ROOT, rel), 'utf8');
}

describe('dtrSavedReportOwnership — SKU SSOT', () => {
  it('oneTimeCheckout exports ordered ownership SKU array without upgrade', () => {
    const src = read('lib/oneTimeCheckout.ts');
    assert.ok(src.includes('DTR_SAVED_REPORT_OWNERSHIP_PRODUCT_IDS'));
    assert.ok(src.includes('DTR_CORE_FULL_V1'));
    assert.ok(src.includes('DTR_CORE_LIGHT_V1'));
    assert.ok(src.includes('DTR_CORE_STATIC_V1'));
    assert.equal(src.includes('DTR_CORE_LIGHT_TO_FULL_UPGRADE_V1'), true);
    const block = src.slice(
      src.indexOf('DTR_SAVED_REPORT_OWNERSHIP_PRODUCT_IDS'),
      src.indexOf('export function isAllowedOneTimeProduct'),
    );
    assert.equal(block.includes('DTR_CORE_LIGHT_TO_FULL_UPGRADE_V1'), false);
  });
});

describe('dtrSavedReportOwnership — consumer static-only removal', () => {
  const cases: Array<{ rel: string; mustInclude: string[]; mustExclude: string[] }> = [
    {
      rel: 'lib/m55/dtrOwnershipGate.ts',
      mustInclude: [
        'getVisibleSavedReportSnapshot',
        'hasSavedReportPaymentBacking',
        'findActiveSavedReportEntitlement',
      ],
      mustExclude: ["eq('product_id', DTR_CORE_STATIC_V1)"],
    },
    {
      rel: 'lib/m55/dtrShelfAccess.ts',
      mustInclude: ['getVisibleSavedReportSnapshot', 'hasHiddenOnlySavedReportSnapshot'],
      mustExclude: ["getVisibleDtrReportSnapshot(userId, DTR_CORE_STATIC_V1)"],
    },
    {
      rel: 'app/dtr/core/page.tsx',
      mustInclude: ['getVisibleSavedReportSnapshot'],
      mustExclude: ['DTR_CORE_STATIC_V1'],
    },
    {
      rel: 'app/dtr/processing/page.tsx',
      mustInclude: ['getVisibleSavedReportSnapshot'],
      mustExclude: ['DTR_CORE_STATIC_V1', 'getVisibleDtrReportSnapshot'],
    },
    {
      rel: 'app/api/me/entitlements/route.ts',
      mustInclude: ['DTR_SAVED_REPORT_OWNERSHIP_PRODUCT_IDS', "in('product_id'"],
      mustExclude: ["eq('product_id', DTR_CORE_STATIC_V1)"],
    },
  ];

  for (const { rel, mustInclude, mustExclude } of cases) {
    it(`${rel} uses saved-report SKU set`, () => {
      const src = read(rel);
      for (const needle of mustInclude) assert.ok(src.includes(needle), `${rel} missing ${needle}`);
      for (const needle of mustExclude) assert.equal(src.includes(needle), false, `${rel} still has ${needle}`);
    });
  }
});

describe('dtrSavedReportOwnership — ownership behavior (structural)', () => {
  it('payment backing loops saved-report SKUs', () => {
    const src = read('lib/m55/dtrSavedReportOwnership.ts');
    assert.ok(src.includes('DTR_SAVED_REPORT_OWNERSHIP_PRODUCT_IDS'));
    assert.ok(src.includes("from('entitlements')"));
    assert.ok(src.includes("from('one_time_fulfillments')"));
  });

  it('ownership gate keeps orphan-right fail-closed', () => {
    const src = read('lib/m55/dtrOwnershipGate.ts');
    assert.ok(src.includes('entitlement_rights_orphan'));
    assert.ok(src.includes("unlockState: 'locked'"));
  });

  it('visible snapshot resolver prefers highest tier first', () => {
    const src = read('lib/m55/dtrSavedReportOwnership.ts');
    const loop = src.slice(src.indexOf('getVisibleSavedReportSnapshot'));
    assert.ok(loop.includes('DTR_SAVED_REPORT_OWNERSHIP_PRODUCT_IDS'));
    assert.ok(loop.includes('getVisibleDtrReportSnapshot'));
  });
});

describe('dtrSavedReportOwnership — Subject A light mapping cases (expected wiring)', () => {
  const matrix: Array<{ case: string; productId: string; inOwnershipSet: boolean }> = [
    { case: 'light entitlement + right + light snapshot', productId: DTR_CORE_LIGHT_V1, inOwnershipSet: true },
    { case: 'full entitlement + right + full snapshot', productId: DTR_CORE_FULL_V1, inOwnershipSet: true },
    { case: 'legacy static entitlement', productId: DTR_CORE_STATIC_V1, inOwnershipSet: true },
    { case: 'right only without payment backing', productId: 'orphan', inOwnershipSet: false },
    { case: 'no ownership', productId: 'none', inOwnershipSet: false },
  ];

  for (const row of matrix) {
    it(row.case, () => {
      const src = read('lib/oneTimeCheckout.ts');
      const savedReportBlock = src.slice(
        src.indexOf('DTR_CORE_SAVED_REPORT_ONE_TIME_PRODUCTS'),
        src.indexOf('DTR_SAVED_REPORT_OWNERSHIP_PRODUCT_IDS'),
      );
      const ownershipBlock = src.slice(
        src.indexOf('DTR_SAVED_REPORT_OWNERSHIP_PRODUCT_IDS'),
        src.indexOf('export function isAllowedOneTimeProduct'),
      );
      if (!row.inOwnershipSet) {
        assert.equal(savedReportBlock.includes(row.productId), false);
        return;
      }
      const needle =
        row.productId === DTR_CORE_LIGHT_V1
          ? 'DTR_CORE_LIGHT_V1'
          : row.productId === DTR_CORE_FULL_V1
            ? 'DTR_CORE_FULL_V1'
            : row.productId;
      assert.ok(savedReportBlock.includes(needle));
      assert.ok(ownershipBlock.includes(needle));
    });
  }
});

describe('dtrSavedReportOwnership — shelf owned path', () => {
  it('owned shelf resolves snapshot via saved-report helper', () => {
    const src = read('lib/m55/dtrShelfAccess.ts');
    const resolveBlock = src.slice(src.indexOf('export async function resolveDtrShelfAccess'));
    assert.ok(resolveBlock.includes('getVisibleSavedReportSnapshot'));
    assert.ok(resolveBlock.includes("unlockState !== 'owned'"));
  });
});
