import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  ALLOWED_ONE_TIME_PRODUCTS,
  DTR_CORE_FULL_V1,
  DTR_CORE_LIGHT_TO_FULL_UPGRADE_V1,
  DTR_CORE_LIGHT_V1,
  DTR_CORE_STATIC_V1,
  getOneTimeStripePriceEnvName,
  isDtrCoreLightToFullUpgradeProduct,
  isDtrCoreSavedReportOneTimeProduct,
  ONE_TIME_STRIPE_PRICE_ENV_CANDIDATES,
  resolveOneTimeStripePriceId,
} from './oneTimeCheckout';

describe('oneTimeCheckout — allowed SKU foundation', () => {
  it('allows legacy static v1 and new light/full/upgrade keys', () => {
    assert.equal(ALLOWED_ONE_TIME_PRODUCTS.has(DTR_CORE_STATIC_V1), true);
    assert.equal(ALLOWED_ONE_TIME_PRODUCTS.has(DTR_CORE_LIGHT_V1), true);
    assert.equal(ALLOWED_ONE_TIME_PRODUCTS.has(DTR_CORE_FULL_V1), true);
    assert.equal(ALLOWED_ONE_TIME_PRODUCTS.has(DTR_CORE_LIGHT_TO_FULL_UPGRADE_V1), true);
    assert.equal(ALLOWED_ONE_TIME_PRODUCTS.size, 4);
  });

  it('separates saved-report SKUs from upgrade SKU for route wiring', () => {
    assert.equal(isDtrCoreSavedReportOneTimeProduct(DTR_CORE_STATIC_V1), true);
    assert.equal(isDtrCoreSavedReportOneTimeProduct(DTR_CORE_LIGHT_V1), true);
    assert.equal(isDtrCoreSavedReportOneTimeProduct(DTR_CORE_FULL_V1), true);
    assert.equal(isDtrCoreSavedReportOneTimeProduct(DTR_CORE_LIGHT_TO_FULL_UPGRADE_V1), false);
    assert.equal(isDtrCoreLightToFullUpgradeProduct(DTR_CORE_LIGHT_TO_FULL_UPGRADE_V1), true);
    assert.equal(getOneTimeStripePriceEnvName('unknown_sku'), undefined);
  });

  it('lists Stripe price env name candidates without implementing checkout', () => {
    assert.equal(
      ONE_TIME_STRIPE_PRICE_ENV_CANDIDATES[DTR_CORE_LIGHT_V1],
      'STRIPE_PRICE_DTR_CORE_LIGHT_V1'
    );
    assert.equal(
      ONE_TIME_STRIPE_PRICE_ENV_CANDIDATES[DTR_CORE_FULL_V1],
      'STRIPE_PRICE_DTR_CORE_FULL_V1'
    );
    assert.equal(
      ONE_TIME_STRIPE_PRICE_ENV_CANDIDATES[DTR_CORE_LIGHT_TO_FULL_UPGRADE_V1],
      'STRIPE_PRICE_DTR_CORE_LIGHT_TO_FULL_UPGRADE_V1'
    );
    assert.equal(
      ONE_TIME_STRIPE_PRICE_ENV_CANDIDATES[DTR_CORE_STATIC_V1],
      'STRIPE_PRICE_DTR_CORE_STATIC_V1'
    );
  });

  it('resolves Light to STATIC price env when LIGHT env is unset', () => {
    const resolved = resolveOneTimeStripePriceId(DTR_CORE_LIGHT_V1, {
      STRIPE_PRICE_DTR_CORE_STATIC_V1: 'price_static_light_equivalent',
    });
    assert.equal(resolved.envKey, 'STRIPE_PRICE_DTR_CORE_LIGHT_V1');
    assert.equal(resolved.priceId, 'price_static_light_equivalent');
    assert.equal(resolved.fallbackEnvKey, 'STRIPE_PRICE_DTR_CORE_STATIC_V1');
  });

  it('prefers dedicated Light env over STATIC fallback', () => {
    const resolved = resolveOneTimeStripePriceId(DTR_CORE_LIGHT_V1, {
      STRIPE_PRICE_DTR_CORE_LIGHT_V1: 'price_light_primary',
      STRIPE_PRICE_DTR_CORE_STATIC_V1: 'price_static_light_equivalent',
    });
    assert.equal(resolved.priceId, 'price_light_primary');
    assert.equal(resolved.fallbackEnvKey, undefined);
  });

  it('does not fall Full or upgrade back to STATIC', () => {
    const full = resolveOneTimeStripePriceId(DTR_CORE_FULL_V1, {
      STRIPE_PRICE_DTR_CORE_STATIC_V1: 'price_static_light_equivalent',
    });
    const upgrade = resolveOneTimeStripePriceId(DTR_CORE_LIGHT_TO_FULL_UPGRADE_V1, {
      STRIPE_PRICE_DTR_CORE_STATIC_V1: 'price_static_light_equivalent',
    });
    assert.equal(full.priceId, undefined);
    assert.equal(upgrade.priceId, undefined);
  });
});
