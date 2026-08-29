/**
 * M55 governed copy inventory for Japanese commercial comprehension baseline.
 * Imports existing authority modules only — does not restate product copy as authority.
 */

import { RELATION_STATUS_CATALOG, RELATION_STATUS_IDS } from '../../compatibility/pairReadingCatalog.v1';
import { questionsForRelationStage } from '../../compatibility/currentContextContract.v2';
import { PAIR_SHARE_UI_COPY } from '../../compatibility/privacySafePairShare';
import {
  M55_COMMERCIAL_PRODUCTS,
  M55_CURRENT_RUNTIME_STATE,
  M55_LEGACY_RUNTIME_DEBT,
} from '../../contracts/m55CommercialFunnelContract';
import { FREE_QUESTIONNAIRE_COPY_V1, FREE_AXIS_EYEBROW_SUFFIX_JA, FREE_QUESTION_HELPER_COMPACT_JA, FREE_QUESTION_HELPER_JA } from '../../freeResult/questionnaireCopyV1';
import { PAID_QUESTIONNAIRE_COPY_V1 } from '../../paidResult/questionnaireCopyV1';
import { SHARE_UI_COPY_V1 } from '../../freeResult/privacySafeShareCardV1';
import { TOP_FREE_ENTRY_PUBLIC_COPY } from '../../topFreeEntryPublicCopy';
import { M55_CTA_LABELS, M55_CTA_STATES } from '../experience/experienceCtaState';
import type {
  AiReviewCorpusItem,
  AiReviewRolePolicy,
  CommercialCtaRole,
  CopyRole,
  CtaComprehensionEntry,
  GovernedCopyEntry,
  OptionAxisRegistration,
  ProductDiscoverabilityEntry,
  SurfaceFamily,
} from '../../../commercialQuality/japaneseComprehensionTypes';
import { buildM55OptionAxisRegistrationsFromGovernedSemantics } from './m55JapaneseComprehensionOptionSemantics';
import { buildM55ClosureGovernedCopyEntries } from './m55JapaneseComprehensionClosureSourceAuthority';
import type {
  CtaBindingSpec,
  GovernedCopyBindingSpec,
} from '../../../commercialQuality/japaneseComprehensionRenderedBinding';

function copyEntry(input: {
  copyId: string;
  surfaceId: string;
  runtimeStateId: string;
  surfaceFamily: SurfaceFamily;
  copyRole: CopyRole;
  sourceOwner: string;
  audienceContext: string;
  textRef: string;
  visibleText: string;
  claimAuthority?: string;
}): GovernedCopyEntry {
  return { ...input };
}

export function buildM55GovernedCopyInventory(): readonly GovernedCopyEntry[] {
  const entries: GovernedCopyEntry[] = [];

  const home = TOP_FREE_ENTRY_PUBLIC_COPY.home;
  entries.push(
    copyEntry({
      copyId: 'home.hero.heading',
      surfaceId: 'm55:public.home',
      runtimeStateId: 'home.hero',
      surfaceFamily: 'HOME',
      copyRole: 'HEADING',
      sourceOwner: 'lib/m55/topFreeEntryPublicCopy.ts',
      audienceContext: 'public',
      textRef: 'TOP_FREE_ENTRY_PUBLIC_COPY.home.heroTitleLine1Ja',
      visibleText: `${home.heroTitleLine1Ja}${home.heroTitleLine2Ja}`,
    }),
    copyEntry({
      copyId: 'home.hero.body',
      surfaceId: 'm55:public.home',
      runtimeStateId: 'home.hero',
      surfaceFamily: 'HOME',
      copyRole: 'BODY',
      sourceOwner: 'lib/m55/topFreeEntryPublicCopy.ts',
      audienceContext: 'public',
      textRef: 'TOP_FREE_ENTRY_PUBLIC_COPY.home.heroSupportJa',
      visibleText: home.heroSupportJa,
    }),
    copyEntry({
      copyId: 'home.cta.primary',
      surfaceId: 'm55:public.home',
      runtimeStateId: 'home.hero',
      surfaceFamily: 'HOME',
      copyRole: 'CTA',
      sourceOwner: 'lib/m55/topFreeEntryPublicCopy.ts',
      audienceContext: 'public',
      textRef: 'TOP_FREE_ENTRY_PUBLIC_COPY.cta.openFreeMapJa',
      visibleText: TOP_FREE_ENTRY_PUBLIC_COPY.cta.openFreeMapJa,
    }),
  );

  for (const q of FREE_QUESTIONNAIRE_COPY_V1) {
    entries.push(
      copyEntry({
        copyId: `self.free.short_label.${q.questionId}`,
        surfaceId: 'm55:self.free.questionnaire',
        runtimeStateId: 'self.free.questionnaire',
        surfaceFamily: 'SELF',
        copyRole: 'BODY',
        sourceOwner: 'lib/m55/freeResult/questionnaireCopyV1.ts',
        audienceContext: 'public',
        textRef: `FREE_QUESTIONNAIRE_COPY_V1.${q.questionId}.shortLabelJa`,
        visibleText: `${q.shortLabelJa}${FREE_AXIS_EYEBROW_SUFFIX_JA}`,
      }),
      copyEntry({
        copyId: `self.free.question.${q.questionId}`,
        surfaceId: 'm55:self.free.questionnaire',
        runtimeStateId: 'self.free.questionnaire',
        surfaceFamily: 'SELF',
        copyRole: 'QUESTION',
        sourceOwner: 'lib/m55/freeResult/questionnaireCopyV1.ts',
        audienceContext: 'public',
        textRef: `FREE_QUESTIONNAIRE_COPY_V1.${q.questionId}.questionJa`,
        visibleText: q.questionJa,
      }),
    );
    for (const choice of q.choices) {
      entries.push(
        copyEntry({
          copyId: `self.free.answer.${q.questionId}.${choice.answerId}`,
          surfaceId: 'm55:self.free.questionnaire',
          runtimeStateId: 'self.free.questionnaire',
          surfaceFamily: 'SELF',
          copyRole: 'ANSWER_OPTION',
          sourceOwner: 'lib/m55/freeResult/questionnaireCopyV1.ts',
          audienceContext: 'public',
          textRef: `FREE_QUESTIONNAIRE_COPY_V1.${q.questionId}.choices.${choice.answerId}`,
          visibleText: choice.labelJa,
        }),
      );
    }
  }

  entries.push(
    copyEntry({
      copyId: 'self.free.questionnaire.helper.primary',
      surfaceId: 'm55:self.free.questionnaire',
      runtimeStateId: 'self.free.questionnaire',
      surfaceFamily: 'SELF',
      copyRole: 'BODY',
      sourceOwner: 'lib/m55/freeResult/questionnaireCopyV1.ts',
      audienceContext: 'public',
      textRef: 'FREE_QUESTION_HELPER_JA',
      visibleText: FREE_QUESTION_HELPER_JA,
    }),
    copyEntry({
      copyId: 'self.free.questionnaire.helper.compact',
      surfaceId: 'm55:self.free.questionnaire',
      runtimeStateId: 'self.free.questionnaire',
      surfaceFamily: 'SELF',
      copyRole: 'BODY',
      sourceOwner: 'lib/m55/freeResult/questionnaireCopyV1.ts',
      audienceContext: 'public',
      textRef: 'FREE_QUESTION_HELPER_COMPACT_JA',
      visibleText: FREE_QUESTION_HELPER_COMPACT_JA,
    }),
  );

  for (const q of PAID_QUESTIONNAIRE_COPY_V1) {
    entries.push(
      copyEntry({
        copyId: `self.paid.short_label.${q.questionId}`,
        surfaceId: 'm55:self.premium.questionnaire',
        runtimeStateId: 'self.premium.questionnaire',
        surfaceFamily: 'SELF',
        copyRole: 'BODY',
        sourceOwner: 'lib/m55/paidResult/questionnaireCopyV1.ts',
        audienceContext: 'public',
        textRef: `PAID_QUESTIONNAIRE_COPY_V1.${q.questionId}.shortLabelJa`,
        visibleText: q.shortLabelJa,
      }),
      copyEntry({
        copyId: `self.paid.question.${q.questionId}`,
        surfaceId: 'm55:self.premium.questionnaire',
        runtimeStateId: 'self.premium.questionnaire',
        surfaceFamily: 'SELF',
        copyRole: 'QUESTION',
        sourceOwner: 'lib/m55/paidResult/questionnaireCopyV1.ts',
        audienceContext: 'public',
        textRef: `PAID_QUESTIONNAIRE_COPY_V1.${q.questionId}.questionJa`,
        visibleText: q.questionJa,
      }),
    );
    for (const choice of q.choices) {
      entries.push(
        copyEntry({
          copyId: `self.paid.answer.${q.questionId}.${choice.answerId}`,
          surfaceId: 'm55:self.premium.questionnaire',
          runtimeStateId: 'self.premium.questionnaire',
          surfaceFamily: 'SELF',
          copyRole: 'ANSWER_OPTION',
          sourceOwner: 'lib/m55/paidResult/questionnaireCopyV1.ts',
          audienceContext: 'public',
          textRef: `PAID_QUESTIONNAIRE_COPY_V1.${q.questionId}.choices.${choice.answerId}`,
          visibleText: choice.labelJa,
        }),
      );
    }
  }

  for (const [key, product] of Object.entries(M55_COMMERCIAL_PRODUCTS)) {
    const pricePresentationJa =
      product.priceJpy == null ? '無料' : `¥${product.priceJpy.toLocaleString('ja-JP')}（税込）`;
    entries.push(
      copyEntry({
        copyId: `product.name.${product.productKey}`,
        surfaceId: 'm55:shared.merchandise',
        runtimeStateId: 'shared.merchandise.catalog',
        surfaceFamily: 'SHARED',
        copyRole: 'PRODUCT_NAME',
        sourceOwner: 'lib/m55/contracts/m55CommercialFunnelContract.ts',
        audienceContext: 'public',
        textRef: `M55_COMMERCIAL_PRODUCTS.${key}.publicName`,
        visibleText: product.publicName,
        claimAuthority: 'product_truth',
      }),
      copyEntry({
        copyId: `product.price.${product.productKey}`,
        surfaceId: 'm55:shared.merchandise',
        runtimeStateId: 'shared.merchandise.catalog',
        surfaceFamily: 'SHARED',
        copyRole: 'PRICE_PRESENTATION',
        sourceOwner: 'lib/m55/contracts/m55CommercialFunnelContract.ts',
        audienceContext: 'public',
        textRef: `M55_COMMERCIAL_PRODUCTS.${key}.priceJpy`,
        visibleText: pricePresentationJa,
        claimAuthority: 'product_truth',
      }),
    );
    product.benefits.forEach((benefit, index) => {
      entries.push(
        copyEntry({
          copyId: `product.value.${product.productKey}.${index}`,
          surfaceId: 'm55:shared.merchandise',
          runtimeStateId: 'shared.merchandise.catalog',
          surfaceFamily: 'SHARED',
          copyRole: 'PRODUCT_VALUE',
          sourceOwner: 'lib/m55/contracts/m55CommercialFunnelContract.ts',
          audienceContext: 'public',
          textRef: `M55_COMMERCIAL_PRODUCTS.${key}.benefits[${index}]`,
          visibleText: benefit,
          claimAuthority: 'product_truth',
        }),
      );
    });
  }

  for (const status of RELATION_STATUS_CATALOG) {
    entries.push(
      copyEntry({
        copyId: `pair.relation_stage.${status.id}`,
        surfaceId: 'm55:pair.entry',
        runtimeStateId: `pair.relation_stage.${status.id}`,
        surfaceFamily: 'PAIR',
        copyRole: 'ANSWER_OPTION',
        sourceOwner: 'lib/m55/compatibility/pairReadingCatalog.v1.ts',
        audienceContext: 'public',
        textRef: `RELATION_STATUS_CATALOG.${status.id}.labelJa`,
        visibleText: status.labelJa,
      }),
    );
  }

  for (const stageId of RELATION_STATUS_IDS) {
    const questions = questionsForRelationStage(stageId);
    for (const q of questions) {
      entries.push(
        copyEntry({
          copyId: `pair.question.${stageId}.${q.questionId}`,
          surfaceId: `m55:pair.${stageId}`,
          runtimeStateId: `pair.questionnaire.${stageId}`,
          surfaceFamily: 'PAIR',
          copyRole: 'QUESTION',
          sourceOwner: 'lib/m55/compatibility/currentContextContract.v2.ts',
          audienceContext: 'public',
          textRef: `questionsForRelationStage(${stageId}).${q.questionId}.question`,
          visibleText: q.question,
        }),
      );
      for (const choice of q.choices) {
        entries.push(
          copyEntry({
            copyId: `pair.answer.${stageId}.${q.questionId}.${choice.answerId}`,
            surfaceId: `m55:pair.${stageId}`,
            runtimeStateId: `pair.questionnaire.${stageId}`,
            surfaceFamily: 'PAIR',
            copyRole: 'ANSWER_OPTION',
            sourceOwner: 'lib/m55/compatibility/currentContextContract.v2.ts',
            audienceContext: 'public',
            textRef: `questionsForRelationStage(${stageId}).${q.questionId}.choices.${choice.answerId}`,
            visibleText: choice.label,
          }),
        );
      }
    }
  }

  for (const [key, value] of Object.entries(PAIR_SHARE_UI_COPY)) {
    entries.push(
      copyEntry({
        copyId: `pair.share.${key}`,
        surfaceId: 'm55:pair.free.result',
        runtimeStateId: 'pair.free.share',
        surfaceFamily: 'PAIR',
        copyRole: key === 'bodyJa' ? 'PRIVACY_SAFETY' : key === 'titleJa' ? 'HEADING' : 'CTA',
        sourceOwner: 'lib/m55/compatibility/privacySafePairShare.ts',
        audienceContext: 'public',
        textRef: `PAIR_SHARE_UI_COPY.${key}`,
        visibleText: value,
      }),
    );
  }

  for (const [key, value] of Object.entries(SHARE_UI_COPY_V1)) {
    entries.push(
      copyEntry({
        copyId: `self.share.${key}`,
        surfaceId: 'm55:self.free.result',
        runtimeStateId: 'self.free.share',
        surfaceFamily: 'SELF',
        copyRole: key.includes('body') ? 'PRIVACY_SAFETY' : key.includes('title') ? 'HEADING' : 'CTA',
        sourceOwner: 'lib/m55/freeResult/privacySafeShareCardV1.ts',
        audienceContext: 'public',
        textRef: `SHARE_UI_COPY_V1.${key}`,
        visibleText: value,
      }),
    );
  }

  for (const state of M55_CTA_STATES) {
    const label = M55_CTA_LABELS[state];
    if (!label) continue;
    entries.push(
      copyEntry({
        copyId: `shared.cta.${state}`,
        surfaceId: 'm55:shared.navigation',
        runtimeStateId: 'shared.cta',
        surfaceFamily: 'SHARED',
        copyRole: 'CTA',
        sourceOwner: 'lib/m55/commercialUx/experience/experienceCtaState.ts',
        audienceContext: 'public',
        textRef: `M55_CTA_LABELS.${state}`,
        visibleText: label,
      }),
    );
  }

  entries.push(...buildM55ClosureGovernedCopyEntries());

  return entries;
}

export function buildM55OptionAxisRegistrations(): readonly OptionAxisRegistration[] {
  return buildM55OptionAxisRegistrationsFromGovernedSemantics();
}

export function buildM55CtaComprehensionRegistry(): readonly CtaComprehensionEntry[] {
  const entries: CtaComprehensionEntry[] = [
    {
      ctaId: 'home.start_free',
      surfaceId: 'm55:public.home',
      runtimeStateId: 'home.hero',
      action: TOP_FREE_ENTRY_PUBLIC_COPY.cta.openFreeMapJa,
      userOutcome: 'self_free_entry',
      destinationSuccessState: '/core',
      commercialRole: 'DISCOVERY',
      sourceOwner: 'lib/m55/topFreeEntryPublicCopy.ts',
    },
    {
      ctaId: 'pair.share.native',
      surfaceId: 'm55:pair.free.result',
      runtimeStateId: 'pair.free.share',
      action: PAIR_SHARE_UI_COPY.nativeShareJa,
      userOutcome: 'privacy_safe_link_only',
      destinationSuccessState: '/synastry',
      commercialRole: 'SHARE_TO_PARTNER',
      sourceOwner: 'lib/m55/compatibility/privacySafePairShare.ts',
    },
    {
      ctaId: 'self.share.native',
      surfaceId: 'm55:self.free.result',
      runtimeStateId: 'self.free.share',
      action: SHARE_UI_COPY_V1.nativeShareJa,
      userOutcome: 'privacy_safe_trait_share',
      destinationSuccessState: '/r/:token',
      commercialRole: 'SHARE_TO_SOCIAL',
      sourceOwner: 'lib/m55/freeResult/privacySafeShareCardV1.ts',
    },
  ];

  for (const state of M55_CTA_STATES) {
    const label = M55_CTA_LABELS[state];
    if (!label) continue;
    entries.push({
      ctaId: `shared.cta.${state}`,
      surfaceId: 'm55:shared.navigation',
      runtimeStateId: 'shared.cta',
      action: label,
      userOutcome: mapCtaOutcome(state),
      destinationSuccessState: 'route_dependent',
      commercialRole: mapCtaRole(state),
      sourceOwner: 'lib/m55/commercialUx/experience/experienceCtaState.ts',
    });
  }

  return entries;
}

function mapCtaRole(state: (typeof M55_CTA_STATES)[number]): CommercialCtaRole {
  if (state.includes('PURCHASE') || state.includes('CHECKOUT')) return 'PURCHASE';
  if (state.includes('SHARE')) return 'SHARE_TO_SOCIAL';
  if (state.includes('RECOVER') || state.includes('RESTORE')) return 'RECOVER';
  if (state.includes('OPEN') || state.includes('REPORT')) return 'OPEN_OWNED_REPORT';
  if (state.includes('CONTINUE')) return 'CONTINUE';
  return 'DISCOVERY';
}

function mapCtaOutcome(state: string): string | null {
  if (state.includes('SHARE')) return 'privacy_safe_link_only';
  if (state.includes('PURCHASE')) return 'checkout_started';
  return null;
}

export function buildM55ProductDiscoverabilityRegistry(
  inventory?: readonly GovernedCopyEntry[],
): readonly ProductDiscoverabilityEntry[] {
  const valueCopyIdsByProduct = new Map<string, boolean>();
  if (inventory) {
    for (const entry of inventory) {
      if (entry.copyRole !== 'PRODUCT_VALUE') continue;
      const match = entry.copyId.match(/^product\.value\.([^.]+)\./);
      if (match) valueCopyIdsByProduct.set(match[1]!, true);
    }
  }

  return Object.values(M55_COMMERCIAL_PRODUCTS).map((product) => {
    const isPairPremium = product.productKey === M55_COMMERCIAL_PRODUCTS.pairPremium.productKey;
    const discoverySurfaces: string[] = [];
    if (product.productKey === M55_COMMERCIAL_PRODUCTS.selfPremiumLight.productKey) {
      discoverySurfaces.push('m55:ecp.premium_light', 'm55:public.home');
    }
    if (product.productKey === M55_COMMERCIAL_PRODUCTS.selfPremiumFull.productKey) {
      discoverySurfaces.push('m55:ecp.premium_full', 'm55:public.home');
    }
    if (isPairPremium) {
      if (!M55_CURRENT_RUNTIME_STATE.pairPremium.homePaidCtaVisible) {
        discoverySurfaces.push('m55:pair.bridge_only');
      } else {
        discoverySurfaces.push('m55:public.home', 'm55:pair.merchandise');
      }
    }
    if (product.productKey === M55_COMMERCIAL_PRODUCTS.selfFree.productKey) {
      discoverySurfaces.push('m55:public.home', 'm55:ecp.self_free');
    }
    if (product.productKey === M55_COMMERCIAL_PRODUCTS.pairFree.productKey) {
      discoverySurfaces.push('m55:pair.entry', 'm55:public.home');
    }

    return {
      productKey: product.productKey,
      productFamily: product.purpose,
      valuePropositionPresent:
        valueCopyIdsByProduct.has(product.productKey) ||
        product.benefits.some((benefit) => Boolean(benefit.trim())),
      pricePresentationPresent: product.priceJpy != null || product.purchaseType === 'none',
      purchaseType: product.purchaseType,
      discoverySurfaces,
      nextAction: discoverySurfaces[0] ?? null,
      contextualPrerequisiteRequired: isPairPremium,
      firstClassMerchandise: isPairPremium
        ? product.showHomePaidCta && M55_CURRENT_RUNTIME_STATE.pairPremium.homePaidCtaVisible
        : discoverySurfaces.length > 0,
    };
  });
}

const AI_RUBRIC = [
  '普通の日本語として一読で意味が取れるか',
  '主語・対象・時間軸を推測しなくてよいか',
  'ユーザーが何を答えればよいか分かるか',
  '前提となる出来事が実際に存在しうるか',
  '選択肢の軸が揃っているか',
  '結果文が抽象的すぎないか',
  'CTAを押す価値が分かるか',
  '有料商品の価値が理解できるか',
  '不自然な機械翻訳調・作者都合の表現がないか',
] as const;

const AI_REVIEW_ROLE_POLICIES: Record<CopyRole, AiReviewRolePolicy> = {
  HEADING: 'AI_REQUIRED',
  BODY: 'AI_REQUIRED',
  QUESTION: 'AI_REQUIRED',
  ANSWER_OPTION: 'AI_REQUIRED',
  CTA: 'AI_REQUIRED',
  PRODUCT_NAME: 'DETERMINISTIC_ONLY_WITH_REASON',
  PRODUCT_VALUE: 'AI_REQUIRED',
  PRICE_PRESENTATION: 'DETERMINISTIC_ONLY_WITH_REASON',
  HELP: 'AI_REQUIRED',
  VALIDATION: 'AI_REQUIRED',
  ERROR: 'AI_REQUIRED',
  EMPTY: 'AI_REQUIRED',
  LOADING: 'AI_REQUIRED',
  RECOVERY: 'AI_REQUIRED',
  SHARE_MOTIVATION: 'AI_REQUIRED',
  PRIVACY_SAFETY: 'AI_REQUIRED',
};

export function buildM55AiReviewCorpus(
  inventory: readonly GovernedCopyEntry[],
): readonly AiReviewCorpusItem[] {
  const governedRoles = new Set(Object.keys(AI_REVIEW_ROLE_POLICIES) as CopyRole[]);
  const substantive = inventory.filter((e) => governedRoles.has(e.copyRole));
  return substantive.map((entry) => ({
    reviewUnitId: `ai.${entry.copyId}`,
    copyId: entry.copyId,
    surfaceId: entry.surfaceId,
    runtimeStateId: entry.runtimeStateId,
    currentText: entry.visibleText,
    role: entry.copyRole,
    context: entry.audienceContext,
    reviewPolicy: AI_REVIEW_ROLE_POLICIES[entry.copyRole],
    rubricDimensions: [...AI_RUBRIC],
    requiredOutcome: 'PENDING_AI_REVIEW' as const,
  }));
}

/** Selector-owned DOM bindings for rendered-copy proof (read-only; no product mutation). */
const M55_RENDERED_COPY_SELECTOR_OWNERSHIP: Readonly<
  Record<string, Readonly<Record<string, string>>>
> = {
  'm55:public.home|home.hero': {
    'home.hero.heading': '[data-testid="m55-home-hero-title"]',
    // home.hero.body governs heroSupportJa; poster hero renders heroPosterSupportJa instead.
    'home.cta.primary': '[data-m55-hero-cta="true"]',
  },
};

function resolveM55RenderedCopySelector(
  surfaceId: string,
  runtimeStateId: string,
  copyId: string,
): string | undefined {
  const key = `${surfaceId}|${runtimeStateId}`;
  return M55_RENDERED_COPY_SELECTOR_OWNERSHIP[key]?.[copyId];
}

export function buildM55RenderedBindingSpecs(
  surfaceId: string,
  runtimeStateId: string,
  inventory: readonly GovernedCopyEntry[],
): { expectedCopy: GovernedCopyBindingSpec[]; expectedCtas: CtaBindingSpec[] } {
  const surfaceCopy = inventory.filter(
    (entry) => entry.surfaceId === surfaceId && entry.runtimeStateId === runtimeStateId,
  );
  return {
    expectedCopy: surfaceCopy.map((entry) => ({
      copyId: entry.copyId,
      visibleText: entry.visibleText,
      copyRole: entry.copyRole,
      selector: resolveM55RenderedCopySelector(surfaceId, runtimeStateId, entry.copyId),
    })),
    expectedCtas: surfaceCopy
      .filter((entry) => entry.copyRole === 'CTA')
      .map((entry) => ({
        ctaId: entry.copyId,
        expectedLabel: entry.visibleText,
        selector: resolveM55RenderedCopySelector(surfaceId, runtimeStateId, entry.copyId),
      })),
  };
}

export function buildM55PublicProhibitedTerminology(): ReadonlyArray<{
  id: string;
  pattern: RegExp;
  reason: string;
}> {
  const terms = [
    ...M55_LEGACY_RUNTIME_DEBT.internalOnlyTerms,
    ...M55_LEGACY_RUNTIME_DEBT.legacyPublicTerms,
  ];
  return terms.map((term, index) => ({
    id: `public_prohibited_${index}`,
    pattern: new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
    reason: 'PUBLIC_PROHIBITED_TERM from machine product truth',
  }));
}

export function countInventoryByFamily(inventory: readonly GovernedCopyEntry[]): Record<SurfaceFamily, number> {
  const counts: Record<SurfaceFamily, number> = { HOME: 0, SELF: 0, PAIR: 0, SHARED: 0 };
  for (const entry of inventory) counts[entry.surfaceFamily] += 1;
  return counts;
}
