/**
 * HOME product-truth contract for guest pair reading.
 * Source: app/synastry/page.tsx (PublicShell + CompatibilityGuestExperience),
 * middleware public route list includes /synastry.
 */
export const HOME_PAIR_READING_PUBLIC_HREF = '/synastry' as const;

/** Guest pair reading at /synastry is a live public route (signed-out OK). */
export const HOME_PAIR_READING_AVAILABILITY = 'LIVE_PUBLIC' as const;

export function isHomePairReadingLivePublic(): boolean {
  return HOME_PAIR_READING_AVAILABILITY === 'LIVE_PUBLIC';
}
