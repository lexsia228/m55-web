/**
 * Machine-auditable M55 user-facing generated Japanese prose corpus.
 * Enumerates free / Premium / Pair / share surfaces from authority builders only.
 */

import { buildPaidCompatibilityReportV1 } from '../../compatibility/buildPaidCompatibilityReportV1';
import type { RelationStatusId } from '../../compatibility/pairReadingTypes';
import { buildPairFreeInsightSpecV2 } from '../../compatibility/pairFreeInsightSpecV2';
import { PAIR_V5_FIXTURES } from '../../compatibility/pairFreeCommercialCopyV5.test';
import { buildM55GovernedCopyInventory } from './m55JapaneseComprehensionInventory';
import { buildFreeDepthAnalysisV1 } from '../../freeResult/buildFreeDepthAnalysisV1';
import { PERSONAL_V5_FIXTURES } from '../../freeResult/personalFreeCommercialCopyV5.test';
import { buildPurchaseInputSnapshotV1 } from '../../paidResult/purchaseInputSnapshotV1';
import { buildPaidSavedReportChapterBodiesV1 } from '../../paidResult/buildPaidSavedReportChapterBodiesV1';
import { buildPaidDtrChapterMaterialPack } from '../../dtrPaidChapterMaterialPack';
import { buildV2FulfillmentSnapshotFromFields } from '../../compositeStem/buildV2FulfillmentSnapshot';
import { composePaidIndividualizationFromEngineContext } from '../../dtrPaidIndividualizationCompose';
import { DTR_CORE_LIGHT_V1 } from '../../../oneTimeCheckout';
import {
  buildPersonalFreeNarrativeShareContextV1,
  projectPersonalFreeNarrativeV1,
} from '../../narrative/projectPersonalFreeNarrativeV1';
import { projectPersonalPremiumNarrativeV1 } from '../../narrative/projectPersonalPremiumNarrativeV1';
import { projectCompatibilityFreeNarrativeV1 } from '../../narrative/projectCompatibilityFreeNarrativeV1';
import {
  projectPersonalPublicShareV1,
  projectPairPublicShareV1,
  projectPremiumPublicShareV1,
} from '../../narrative/projectPublicShareV1';
import { buildPremiumPurchasedSemanticProjectionV1 } from '../../narrative/buildPremiumPurchasedSemanticProjectionV1';
import { parsePublicCardDisplayV1, extractJapaneseLabelQuoteJa } from '../../narrative/publicCardDisplayV1';
import { reconstructPersonalPublicCard } from '../../narrative/reconstructPublicCardV1';
import { checkShareCardBodyParseIntegrity, runContentIntegrityAudit } from '../../../commercialQuality/contentIntegrityChecks';
import type { ContentIntegrityCorpusItem, ContentIntegrityFinding } from '../../../commercialQuality/contentIntegrityTypes';
import type { ShareCandidateVariant } from '../../narrative/m55NarrativeSpecV1';

const SHARE_VARIANTS: readonly ShareCandidateVariant[] = [
  'manual',
  'seen_vs_actual',
  'hidden_spec',
  'premium_takeaway',
];

function pushItem(
  items: ContentIntegrityCorpusItem[],
  partial: Omit<ContentIntegrityCorpusItem, 'itemId'> & { itemId?: string },
): void {
  const itemId =
    partial.itemId ??
    `${partial.surface}::${partial.variantIdentity}::${partial.sourceCategory}::${partial.headingLabel}`;
  items.push({ ...partial, itemId });
}

export function buildM55ContentIntegrityCorpus(): ContentIntegrityCorpusItem[] {
  const items: ContentIntegrityCorpusItem[] = [];

  for (const entry of buildM55GovernedCopyInventory()) {
    if (entry.copyRole === 'BODY' || entry.copyRole === 'HEADING' || entry.copyRole === 'QUESTION') {
      pushItem(items, {
        surface: `static.${entry.surfaceFamily.toLowerCase()}.${entry.runtimeStateId}`,
        sourceCategory: 'governed_inventory',
        variantIdentity: entry.copyId,
        headingLabel: entry.copyId,
        semanticText: entry.visibleText,
        sourceOwner: entry.sourceOwner,
      });
    }
  }

  for (const fixture of PERSONAL_V5_FIXTURES) {
    const depth = buildFreeDepthAnalysisV1(fixture);
    if (depth.ok) {
      pushItem(items, {
        surface: 'self.free.result',
        sourceCategory: 'free_depth_analysis',
        variantIdentity: fixture.id,
        headingLabel: 'headlineJa',
        semanticText: depth.value.headlineJa,
        sourceOwner: 'lib/m55/freeResult/buildFreeDepthAnalysisV1.ts',
      });
      pushItem(items, {
        surface: 'self.free.result',
        sourceCategory: 'free_depth_analysis',
        variantIdentity: fixture.id,
        headingLabel: 'premiumOpenLoopJa',
        semanticText: depth.value.premiumOpenLoopJa,
        sourceOwner: 'lib/m55/freeResult/buildFreeDepthAnalysisV1.ts',
      });
    }

    const narrative = projectPersonalFreeNarrativeV1(fixture);
    if (narrative.ok) {
      pushItem(items, {
        surface: 'self.free.result',
        sourceCategory: 'narrative_opening',
        variantIdentity: fixture.id,
        headingLabel: 'openingHit',
        semanticText: narrative.value.openingHit.text,
        sourceOwner: 'lib/m55/narrative/projectPersonalFreeNarrativeV1.ts',
      });
      for (const slot of narrative.value.manualSpec.slots) {
        pushItem(items, {
          surface: 'self.free.result.manual',
          sourceCategory: 'personal_manual_slot',
          variantIdentity: `${fixture.id}.${slot.id}`,
          headingLabel: slot.labelJa,
          semanticText: slot.bodyJa,
          sourceOwner: 'lib/m55/narrative/personalManualV1.ts',
        });
      }
    }

    const ctx = buildPersonalFreeNarrativeShareContextV1(fixture);
    if (!ctx.ok) continue;
    const { answerAxes, birthAxes, hingeAxisId, stemLaneIndex, narrative: narrativeSpec } = ctx.value;

    for (const variant of SHARE_VARIANTS) {
      if (variant === 'premium_takeaway') continue;
      const card = reconstructPersonalPublicCard({
        variant,
        answerAxes,
        birthAxes,
        hingeAxisId,
      });
      if (!card) continue;

      pushItem(items, {
        surface: 'self.free.share_card',
        sourceCategory: 'reconstruct_public_card',
        variantIdentity: `${fixture.id}.${variant}`,
        headingLabel: card.headline,
        semanticText: card.body,
        shareTextJa: card.shareTextJa,
        sourceOwner: 'lib/m55/narrative/reconstructPublicCardV1.ts',
      });

      const display = parsePublicCardDisplayV1({
        variant: card.variant,
        headline: card.headline,
        body: card.body,
        cta: card.cta,
      });

      if (variant === 'seen_vs_actual') {
        pushItem(items, {
          surface: 'self.free.share_card_display',
          sourceCategory: 'parse_public_card_display',
          variantIdentity: `${fixture.id}.seenJa`,
          headingLabel: '人から見える私',
          semanticText: display.seenJa,
          shareTextJa: card.shareTextJa,
          authoritySemanticText: extractJapaneseLabelQuoteJa(card.body, '人から見える私'),
          sourceOwner: 'lib/m55/narrative/publicCardDisplayV1.ts',
        });
        pushItem(items, {
          surface: 'self.free.share_card_display',
          sourceCategory: 'parse_public_card_display',
          variantIdentity: `${fixture.id}.actualJa`,
          headingLabel: '実際の私',
          semanticText: display.actualJa,
          shareTextJa: card.shareTextJa,
          authoritySemanticText: extractJapaneseLabelQuoteJa(card.body, '実際の私'),
          sourceOwner: 'lib/m55/narrative/publicCardDisplayV1.ts',
        });
      }

      if (variant === 'hidden_spec') {
        pushItem(items, {
          surface: 'self.free.share_card_display',
          sourceCategory: 'parse_public_card_display',
          variantIdentity: `${fixture.id}.heroJa`,
          headingLabel: card.headline,
          semanticText: display.heroJa,
          shareTextJa: card.shareTextJa,
          authoritySemanticText: card.insightJa,
          sourceOwner: 'lib/m55/narrative/publicCardDisplayV1.ts',
        });
      }

      const shareSpec = projectPersonalPublicShareV1({
        narrative: narrativeSpec,
        variant,
        stemLaneIndex,
        answerAxes,
        birthAxes,
        hingeAxisId,
      });
      if (shareSpec) {
        pushItem(items, {
          surface: 'self.free.share_post',
          sourceCategory: 'project_public_share',
          variantIdentity: `${fixture.id}.${variant}`,
          headingLabel: shareSpec.headline,
          semanticText: shareSpec.shareTextJa,
          shareTextJa: shareSpec.shareTextJa,
          sourceOwner: 'lib/m55/narrative/projectPublicShareV1.ts',
        });
      }
    }
  }

  for (const fixture of PAIR_V5_FIXTURES) {
    const spec = buildPairFreeInsightSpecV2({
      answers: fixture.answers,
      answersV2: fixture.answers,
      pairAxisId: 'A2',
      personABirthDate: fixture.personA,
      personBBirthDate: fixture.personB,
      personAUsesFirstPerspective: true,
      focusLabel: fixture.focus,
      relationStatusId: fixture.id as RelationStatusId,
    });

    pushItem(items, {
      surface: 'pair.free.result',
      sourceCategory: 'pair_free_insight',
      variantIdentity: fixture.id,
      headingLabel: 'betweenThem',
      semanticText: spec.betweenThem,
      sourceOwner: 'lib/m55/compatibility/pairFreeInsightSpecV2.ts',
    });

    const narrative = projectCompatibilityFreeNarrativeV1({ spec });
    pushItem(items, {
      surface: 'pair.free.result',
      sourceCategory: 'pair_narrative_opening',
      variantIdentity: fixture.id,
      headingLabel: 'openingHit',
      semanticText: narrative.openingHit.text,
      sourceOwner: 'lib/m55/narrative/projectCompatibilityFreeNarrativeV1.ts',
    });
    for (const slot of narrative.manualSpec.slots) {
      pushItem(items, {
        surface: 'pair.free.result.manual',
        sourceCategory: 'pair_manual_slot',
        variantIdentity: `${fixture.id}.${slot.id}`,
        headingLabel: slot.labelJa,
        semanticText: slot.bodyJa,
        sourceOwner: 'lib/m55/narrative/pairManualV1.ts',
      });
    }

    const pairShare = projectPairPublicShareV1({ spec });
    pushItem(items, {
      surface: 'pair.free.share_card',
      sourceCategory: 'pair_public_share',
      variantIdentity: fixture.id,
      headingLabel: pairShare.headline,
      semanticText: pairShare.body,
      shareTextJa: pairShare.shareTextJa,
      sourceOwner: 'lib/m55/narrative/projectPublicShareV1.ts',
    });
    pushItem(items, {
      surface: 'pair.free.share_post',
      sourceCategory: 'pair_public_share',
      variantIdentity: fixture.id,
      headingLabel: pairShare.headline,
      semanticText: pairShare.shareTextJa,
      shareTextJa: pairShare.shareTextJa,
      sourceOwner: 'lib/m55/narrative/projectPublicShareV1.ts',
    });
  }

  const paidSnapshot = buildPaidCompatibilityReportV1({
    pairAxisId: 'A2',
    paidTopicId: 'T3',
    relationStatusId: 'R2',
    temperatureId: 'E0',
    personAUsesFirstPerspective: true,
    currentContext: PAIR_V5_FIXTURES[0]!.answers,
    personABirthDate: PAIR_V5_FIXTURES[0]!.personA,
    personBBirthDate: PAIR_V5_FIXTURES[0]!.personB,
  });
  pushItem(items, {
    surface: 'pair.premium.report',
    sourceCategory: 'paid_compatibility_summary',
    variantIdentity: 'R1.T3',
    headingLabel: 'relationshipSummary',
    semanticText: paidSnapshot.relationshipSummary,
    sourceOwner: 'lib/m55/compatibility/buildPaidCompatibilityReportV1.ts',
  });
  for (const chapter of paidSnapshot.chapters) {
    pushItem(items, {
      surface: 'pair.premium.report.chapter',
      sourceCategory: 'paid_compatibility_chapter',
      variantIdentity: `${chapter.key}`,
      headingLabel: chapter.title,
      semanticText: [
        chapter.scene,
        chapter.personAPerspective,
        chapter.personBPerspective,
        ...chapter.relationshipLoop,
        ...chapter.resetSteps,
        chapter.usablePhrase,
        chapter.smallExperiment,
        chapter.reflectionQuestion,
      ].join('\n'),
      sourceOwner: 'lib/m55/compatibility/buildPaidCompatibilityReportV1.ts',
    });
  }

  const purchaseBuilt = buildPurchaseInputSnapshotV1({
    userId: 'user_content_integrity_corpus',
    productId: DTR_CORE_LIGHT_V1,
    profile: { nickname: 'CI', birthDate: '1990-01-15', birthTimeUnknown: true, country: 'JP' },
    freeAnswerSet: {
      'free.start_style': 'free.start_style.map_first',
      'free.decision_style': 'free.decision_style.sort_first',
      'free.recovery_style': 'free.recovery_style.pause_short',
      'free.distance_style': 'free.distance_style.close_careful',
      'free.change_style': 'free.change_style.observe_first',
      'free.primary_theme': 'free.primary_theme.work',
    },
    paidAnswerSet: {
      'paid.work_focus': 'paid.work_focus.priority',
      'paid.decision_friction': 'paid.decision_friction.too_many',
      'paid.relation_focus': 'paid.relation_focus.words',
      'paid.fatigue_signal': 'paid.fatigue_signal.after_push',
      'paid.recovery_sequence': 'paid.recovery_sequence.pause_first',
      'paid.restart_condition': 'paid.restart_condition.overview_first',
    },
    stemLaneIndex: 1,
  });
  if (purchaseBuilt.ok) {
    const projection = buildPremiumPurchasedSemanticProjectionV1({
      purchaseInput: purchaseBuilt.value,
      stemLaneIndex: 1,
    });
    if (projection.ok) {
      pushItem(items, {
        surface: 'self.premium.revisit',
        sourceCategory: 'premium_projection',
        variantIdentity: 'light.work',
        headingLabel: 'takeawayJa',
        semanticText: projection.value.takeawayJa,
        sourceOwner: 'lib/m55/narrative/buildPremiumPurchasedSemanticProjectionV1.ts',
      });
      if (projection.value.nextActionJa) {
        pushItem(items, {
          surface: 'self.premium.revisit',
          sourceCategory: 'premium_projection',
          variantIdentity: 'light.work',
          headingLabel: 'nextActionJa',
          semanticText: projection.value.nextActionJa,
          sourceOwner: 'lib/m55/narrative/buildPremiumPurchasedSemanticProjectionV1.ts',
        });
      }

      const premiumNarrative = projectPersonalPremiumNarrativeV1({
        payload: {
          title: 'プレミアムレポート',
          teaserSections: [],
          fullSections: [],
          ownershipType: 'static',
          expiresAt: null,
          aiConsultIncluded: true,
          version: 'v1',
        },
        stemLaneIndex: 1,
        projection: projection.value,
      });
      if (premiumNarrative.takeaway?.text) {
        pushItem(items, {
          surface: 'self.premium.result',
          sourceCategory: 'premium_narrative_takeaway',
          variantIdentity: 'light.work',
          headingLabel: 'takeaway',
          semanticText: premiumNarrative.takeaway.text,
          sourceOwner: 'lib/m55/narrative/projectPersonalPremiumNarrativeV1.ts',
        });
      }
      for (const slot of premiumNarrative.manualSpec.slots) {
        pushItem(items, {
          surface: 'self.premium.result.manual',
          sourceCategory: 'premium_manual_slot',
          variantIdentity: slot.id,
          headingLabel: slot.labelJa,
          semanticText: slot.bodyJa,
          sourceOwner: 'lib/m55/narrative/projectPersonalPremiumNarrativeV1.ts',
        });
      }

      const premiumShare = projectPremiumPublicShareV1({
        stemLaneIndex: projection.value.stemLaneIndex,
        answerAxes: projection.value.axes,
        birthAxes: projection.value.birthAxes,
        hingeAxisId: projection.value.hingeAxisId,
        premiumTakeawayJa: projection.value.takeawayJa,
      });
      pushItem(items, {
        surface: 'self.premium.share_card',
        sourceCategory: 'premium_public_share',
        variantIdentity: 'premium_takeaway',
        headingLabel: premiumShare.headline,
        semanticText: premiumShare.body,
        shareTextJa: premiumShare.shareTextJa,
        sourceOwner: 'lib/m55/narrative/projectPublicShareV1.ts',
      });
      pushItem(items, {
        surface: 'self.premium.share_post',
        sourceCategory: 'premium_public_share',
        variantIdentity: 'premium_takeaway',
        headingLabel: premiumShare.headline,
        semanticText: premiumShare.shareTextJa,
        shareTextJa: premiumShare.shareTextJa,
        sourceOwner: 'lib/m55/narrative/projectPublicShareV1.ts',
      });
    }

    const foundation = buildV2FulfillmentSnapshotFromFields({
      nickname: 'CI',
      birthDate: '1990-01-15',
      birthTime: null,
      birthTimeUnknown: true,
      country: 'JP',
      birthplace: null,
      timezone: null,
    });
    const individualization = composePaidIndividualizationFromEngineContext(foundation.engine_context_json);
    const materialPack = buildPaidDtrChapterMaterialPack(
      foundation.engine_context_json,
      individualization,
    );
    const chapterBodies = buildPaidSavedReportChapterBodiesV1({
      draft: purchaseBuilt.value.individualization,
      materialPack,
    });
    for (const [sectionId, body] of Object.entries(chapterBodies)) {
      if (!body?.trim()) continue;
      pushItem(items, {
        surface: 'self.premium.report.chapter',
        sourceCategory: 'paid_saved_report_body',
        variantIdentity: sectionId,
        headingLabel: sectionId,
        semanticText: body.trim(),
        sourceOwner: 'lib/m55/paidResult/buildPaidSavedReportChapterBodiesV1.ts',
      });
    }
  }

  return items;
}

export function collectShareCardParseIntegrityFindings(
  corpus: readonly ContentIntegrityCorpusItem[],
): ContentIntegrityFinding[] {
  const findings: ContentIntegrityFinding[] = [];
  for (const item of corpus) {
    if (item.surface !== 'self.free.share_card') continue;
    if (!item.variantIdentity.includes('seen_vs_actual')) continue;
    findings.push(
      ...checkShareCardBodyParseIntegrity({
        itemId: item.itemId,
        body: item.semanticText,
        cta: '',
        variant: 'seen_vs_actual',
      }),
    );
  }
  return findings;
}

export type ContentIntegrityCorpusExportLine = ContentIntegrityCorpusItem & {
  auditFindings: readonly ContentIntegrityFinding[];
};

export function buildM55ContentIntegrityCorpusExportLines(): ContentIntegrityCorpusExportLine[] {
  const corpus = buildM55ContentIntegrityCorpus();
  const { findings } = runContentIntegrityAudit(corpus);
  const parseFindings = collectShareCardParseIntegrityFindings(corpus);
  const allFindings = [...findings, ...parseFindings];
  const byItem = new Map<string, ContentIntegrityFinding[]>();
  for (const f of allFindings) {
    const list = byItem.get(f.itemId) ?? [];
    list.push(f);
    byItem.set(f.itemId, list);
  }
  return corpus.map((item) => ({
    ...item,
    auditFindings: byItem.get(item.itemId) ?? [],
  }));
}
