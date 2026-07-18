import { PAID_DTR_CHAPTERS } from './paidDtrProductCopy';

/** Fixture-safe static copy for HOME free-result preview (no profile / DOB). */
export const HOME_FREE_PREVIEW_FIXTURE = {
  /** Representative persona for UI hierarchy only — not a default or ranking. */
  personaNameJa: 'プランナー',
  qualityLabelJa: '適応の資質',
  summaryJa:
    '近い人との関係で、距離の取り方に迷いやすい場面があります。負担が重なったときは、一度整える順番を見直す手がかりになります。',
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
