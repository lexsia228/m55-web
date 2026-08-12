/**
 * Support reference shown to a buyer after payment.
 *
 * A Checkout Session id is a transport identifier, not customer-facing data. Rendering it
 * raw reads as an error dump, invites the buyer to treat the id itself as proof of purchase,
 * and is long enough to break narrow layouts. Ownership is resolved from the database, so the
 * visible reference only has to let support correlate a report with a session the signed-in
 * account already owns.
 */
const RECOVERY_REF_VISIBLE_CHARS = 8;

const RECOVERY_REF_PREFIX = 'M55-';

export function maskCheckoutRecoveryRef(
  checkoutSessionId: string | null | undefined,
): string | null {
  const normalized = checkoutSessionId?.trim() ?? '';
  if (!normalized.startsWith('cs_')) return null;
  const tail = normalized.slice(-RECOVERY_REF_VISIBLE_CHARS);
  if (tail.length < RECOVERY_REF_VISIBLE_CHARS) return null;
  return `${RECOVERY_REF_PREFIX}${tail.toUpperCase()}`;
}
