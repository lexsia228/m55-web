/**
 * M55 Asset-First Commercial SSOT — machine-readable asset ledger.
 * References canonical owners; does not duplicate source text.
 */
import { M55_ASSET_LEDGER_VERSION, type AssetLedgerEntry } from './types';

const APPROVAL = 'M55_COMMERCIAL_QUALITY_CONTRACT + ECP v2 Human review baseline';

function canonical(
  assetKey: string,
  domain: AssetLedgerEntry['domain'],
  sourcePath: string,
  sourceSymbol: string,
  meaning: string,
  surfaces: readonly string[],
  deps: readonly string[] = [],
): AssetLedgerEntry {
  return {
    assetKey,
    classification: 'CANONICAL',
    domain,
    sourcePath,
    sourceSymbol,
    humanApprovalRef: APPROVAL,
    intendedMeaning: meaning,
    permittedSurfaces: surfaces,
    prohibitedSurfaces: ['unregistered_route'],
    derivationParents: [],
    productTruthDeps: deps,
    privacy: 'public',
    compatibility: 'active',
    replacementKey: null,
    verifierRules: ['ledger.classified', 'ledger.source_resolves'],
    assetVersion: '1',
  };
}

function derived(
  assetKey: string,
  domain: AssetLedgerEntry['domain'],
  sourcePath: string,
  sourceSymbol: string,
  meaning: string,
  parents: readonly string[],
  surfaces: readonly string[],
): AssetLedgerEntry {
  return {
    assetKey,
    classification: 'DERIVED',
    domain,
    sourcePath,
    sourceSymbol,
    humanApprovalRef: APPROVAL,
    intendedMeaning: meaning,
    permittedSurfaces: surfaces,
    prohibitedSurfaces: ['paid_body_before_purchase'],
    derivationParents: [...parents],
    productTruthDeps: [],
    privacy: 'public',
    compatibility: 'active',
    replacementKey: null,
    verifierRules: ['ledger.derived_has_parents'],
    assetVersion: '1',
  };
}

function legacy(
  assetKey: string,
  domain: AssetLedgerEntry['domain'],
  sourcePath: string,
  sourceSymbol: string,
  meaning: string,
  replacement: string,
): AssetLedgerEntry {
  return {
    assetKey,
    classification: 'LEGACY',
    domain,
    sourcePath,
    sourceSymbol,
    humanApprovalRef: 'immutable_snapshot_compat',
    intendedMeaning: meaning,
    permittedSurfaces: ['purchased_snapshot_readonly'],
    prohibitedSurfaces: ['new_ui', 'new_questionnaire'],
    derivationParents: [],
    productTruthDeps: [],
    privacy: 'purchased_private',
    compatibility: 'legacy_readonly',
    replacementKey: replacement,
    verifierRules: ['ledger.legacy_not_in_new_ui'],
    assetVersion: '1',
  };
}

function rejected(assetKey: string, meaning: string, replacement: string): AssetLedgerEntry {
  return {
    assetKey,
    classification: 'REJECTED',
    domain: 'premium_questions',
    sourcePath: 'lib/m55/commercialUx/assetLedger/assetLedger.ts',
    sourceSymbol: assetKey,
    humanApprovalRef: 'asset-first-cutover-v1',
    intendedMeaning: meaning,
    permittedSurfaces: [],
    prohibitedSurfaces: ['all_governed_ui'],
    derivationParents: [],
    productTruthDeps: [],
    privacy: 'internal_only',
    compatibility: 'deprecated_ui',
    replacementKey: replacement,
    verifierRules: ['ledger.rejected_not_rendered'],
    assetVersion: '1',
  };
}

export const M55_ASSET_LEDGER: readonly AssetLedgerEntry[] = [
  canonical(
    'terminology.core',
    'terminology',
    'lib/m55/commercialUx/terminology.ts',
    'M55_COMMERCIAL_TERMINOLOGY',
    'Canonical user-facing product and action labels',
    ['home', 'core', 'dtr/lp', 'pricing', 'share'],
  ),
  canonical(
    'terminology.premium_product',
    'terminology',
    'lib/m55/commercialUx/terminology.ts',
    'premiumProduct',
    'User-facing product name: プレミアムレポート',
    ['all_governed_commercial'],
  ),
  canonical(
    'terminology.ten_qualities',
    'terminology',
    'lib/m55/commercialUx/terminology.ts',
    'trait',
    'Ten-trait public label',
    ['ten-views', 'home', 'core', 'share'],
  ),
  canonical(
    'fence.free',
    'commercial_fence',
    'lib/m55/commercialUx/assetLedger/commercialFence.ts',
    'M55_COMMERCIAL_FENCE.free',
    'Free commercial boundary',
    ['home', 'core', 'dtr/lp', 'pricing'],
  ),
  canonical(
    'fence.premium',
    'commercial_fence',
    'lib/m55/commercialUx/assetLedger/commercialFence.ts',
    'M55_COMMERCIAL_FENCE.premium',
    'Premium commercial boundary',
    ['core', 'dtr/lp', 'pricing', 'plan', 'checkout'],
  ),
  canonical(
    'trait.identity',
    'trait_identity',
    'lib/m55/commercialUx/traitIdentityCatalog.ts',
    'TRAIT_IDENTITY_CATALOG',
    'Ten trait identity chain',
    ['core', 'share', 'og', 'dtr/lp'],
  ),
  canonical(
    'trait.share_statement',
    'trait_identity',
    'lib/m55/commercialUx/traitIdentityCatalog.ts',
    'shareStatement',
    'Privacy-safe share recognition line per trait',
    ['share', 'og'],
  ),
  canonical(
    'free.questionnaire',
    'free_result',
    'lib/m55/freeResult/questionnaireCopyV1.ts',
    'FREE_QUESTIONNAIRE_COPY_V1',
    'Five free self-understanding questions',
    ['core'],
  ),
  canonical(
    'free.result',
    'free_result',
    'lib/m55/freeResult/guestFreeJourneyCopyV1.ts',
    'GUEST_FREE_JOURNEY_COPY_V1',
    'Free result journey copy',
    ['core'],
  ),
  canonical(
    'free.save',
    'free_result',
    'lib/m55/commercialUx/terminology.ts',
    'saveResult',
    'Save same result without repeating work',
    ['core'],
  ),
  canonical(
    'free.funnel',
    'free_result',
    'lib/m55/commercialUx/experience/pageContent/freeFunnelCopy.ts',
    'FREE_FUNNEL_PAGE_CONTENT',
    'Free funnel surface copy',
    ['core', 'dtr/lp'],
  ),
  canonical(
    'premium.questionnaire',
    'premium_questions',
    'lib/m55/paidResult/questionnaireCopyV1.ts',
    'PAID_QUESTIONNAIRE_COPY_V1',
    'Six premium self-understanding questions',
    ['dtr/lp'],
  ),
  canonical(
    'individualization.paid_depth',
    'individualization',
    'lib/m55/individualization/paidDepthV1.ts',
    'buildPaidDepthV1',
    'Paid answer → chapter bias mapping',
    ['report_generation'],
  ),
  canonical(
    'individualization.recovery_selector_catalog',
    'individualization',
    'lib/m55/individualization/individualizationSelectorCatalogV1.ts',
    'RECOVERY_SELECTOR_CATALOG_V1',
    'Recovery sequence selector catalog',
    ['report_generation'],
  ),
  canonical(
    'individualization.paid_chapter_emphasis_ch4',
    'individualization',
    'lib/m55/individualization/individualizationSelectorCatalogV1.ts',
    'paid_ch4__*',
    'Chapter IV paid emphasis selectors',
    ['report_generation'],
  ),
  canonical(
    'individualization.signals',
    'individualization',
    'lib/m55/individualization/signalsV1.ts',
    'buildHesitationV1',
    'Hesitation and reactive context signals',
    ['report_generation'],
  ),
  canonical(
    'individualization.reply_affinity',
    'individualization',
    'lib/m55/individualization/replyAffinityV1.ts',
    'buildReplyAffinityV1',
    'Theme affinity from answers',
    ['report_generation'],
  ),
  canonical(
    'individualization.paid_report_internal',
    'individualization',
    'lib/m55/paidDtrProductCopy.ts',
    'PAID_DTR_*',
    'Purchased report internal editorial (not pre-purchase UI)',
    ['purchased.reader'],
  ),
  canonical(
    'product_truth.light',
    'product_truth',
    'lib/m55/contracts/m55CommercialFunnelContract.ts',
    'selfPremiumLight',
    'Light ¥1,000 + 1 additional reading',
    ['pricing', 'plan'],
    ['selfPremiumLight'],
  ),
  canonical(
    'product_truth.full',
    'product_truth',
    'lib/m55/contracts/m55CommercialFunnelContract.ts',
    'selfPremiumFull',
    'Full ¥1,480 + 5 additional readings',
    ['pricing', 'plan'],
    ['selfPremiumFull'],
  ),
  canonical(
    'product_truth.upgrade',
    'product_truth',
    'lib/m55/commercialUx/planComparison.ts',
    'upgradePriceJpy',
    'Light→Full upgrade ¥600; later total ¥1,600',
    ['plan', 'checkout'],
  ),
  canonical(
    'product_truth.pricing',
    'product_truth',
    'lib/m55/commercialUx/planComparison.ts',
    'buildPlanComparisonModel',
    'Unified plan comparison model',
    ['pricing', 'plan', 'checkout'],
  ),
  canonical(
    'safety.non_diagnostic',
    'safety',
    'components/core/corePublicCopy.ts',
    'STATIC_FREE_TO_PAID_BRIDGE.safetyNote',
    'Non-diagnostic non-guarantee safety note',
    ['core', 'dtr/lp', 'checkout'],
  ),
  canonical(
    'safety.privacy',
    'safety',
    'lib/m55/freeResult/privacySafeShareCardV1.ts',
    'SHARE_UI_COPY_V1',
    'Privacy-safe share boundaries',
    ['share'],
  ),
  canonical(
    'safety.legal',
    'safety',
    'app/legal',
    'legal_pages',
    'Legal/support commercial proximity copy',
    ['legal', 'support'],
  ),
  canonical(
    'share.card',
    'sharing',
    'lib/m55/freeResult/privacySafeShareCardV1.ts',
    'buildPrivacySafeShareCardV1',
    'Privacy-safe share card per trait',
    ['share', 'shared.entry', 'og'],
  ),
  canonical(
    'premium.funnel',
    'premium_funnel',
    'lib/m55/commercialUx/experience/pageContent/premiumFunnelCopy.ts',
    'PREMIUM_FUNNEL_PAGE_CONTENT',
    'Premium funnel chrome copy',
    ['dtr/lp', 'checkout'],
  ),
  derived(
    'bridge.locked_preview',
    'premium_funnel',
    'components/core/corePublicCopy.ts',
    'STATIC_FREE_TO_PAID_BRIDGE',
    'Locked premium preview headings from fence + trait',
    ['fence.premium', 'trait.identity'],
    ['core', 'dtr/lp'],
  ),
  derived(
    'plan.comparison_surface',
    'plan_pricing',
    'lib/m55/commercialUx/planComparison.ts',
    'buildPlanComparisonModel',
    'User-facing Light/Full comparison',
    ['product_truth.light', 'product_truth.full', 'terminology.premium_product'],
    ['pricing', 'plan', 'checkout', 'home'],
  ),
  derived(
    'home.premium_section',
    'premium_funnel',
    'lib/m55/topFreeEntryPublicCopy.ts',
    'TOP_FREE_ENTRY_PUBLIC_COPY.home',
    'Home premium value section below frozen poster',
    ['fence.free', 'fence.premium', 'plan.comparison_surface'],
    ['home'],
  ),
  derived(
    'print.summary',
    'print',
    'components/home/HomePrintSummary.tsx',
    'HomePrintSummary',
    'Print brochure derived from fence + plan facts',
    ['fence.free', 'fence.premium', 'plan.comparison_surface'],
    ['home', 'core', 'dtr/lp'],
  ),
  legacy(
    'premium.question.report_usage',
    'premium_questions',
    'lib/m55/commercialUx/assetLedger/legacyPaidQuestionAdapter.ts',
    'paid.report_usage',
    'Legacy reading-usage preference question',
    'premium.question.recovery_sequence',
  ),
  legacy(
    'premium.question.reading_style',
    'premium_questions',
    'lib/m55/commercialUx/assetLedger/legacyPaidQuestionAdapter.ts',
    'paid.reading_style',
    'Legacy content-entry style preference question',
    'premium.question.restart_condition',
  ),
  legacy(
    'copy.internal_four_chapter',
    'premium_funnel',
    'lib/m55/paidDtrProductCopy.ts',
    'PAID_DTR_LP',
    'Internal purchased-report chapter structure labels',
    'terminology.premium_product',
  ),
  rejected(
    'premium.question.reading_preference',
    'User reading/presentation preference as product question',
    'premium.question.recovery_sequence',
  ),
  rejected(
    'premium.question.section_order',
    'User section/chapter order preference',
    'premium.question.restart_condition',
  ),
  rejected(
    'social.automatic_posting',
    'Background social publication without user action',
    'share.card',
  ),
] as const;

export { M55_ASSET_LEDGER_VERSION };

export function ledgerEntry(assetKey: string): AssetLedgerEntry | undefined {
  return M55_ASSET_LEDGER.find((e) => e.assetKey === assetKey);
}

export function assertAssetLedgerComplete(): void {
  const keys = new Set(M55_ASSET_LEDGER.map((e) => e.assetKey));
  if (keys.size !== M55_ASSET_LEDGER.length) {
    throw new Error('duplicate asset keys in ledger');
  }
  for (const entry of M55_ASSET_LEDGER) {
    if (entry.classification === 'DERIVED' && entry.derivationParents.length === 0) {
      throw new Error(`DERIVED ${entry.assetKey} missing parents`);
    }
    if (entry.classification === 'REJECTED' && entry.permittedSurfaces.length > 0) {
      throw new Error(`REJECTED ${entry.assetKey} must not permit surfaces`);
    }
  }
}

export function countByClassification(): Record<
  AssetLedgerEntry['classification'],
  number
> {
  const out = { CANONICAL: 0, DERIVED: 0, LEGACY: 0, REJECTED: 0 };
  for (const e of M55_ASSET_LEDGER) out[e.classification] += 1;
  return out;
}
