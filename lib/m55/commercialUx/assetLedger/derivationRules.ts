/**
 * Typed derivation rules — DERIVED assets must declare CANONICAL parents.
 */
import type { DerivationRule } from './types';

export const M55_ASSET_DERIVATION_RULES: readonly DerivationRule[] = [
  {
    derivedKey: 'fence.bridge_supporting',
    parentKeys: ['fence.free', 'fence.premium'],
    allowedTransforms: ['shorten', 'reorder'],
    forbiddenTransforms: ['new_diagnosis', 'price_change', 'weaken_free'],
  },
  {
    derivedKey: 'bridge.locked_preview',
    parentKeys: ['fence.premium', 'trait.identity'],
    allowedTransforms: ['shorten', 'privacy_strip'],
    forbiddenTransforms: ['paid_body_exposure', 'new_diagnosis'],
  },
  {
    derivedKey: 'plan.comparison_surface',
    parentKeys: ['product_truth.light', 'product_truth.full', 'terminology.premium_product'],
    allowedTransforms: ['shorten', 'reorder'],
    forbiddenTransforms: ['price_change', 'chapter_count_as_benefit'],
  },
  {
    derivedKey: 'share.card',
    parentKeys: ['trait.identity', 'trait.share_statement'],
    allowedTransforms: ['shorten', 'privacy_strip', 'recipient_grammar'],
    forbiddenTransforms: ['dob_exposure', 'answer_exposure', 'purchase_status'],
  },
  {
    derivedKey: 'home.premium_section',
    parentKeys: ['fence.free', 'fence.premium', 'plan.comparison_surface'],
    allowedTransforms: ['shorten', 'reorder', 'cta_state'],
    forbiddenTransforms: ['chapter_count_as_benefit', 'weaken_free'],
  },
  {
    derivedKey: 'print.summary',
    parentKeys: ['fence.free', 'fence.premium', 'terminology.premium_product'],
    allowedTransforms: ['shorten', 'reorder'],
    forbiddenTransforms: ['paid_body_exposure', 'private_data'],
  },
] as const;
