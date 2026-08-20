import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { M55_METHOD_PUBLIC_NAME } from './m55MethodAuthority';
import {
  COMPETING_PUBLIC_METHOD_NAMES,
  M55_METHOD_ROUTE_CONSUMPTION,
  rejectRouteConsumptionFixture,
  routeConsumptionNegativeFixtures,
} from './m55MethodRouteConsumption';

describe('M55 method route-consumption authority', () => {
  it('registers six placements with checkout prep on Premium LP', () => {
    assert.deepEqual(
      M55_METHOD_ROUTE_CONSUMPTION.map((p) => p.id),
      [
        'home',
        'core_free_result',
        'dtr_lp',
        'purchased_report',
        'checkout_prep',
        'footer_nav',
      ],
    );
    assert.ok(M55_METHOD_ROUTE_CONSUMPTION.every((p) => p.runtimeEvidenceRequired));
  });

  it('keeps checkout prep as a distinct /dtr/lp registry entry', () => {
    const checkout = M55_METHOD_ROUTE_CONSUMPTION.find((p) => p.id === 'checkout_prep');
    assert.ok(checkout);
    assert.equal(checkout!.route, '/dtr/lp');
    assert.equal(checkout!.runtimeState, 'checkout');
    assert.equal(checkout!.testId, 'm55-method-checkout-trust-link');
    assert.equal(
      M55_METHOD_ROUTE_CONSUMPTION.some((p) => p.route === '/pricing'),
      false,
    );
  });

  it('requires purchased-report runtime evidence', () => {
    const purchased = M55_METHOD_ROUTE_CONSUMPTION.find((p) => p.id === 'purchased_report');
    assert.equal(purchased?.runtimeEvidenceRequired, true);
    assert.equal(purchased?.testId, 'm55-method-purchased-report');
  });
});

describe('M55 method route-consumption negative fixtures', () => {
  const fixtures = routeConsumptionNegativeFixtures();

  it('defines exactly ten negative fixtures', () => {
    assert.equal(fixtures.length, 10);
  });

  for (const fixture of fixtures) {
    it(`rejects ${fixture.id}`, () => {
      const reasons = rejectRouteConsumptionFixture(fixture);
      assert.ok(
        reasons.length > 0,
        `${fixture.id} was accepted; expected rejection`,
      );
    });
  }

  it('accepts the healthy canonical registry for structural checks that need it', () => {
    // Competing-name check with only the canonical name must pass.
    const reasons = rejectRouteConsumptionFixture({
      id: 'competing_canonical_method_name',
      placements: M55_METHOD_ROUTE_CONSUMPTION,
      observation: { renderedPublicNames: [M55_METHOD_PUBLIC_NAME] },
    });
    assert.deepEqual(reasons, []);
    assert.ok(COMPETING_PUBLIC_METHOD_NAMES.includes('M55複合暦解析'));
  });
});
