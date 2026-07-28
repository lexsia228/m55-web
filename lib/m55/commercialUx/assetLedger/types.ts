/**
 * M55 Asset-First Commercial SSOT — ledger types.
 * Reference canonical owners; do not duplicate source text here.
 */

export const M55_ASSET_LEDGER_VERSION = 'asset-ledger-v1' as const;

export type AssetClassification = 'CANONICAL' | 'DERIVED' | 'LEGACY' | 'REJECTED';

export type AssetDomain =
  | 'terminology'
  | 'commercial_fence'
  | 'trait_identity'
  | 'free_result'
  | 'premium_funnel'
  | 'premium_questions'
  | 'plan_pricing'
  | 'product_truth'
  | 'sharing'
  | 'safety'
  | 'individualization'
  | 'navigation'
  | 'print'
  | 'og';

export type AssetPrivacyClass =
  | 'public'
  | 'privacy_safe_share'
  | 'guest_session'
  | 'authenticated'
  | 'purchased_private'
  | 'internal_only';

export type AssetCompatibilityStatus =
  | 'active'
  | 'legacy_readonly'
  | 'deprecated_ui'
  | 'frozen';

export type AssetLedgerEntry = {
  assetKey: string;
  classification: AssetClassification;
  domain: AssetDomain;
  sourcePath: string;
  sourceSymbol: string;
  humanApprovalRef: string;
  intendedMeaning: string;
  permittedSurfaces: readonly string[];
  prohibitedSurfaces: readonly string[];
  derivationParents: readonly string[];
  productTruthDeps: readonly string[];
  privacy: AssetPrivacyClass;
  compatibility: AssetCompatibilityStatus;
  replacementKey: string | null;
  verifierRules: readonly string[];
  assetVersion: string;
};

export type DerivationRule = {
  derivedKey: string;
  parentKeys: readonly string[];
  allowedTransforms: readonly ('shorten' | 'reorder' | 'cta_state' | 'privacy_strip' | 'recipient_grammar')[];
  forbiddenTransforms: readonly string[];
};

export type PremiumQuestionContract = {
  questionId: string;
  axis: string;
  questionJa: string;
  optionIds: readonly string[];
  reviewLabelJa: string;
  userInsightPurpose: string;
  reportEffect: string;
  canonicalAssetKeys: readonly string[];
  compatibilityPolicy: string;
};
