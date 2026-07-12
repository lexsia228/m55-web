/**
 * Deterministic paid saved-report chapter bodies from individualization selectors-v1.
 * Uses paidChapterEmphasisIds as composition authority (not chapterBias).
 */
import type { IndividualizationDraft } from '../individualization/types';
import type { PaidChapterEmphasisIdV1 } from '../individualization/individualizationSelectorTypesV1';
import type { ChapterMaterialPack } from '../dtrPaidChapterMaterialPack';
import type { PaidDtrGeneratedChapterBodies } from '../dtrEngine';
import { PAID_CHAPTER_EMPHASIS_COPY_V1 } from './paidChapterEmphasisCopyV1';
import { buildFakeSectionBody } from '../dtrPaidChapterBodyGen';

function emphasisParagraphs(
  ids: readonly PaidChapterEmphasisIdV1[],
): string {
  const lines = ids
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

function alignDivergeParagraph(draft: IndividualizationDraft): string {
  const align = draft.fingerprint.alignItems[0];
  const diverge = draft.fingerprint.divergeItems[0];
  const parts: string[] = [];
  if (align) {
    parts.push(
      `土台と今が重なりやすいのは、${AXIS_LABEL_JA[align.axisId]}の視点です。`,
    );
  }
  if (diverge) {
    parts.push(
      `少し異なるのは、${AXIS_LABEL_JA[diverge.axisId]}の視点です。良し悪しではなく、いまの表れ方の差として見てください。`,
    );
  }
  if (!parts.length) return '';
  return `\n\n${parts.join('\n')}`;
}

function themeParagraph(draft: IndividualizationDraft): string {
  const primary = draft.fingerprint.freeExpression.primaryReplyTheme;
  const map: Record<string, string> = {
    work: '仕事・進め方',
    relation: '人との関係',
    fatigue: '疲れ・生活のリズム',
    tendency: '自分の傾向の読み方',
    report: 'あとでじっくり読み返せる形',
  };
  const label = primary != null ? (map[primary] ?? 'いまの読みの入口') : 'いまの読みの入口';
  return `\n\nいまの読みの入口は、「${label}」に近いところです。`;
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

  const baseS1 = buildFakeSectionBody(params.materialPack, 's1_identity');
  const baseS2 = buildFakeSectionBody(params.materialPack, 's2_composition');
  const baseS3 = buildFakeSectionBody(params.materialPack, 's3_essence');
  const baseS4 = buildFakeSectionBody(params.materialPack, 's4_strengths');

  const bridge = alignDivergeParagraph(params.draft) + themeParagraph(params.draft);

  return {
    s1_identity:
      baseS1 +
      emphasisParagraphs(emphasis.chapter1) +
      bridge,
    s2_composition:
      baseS2 + emphasisParagraphs(emphasis.chapter2),
    s3_essence:
      baseS3 + emphasisParagraphs(emphasis.chapter3),
    s4_strengths:
      baseS4 + emphasisParagraphs(emphasis.chapter4),
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
