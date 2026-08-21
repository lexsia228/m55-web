/**
 * selectors-v1 ID unions and bundle types (pure; no I/O).
 */

import type { INDIVIDUALIZATION_SELECTOR_VERSION_V1 } from './versions';

export type StrainSelectorIdV1 =
  | 'strain__pace_mismatch'
  | 'strain__decision_overload'
  | 'strain__distance_tension'
  | 'strain__recovery_delay'
  | 'strain__change_uncertainty';

export type RecoverySelectorIdV1 =
  | 'recovery__small_start'
  | 'recovery__sort_materials'
  | 'recovery__pause_first'
  | 'recovery__speak_to_trusted_person'
  | 'recovery__reduce_change_scope';

export type FreeBlockSelectorIdV1 =
  | 'free__intro__welcome'
  | 'free__dob_baseline__five_axes'
  | 'free__current_expression__projection'
  | 'free__primary_theme__work'
  | 'free__primary_theme__relation'
  | 'free__primary_theme__fatigue'
  | 'free__primary_theme__tendency'
  | 'free__primary_theme__report_scene'
  | 'free__align_diverge__distance_diverge'
  | 'free__align_diverge__distance_align'
  | 'free__align_diverge__recovery_diverge'
  | 'free__align_diverge__recovery_align'
  | 'free__align_diverge__decision_diverge'
  | 'free__align_diverge__decision_align'
  | 'free__align_diverge__start_diverge'
  | 'free__align_diverge__start_align'
  | 'free__align_diverge__change_diverge'
  | 'free__align_diverge__change_align'
  | 'free__strain__pace_mismatch'
  | 'free__strain__decision_overload'
  | 'free__strain__distance_tension'
  | 'free__strain__recovery_delay'
  | 'free__strain__change_uncertainty'
  | 'free__strain__none'
  | 'free__recovery__small_start'
  | 'free__recovery__sort_materials'
  | 'free__recovery__pause_first'
  | 'free__recovery__speak_to_trusted_person'
  | 'free__recovery__reduce_change_scope'
  | 'free__paid_depth_point__chapter_I'
  | 'free__paid_depth_point__chapter_II'
  | 'free__paid_depth_point__chapter_III'
  | 'free__paid_depth_point__chapter_IV';

export type PaidChapterEmphasisIdV1 =
  | 'paid_ch1__baseline_landscape'
  | 'paid_ch1__expression_mirror'
  | 'paid_ch1__align_diverge_bridge'
  | 'paid_ch2__start_rhythm'
  | 'paid_ch2__decision_flow'
  | 'paid_ch2__change_adaptation'
  | 'paid_ch3__distance_posture'
  | 'paid_ch3__decision_in_relation'
  | 'paid_ch3__recovery_connection'
  | 'paid_ch4__recovery_pace'
  | 'paid_ch4__change_life_load'
  | 'paid_ch4__distance_boundary'
  | 'paid_ch4__strain_life_context'
  | 'paid_ch2__work_focus_priority'
  | 'paid_ch2__work_focus_pace'
  | 'paid_ch2__work_focus_boundary'
  | 'paid_ch2__decision_friction_too_many'
  | 'paid_ch2__decision_friction_unclear_end'
  | 'paid_ch2__decision_friction_fear_mistake'
  | 'paid_ch3__relation_focus_words'
  | 'paid_ch3__relation_focus_timing'
  | 'paid_ch3__relation_focus_recovery'
  | 'paid_ch4__fatigue_signal_after_push'
  | 'paid_ch4__fatigue_signal_before_start'
  | 'paid_ch4__fatigue_signal_long_stretch'
  | 'paid_ch4__recovery_sequence_pause_first'
  | 'paid_ch4__recovery_sequence_small_start'
  | 'paid_ch4__recovery_sequence_sort_materials'
  | 'paid_ch4__restart_condition_overview_first'
  | 'paid_ch4__restart_condition_shrink_scope'
  | 'paid_ch4__restart_condition_trusted_support';

export type RootEvidenceLineageV1 =
  | 'DOB_BASELINE_ROOT'
  | 'QUESTIONNAIRE_AXIS_ROOT'
  | 'QUESTIONNAIRE_THEME_ROOT'
  | 'CROSS_AXIS_AGGREGATE_ROOT'
  | 'DERIVED_RELATION'
  | 'DERIVED_CONTEXT'
  | 'DERIVED_FREE_PICK';

export type SelectorCategoryV1 =
  | 'strain'
  | 'recovery'
  | 'free_block'
  | 'paid_chapter_emphasis';

export type FreeBlockRoleV1 =
  | 'intro'
  | 'dob_baseline'
  | 'current_expression'
  | 'primary_theme'
  | 'align_diverge'
  | 'strain'
  | 'recovery'
  | 'paid_depth_point';

export type SuppressionRuleIdV1 =
  | 'SUPPRESS_SAME_LINEAGE_DOUBLE_COUNT'
  | 'SUPPRESS_FREE_PICK_AS_EVIDENCE'
  | 'SUPPRESS_SAME_AXIS_REACTIVE_CONTEXT'
  | 'SUPPRESS_DIVERGE_ONLY_STRAIN'
  | 'SUPPRESS_ALIGN_ONLY_STRAIN'
  | 'SUPPRESS_THEME_ONLY'
  | 'SUPPRESS_REPLY_AFFINITY_ONLY'
  | 'SUPPRESS_STRAIN_CH4_DUP'
  | 'SUPPRESS_RECOVERY_CONTRA'
  | 'SUPPRESS_COMMERCE_INTENT'
  | 'SUPPRESS_CROSS_CHAPTER_DUP';

export type IndividualizationSelectorBundleV1 = {
  version: typeof INDIVIDUALIZATION_SELECTOR_VERSION_V1;
  strainSelectorIds: readonly StrainSelectorIdV1[];
  recoverySelectorIds: readonly RecoverySelectorIdV1[];
  freeBlockSelectorIds: readonly FreeBlockSelectorIdV1[];
  paidChapterEmphasisIds: Readonly<{
    chapter1: readonly PaidChapterEmphasisIdV1[];
    chapter2: readonly PaidChapterEmphasisIdV1[];
    chapter3: readonly PaidChapterEmphasisIdV1[];
    chapter4: readonly PaidChapterEmphasisIdV1[];
  }>;
};
