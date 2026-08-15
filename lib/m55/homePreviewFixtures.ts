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
  headlineJa:
    '普段は間を取っているのに、会話の中では距離を言葉にしてしまう。丁寧に見える一方、あとから「近づきすぎた」が残る。普段は間を取っている相手に、会話の途中で距離を言葉にする。出す前の段取りを、誰かへ一度見せにいくときに起きやすい。予定を変えるか迷うとき、差分修正に見えても本人はやり直しの手を動かしている。返信を翌朝まで置いた朝に、同じ動きが出る。周りには、場の流れを読んでから動く人に見える。',
  sceneLabelJa: '人との距離',
  sceneBodyJa:
    '人との距離では、会話の中で「今は少し離れる／近づく」を言葉にした直後に、自分の中で言い方を再点検する場面が典型です。',
  strengthHeadingJa: 'この傾向が活きるとき',
  strengthConditionsJa: [
    '途中経過を共有でき、一人で並べ直す時間も残るとき',
    '相談が決定と誤解されないとき',
    '確認先が増えても結論を急かされないとき',
  ],
  loadHeadingJa: '同じ傾向が重くなるとき',
  loadConditionsJa: [
    '境界が曖昧なまま関わりが続くとき',
    '小さな修正の余地なく大転換だけを求められるとき',
    '近い関係で再点検が「今さら」に見えるとき',
  ],
  openQuestionJa:
    '途中経過を共有でき、一人で並べ直す時間も残るときは同じ動きがつながるのに、境界が曖昧なまま関わりが続くときにその動きが止まります。この差が、距離の整え方と変化の最初の一手のどちらから来るのかは、場面を分けて見ないと決まりません。',
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
