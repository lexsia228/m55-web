const IDEMPOTENCY_PREFIX = 'm55_r5_purchase_attempt_checkout_v1_' as const;
const LOWERCASE_UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export const M55_R5_PURCHASE_ATTEMPT_CHECKOUT_IDEMPOTENCY_PREFIX_V1 = IDEMPOTENCY_PREFIX;

export function buildPurchaseAttemptCheckoutIdempotencyKeyV1(
  purchaseAttemptId: string,
): string {
  if (typeof purchaseAttemptId !== 'string' || !LOWERCASE_UUID_RE.test(purchaseAttemptId)) {
    throw new Error('INVALID_PURCHASE_ATTEMPT_ID');
  }
  return `${IDEMPOTENCY_PREFIX}${purchaseAttemptId}`;
}
