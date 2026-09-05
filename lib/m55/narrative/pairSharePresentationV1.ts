import { resolveTraitIdentity } from '../commercialUx/traitIdentityCatalog';
import { parsePublicCardDisplayV1 } from './publicCardDisplayV1';
import type { PublicShareSpecV1 } from './publicShareSpecV1';
import { decodePublicShareToken } from './publicShareTokenV1';

export type PairShareAspectV1 = '1:1' | '4:5' | '9:16';
export type PairShareHierarchyV1 = 'square-priority' | 'portrait-rich' | 'story-stack';
export type PairShareRelationModeV1 = 'combined' | 'two-column' | 'vertical';

export type PairSharePresentationV1 = {
  readonly hierarchy: PairShareHierarchyV1;
  readonly showGenericHeadline: boolean;
  readonly pairLabel: string;
  readonly relationMode: PairShareRelationModeV1;
  readonly sideAJa: string;
  readonly sideBJa: string;
  readonly combinedRelationJa: string;
  readonly showCue: boolean;
  readonly cueJa: string;
  readonly ctaJa: string;
  readonly heroPaths: readonly [string, string];
};

/** Presentation-only projection from an already-public Pair share specification. */
export function buildPairSharePresentationV1(
  spec: PublicShareSpecV1,
  aspect: PairShareAspectV1,
): PairSharePresentationV1 | null {
  if (spec.variant !== 'pair_manual') return null;
  const key = decodePublicShareToken(spec.token);
  if (
    key?.kind !== 'pair' ||
    typeof key.personAStemLaneIndex !== 'number' ||
    typeof key.personBStemLaneIndex !== 'number'
  ) {
    return null;
  }
  const traitA = resolveTraitIdentity(key.personAStemLaneIndex);
  const traitB = resolveTraitIdentity(key.personBStemLaneIndex);
  if (!traitA || !traitB) return null;
  const display = parsePublicCardDisplayV1(spec);
  const sideAJa = display.sideAJa || display.entryJa;
  const sideBJa = display.sideBJa;
  const combinedRelationJa = sideBJa
    ? `${sideAJa}。もう一方は、${sideBJa}。`
    : sideAJa;
  return Object.freeze({
    hierarchy:
      aspect === '1:1' ? 'square-priority' : aspect === '4:5' ? 'portrait-rich' : 'story-stack',
    showGenericHeadline: aspect !== '1:1',
    pairLabel: `${traitA.traitName} × ${traitB.traitName}`,
    relationMode: aspect === '1:1' ? 'combined' : aspect === '4:5' ? 'two-column' : 'vertical',
    sideAJa,
    sideBJa,
    combinedRelationJa,
    showCue: aspect === '9:16' && Boolean(display.cueJa),
    cueJa: display.cueJa,
    ctaJa: display.cta,
    heroPaths: [traitA.imagePath, traitB.imagePath] as const,
  });
}
