/**
 * Canonical Free entry CTA label authority.
 *
 * The commercial review found the same Free entry action carrying two different
 * labels (the public header read one thing, HOME and /core another). This module
 * names the single label and lists every owner that must agree with it, so a new
 * divergent literal fails a test instead of shipping.
 */
import { M55_COMMERCIAL_TERMINOLOGY as T } from '../terminology';
import { M55_CTA_LABELS } from '../experience/experienceCtaState';
import { TOP_FREE_ENTRY_PUBLIC_COPY } from '../../topFreeEntryPublicCopy';
import { getCommercialProduct } from '../../contracts/m55CommercialFunnelContract';

/** The one label every Free entry action must present. */
export const CANONICAL_FREE_ENTRY_CTA_JA = T.freeEntry;

/** A label of `null` counts as divergent: a Free entry surface must say something. */
export type FreeEntryCtaOwner = { owner: string; label: string | null };

/**
 * Every owner that renders the Free entry action. Each entry names the owner so
 * a failure points at the file to correct rather than at an anonymous string.
 */
export function freeEntryCtaOwners(): readonly FreeEntryCtaOwner[] {
  const home = TOP_FREE_ENTRY_PUBLIC_COPY.home;
  const cta = TOP_FREE_ENTRY_PUBLIC_COPY.cta;
  const selfProduct = getCommercialProduct('selfFree');

  return [
    { owner: 'terminology.freeEntry', label: T.freeEntry },
    { owner: 'terminology.freeStart', label: T.freeStart },
    { owner: 'experienceCtaState.M55_CTA_LABELS.FRESH', label: M55_CTA_LABELS.FRESH },
    { owner: 'topFreeEntryPublicCopy.home.heroPosterCtaJa', label: home.heroPosterCtaJa },
    { owner: 'topFreeEntryPublicCopy.home.productMapSelfCtaJa', label: home.productMapSelfCtaJa },
    { owner: 'topFreeEntryPublicCopy.home.finalCtaPrimaryJa', label: home.finalCtaPrimaryJa },
    { owner: 'topFreeEntryPublicCopy.cta.openFreeMapJa', label: cta.openFreeMapJa },
    { owner: 'topFreeEntryPublicCopy.cta.viewFreeMapJa', label: cta.viewFreeMapJa },
    { owner: 'm55CommercialFunnelContract.selfFree.ctaLabel', label: selfProduct.ctaLabel },
  ];
}

/** Owners whose label differs from the canonical Free entry label. */
export function divergentFreeEntryCtaOwners(): readonly FreeEntryCtaOwner[] {
  return freeEntryCtaOwners().filter((entry) => entry.label !== CANONICAL_FREE_ENTRY_CTA_JA);
}
