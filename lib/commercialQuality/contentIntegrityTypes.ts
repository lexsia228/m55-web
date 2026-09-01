/**
 * M55 content integrity — deterministic Japanese semantic corpus audit types.
 */

export type ContentIntegritySeverity = 'P0' | 'P1' | 'P2';

export type ContentIntegrityCategory =
  | 'unmatched_brackets'
  | 'empty_output'
  | 'mojibake'
  | 'malformed_interpolation'
  | 'dangling_fragment'
  | 'share_display_truncation'
  | 'share_source_divergence'
  | 'duplicate_adjacent_prose'
  | 'incomplete_sentence_ending'
  | 'nested_quote_truncation_regression'
  | 'corpus_person_b_extraction_misidentification'
  | 'self_generated_abstraction'
  | 'seen_vs_actual_nested_quotes'
  | 'personal_manual_actor_inversion'
  | 'pair_share_self_perspective'
  | 'pair_r2_share_ambiguous_ending'
  | 'pair_manual_slot_perspective'
  | 'pair_premium_free_restatement'
  | 'pair_premium_chapter_duplication'
  | 'premium_share_tier_collapse'
  | 'paid_report_tone_fragment'
  | 'digital_report_delivery_wording'
  | 'share_quote_nesting'
  | 'pair_free_broken_abstraction'
  | 'pair_actor_side_label'
  | 'cross_profile_share_duplicate'
  | 'share_doubled_terminal_punctuation'
  | 'premium_open_loop_collapse'
  | 'pair_premium_chapter_grammar'
  | 'pair_premium_boilerplate_signature'
  | 'static_paid_opening_barnum'
  | 'paid_composition_contradiction';

export type ContentIntegrityCorpusItem = {
  readonly itemId: string;
  readonly surface: string;
  readonly sourceCategory: string;
  readonly variantIdentity: string;
  readonly headingLabel: string;
  readonly semanticText: string;
  readonly shareTextJa?: string;
  readonly sourceOwner: string;
  readonly authoritySemanticText?: string;
};

export type ContentIntegrityFinding = {
  readonly findingId: string;
  readonly itemId: string;
  readonly severity: ContentIntegritySeverity;
  readonly category: ContentIntegrityCategory;
  readonly deterministicEvidence: string;
  readonly currentText: string;
  readonly expectedText?: string;
};

export type ContentIntegrityAuditResult = {
  readonly corpusItemCount: number;
  readonly brokenItemCount: number;
  readonly findings: readonly ContentIntegrityFinding[];
  readonly findingsBySeverity: Readonly<Record<ContentIntegritySeverity, number>>;
};

/** Permanent regression fixture — Production observed 2026-08. */
export const CONTENT_INTEGRITY_SEEN_VS_ACTUAL_REGRESSION_V1 = {
  fixtureId: 'P3.seen_vs_actual.deadline.close.nested_quote',
  headingLabel: '人から見える私 / 実際の私',
  expectedActualJa: '近い関係で「ここまで」が見えたところで、自分の中で決めている',
  truncatedDisplayJa: '近い関係で「ここまで」',
} as const;
