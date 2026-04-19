/**
 * Trust row on M55-hosted purchase surfaces (e.g. /dtr/lp).
 * Must match what is enabled in Stripe Dashboard / Checkout — set explicitly in production.
 *
 * `NEXT_PUBLIC_CHECKOUT_TRUST_BADGES` — comma-separated ids, e.g.:
 *   visa,mastercard,amex,jcb,apple_pay,google_pay,paypay,shop_pay
 *
 * If unset, a conservative default lists major cards + wallet logos (with on-page soft disclaimer).
 * `shop_pay` and `paypay` are NOT in the default; add them only when actually enabled.
 */
export const CHECKOUT_TRUST_BADGE_IDS = [
  'visa',
  'mastercard',
  'amex',
  'jcb',
  'apple_pay',
  'google_pay',
  'shop_pay',
  'paypay',
] as const;

export type CheckoutTrustBadgeId = (typeof CHECKOUT_TRUST_BADGE_IDS)[number];

const DEFAULT_BADGES: readonly CheckoutTrustBadgeId[] = [
  'visa',
  'mastercard',
  'amex',
  'jcb',
  'apple_pay',
  'google_pay',
];

const DISPLAY_ORDER: readonly CheckoutTrustBadgeId[] = [
  'visa',
  'mastercard',
  'amex',
  'jcb',
  'apple_pay',
  'google_pay',
  'shop_pay',
  'paypay',
];

const ALLOWED = new Set<string>(CHECKOUT_TRUST_BADGE_IDS);

function normalizeIds(raw: string): CheckoutTrustBadgeId[] {
  const out: CheckoutTrustBadgeId[] = [];
  for (const part of raw.split(',')) {
    const id = part.trim().toLowerCase();
    if (id && ALLOWED.has(id)) out.push(id as CheckoutTrustBadgeId);
  }
  return out;
}

/** Ordered list of badge ids to render on the purchase trust row. */
export function getCheckoutTrustBadgeIds(): CheckoutTrustBadgeId[] {
  const fromEnv = process.env.NEXT_PUBLIC_CHECKOUT_TRUST_BADGES?.trim();
  const list = fromEnv ? normalizeIds(fromEnv) : [...DEFAULT_BADGES];
  const orderIndex = (id: CheckoutTrustBadgeId) => {
    const i = DISPLAY_ORDER.indexOf(id);
    return i === -1 ? 999 : i;
  };
  return [...list].sort((a, b) => orderIndex(a) - orderIndex(b));
}

export function trustRowShowsWalletBadges(ids: CheckoutTrustBadgeId[]): boolean {
  return ids.includes('apple_pay') || ids.includes('google_pay');
}
