/**
 * M55NarrativeSpecV1 — presentation contract over existing inference.
 * Does not invent conclusions. Every block cites provenance IDs.
 */

export const M55_NARRATIVE_SPEC_VERSION = 'm55_narrative_v1' as const;

export type M55NarrativeSurface =
  | 'personal_free'
  | 'personal_premium'
  | 'compatibility_free'
  | 'compatibility_paid';

export type NarrativeProvenanceRef = {
  readonly text: string;
  readonly provenanceIds: readonly string[];
};

export type ManualSlotId =
  | 'start'
  | 'decision'
  | 'distance'
  | 'recovery'
  | 'change'
  | 'misread'
  | 'actual'
  | 'talk_hint'
  | 'mismatch_entry'
  | 'one_tends'
  | 'other_tends'
  | 'pair_misread'
  | 'return_path'
  | 'pair_talk_hint';

export type ManualSlotV1 = {
  readonly id: ManualSlotId;
  readonly labelJa: string;
  readonly bodyJa: string;
  readonly provenanceIds: readonly string[];
};

export type ManualSpecV1 = {
  readonly titleJa: string;
  readonly slots: readonly ManualSlotV1[];
  readonly hiddenSpecJa: string;
  readonly hiddenSpecProvenanceIds: readonly string[];
  readonly completeness: 'short' | 'complete';
};

export type ShareCandidateVariant =
  | 'manual'
  | 'seen_vs_actual'
  | 'hidden_spec'
  | 'premium_takeaway'
  | 'pair_manual'
  | 'pair_generic';

export type ShareCandidateV1 = {
  readonly variant: ShareCandidateVariant;
  readonly labelJa: string;
  readonly headlineJa: string;
  readonly bodyJa: string;
  readonly ctaJa: string;
  readonly provenanceIds: readonly string[];
};

export type M55NarrativeSpecV1 = {
  readonly version: typeof M55_NARRATIVE_SPEC_VERSION;
  readonly surface: M55NarrativeSurface;
  readonly openingHit: NarrativeProvenanceRef;
  readonly trustCue: NarrativeProvenanceRef;
  readonly birthFoundation?: NarrativeProvenanceRef;
  readonly currentExpression?: NarrativeProvenanceRef;
  readonly fusedDiscovery?: NarrativeProvenanceRef;
  readonly contextSections: readonly NarrativeProvenanceRef[];
  readonly strengthFriction?: {
    readonly strengthJa: string;
    readonly frictionJa: string;
    readonly provenanceIds: readonly string[];
  };
  readonly manualSpec: ManualSpecV1;
  readonly actions: readonly NarrativeProvenanceRef[];
  readonly takeaway?: NarrativeProvenanceRef;
  readonly shareCandidates: readonly ShareCandidateV1[];
  readonly inferenceIds: readonly string[];
};
