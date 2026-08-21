/**
 * Privacy-safe Free→Premium LP entry marker (sessionStorage only).
 * Coarse attribution: entrySource=free_result. No PII / answers / timestamps required.
 */

export const M55_FREE_RESULT_LP_ENTRY_KEY = 'm55_g5_lp_entry_free_result_v1' as const;
export const M55_FREE_RESULT_LP_ENTRY_VALUE = '1' as const;

export function markFreeResultPremiumLpEntry(): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(M55_FREE_RESULT_LP_ENTRY_KEY, M55_FREE_RESULT_LP_ENTRY_VALUE);
  } catch {
    /* storage may be unavailable — never break CTA navigation */
  }
}

/** Consume one-shot marker. Returns true only when Free→LP attribution applies. */
export function consumeFreeResultPremiumLpEntry(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const raw = window.sessionStorage.getItem(M55_FREE_RESULT_LP_ENTRY_KEY);
    window.sessionStorage.removeItem(M55_FREE_RESULT_LP_ENTRY_KEY);
    return raw === M55_FREE_RESULT_LP_ENTRY_VALUE;
  } catch {
    return false;
  }
}
