/**
 * M55 SOUL ADAPTER
 * Maps Clerk User to Legacy-compatible shape.
 * SSOT: PurchaseCache remains authority for entitlements; this is display-only.
 */
type ClerkUserShape = {
  username?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  primaryEmailAddress?: { emailAddress?: string } | null;
  publicMetadata?: Record<string, unknown>;
};

export type LegacyUserShape = {
  user_name: string;
  plan: 'FREE' | 'STANDARD' | 'PREMIUM';
};

function normalizePlan(raw: unknown): 'FREE' | 'STANDARD' | 'PREMIUM' {
  const s = String(raw ?? 'FREE').toUpperCase();
  if (s === 'PREMIUM') return 'PREMIUM';
  if (s === 'STANDARD') return 'STANDARD';
  return 'FREE';
}

export function adaptClerkUserToLegacy(user: ClerkUserShape | null | undefined): LegacyUserShape {
  if (!user) {
    return { user_name: 'Guest', plan: 'FREE' };
  }

  const namePart = [user.firstName, user.lastName].filter(Boolean).join(' ').trim() || user.primaryEmailAddress?.emailAddress || null;
  const user_name = user.username ?? namePart ?? 'Guest';

  const meta = user.publicMetadata?.plan;
  const plan = normalizePlan(meta);

  return { user_name, plan };
}
