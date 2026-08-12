import { PAID_DTR_CHAPTERS } from './paidDtrProductCopy';

/**
 * Fixture-safe static copy for HOME free-result preview (no profile / DOB).
 *
 * Every field below is verbatim output of `buildFreeDepthAnalysisV1` for the
 * sample input in `HOME_FREE_PREVIEW_SOURCE`, so the HOME sample cannot drift
 * from the free result users actually receive.
 * `homeFreePreviewFidelity.test.ts` regenerates and compares.
 */
export const HOME_FREE_PREVIEW_SOURCE = {
  birthDate: '1990-05-14',
  stemLaneIndex: 1,
  freeAnswerSet: {
    'free.start_style': 'free.start_style.ask_first',
    'free.decision_style': 'free.decision_style.sort_first',
    'free.recovery_style': 'free.recovery_style.pause_short',
    'free.distance_style': 'free.distance_style.close_careful',
    'free.change_style': 'free.change_style.adjust_fast',
    'free.primary_theme': 'free.primary_theme.relation',
  },
} as const;

export const HOME_FREE_PREVIEW_FIXTURE = {
  /** Representative persona for UI hierarchy only — not a default or ranking. */
  personaNameJa: 'プランナー',
  qualityLabelJa: '適応の資質',
  headlineJa: '周囲の視点を集め、候補を比べてから決める傾向が、いま強く表れています。',
  sceneLabelJa: '仕事や判断',
  sceneBodyJa:
    '仕事や判断では、判断材料が足りないとき、関係者に確認や共有を足してから動く場面や、候補が複数あるときに比較表を作ってから選ぶ場面が重なりやすいです。材料や区切りがあるほど、同じパターンがはっきり出ます。',
  strengthHeadingJa: 'この傾向が活きるとき',
  strengthConditionsJa: [
    '確認先や情報が手元に増えるとき',
    '比較できる材料が揃っているとき',
    '短い休みや区切りが取れるとき',
  ],
  loadHeadingJa: '同じ傾向が重くなるとき',
  loadConditionsJa: [
    '相談先がなく一人で抱え込むとき',
    '境界が曖昧なまま関わりが続くとき',
    '小さな修正の余地なく大転換だけを求められるとき',
  ],
  openQuestionJa:
    '比較できる材料が揃っているときは流れがつながるのに、相談先がなく一人で抱え込むときに同じ動きが止まります。この差がどこから来るのかは、人との距離まで含めて見ないと決まりません。',
} as const;

const chapterOne = PAID_DTR_CHAPTERS[0];

/** Fixture-safe static copy for HOME premium preview (no live report / wallet). */
export const HOME_PREMIUM_PREVIEW_FIXTURE = {
  productTitleJa: 'M55 プレミアムレポート',
  activeChapterRoman: chapterOne.roman,
  activeChapterTitleJa: chapterOne.title,
  chapterBodyJa:
    '今の自分に出やすい傾向の全体像を、責めずに整理します。生年月日から見える基礎傾向と、今の回答に表れる内面を重ね、自分の動き方や、人との関係に表れやすい流れを、複数の視点から読み解いていきます。',
  chapters: PAID_DTR_CHAPTERS.map((ch) => ({
    roman: ch.roman,
    titleJa: ch.title,
  })),
} as const;
