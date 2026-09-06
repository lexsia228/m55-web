/**
 * Deterministic paid saved-report chapter bodies from individualization selectors-v1.
 * Uses paidChapterEmphasisIds as composition authority (not chapterBias).
 * Production path — never uses test/fake chapter body generator.
 *
 * Q1 editorial progression:
 *   s1 portrait → s2 mechanism/conditions → s3 expression/load → s4 handling/return
 */
import type { IndividualizationDraft } from '../individualization/types';
import type { PaidChapterEmphasisIdV1 } from '../individualization/individualizationSelectorTypesV1';
import type { ChapterMaterialPack } from '../dtrPaidChapterMaterialPack';
import type { PaidDtrGeneratedChapterBodies } from '../dtrEngine';
import {
  PAID_CHAPTER_EMPHASIS_COPY_V1,
  PAID_CHAPTER_EMPHASIS_EXPLANATION_V1,
} from './paidChapterEmphasisCopyV1';

function selectorBoundSubstance(ids: readonly PaidChapterEmphasisIdV1[]): string {
  const paragraphs = ids
    .map((id) => PAID_CHAPTER_EMPHASIS_EXPLANATION_V1[id])
    .filter((text): text is string => Boolean(text?.trim()));
  if (!paragraphs.length) return '';
  return `\n\n${paragraphs.join('\n\n')}`;
}

/** Fallback only — skip when substantive explanation already covers this ID. */
function consequenceTail(ids: readonly PaidChapterEmphasisIdV1[]): string {
  const lines = ids
    .filter((id) => !PAID_CHAPTER_EMPHASIS_EXPLANATION_V1[id]?.trim())
    .map((id) => PAID_CHAPTER_EMPHASIS_COPY_V1[id])
    .filter(Boolean);
  if (!lines.length) return '';
  return `\n\n${lines.join('\n')}`;
}

import type { ExpressionAxisId } from '../individualization/types';

const AXIS_LABEL_JA: Readonly<Record<ExpressionAxisId, string>> = {
  start: '始め方',
  decision: '決め方',
  recovery: '回復の仕方',
  distance: '距離の取り方',
  change: '変化への向き合い方',
};

/** Portrait layer — one compact align/diverge read (chapter I only). */
function alignDivergeParagraph(draft: IndividualizationDraft): string {
  const align = draft.fingerprint.alignItems[0];
  const diverge = draft.fingerprint.divergeItems[0];
  if (!align && !diverge) return '';

  const cues: string[] = [];
  if (align) {
    cues.push(`${AXIS_LABEL_JA[align.axisId]}の視点では重なりやすい`);
  }
  if (diverge) {
    cues.push(`${AXIS_LABEL_JA[diverge.axisId]}の視点では少しずれる`);
  }
  const cueText =
    cues.length === 2
      ? `${cues[0]}一方、${cues[1]}`
      : cues[0] ?? '';

  return `\n\nこのレポートで生年月日から置く基調と、今の回答を分けて見ると、${cueText}ことが手がかりになります。`;
}

/** Portrait layer — primary theme entry point (chapter I only). */
function themeParagraph(draft: IndividualizationDraft): string {
  const primary = draft.fingerprint.freeExpression.primaryReplyTheme;
  const map: Record<string, string> = {
    work: '仕事・進め方',
    relation: '人との関係',
    fatigue: '疲れ・生活のリズム',
    tendency: '自分の傾向の読み方',
    report_preview: '全体の整理',
  };
  const label = primary != null ? (map[primary] ?? 'いまの読み') : 'いまの読み';
  return `\n\nいまの入口は、「${label}」に近いところです。`;
}

function chapterDomainBody(
  materialPack: ChapterMaterialPack,
  sectionId: 's1_identity' | 's2_composition' | 's3_essence' | 's4_strengths',
): string {
  const seed = materialPack.seedBodies[sectionId];
  if (!seed?.trim()) return '';

  const domainNotes: string[] = [seed];

  if (sectionId === 's1_identity' && materialPack.identityDesignViz.blueprint.core) {
    domainNotes.push(`\n\n${materialPack.identityDesignViz.blueprint.core}`);
  }
  if (sectionId === 's2_composition' && materialPack.compositionStructureViz.patternCaption) {
    domainNotes.push(`\n\n${materialPack.compositionStructureViz.patternCaption}`);
  }
  if (sectionId === 's3_essence' && materialPack.essenceStabilityViz.stabilize) {
    domainNotes.push(`\n\n${materialPack.essenceStabilityViz.stabilize}`);
  }
  if (sectionId === 's4_strengths' && materialPack.handlingHint) {
    domainNotes.push(`\n\n${materialPack.handlingHint}`);
  }

  return domainNotes.join('');
}

/** Chapter I — portrait bridge only; no ch1 catalog explanation/tail blocks. */
function chapterPortraitEditorialLayer(draft: IndividualizationDraft): string {
  return alignDivergeParagraph(draft) + themeParagraph(draft);
}

function chapterEditorialLayer(ids: readonly PaidChapterEmphasisIdV1[]): string {
  const substance = selectorBoundSubstance(ids);
  const tail = consequenceTail(ids);
  return substance + tail;
}

/**
 * Build four chapter bodies (Light/FULL identical for same input).
 */
export function buildPaidSavedReportChapterBodiesV1(params: {
  draft: IndividualizationDraft;
  materialPack: ChapterMaterialPack;
}): PaidDtrGeneratedChapterBodies {
  const selectors = params.draft.fingerprint.selectors;
  if (!selectors) {
    throw new Error('missing_selectors');
  }
  const emphasis = selectors.paidChapterEmphasisIds;

  const portraitBase = chapterDomainBody(params.materialPack, 's1_identity');
  const mechanismBase = chapterDomainBody(params.materialPack, 's2_composition');
  const expressionBase = chapterDomainBody(params.materialPack, 's3_essence');
  const handlingBase = chapterDomainBody(params.materialPack, 's4_strengths');

  return {
    s1_identity: portraitBase + chapterPortraitEditorialLayer(params.draft),
    s2_composition: mechanismBase + chapterEditorialLayer(emphasis.chapter2),
    s3_essence: expressionBase + chapterEditorialLayer(emphasis.chapter3),
    s4_strengths: handlingBase + chapterEditorialLayer(emphasis.chapter4),
  };
}

export function hashChapterBodiesForEquality(
  bodies: PaidDtrGeneratedChapterBodies,
): string {
  const parts = [
    bodies.s1_identity ?? '',
    bodies.s2_composition ?? '',
    bodies.s3_essence ?? '',
    bodies.s4_strengths ?? '',
  ];
  return parts.join('\u001f');
}

/** Test/export helper — substantive selector-bound paragraphs for a chapter emphasis set. */
export function collectSelectorBoundSubstanceText(
  ids: readonly PaidChapterEmphasisIdV1[],
): string {
  return selectorBoundSubstance(ids).replace(/^\n+/, '');
}
