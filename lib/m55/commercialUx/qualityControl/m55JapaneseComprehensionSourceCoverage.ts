/**
 * Deterministic source-owner coverage manifest with exact identity comparison.
 */

import { RELATION_STATUS_CATALOG, RELATION_STATUS_IDS } from '../../compatibility/pairReadingCatalog.v1';
import { questionsForRelationStage } from '../../compatibility/currentContextContract.v2';
import { PAIR_SHARE_UI_COPY } from '../../compatibility/privacySafePairShare';
import { M55_COMMERCIAL_PRODUCTS } from '../../contracts/m55CommercialFunnelContract';
import { FREE_QUESTIONNAIRE_COPY_V1, FREE_AXIS_EYEBROW_SUFFIX_JA, FREE_QUESTION_HELPER_COMPACT_JA, FREE_QUESTION_HELPER_JA } from '../../freeResult/questionnaireCopyV1';
import { PAID_QUESTIONNAIRE_COPY_V1 } from '../../paidResult/questionnaireCopyV1';
import { SHARE_UI_COPY_V1 } from '../../freeResult/privacySafeShareCardV1';
import { TOP_FREE_ENTRY_PUBLIC_COPY } from '../../topFreeEntryPublicCopy';
import { M55_CTA_LABELS, M55_CTA_STATES } from '../experience/experienceCtaState';
import type {
  GovernedCopyEntry,
  SourceDomainCoverageSummary,
  SourceIdentityCoverageSummary,
  UnexpectedIdentityClassification,
  UnexpectedIdentityEntry,
} from '../../../commercialQuality/japaneseComprehensionTypes';
import {
  buildM55ClosureSourceIdentities,
  buildSourceIdentityFingerprint,
  M55_CLOSURE_PLACEHOLDER_DOMAIN_IDS,
} from './m55JapaneseComprehensionClosureSourceAuthority';

export type SourceCopyIdentity = {
  domainId: string;
  sourceOwner: string;
  sourceExport: string;
  sourceItemId: string;
  expectedCopyId: string;
  textRef: string;
  sourceFingerprint: string;
};

export type SourceDomainStatus =
  | 'PRESENT_COVERED'
  | 'PRESENT_UNGOVERNED'
  | 'ABSENT_BY_DESIGN_WITH_AUTHORITY_EVIDENCE'
  | 'MISSING';

export type SourceDomainSpec = {
  domainId: string;
  sourceOwner: string | null;
  extractionStrategy: string;
  userVisibleCopyExists?: boolean;
  provenAbsentByDesignAuthorityEvidence?: string;
  extractIdentities: () => readonly SourceCopyIdentity[];
};

function identityFingerprint(parts: {
  sourceOwner: string;
  sourceExport: string;
  sourceItemId: string;
  expectedCopyId: string;
  textRef: string;
  visibleText?: string;
}): string {
  return buildSourceIdentityFingerprint(parts);
}

function closureIdentitiesForDomain(domainId: string): SourceCopyIdentity[] {
  return buildM55ClosureSourceIdentities().filter((identity) => identity.domainId === domainId);
}

function inventoryFingerprintForIdentity(entry: GovernedCopyEntry, identity: SourceCopyIdentity): string {
  return identityFingerprint({
    sourceOwner: entry.sourceOwner,
    sourceExport: identity.sourceExport,
    sourceItemId: identity.sourceItemId,
    expectedCopyId: entry.copyId,
    textRef: entry.textRef,
    visibleText: entry.visibleText,
  });
}

function homeIdentities(): SourceCopyIdentity[] {
  const owner = 'lib/m55/topFreeEntryPublicCopy.ts';
  const home = TOP_FREE_ENTRY_PUBLIC_COPY.home;
  return [
    {
      domainId: 'home.entry.hero.discovery',
      sourceOwner: owner,
      sourceExport: 'TOP_FREE_ENTRY_PUBLIC_COPY.home',
      sourceItemId: 'heroTitleLine1Ja+heroTitleLine2Ja',
      expectedCopyId: 'home.hero.heading',
      textRef: 'TOP_FREE_ENTRY_PUBLIC_COPY.home.heroTitleLine1Ja',
      sourceFingerprint: identityFingerprint({
        sourceOwner: owner,
        sourceExport: 'TOP_FREE_ENTRY_PUBLIC_COPY.home',
        sourceItemId: 'heroTitleLine1Ja+heroTitleLine2Ja',
        expectedCopyId: 'home.hero.heading',
        textRef: 'TOP_FREE_ENTRY_PUBLIC_COPY.home.heroTitleLine1Ja',
        visibleText: `${home.heroTitleLine1Ja}${home.heroTitleLine2Ja}`,
      }),
    },
    {
      domainId: 'home.entry.hero.discovery',
      sourceOwner: owner,
      sourceExport: 'TOP_FREE_ENTRY_PUBLIC_COPY.home',
      sourceItemId: 'heroSupportJa',
      expectedCopyId: 'home.hero.body',
      textRef: 'TOP_FREE_ENTRY_PUBLIC_COPY.home.heroSupportJa',
      sourceFingerprint: identityFingerprint({
        sourceOwner: owner,
        sourceExport: 'TOP_FREE_ENTRY_PUBLIC_COPY.home',
        sourceItemId: 'heroSupportJa',
        expectedCopyId: 'home.hero.body',
        textRef: 'TOP_FREE_ENTRY_PUBLIC_COPY.home.heroSupportJa',
        visibleText: home.heroSupportJa,
      }),
    },
    {
      domainId: 'home.entry.hero.discovery',
      sourceOwner: owner,
      sourceExport: 'TOP_FREE_ENTRY_PUBLIC_COPY.cta',
      sourceItemId: 'openFreeMapJa',
      expectedCopyId: 'home.cta.primary',
      textRef: 'TOP_FREE_ENTRY_PUBLIC_COPY.cta.openFreeMapJa',
      sourceFingerprint: identityFingerprint({
        sourceOwner: owner,
        sourceExport: 'TOP_FREE_ENTRY_PUBLIC_COPY.cta',
        sourceItemId: 'openFreeMapJa',
        expectedCopyId: 'home.cta.primary',
        textRef: 'TOP_FREE_ENTRY_PUBLIC_COPY.cta.openFreeMapJa',
        visibleText: TOP_FREE_ENTRY_PUBLIC_COPY.cta.openFreeMapJa,
      }),
    },
  ];
}

function selfQuestionnaireIdentities(): SourceCopyIdentity[] {
  const owner = 'lib/m55/freeResult/questionnaireCopyV1.ts';
  const identities: SourceCopyIdentity[] = [];
  for (const q of FREE_QUESTIONNAIRE_COPY_V1) {
    identities.push({
      domainId: 'self.questionnaire.answers',
      sourceOwner: owner,
      sourceExport: 'FREE_QUESTIONNAIRE_COPY_V1',
      sourceItemId: `shortLabel.${q.questionId}`,
      expectedCopyId: `self.free.short_label.${q.questionId}`,
      textRef: `FREE_QUESTIONNAIRE_COPY_V1.${q.questionId}.shortLabelJa`,
      sourceFingerprint: identityFingerprint({
        sourceOwner: owner,
        sourceExport: 'FREE_QUESTIONNAIRE_COPY_V1',
        sourceItemId: `shortLabel.${q.questionId}`,
        expectedCopyId: `self.free.short_label.${q.questionId}`,
        textRef: `FREE_QUESTIONNAIRE_COPY_V1.${q.questionId}.shortLabelJa`,
        visibleText: `${q.shortLabelJa}${FREE_AXIS_EYEBROW_SUFFIX_JA}`,
      }),
    });
    identities.push({
      domainId: 'self.questionnaire.answers',
      sourceOwner: owner,
      sourceExport: 'FREE_QUESTIONNAIRE_COPY_V1',
      sourceItemId: `question.${q.questionId}`,
      expectedCopyId: `self.free.question.${q.questionId}`,
      textRef: `FREE_QUESTIONNAIRE_COPY_V1.${q.questionId}.questionJa`,
      sourceFingerprint: identityFingerprint({
        sourceOwner: owner,
        sourceExport: 'FREE_QUESTIONNAIRE_COPY_V1',
        sourceItemId: `question.${q.questionId}`,
        expectedCopyId: `self.free.question.${q.questionId}`,
        textRef: `FREE_QUESTIONNAIRE_COPY_V1.${q.questionId}.questionJa`,
        visibleText: q.questionJa,
      }),
    });
    for (const choice of q.choices) {
      identities.push({
        domainId: 'self.questionnaire.answers',
        sourceOwner: owner,
        sourceExport: 'FREE_QUESTIONNAIRE_COPY_V1',
        sourceItemId: `answer.${q.questionId}.${choice.answerId}`,
        expectedCopyId: `self.free.answer.${q.questionId}.${choice.answerId}`,
        textRef: `FREE_QUESTIONNAIRE_COPY_V1.${q.questionId}.choices.${choice.answerId}`,
        sourceFingerprint: identityFingerprint({
          sourceOwner: owner,
          sourceExport: 'FREE_QUESTIONNAIRE_COPY_V1',
          sourceItemId: `answer.${q.questionId}.${choice.answerId}`,
          expectedCopyId: `self.free.answer.${q.questionId}.${choice.answerId}`,
          textRef: `FREE_QUESTIONNAIRE_COPY_V1.${q.questionId}.choices.${choice.answerId}`,
          visibleText: choice.labelJa,
        }),
      });
    }
  }
  identities.push(
    {
      domainId: 'self.questionnaire.answers',
      sourceOwner: owner,
      sourceExport: 'FREE_QUESTION_HELPER_JA',
      sourceItemId: 'helper.primary',
      expectedCopyId: 'self.free.questionnaire.helper.primary',
      textRef: 'FREE_QUESTION_HELPER_JA',
      sourceFingerprint: identityFingerprint({
        sourceOwner: owner,
        sourceExport: 'FREE_QUESTION_HELPER_JA',
        sourceItemId: 'helper.primary',
        expectedCopyId: 'self.free.questionnaire.helper.primary',
        textRef: 'FREE_QUESTION_HELPER_JA',
        visibleText: FREE_QUESTION_HELPER_JA,
      }),
    },
    {
      domainId: 'self.questionnaire.answers',
      sourceOwner: owner,
      sourceExport: 'FREE_QUESTION_HELPER_COMPACT_JA',
      sourceItemId: 'helper.compact',
      expectedCopyId: 'self.free.questionnaire.helper.compact',
      textRef: 'FREE_QUESTION_HELPER_COMPACT_JA',
      sourceFingerprint: identityFingerprint({
        sourceOwner: owner,
        sourceExport: 'FREE_QUESTION_HELPER_COMPACT_JA',
        sourceItemId: 'helper.compact',
        expectedCopyId: 'self.free.questionnaire.helper.compact',
        textRef: 'FREE_QUESTION_HELPER_COMPACT_JA',
        visibleText: FREE_QUESTION_HELPER_COMPACT_JA,
      }),
    },
  );
  return identities;
}

function selfPremiumQuestionnaireIdentities(): SourceCopyIdentity[] {
  const owner = 'lib/m55/paidResult/questionnaireCopyV1.ts';
  const identities: SourceCopyIdentity[] = [];
  for (const q of PAID_QUESTIONNAIRE_COPY_V1) {
    identities.push({
      domainId: 'self.premium.questionnaire',
      sourceOwner: owner,
      sourceExport: 'PAID_QUESTIONNAIRE_COPY_V1',
      sourceItemId: `shortLabel.${q.questionId}`,
      expectedCopyId: `self.paid.short_label.${q.questionId}`,
      textRef: `PAID_QUESTIONNAIRE_COPY_V1.${q.questionId}.shortLabelJa`,
      sourceFingerprint: identityFingerprint({
        sourceOwner: owner,
        sourceExport: 'PAID_QUESTIONNAIRE_COPY_V1',
        sourceItemId: `shortLabel.${q.questionId}`,
        expectedCopyId: `self.paid.short_label.${q.questionId}`,
        textRef: `PAID_QUESTIONNAIRE_COPY_V1.${q.questionId}.shortLabelJa`,
        visibleText: q.shortLabelJa,
      }),
    });
    identities.push({
      domainId: 'self.premium.questionnaire',
      sourceOwner: owner,
      sourceExport: 'PAID_QUESTIONNAIRE_COPY_V1',
      sourceItemId: `question.${q.questionId}`,
      expectedCopyId: `self.paid.question.${q.questionId}`,
      textRef: `PAID_QUESTIONNAIRE_COPY_V1.${q.questionId}.questionJa`,
      sourceFingerprint: identityFingerprint({
        sourceOwner: owner,
        sourceExport: 'PAID_QUESTIONNAIRE_COPY_V1',
        sourceItemId: `question.${q.questionId}`,
        expectedCopyId: `self.paid.question.${q.questionId}`,
        textRef: `PAID_QUESTIONNAIRE_COPY_V1.${q.questionId}.questionJa`,
        visibleText: q.questionJa,
      }),
    });
    for (const choice of q.choices) {
      identities.push({
        domainId: 'self.premium.questionnaire',
        sourceOwner: owner,
        sourceExport: 'PAID_QUESTIONNAIRE_COPY_V1',
        sourceItemId: `answer.${q.questionId}.${choice.answerId}`,
        expectedCopyId: `self.paid.answer.${q.questionId}.${choice.answerId}`,
        textRef: `PAID_QUESTIONNAIRE_COPY_V1.${q.questionId}.choices.${choice.answerId}`,
        sourceFingerprint: identityFingerprint({
          sourceOwner: owner,
          sourceExport: 'PAID_QUESTIONNAIRE_COPY_V1',
          sourceItemId: `answer.${q.questionId}.${choice.answerId}`,
          expectedCopyId: `self.paid.answer.${q.questionId}.${choice.answerId}`,
          textRef: `PAID_QUESTIONNAIRE_COPY_V1.${q.questionId}.choices.${choice.answerId}`,
          visibleText: choice.labelJa,
        }),
      });
    }
  }
  return identities;
}

function selfShareIdentities(): SourceCopyIdentity[] {
  const owner = 'lib/m55/freeResult/privacySafeShareCardV1.ts';
  return Object.entries(SHARE_UI_COPY_V1).map(([key, value]) => ({
    domainId: 'self.free.share',
    sourceOwner: owner,
    sourceExport: 'SHARE_UI_COPY_V1',
    sourceItemId: key,
    expectedCopyId: `self.share.${key}`,
    textRef: `SHARE_UI_COPY_V1.${key}`,
    sourceFingerprint: identityFingerprint({
      sourceOwner: owner,
      sourceExport: 'SHARE_UI_COPY_V1',
      sourceItemId: key,
      expectedCopyId: `self.share.${key}`,
      textRef: `SHARE_UI_COPY_V1.${key}`,
      visibleText: value,
    }),
  }));
}

function selfPremiumBridgeIdentities(): SourceCopyIdentity[] {
  const owner = 'lib/m55/commercialUx/experience/experienceCtaState.ts';
  const label = M55_CTA_LABELS.FREE_TO_PREMIUM;
  return [
    {
      domainId: 'self.premium.bridge',
      sourceOwner: owner,
      sourceExport: 'M55_CTA_LABELS',
      sourceItemId: 'FREE_TO_PREMIUM',
      expectedCopyId: 'shared.cta.FREE_TO_PREMIUM',
      textRef: 'M55_CTA_LABELS.FREE_TO_PREMIUM',
      sourceFingerprint: identityFingerprint({
        sourceOwner: owner,
        sourceExport: 'M55_CTA_LABELS',
        sourceItemId: 'FREE_TO_PREMIUM',
        expectedCopyId: 'shared.cta.FREE_TO_PREMIUM',
        textRef: 'M55_CTA_LABELS.FREE_TO_PREMIUM',
        visibleText: label,
      }),
    },
    {
      domainId: 'self.premium.bridge',
      sourceOwner: 'lib/m55/topFreeEntryPublicCopy.ts',
      sourceExport: 'TOP_FREE_ENTRY_PUBLIC_COPY.cta',
      sourceItemId: 'openFreeMapJa',
      expectedCopyId: 'home.cta.primary',
      textRef: 'TOP_FREE_ENTRY_PUBLIC_COPY.cta.openFreeMapJa',
      sourceFingerprint: identityFingerprint({
        sourceOwner: 'lib/m55/topFreeEntryPublicCopy.ts',
        sourceExport: 'TOP_FREE_ENTRY_PUBLIC_COPY.cta',
        sourceItemId: 'openFreeMapJa',
        expectedCopyId: 'home.cta.primary',
        textRef: 'TOP_FREE_ENTRY_PUBLIC_COPY.cta.openFreeMapJa',
        visibleText: TOP_FREE_ENTRY_PUBLIC_COPY.cta.openFreeMapJa,
      }),
    },
  ].filter((entry) => Boolean(label));
}

function productIdentities(domainId: string): SourceCopyIdentity[] {
  const owner = 'lib/m55/contracts/m55CommercialFunnelContract.ts';
  const identities: SourceCopyIdentity[] = [];
  for (const [key, product] of Object.entries(M55_COMMERCIAL_PRODUCTS)) {
    const pricePresentationJa =
      product.priceJpy == null ? '無料' : `¥${product.priceJpy.toLocaleString('ja-JP')}（税込）`;
    identities.push({
      domainId,
      sourceOwner: owner,
      sourceExport: 'M55_COMMERCIAL_PRODUCTS',
      sourceItemId: `${key}.publicName`,
      expectedCopyId: `product.name.${product.productKey}`,
      textRef: `M55_COMMERCIAL_PRODUCTS.${key}.publicName`,
      sourceFingerprint: identityFingerprint({
        sourceOwner: owner,
        sourceExport: 'M55_COMMERCIAL_PRODUCTS',
        sourceItemId: `${key}.publicName`,
        expectedCopyId: `product.name.${product.productKey}`,
        textRef: `M55_COMMERCIAL_PRODUCTS.${key}.publicName`,
        visibleText: product.publicName,
      }),
    });
    identities.push({
      domainId,
      sourceOwner: owner,
      sourceExport: 'M55_COMMERCIAL_PRODUCTS',
      sourceItemId: `${key}.priceJpy`,
      expectedCopyId: `product.price.${product.productKey}`,
      textRef: `M55_COMMERCIAL_PRODUCTS.${key}.priceJpy`,
      sourceFingerprint: identityFingerprint({
        sourceOwner: owner,
        sourceExport: 'M55_COMMERCIAL_PRODUCTS',
        sourceItemId: `${key}.priceJpy`,
        expectedCopyId: `product.price.${product.productKey}`,
        textRef: `M55_COMMERCIAL_PRODUCTS.${key}.priceJpy`,
        visibleText: pricePresentationJa,
      }),
    });
    product.benefits.forEach((benefit, index) => {
      identities.push({
        domainId,
        sourceOwner: owner,
        sourceExport: 'M55_COMMERCIAL_PRODUCTS',
        sourceItemId: `${key}.benefits.${index}`,
        expectedCopyId: `product.value.${product.productKey}.${index}`,
        textRef: `M55_COMMERCIAL_PRODUCTS.${key}.benefits[${index}]`,
        sourceFingerprint: identityFingerprint({
          sourceOwner: owner,
          sourceExport: 'M55_COMMERCIAL_PRODUCTS',
          sourceItemId: `${key}.benefits.${index}`,
          expectedCopyId: `product.value.${product.productKey}.${index}`,
          textRef: `M55_COMMERCIAL_PRODUCTS.${key}.benefits[${index}]`,
          visibleText: benefit,
        }),
      });
    });
  }
  return identities;
}

function pairRelationStageIdentities(): SourceCopyIdentity[] {
  const owner = 'lib/m55/compatibility/pairReadingCatalog.v1.ts';
  return RELATION_STATUS_CATALOG.map((status) => ({
    domainId: 'pair.relation_stage.r1_r6',
    sourceOwner: owner,
    sourceExport: 'RELATION_STATUS_CATALOG',
    sourceItemId: status.id,
    expectedCopyId: `pair.relation_stage.${status.id}`,
    textRef: `RELATION_STATUS_CATALOG.${status.id}.labelJa`,
    sourceFingerprint: identityFingerprint({
      sourceOwner: owner,
      sourceExport: 'RELATION_STATUS_CATALOG',
      sourceItemId: status.id,
      expectedCopyId: `pair.relation_stage.${status.id}`,
      textRef: `RELATION_STATUS_CATALOG.${status.id}.labelJa`,
      visibleText: status.labelJa,
    }),
  }));
}

function pairQuestionnaireIdentities(): SourceCopyIdentity[] {
  const owner = 'lib/m55/compatibility/currentContextContract.v2.ts';
  const identities: SourceCopyIdentity[] = [];
  for (const stageId of RELATION_STATUS_IDS) {
    for (const q of questionsForRelationStage(stageId)) {
      identities.push({
        domainId: 'pair.questionnaire.answers',
        sourceOwner: owner,
        sourceExport: 'questionsForRelationStage',
        sourceItemId: `${stageId}.${q.questionId}.question`,
        expectedCopyId: `pair.question.${stageId}.${q.questionId}`,
        textRef: `questionsForRelationStage(${stageId}).${q.questionId}.question`,
        sourceFingerprint: identityFingerprint({
          sourceOwner: owner,
          sourceExport: 'questionsForRelationStage',
          sourceItemId: `${stageId}.${q.questionId}.question`,
          expectedCopyId: `pair.question.${stageId}.${q.questionId}`,
          textRef: `questionsForRelationStage(${stageId}).${q.questionId}.question`,
          visibleText: q.question,
        }),
      });
      for (const choice of q.choices) {
        identities.push({
          domainId: 'pair.questionnaire.answers',
          sourceOwner: owner,
          sourceExport: 'questionsForRelationStage',
          sourceItemId: `${stageId}.${q.questionId}.${choice.answerId}`,
          expectedCopyId: `pair.answer.${stageId}.${q.questionId}.${choice.answerId}`,
          textRef: `questionsForRelationStage(${stageId}).${q.questionId}.choices.${choice.answerId}`,
          sourceFingerprint: identityFingerprint({
            sourceOwner: owner,
            sourceExport: 'questionsForRelationStage',
            sourceItemId: `${stageId}.${q.questionId}.${choice.answerId}`,
            expectedCopyId: `pair.answer.${stageId}.${q.questionId}.${choice.answerId}`,
            textRef: `questionsForRelationStage(${stageId}).${q.questionId}.choices.${choice.answerId}`,
            visibleText: choice.label,
          }),
        });
      }
    }
  }
  return identities;
}

function pairShareIdentities(): SourceCopyIdentity[] {
  const owner = 'lib/m55/compatibility/privacySafePairShare.ts';
  return Object.entries(PAIR_SHARE_UI_COPY).map(([key, value]) => ({
    domainId: 'pair.free.share',
    sourceOwner: owner,
    sourceExport: 'PAIR_SHARE_UI_COPY',
    sourceItemId: key,
    expectedCopyId: `pair.share.${key}`,
    textRef: `PAIR_SHARE_UI_COPY.${key}`,
    sourceFingerprint: identityFingerprint({
      sourceOwner: owner,
      sourceExport: 'PAIR_SHARE_UI_COPY',
      sourceItemId: key,
      expectedCopyId: `pair.share.${key}`,
      textRef: `PAIR_SHARE_UI_COPY.${key}`,
      visibleText: value,
    }),
  }));
}

function sharedCtaIdentities(): SourceCopyIdentity[] {
  const owner = 'lib/m55/commercialUx/experience/experienceCtaState.ts';
  return M55_CTA_STATES.filter((state) => Boolean(M55_CTA_LABELS[state])).map((state) => ({
    domainId: 'shared.navigation.commercial_cta',
    sourceOwner: owner,
    sourceExport: 'M55_CTA_LABELS',
    sourceItemId: state,
    expectedCopyId: `shared.cta.${state}`,
    textRef: `M55_CTA_LABELS.${state}`,
    sourceFingerprint: identityFingerprint({
      sourceOwner: owner,
      sourceExport: 'M55_CTA_LABELS',
      sourceItemId: state,
      expectedCopyId: `shared.cta.${state}`,
      textRef: `M55_CTA_LABELS.${state}`,
      visibleText: M55_CTA_LABELS[state]!,
    }),
  }));
}

function freeProductMetadataIdentities(): SourceCopyIdentity[] {
  return productIdentities('shared.free.product.metadata.value').filter(
    (identity) =>
      identity.expectedCopyId.includes('self_free_v1') ||
      identity.expectedCopyId.includes('pair_free_v1'),
  );
}

export const M55_SOURCE_COVERAGE_DOMAINS: readonly SourceDomainSpec[] = [
  { domainId: 'home.entry.hero.discovery', sourceOwner: 'lib/m55/topFreeEntryPublicCopy.ts', extractionStrategy: 'TOP_FREE_ENTRY_PUBLIC_COPY hero/cta', extractIdentities: homeIdentities },
  { domainId: 'self.entry.input', sourceOwner: 'lib/m55/freeResult/questionnaireCopyV1.ts', extractionStrategy: 'FREE questionnaire entry questions', extractIdentities: () => selfQuestionnaireIdentities().filter((i) => i.sourceItemId.startsWith('question.')) },
  { domainId: 'self.questionnaire.answers', sourceOwner: 'lib/m55/freeResult/questionnaireCopyV1.ts', extractionStrategy: 'FREE_QUESTIONNAIRE_COPY_V1', extractIdentities: selfQuestionnaireIdentities },
  { domainId: 'self.validation.error.empty.loading', sourceOwner: 'lib/m55/freeResult/segmentedDobInputV1.ts', extractionStrategy: 'segmented DOB validation + intake modal errors + flow steps', extractIdentities: () => closureIdentitiesForDomain('self.validation.error.empty.loading') },
  { domainId: 'self.auth.transition', sourceOwner: 'lib/m55/freeResult/guestFreeJourneyCopyV1.ts', extractionStrategy: 'GUEST_* journey copy', extractIdentities: () => closureIdentitiesForDomain('self.auth.transition') },
  { domainId: 'self.free.result', sourceOwner: 'lib/m55/freeResult/buildFreeDepthAnalysisV1.ts', extractionStrategy: 'FREE_DEPTH static narrative authorities', extractIdentities: () => closureIdentitiesForDomain('self.free.result') },
  { domainId: 'self.premium.bridge', sourceOwner: 'lib/m55/commercialUx/experience/experienceCtaState.ts', extractionStrategy: 'M55_CTA_LABELS bridge states', extractIdentities: selfPremiumBridgeIdentities },
  { domainId: 'self.premium.questionnaire', sourceOwner: 'lib/m55/paidResult/questionnaireCopyV1.ts', extractionStrategy: 'PAID_QUESTIONNAIRE_COPY_V1', extractIdentities: selfPremiumQuestionnaireIdentities },
  { domainId: 'self.premium.merchandise.value', sourceOwner: 'lib/m55/contracts/m55CommercialFunnelContract.ts', extractionStrategy: 'M55_COMMERCIAL_PRODUCTS self premium benefits', extractIdentities: () => productIdentities('self.premium.merchandise.value').filter((i) => i.expectedCopyId.includes('dtr_core_light_v1') || i.expectedCopyId.includes('dtr_core_full_v1')) },
  { domainId: 'self.purchase.confirmation', sourceOwner: 'lib/m55/commercialUx/experience/experienceCtaState.ts', extractionStrategy: 'PLAN_SELECTED/PAYMENT_READY CTA labels', extractIdentities: () => sharedCtaIdentities().filter((i) => i.sourceItemId === 'PLAN_SELECTED' || i.sourceItemId === 'PAYMENT_READY') },
  { domainId: 'self.paid.report', sourceOwner: 'lib/m55/paidDtrProductCopy.ts', extractionStrategy: 'PAID_DTR_* report copy authorities', extractIdentities: () => closureIdentitiesForDomain('self.paid.report') },
  { domainId: 'self.owned.report', sourceOwner: 'components/dtr/PaidDtrAnalysisLoading.tsx', extractionStrategy: 'owned report loading copy', extractIdentities: () => closureIdentitiesForDomain('self.owned.report') },
  { domainId: 'self.revisit.restore.recovery', sourceOwner: 'lib/m55/commercialUx/experience/experienceCtaState.ts', extractionStrategy: 'RETURN_TO_FREE_RESULT CTA', extractIdentities: () => sharedCtaIdentities().filter((i) => i.sourceItemId === 'RETURN_TO_FREE_RESULT') },
  { domainId: 'self.free.share', sourceOwner: 'lib/m55/freeResult/privacySafeShareCardV1.ts', extractionStrategy: 'SHARE_UI_COPY_V1', extractIdentities: selfShareIdentities },
  { domainId: 'pair.entry', sourceOwner: 'lib/m55/compatibility/pairReadingCatalog.v1.ts', extractionStrategy: 'RELATION_STATUS_CATALOG entry labels', extractIdentities: () => pairRelationStageIdentities().slice(0, 1) },
  { domainId: 'pair.dob.input', sourceOwner: 'components/compatibility/CompatibilityGuestExperience.tsx', extractionStrategy: 'pair DOB step labels + public structure', extractIdentities: () => closureIdentitiesForDomain('pair.dob.input') },
  { domainId: 'pair.relation_stage.r1_r6', sourceOwner: 'lib/m55/compatibility/pairReadingCatalog.v1.ts', extractionStrategy: 'RELATION_STATUS_CATALOG R1-R6', extractIdentities: pairRelationStageIdentities },
  { domainId: 'pair.questionnaire.answers', sourceOwner: 'lib/m55/compatibility/currentContextContract.v2.ts', extractionStrategy: 'questionsForRelationStage', extractIdentities: pairQuestionnaireIdentities },
  { domainId: 'pair.validation.error.empty.loading', sourceOwner: 'lib/m55/compatibility/pairReadingGuestResult.ts', extractionStrategy: 'pair guest validation outcomes', extractIdentities: () => closureIdentitiesForDomain('pair.validation.error.empty.loading') },
  { domainId: 'pair.auth.transition', sourceOwner: 'components/compatibility/CompatibilityPurchaseExperience.tsx', extractionStrategy: 'pair purchase auth boundary', extractIdentities: () => closureIdentitiesForDomain('pair.auth.transition') },
  { domainId: 'pair.free.result', sourceOwner: 'lib/m55/compatibility/pairReadingFragments.v1.ts', extractionStrategy: 'pair free narrative fragments', extractIdentities: () => closureIdentitiesForDomain('pair.free.result') },
  { domainId: 'pair.free.share', sourceOwner: 'lib/m55/compatibility/privacySafePairShare.ts', extractionStrategy: 'PAIR_SHARE_UI_COPY', extractIdentities: pairShareIdentities },
  { domainId: 'pair.premium.bridge', sourceOwner: 'lib/m55/commercialUx/experience/experienceCtaState.ts', extractionStrategy: 'pair premium bridge CTA', extractIdentities: () => sharedCtaIdentities().filter((i) => i.sourceItemId === 'FREE_TO_PREMIUM') },
  { domainId: 'pair.premium.merchandise.discovery.value', sourceOwner: 'lib/m55/contracts/m55CommercialFunnelContract.ts', extractionStrategy: 'pair premium product metadata', extractIdentities: () => productIdentities('pair.premium.merchandise.discovery.value').filter((i) => i.expectedCopyId.includes('compatibility_report') || i.expectedCopyId.includes('pair')) },
  { domainId: 'pair.purchase.confirmation', sourceOwner: 'lib/m55/commercialUx/experience/experienceCtaState.ts', extractionStrategy: 'pair purchase confirmation CTA', extractIdentities: () => sharedCtaIdentities().filter((i) => i.sourceItemId === 'PLAN_SELECTED' || i.sourceItemId === 'PAYMENT_READY') },
  { domainId: 'pair.paid.report', sourceOwner: 'lib/m55/compatibility/pairReadingFragments.v1.ts', extractionStrategy: 'pair paid narrative fragments', extractIdentities: () => closureIdentitiesForDomain('pair.paid.report') },
  { domainId: 'pair.owned.report', sourceOwner: 'components/compatibility/CompatibilityPurchaseExperience.tsx', extractionStrategy: 'pair owned report processing copy', extractIdentities: () => closureIdentitiesForDomain('pair.owned.report') },
  { domainId: 'pair.revisit.restore.recovery', sourceOwner: 'lib/m55/commercialUx/experience/experienceCtaState.ts', extractionStrategy: 'pair recovery CTA', extractIdentities: () => sharedCtaIdentities().filter((i) => i.sourceItemId === 'RETURN_TO_FREE_RESULT') },
  { domainId: 'shared.navigation', sourceOwner: 'lib/m55/commercialUx/experience/experienceCtaState.ts', extractionStrategy: 'M55_CTA_LABELS navigation', extractIdentities: sharedCtaIdentities },
  { domainId: 'shared.support.help', sourceOwner: 'app/_components/PublicFooter.tsx', extractionStrategy: 'PublicFooter support/legal + method link', extractIdentities: () => closureIdentitiesForDomain('shared.support.help') },
  { domainId: 'shared.validation.error', sourceOwner: 'lib/m55/purchaseCheckoutStartedAction.ts', extractionStrategy: 'PURCHASE_CHECKOUT_PUBLIC_ERRORS', extractIdentities: () => closureIdentitiesForDomain('shared.validation.error') },
  { domainId: 'shared.empty.loading', sourceOwner: 'components/QuietPolling.tsx', extractionStrategy: 'shared loading/empty states', extractIdentities: () => closureIdentitiesForDomain('shared.empty.loading') },
  { domainId: 'shared.auth', sourceOwner: 'components/PurchaseButton.tsx', extractionStrategy: 'shared purchase auth copy', extractIdentities: () => closureIdentitiesForDomain('shared.auth') },
  { domainId: 'shared.restore.recovery', sourceOwner: 'lib/m55/commercialUx/experience/experienceCtaState.ts', extractionStrategy: 'shared recovery CTA', extractIdentities: () => sharedCtaIdentities().filter((i) => i.sourceItemId === 'RETURN_TO_FREE_RESULT') },
  { domainId: 'shared.navigation.commercial_cta', sourceOwner: 'lib/m55/commercialUx/experience/experienceCtaState.ts', extractionStrategy: 'M55_CTA_LABELS commercial CTA', extractIdentities: sharedCtaIdentities },
  { domainId: 'shared.free.product.metadata.value', sourceOwner: 'lib/m55/contracts/m55CommercialFunnelContract.ts', extractionStrategy: 'M55_COMMERCIAL_PRODUCTS self_free_v1 and pair_free_v1 metadata', extractIdentities: freeProductMetadataIdentities },
];

function classifyUnexpectedIdentity(copyId: string): UnexpectedIdentityEntry {
  return {
    copyId,
    classification: 'UNMAPPED_GOVERNED_COPY',
    reason: 'governed copy identity not covered by mandatory source-domain extractor',
  };
}

export function evaluateSourceDomainCoverage(
  inventory: readonly GovernedCopyEntry[],
): SourceDomainCoverageSummary {
  const inventoryByCopyId = new Map(inventory.map((entry) => [entry.copyId, entry]));

  const domains = M55_SOURCE_COVERAGE_DOMAINS.map((domain) => {
    const discovered = domain.extractIdentities();
    if (discovered.length === 0) {
      if (domain.provenAbsentByDesignAuthorityEvidence) {
        return {
          domainId: domain.domainId,
          sourceOwner: domain.sourceOwner,
          extractionStrategy: domain.extractionStrategy,
          status: 'ABSENT_BY_DESIGN_WITH_AUTHORITY_EVIDENCE' as const,
          absentByDesignAuthorityEvidence: domain.provenAbsentByDesignAuthorityEvidence,
          discoveredIdentities: 0,
          registeredIdentities: 0,
          missingIdentities: 0,
        };
      }
      if (domain.userVisibleCopyExists) {
        return {
          domainId: domain.domainId,
          sourceOwner: domain.sourceOwner,
          extractionStrategy: domain.extractionStrategy,
          status: 'PRESENT_UNGOVERNED' as const,
          ungovernedReason: 'user-visible copy exists but is not yet extractable into governed inventory',
          discoveredIdentities: 0,
          registeredIdentities: 0,
          missingIdentities: 0,
        };
      }
      return {
        domainId: domain.domainId,
        sourceOwner: domain.sourceOwner,
        extractionStrategy: domain.extractionStrategy,
        status: 'MISSING' as const,
        discoveredIdentities: 0,
        registeredIdentities: 0,
        missingIdentities: 0,
      };
    }

    let registered = 0;
    let missing = 0;
    for (const identity of discovered) {
      const entry = inventoryByCopyId.get(identity.expectedCopyId);
      if (!entry || inventoryFingerprintForIdentity(entry, identity) !== identity.sourceFingerprint) {
        missing += 1;
        continue;
      }
      registered += 1;
    }

    return {
      domainId: domain.domainId,
      sourceOwner: domain.sourceOwner,
      extractionStrategy: domain.extractionStrategy,
      status: missing === 0 ? ('PRESENT_COVERED' as const) : ('MISSING' as const),
      discoveredIdentities: discovered.length,
      registeredIdentities: registered,
      missingIdentities: missing,
    };
  });

  const presentCovered = domains.filter((d) => d.status === 'PRESENT_COVERED').length;
  const presentUngoverned = domains.filter((d) => d.status === 'PRESENT_UNGOVERNED').length;
  const absentByDesign = domains.filter((d) => d.status === 'ABSENT_BY_DESIGN_WITH_AUTHORITY_EVIDENCE').length;
  const missing = domains.filter((d) => d.status === 'MISSING').length;
  const unresolvedDomainIds = domains
    .filter((d) => d.status === 'PRESENT_UNGOVERNED' || d.status === 'MISSING')
    .map((d) => d.domainId);

  return {
    required: domains.length,
    presentCovered,
    presentUngoverned,
    absentByDesignWithAuthorityEvidence: absentByDesign,
    missing,
    unresolvedDomainIds,
    domains,
  };
}

function dedupeDiscoveredIdentities(discovered: readonly SourceCopyIdentity[]): SourceCopyIdentity[] {
  const byIdentityKey = new Map<string, SourceCopyIdentity>();
  for (const identity of discovered) {
    const key = `${identity.expectedCopyId}|${identity.sourceOwner}|${identity.textRef}`;
    if (!byIdentityKey.has(key)) byIdentityKey.set(key, identity);
  }
  return [...byIdentityKey.values()];
}

function countInconsistentDuplicateIdentities(discovered: readonly SourceCopyIdentity[]): number {
  const byCopyId = new Map<string, Set<string>>();
  for (const identity of discovered) {
    const fingerprint = `${identity.sourceOwner}|${identity.textRef}`;
    const fingerprints = byCopyId.get(identity.expectedCopyId) ?? new Set<string>();
    fingerprints.add(fingerprint);
    byCopyId.set(identity.expectedCopyId, fingerprints);
  }
  let inconsistent = 0;
  for (const fingerprints of byCopyId.values()) {
    if (fingerprints.size > 1) inconsistent += 1;
  }
  return inconsistent;
}

export function evaluateSourceIdentityCoverage(
  inventory: readonly GovernedCopyEntry[],
): SourceIdentityCoverageSummary {
  const discoveredRaw: SourceCopyIdentity[] = M55_SOURCE_COVERAGE_DOMAINS.flatMap((d) => d.extractIdentities());
  const discovered = dedupeDiscoveredIdentities(discoveredRaw);
  const inventoryByCopyId = new Map(inventory.map((entry) => [entry.copyId, entry]));

  const discoveredIds = new Set(discovered.map((d) => d.expectedCopyId));
  const unexpectedEntries = inventory
    .filter((entry) => !discoveredIds.has(entry.copyId))
    .map((entry) => classifyUnexpectedIdentity(entry.copyId));

  const missingIdentities = discovered.filter((identity) => {
    const entry = inventoryByCopyId.get(identity.expectedCopyId);
    if (!entry) return true;
    return inventoryFingerprintForIdentity(entry, identity) !== identity.sourceFingerprint;
  });

  const fingerprintMismatches: string[] = [];
  for (const identity of discovered) {
    const entry = inventoryByCopyId.get(identity.expectedCopyId);
    if (!entry) continue;
    if (inventoryFingerprintForIdentity(entry, identity) !== identity.sourceFingerprint) {
      fingerprintMismatches.push(identity.expectedCopyId);
    }
  }

  const duplicateIdentities = countInconsistentDuplicateIdentities(discoveredRaw);
  const unmappedGovernedCopy = unexpectedEntries.filter(
    (entry) => entry.classification === 'UNMAPPED_GOVERNED_COPY',
  ).length;

  return {
    discoveredIdentities: discovered.length,
    registeredIdentities: inventory.length,
    missingIdentities: missingIdentities.length,
    unexpectedIdentities: unexpectedEntries.length,
    unexpectedClassified: unexpectedEntries,
    unmappedGovernedCopy,
    duplicateIdentities,
    fingerprintMismatches: fingerprintMismatches.length,
    sourceFingerprintCompared: true,
    missingCopyIds: missingIdentities.map((i) => i.expectedCopyId),
    unexpectedCopyIds: unexpectedEntries.map((e) => e.copyId),
    fingerprintMismatchCopyIds: fingerprintMismatches,
  };
}

export { M55_CLOSURE_PLACEHOLDER_DOMAIN_IDS };

export function countDiscoveredSourceItems(): number {
  return M55_SOURCE_COVERAGE_DOMAINS.reduce((sum, domain) => sum + domain.extractIdentities().length, 0);
}

export function countUnregisteredGovernedCopy(
  inventory: readonly GovernedCopyEntry[],
  identityCoverage: SourceIdentityCoverageSummary,
): number {
  return identityCoverage.missingIdentities;
}
