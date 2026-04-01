/**
 * One-time checkout lane constants.
 * Webhook と success page で共有。subscription lane は対象外。
 */
export const DTR_CORE_STATIC_V1 = 'DTR_CORE_STATIC_V1';
export const ALLOWED_ONE_TIME_PRODUCTS: ReadonlySet<string> = new Set([
  DTR_CORE_STATIC_V1,
]);
