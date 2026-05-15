/**
 * M55 SOUL ADAPTER
 * Maps Clerk User to Legacy-compatible shape.
 * Next/Web 本流の権利状態は DB entitlements / entitlement_rights。
 * PurchaseCache は legacy または表示補助であり、第二の所有状態にしない（本モジュールは display-only）。
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
