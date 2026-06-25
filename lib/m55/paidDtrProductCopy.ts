/**
 * Paid DTR Product Copy Master — runtime SSOT (display/copy only).
 * Governance: docs/ssot/M55_PAID_DTR_PRODUCT_COPY_MASTER_v1.md
 *
 * Do not import engine, payment, DB, or auth modules here.
 * Downstream surfaces (LP, Core, My, shelf, reader, ConsultRoom) wire in later gates.
 */

import {
  LABEL_FORMAT_SAVED,
  LABEL_PRODUCT_EN,
  LABEL_PRODUCT_JP,
  LABEL_STATE_OWNED,
} from './dtrProductLabels';
import {
  ADDITIONAL_REPLY_TICKET_PRODUCT_KEY,
  DTR_CORE_FULL_V1_PRODUCT_KEY,
  DTR_CORE_LIGHT_TO_FULL_UPGRADE_V1_PRODUCT_KEY,
  DTR_CORE_LIGHT_V1_PRODUCT_KEY,
  LEGACY_ADDITIONAL_REPLY_TICKET_PRICE_YEN,
  REPLY_TICKET_FULL_MAX_PURCHASED_COUNT,
  REPLY_TICKET_INCLUDED_COUNT,
  REPLY_TICKET_TOTAL_CAP_PER_REPORT,
} from './reply/replyTicketCheckoutConstants';

export const PAID_DTR_PRODUCT_COPY_VERSION = 'm55-paid-dtr-product-copy-v1' as const;

export const PAID_DTR_PRODUCT_IDENTITY = {
  version: PAID_DTR_PRODUCT_COPY_VERSION,
  primaryNameJa: LABEL_PRODUCT_JP,
  formatLabel: LABEL_FORMAT_SAVED,
  ownedStateLabel: LABEL_STATE_OWNED,
  auxiliaryNameEn: LABEL_PRODUCT_EN,
  shortNameJa: '本質の読み解き',
  /** User-facing primary term for the consultation feature */
  consultPrimaryTermJa: '相談返書',
  /** Explanatory bridge only — not the default UI label */
  consultBridgeTermJa: 'AI往復券',
  termsNotForPrimaryUse: [
    'Entry Report',
    'Premium',
    'Blueprint',
    'DTR Core Static V1',
    '汎用AIチャット',
    '汎用チャット',
    '診断',
    '占い',
    '鑑定',
    '当たる',
    '開運',
  ] as const,
} as const;

export const PAID_DTR_VALUE_PROPOSITION = {
  oneSentenceJa:
    '無料の見取り図で見えた輪郭を土台に、保存版は章立てで読み返しながら、近い人との距離・消耗・迷い・整え方を自分の暮らしの中で読み直せる有料レポートです。',
  leadParagraphJa:
    '自分の形を知ると、少し楽になる。M55は、そのための見取り図です。保存版では、いまの傾向を章立てで深く整理し、必要なときに相談返書で論点を絞り込めます。',
  notAClaim: [
    '占いや鑑定の結果ではありません',
    '汎用の会話ボットではありません',
    '未来や結果を断定するものではありません',
  ] as const,
} as const;

export const PAID_DTR_FREE_VS_PAID = {
  freeCoreLabelJa: '無料の見取り図',
  paidSavedLabelJa: `${LABEL_FORMAT_SAVED}（${LABEL_PRODUCT_JP}）`,
  freeGives: [
    '生年月日とニックネームから、いま出やすい傾向の輪郭を読む入口',
    '日々の人間関係やひとり時間など、5つの出方から見た入口の整理',
    '保存版へ進む前に、自分の読み方の土台をつかむ',
  ] as const,
  paidAdds: [
    '4章構成で読み返せる保存版レポート（購入時プロフィールに基づく）',
    '力が出やすい場面・無理がたまりやすい条件・戻し方を順に整理',
    '購入に付帯する相談返書 1件（レポートの章に沿った深掘り）',
  ] as const,
  paidIsNotMerely: '無料ページの長文コピーではありません。章立て・保存・相談返書まで含む別商品です。',
  bundleNoteJa: `${LABEL_PRODUCT_JP}に加え、相談返書の利用が含まれます。`,
} as const;

export type PaidDtrChapterId = 'outline' | 'structure' | 'strain' | 'ease';

export const PAID_DTR_CHAPTERS = [
  {
    id: 'outline' as const,
    roman: 'Ⅰ',
    title: '輪郭を見る',
    catch: '広げるより、深める',
    tocTag: '全体像',
    helpsUnderstandJa:
      '今の自分に出やすい傾向の全体像を、責めずに整理する',
    lifeConcernJa: 'いまの自分の出方・入口としての輪郭',
    readerDescJa: '今の自分に出やすい傾向を整理する',
  },
  {
    id: 'structure' as const,
    roman: 'Ⅱ',
    title: '構造を読む',
    tocTag: '動き方の理由',
    helpsUnderstandJa:
      'なぜ力が出るのか、どこで安定しやすいのかを読む',
    lifeConcernJa: '近い人との距離や日々の判断で出やすい流れ',
    readerDescJa: 'なぜ力が出るのか、どこで安定するのかを見る',
  },
  {
    id: 'strain' as const,
    roman: 'Ⅲ',
    title: '無理を知る',
    tocTag: '崩れやすい条件',
    helpsUnderstandJa:
      '無理が出やすい場面を、自分を責めずに整理する',
    lifeConcernJa: '疲れ・消耗・人間関係の負荷',
    readerDescJa: '無理が出やすい場面を、責めずに整理する',
  },
  {
    id: 'ease' as const,
    roman: 'Ⅳ',
    title: '楽に扱う',
    tocTag: '戻し方と使い方',
    helpsUnderstandJa:
      '戻し方・整え方・日常での使い方を具体的に扱う',
    lifeConcernJa: '回復・整え方・自分への扱い方',
    readerDescJa: '戻し方・整え方・日常での使い方',
  },
] as const;

/** /dtr/core reader hero — read-back axis (product name stays LABEL_PRODUCT_JP). */
export const PAID_DTR_READER_HERO_READ_BACK_PREFIX_JA = 'この保存版で読み返す' as const;

/** PremiumDrawerHub shell copy (drawer row labels are action-oriented; chapter titles from PAID_DTR_CHAPTERS). */
export const PAID_DTR_DRAWER_HUB = {
  ariaLabelJa: '保存版の入口',
  overlineJa: '保存版の入口',
  titleJa: 'この保存版で読み返すこと',
  leadJa: '気になるところから、静かに読み返せます。',
  chapterRowLabelsJa: [
    'まず、全体を読み返す',
    '力が出やすい条件を読む',
    '無理が出やすい場面を読む',
    '戻し方と使い方を読む',
  ] as const,
  consultLabelJa: '相談返書で整理する',
  consultSublabelJa: '保存版に紐づく相談',
} as const;

/** PremiumDrawerHub theme-first entry rows — labels align with PAID_DTR_CONSULT_REPLY.themeExamplesJa. */
export type PaidDtrDrawerThemeEntryId =
  | 'theme-relationship'
  | 'theme-work'
  | 'theme-money'
  | 'theme-forward'
  | 'theme-rest';

export type PaidDtrDrawerThemePrimaryPanel =
  | 'chapter-1'
  | 'chapter-2'
  | 'chapter-3'
  | 'chapter-4';

export type PaidDtrDrawerThemeEntry = {
  id: PaidDtrDrawerThemeEntryId;
  labelJa: string;
  sublabelJa: string;
  primaryPanel: PaidDtrDrawerThemePrimaryPanel;
  primaryChapterJa: string;
  relatedChaptersJa: readonly string[];
  pillLabelJa: string;
};

/**
 * Five consult themes — ConsultRoom Step 1 + consultReplyThemePartMap.
 * Not used for PremiumDrawerHub row labels after W-A1 v1.2 (see PAID_DTR_DRAWER_CHAPTER_ENTRIES).
 */
export const PAID_DTR_DRAWER_THEME_ENTRIES: readonly PaidDtrDrawerThemeEntry[] = [
  {
    id: 'theme-relationship',
    labelJa: '恋人・近い人との向き合い方',
    sublabelJa: '距離感・言葉選び・無理の出方を見る',
    primaryPanel: 'chapter-3',
    primaryChapterJa: 'Ⅲ 無理を知る',
    relatedChaptersJa: ['Ⅰ 輪郭を見る', 'Ⅱ 構造を読む'],
    pillLabelJa: '読',
  },
  {
    id: 'theme-work',
    labelJa: '仕事・スキルの伸ばし方',
    sublabelJa: '力が出やすい条件と、詰まりやすい流れを見る',
    primaryPanel: 'chapter-2',
    primaryChapterJa: 'Ⅱ 構造を読む',
    relatedChaptersJa: ['Ⅰ 輪郭を見る', 'Ⅲ 無理を知る'],
    pillLabelJa: '読',
  },
  {
    id: 'theme-money',
    labelJa: 'お金・生活の整え方',
    sublabelJa: '生活の余白と、日々の判断の整え方を見る',
    primaryPanel: 'chapter-4',
    primaryChapterJa: 'Ⅳ 楽に扱う',
    relatedChaptersJa: ['Ⅲ 無理を知る'],
    pillLabelJa: '読',
  },
  {
    id: 'theme-forward',
    labelJa: 'これからの動き方',
    sublabelJa: '今の優先と、負荷の少ない進め方を見る',
    primaryPanel: 'chapter-2',
    primaryChapterJa: 'Ⅱ 構造を読む',
    relatedChaptersJa: ['Ⅳ 楽に扱う', 'Ⅰ 輪郭を見る'],
    pillLabelJa: '読',
  },
  {
    id: 'theme-rest',
    labelJa: '疲れたときの戻り方',
    sublabelJa: '無理のサインと、戻り方を見る',
    primaryPanel: 'chapter-4',
    primaryChapterJa: 'Ⅳ 楽に扱う',
    relatedChaptersJa: ['Ⅲ 無理を知る'],
    pillLabelJa: '読',
  },
] as const;

/** PremiumDrawerHub — 4-chapter integrated surface (user-interest labels; Ⅰ〜Ⅳ skeleton preserved). */
export type PaidDtrDrawerChapterEntryId =
  | 'chapter-entry-1'
  | 'chapter-entry-2'
  | 'chapter-entry-3'
  | 'chapter-entry-4';

export type PaidDtrDrawerChapterEntry = {
  id: PaidDtrDrawerChapterEntryId;
  pillLabelJa: string;
  labelJa: string;
  sublabelJa: string;
  panel: PaidDtrDrawerThemePrimaryPanel;
  primaryChapterJa: string;
};

export const PAID_DTR_DRAWER_CHAPTER_ENTRIES: readonly PaidDtrDrawerChapterEntry[] = [
  {
    id: 'chapter-entry-1',
    pillLabelJa: 'Ⅰ',
    labelJa: '自分の形を知る',
    sublabelJa: '今の悩みを読み直す土台',
    panel: 'chapter-1',
    primaryChapterJa: 'Ⅰ 輪郭を見る',
  },
  {
    id: 'chapter-entry-2',
    pillLabelJa: 'Ⅱ',
    labelJa: '仕事・これからの進め方',
    sublabelJa: '力が出る条件と、優先順位を見る',
    panel: 'chapter-2',
    primaryChapterJa: 'Ⅱ 構造を読む',
  },
  {
    id: 'chapter-entry-3',
    pillLabelJa: 'Ⅲ',
    labelJa: '恋人・近い人との向き合い方',
    sublabelJa: '距離感・言葉選び・無理の出方を見る',
    panel: 'chapter-3',
    primaryChapterJa: 'Ⅲ 無理を知る',
  },
  {
    id: 'chapter-entry-4',
    pillLabelJa: 'Ⅳ',
    labelJa: 'お金・生活・疲れの整え方',
    sublabelJa: '生活の余白と、戻り方を見る',
    panel: 'chapter-4',
    primaryChapterJa: 'Ⅳ 楽に扱う',
  },
] as const;

const PAID_DTR_CHAPTER_ANCHOR_BY_ID: Record<PaidDtrChapterId, string> = {
  outline: 'section-overview',
  structure: 'section-structure',
  strain: 'section-strain',
  ease: 'section-practice',
};

const PAID_DTR_CHAPTER_PART_ID: Record<PaidDtrChapterId, '1' | '2' | '3' | '4'> = {
  outline: '1',
  structure: '2',
  strain: '3',
  ease: '4',
};

export type PaidDtrReportPartId = '1' | '2' | '3' | '4';

/** Drawer chapter surface — user-centric (W-B1 refine). Engine / snapshot unchanged. */
export type PaidDtrChapterDrawerIntro = {
  partId: PaidDtrReportPartId;
  hubLabelJa: string;
  hubSublabelJa: string;
  personalHeadingSuffixJa: string;
  /** Screen-reader / mapping only — not shown as primary UI */
  legacyChapterTitleJa: string;
};

export const PAID_DTR_CHAPTER_DRAWER_INTRO: Record<PaidDtrReportPartId, PaidDtrChapterDrawerIntro> = {
  '1': {
    partId: '1',
    hubLabelJa: '自分の形を知る',
    hubSublabelJa: '今の悩みを読み直す土台',
    personalHeadingSuffixJa: 'の形',
    legacyChapterTitleJa: '輪郭を見る',
  },
  '2': {
    partId: '2',
    hubLabelJa: '仕事・これからの進め方',
    hubSublabelJa: '力が出る条件と、優先順位を見る',
    personalHeadingSuffixJa: 'の進め方',
    legacyChapterTitleJa: '構造を読む',
  },
  '3': {
    partId: '3',
    hubLabelJa: '恋人・近い人との向き合い方',
    hubSublabelJa: '距離感・言葉選び・無理の出方を見る',
    personalHeadingSuffixJa: 'の近い人との向き合い方',
    legacyChapterTitleJa: '無理を知る',
  },
  '4': {
    partId: '4',
    hubLabelJa: 'お金・生活・疲れの整え方',
    hubSublabelJa: '生活の余白と、戻り方を見る',
    personalHeadingSuffixJa: 'の整え方',
    legacyChapterTitleJa: '楽に扱う',
  },
} as const;

/** One-line graph meaning — placed immediately before each viz (W-B1). */
export type PaidDtrChapterGraphCaptionId =
  | 'ch1-identity-design'
  | 'ch1-structure-radar'
  | 'ch1-five-axis'
  | 'ch2-stability-panel'
  | 'ch2-strengths-lift'
  | 'ch2-trait-interaction'
  | 'ch3-friction-warning'
  | 'ch3-comm-flow'
  | 'ch3-domain-scenes'
  | 'ch4-work-guide'
  | 'ch4-practical-guidance'
  | 'ch4-friction-recovery';

export const PAID_DTR_CHAPTER_GRAPH_CAPTION_LEAD_JA = 'この図で見ること' as const;

export const PAID_DTR_CHAPTER_GRAPH_CAPTIONS: Record<PaidDtrChapterGraphCaptionId, string> = {
  'ch1-identity-design': '出るとき・崩れやすいとき・戻すとき',
  'ch1-structure-radar': '出方が重なるところ',
  'ch1-five-axis': '5つの力のバランス',
  'ch2-stability-panel': '力が出やすい条件と詰まりやすい条件',
  'ch2-strengths-lift': '力が自然に出やすい場面',
  'ch2-trait-interaction': '出やすい力と無理の重なり',
  'ch3-friction-warning': '無理が出やすい場面',
  'ch3-comm-flow': '言葉と距離の流れ',
  'ch3-domain-scenes': '近い人を中心にした場面の見方',
  'ch4-work-guide': '余白が戻るときの見方',
  'ch4-practical-guidance': 'お金・生活・疲れが重いときの戻し方',
  'ch4-friction-recovery': 'つまずきから戻る流れ',
} as const;

/** W-B3: chapter-end bridge copy for consult panel entry (display-only). */
export type PaidDtrChapterBridgeCopy = {
  tendencyJa: string;
  lifeJa: string;
  actionJa: string;
  consultQuestionJa: string;
};

export const PAID_DTR_CHAPTER_BRIDGE_COPY: Record<PaidDtrReportPartId, PaidDtrChapterBridgeCopy> = {
  '1': {
    tendencyJa:
      'M55の読み解きでは、{nickname}さんは、ひとつのことにじっくり向き合うほど力が出やすい出方があります。',
    lifeJa:
      'この章で見えた形を土台にすると、進め方・近い人・整え方のどこで無理が出やすいかを読みやすくなります。',
    actionJa:
      'まずは、今いちばん気になる場面をひとつ選んで、そこで自分の出方がどう重なるかを見てみてください。',
    consultQuestionJa:
      '今の悩みは、私のどの出方が重なって起きていますか？',
  },
  '2': {
    tendencyJa:
      'M55の読み解きでは、{nickname}さんは、力が出る条件が整うと進みやすく、条件が乱れると詰まりやすい出方があります。',
    lifeJa:
      '仕事やこれからの動きでは、先にひとつ整えてから進むほうが、無理なく動きやすくなります。',
    actionJa:
      'まずは、今週いちばん止まりやすい作業の前に、整える条件をひとつ置いてみてください。',
    consultQuestionJa:
      '今の仕事やこれからの動きで、先に整えると楽になる場所はどこですか？',
  },
  '3': {
    tendencyJa:
      'M55の読み解きでは、{nickname}さんは、大切な人ほど言葉や距離に力が入りやすい出方があります。',
    lifeJa:
      '近い人との場面では、正しさを急ぐより、距離と言葉の置き方を整えるほうが戻しやすくなります。',
    actionJa:
      'まずは、言いすぎたと感じた場面で、結論の前にひと呼吸おくところから試してみてください。',
    consultQuestionJa:
      '近い人とのやりとりで、言葉と距離をどう置くと無理が減りますか？',
  },
  '4': {
    tendencyJa:
      'M55の読み解きでは、{nickname}さんは、疲れや不安が重なると、日々の判断が重くなりやすい出方があります。',
    lifeJa:
      'お金や生活の不安は、一気に答えを出すより、まず負担を一つ軽くするほうが扱いやすくなります。',
    actionJa:
      'まずは、いま重い負担を一つだけ横に置き、休める時間を先に作るところから試してみてください。',
    consultQuestionJa:
      '今の疲れや不安を軽くするために、まず一つ減らすなら何ですか？',
  },
} as const;

export const PAID_DTR_CHAPTER_CONSULT_CTA_LABEL_JA =
  'この章の悩みを、相談返書でひとつに絞る' as const;

export const PAID_DTR_CHAPTER_CONSULT_TRUTH_NOTE_JA =
  '保存版に紐づく1テーマだけを扱います。送信するまで相談返書は使いません。' as const;

/** Chapter-end consult bridge — fixed life-language supplement (no dynamic body excerpt). */
export const PAID_DTR_CHAPTER_BRIDGE_LIFE_SUPPLEMENT_JA =
  'この章では、今の動き方の手がかりも一緒に見ています。' as const;

/** W-B3 refine: unified chapter opening (user-specific, life-language, display-only). */
export type PaidDtrChapterOpeningCopy = {
  headingSuffixJa: string;
  tendencyJa: string;
  reasonJa?: string;
  /** Ⅳ章のみ：お金の見方（収入以外の時間・学び・余白） */
  moneyScopeJa?: string;
  /** Ⅳ章のみ：見える化・減らす・守る・つなげるの習慣としての見方 */
  moneyHabitJa?: string;
  lifeJa: string;
  actionJa: string;
  pointsJa: readonly [string, string, string];
};

export const PAID_DTR_CHAPTER_OPENING_COPY: Record<PaidDtrReportPartId, PaidDtrChapterOpeningCopy> = {
  '1': {
    headingSuffixJa: 'の自分の形',
    tendencyJa:
      '{nickname}さんには、ひとつのことを少しずつ良くしていける力があります。完成した瞬間だけではなく、直しながら良くなっていく過程でも力が出やすい形です。',
    reasonJa:
      'M55では、この出方を「じっくり向き合うほど、自分らしさが見えやすくなる形」と読み解きました。',
    lifeJa:
      'そう読んだ理由は、「少しずつ良くしていく力」と「納得できる形まで整えたい気持ち」が強く出ているためです。',
    actionJa:
      'まずは、今の悩みを責めずに見直し、力が戻りやすい場所から読んでいきます。',
    pointsJa: ['一つを深く見られる人', '細かく直して良くできる人', '納得できる形まで整えたい人'],
  },
  '2': {
    headingSuffixJa: 'の進め方',
    tendencyJa:
      '{nickname}さんには、ひとつずつ整えながら前に進める力があります。一気に全部を動かすより、先に条件を整えてから進むほうが、力を出しやすくなります。',
    reasonJa:
      'M55では、この出方を「整える場所が見えるほど、進みやすくなる形」と読み解きました。',
    lifeJa:
      'そう読んだ理由は、力が出やすい条件と、止まりやすい条件が分かれて出ているためです。',
    actionJa:
      'まずは、今の仕事やこれからの動きの中で、先に整える場所を一つ見ていきます。',
    pointsJa: ['全体を見て順番を作れる人', '条件を整えてから動ける人', '急かされると力が散りやすい人'],
  },
  '3': {
    headingSuffixJa: 'の近い人との向き合い方',
    tendencyJa:
      '{nickname}さんには、大切な人ほど丁寧に向き合おうとする力があります。軽く流すより、相手の言葉や空気を受け取りながら、ちゃんと分かり合おうとしやすい形です。',
    reasonJa:
      'M55では、この出方を「近い人ほど、言葉と距離に力が入りやすい形」と読み解きました。',
    lifeJa:
      'そう読んだ理由は、感じ取る力と、納得できるまで向き合いたい気持ちが重なって出ているためです。',
    actionJa:
      'まずは、近い人とのやりとりで、どこに無理がたまりやすいかを見ていきます。',
    pointsJa: [
      '大切な人ほど丁寧に向き合う人',
      '言葉の違和感に気づきやすい人',
      '近くなるほど抱え込みやすい人',
    ],
  },
  '4': {
    headingSuffixJa: 'の整え方',
    moneyScopeJa:
      'ここで見るお金は、収入だけの話ではありません。時間の使い方、学び方、無駄を減らす力、安心して選べる余白まで含めて見ていきます。',
    moneyHabitJa:
      '見える化・減らす・守る・つなげる。無理に増やさず、続けられる形から一つだけ見直します。',
    tendencyJa:
      '{nickname}さんには、生活の小さな乱れや疲れに気づきやすいところがあります。無理をして押し切るより、余白が戻るほど動きやすくなる形です。',
    reasonJa:
      'M55では、この出方を「疲れや不安が重なると、判断が重くなりやすい形」と読み解きました。',
    lifeJa:
      'そう読んだ理由は、整える力がある一方で、お金・予定・生活の負担が重なると、動き出すまでに重さが出やすいためです。',
    actionJa:
      'まずは、お金・予定・生活の中で、どこから余白を戻すと楽になるかを見ていきます。',
    pointsJa: [
      '生活の乱れに気づきやすい人',
      '判断が重なると疲れやすい人',
      '余白が戻ると動きやすい人',
    ],
  },
} as const;

/** W-B3c1 pilot: chapter-1 only graph-reading and chapter-branch guidance. */
export const PAID_DTR_CHAPTER1_PILOT_GUIDE = {
  beforeIdentityGraphJa:
    'まずは「力が出やすいとき」と「止まりやすいとき」の2つを見ると、今の悩みの位置がつかみやすくなります。',
  branchLeadJa:
    '形が見えたら、次は今いちばん重い場面へ進みます。',
  branchItemsJa: [
    '進め方が重いときは、Ⅱ「仕事・これからの進め方」へ。',
    '近い人とのやりとりが重いときは、Ⅲ「恋人・近い人との向き合い方」へ。',
    '疲れ・生活・お金の不安が重いときは、Ⅳ「お金・生活・疲れの整え方」へ。',
  ] as const,
} as const;

/** Deep-reading renewal (W-B3): chapter-end takeaways copy (display-only). */
export type PaidDtrDeepReadingTakeaway = {
  closedTitleJa: string;
  closedLeadJa: string;
  itemsJa: readonly [string, string, string, string];
};

export const PAID_DTR_DEEP_READING_SECTION_TITLE_JA = 'この章で持ち帰ること' as const;

export const PAID_DTR_DEEP_READING_TAKEAWAYS: Record<PaidDtrReportPartId, PaidDtrDeepReadingTakeaway> = {
  '1': {
    closedTitleJa: 'いまの形を、最後に短く整理する',
    closedLeadJa: '力が出やすいとき・止まりやすいとき・戻し方を、短く確認します。',
    itemsJa: [
      '力が出やすいとき: 一つのことに深く向き合い、少しずつ良くしていけるとき。',
      '止まりやすいとき: 急かされたり、途中で細かく割り込まれて、自分のペースを失うとき。',
      'まず意識すること: 始める前に「今日はここまで」と自分の言葉で決めると、力が戻りやすくなります。',
      '返書で深める問い: 今の悩みは、私のどの出方が重なって起きていますか？',
    ],
  },
  '2': {
    closedTitleJa: '仕事とこれからの進め方を、短く確認する',
    closedLeadJa: '力が出やすいとき・止まりやすいときを、先に整える順で見ます。',
    itemsJa: [
      '力が出やすいとき: やることの順番が見え、先に整える場所を一つ決められるとき。',
      '止まりやすいとき: 同時進行や急かしが重なり、どこから手をつけるか分からなくなるとき。',
      'まず意識すること: 今日進めることを一つに絞ると、動き出す場所が見えやすくなります。',
      '返書で深める問い: 今の仕事やこれからの動きで、先に整えると楽になる場所はどこですか？',
    ],
  },
  '3': {
    closedTitleJa: '近い人とのやりとりを、短く確認する',
    closedLeadJa: '言葉・距離・無理の出方を、自分側の扱い方として見直します。',
    itemsJa: [
      '力が出やすいとき: 落ち着いて相手の言葉を聞き、自分の気持ちも少しずつ言葉にできるとき。',
      '止まりやすいとき: 分かってほしい気持ちが強くなり、言葉が強くなったり距離が近くなりすぎるとき。',
      'まず意識すること: 相手を変えようとする前に、自分の言葉と距離を少し整えると、無理が減りやすくなります。',
      '返書で深める問い: 近い人とのやりとりで、言葉と距離をどう置くと無理が減りますか？',
    ],
  },
  '4': {
    closedTitleJa: '生活の余白と戻し方を、短く確認する',
    closedLeadJa: 'お金・生活・疲れを、今日の時間と余白から短く見直します。',
    itemsJa: [
      '力が出やすいとき: 余白があり、今やることを少なくできるとき。',
      '止まりやすいとき: 不安・予定・疲れが重なり、全部を一度に決めようとするとき。',
      'まず意識すること: 見える化・減らす・守る——続けられる習慣として、まず一つだけ見直すと、戻る場所が見えやすくなります。',
      '返書で深める問い: 今の疲れや不安を軽くするために、まず一つ減らすなら何ですか？',
    ],
  },
} as const;

/** Drawer: engine section id → user-facing title (display-only; engine title unchanged). */
export const PAID_DTR_DRAWER_SECTION_DISPLAY_TITLE_BY_ID: Readonly<
  Record<string, string>
> = {
  s2_composition: '出方が重なるところ',
  s3_essence: '力が出やすい条件と安定',
};

export function drawerSectionDisplayTitleJa(section: {
  id: string;
  title: string;
}): string {
  return PAID_DTR_DRAWER_SECTION_DISPLAY_TITLE_BY_ID[section.id] ?? section.title;
}

/** Consult grounding band — life-language labels (W-B1 patch). */
export const PAID_DTR_CONSULT_GROUNDING_COPY = {
  titleLine2Ja: 'この保存版をもとに、今気になっていることを1テーマだけ整理します',
  dividerChipJa: '保存版に紐づく相談返書',
  entryContextAriaJa: '相談返書の入口のコンテキスト',
  continuousSupportOverlineJa: '状況が変わったときの使い方',
  continuousSupportBodyJa:
    '状況が変わったときは、この保存版をもとに、今の感じ方や迷いを相談返書で整理できます。',
  continuousSupportScopeJa:
    '※転職・異動・恋愛・相性・仕事特化など、別レポートで扱うべき領域までは、この解析では広げません。',
  pillarFlowRefJa: '進め方を見る',
  metaReadAxesJa: '自分の形 · 進め方 · 近い人 · 整え方 · 戻し方',
} as const;

/** Consult entry-first layout — display-only (W-B2). */
export const PAID_DTR_CONSULT_ENTRY_LAYOUT = {
  essentialNotesJa: [
    '汎用チャットではなく、無制限の相談でもありません。',
    '保存版に紐づく1テーマだけを扱います。',
    '送信するまで相談返書は使いません。',
  ] as const,
  valueDetailsSummaryJa: '返書で整理できること',
  savedReportAboutSummaryJa: 'この保存版と相談返書について',
  savedReportConsultLeadJa:
    '相談返書では、この保存版をもとに、今気になっていることを1テーマだけ整理します。',
  fixedReportBulletsJa: [
    'レポート本文は購入時点の内容として固定されます',
    '今の感じ方や迷いは相談返書で整理できます',
    '相談返書はこのレポートに紐づいて作成されます',
  ] as const,
  groundingNoteTemplateJa:
    '一般的なアドバイスではなく、{nickname}向けのこの解析内容に基づいた相談返書を作成します。',
  groundingNoteFallbackJa:
    '一般的なアドバイスではなく、この解析内容に基づいた相談返書を作成します。',
} as const;

/** Consult usage card — entry display copy (tier-neutral; no fixed cap table). */
export const PAID_DTR_CONSULT_USAGE_DISPLAY = {
  availablePrimaryJa: '相談返書を使って、1テーマだけ整理できます。',
  availableSecondaryJa: '今気になっていることを、1テーマだけ書けます。',
  /** Legacy SSOT for in-flight tests; not used on consult entry UI surfaces. */
  purchasePrimaryLine1Ja: '今は残り0件です。',
  purchasePrimaryLine2Ja:
    '保存版に紐づく相談返書を、あと{count}件まで追加できます。',
  exhaustedPrimaryJa: '今は相談返書を使えません。',
  exhaustedSecondaryJa: '残数はこの入口で確認できます。',
  capReachedPrimaryJa: 'この保存版で使える相談返書は上限に達しています。',
  capReachedSecondaryJa: 'これまでの返書は引き続き確認できます。',
  usedCountTemplateJa: '使用済み {used}件',
  remainingCompactTemplateJa: '残り {count}件',
  /** Legacy SSOT; not rendered on consult entry UI surfaces. */
  additionalPurchasableTemplateJa: 'あと購入できる {count}件',
} as const;

/** Consult entry LOCAL wave — neutral wallet lines (consult/my only; not LP). */
export const PAID_DTR_CONSULT_ENTRY_NEUTRAL = {
  walletRemainingTemplateJa: '残り {count}件',
  walletUsedTemplateJa: '使用済み {used}件',
  walletExhaustedJa: '今は相談返書を使えません。残数はこの入口で確認できます。',
} as const;

/** Legacy formatter; consult entry UI uses PAID_DTR_CONSULT_ENTRY_NEUTRAL instead. */
export function formatConsultPurchaseAddOnLine(additionalPurchasableCount: number): string {
  return PAID_DTR_CONSULT_USAGE_DISPLAY.purchasePrimaryLine2Ja.replace(
    '{count}',
    String(additionalPurchasableCount)
  );
}

export function formatConsultUsedCountLine(used: number, cap?: number): string {
  if (cap !== undefined) {
    return `使用済み ${used} / ${cap}件`;
  }
  return PAID_DTR_CONSULT_USAGE_DISPLAY.usedCountTemplateJa.replace(
    '{used}',
    String(used)
  );
}

export type PaidDtrReportPartView = {
  partId: PaidDtrReportPartId;
  roman: string;
  name: string;
  catch: string;
  desc: string;
  anchor: string;
  tocTag: string;
  chapterId: PaidDtrChapterId;
};

/** Reader chapter bands + legacy TOC — derived from PAID_DTR_CHAPTERS (display-only). */
export const PAID_DTR_REPORT_PARTS: readonly PaidDtrReportPartView[] = PAID_DTR_CHAPTERS.map((ch) => ({
  partId: PAID_DTR_CHAPTER_PART_ID[ch.id],
  roman: ch.roman,
  name: ch.title,
  catch: 'catch' in ch ? ch.catch : '',
  desc: ch.readerDescJa,
  anchor: PAID_DTR_CHAPTER_ANCHOR_BY_ID[ch.id],
  tocTag: ch.tocTag,
  chapterId: ch.id,
}));

export const PAID_DTR_BENEFITS_HEADING = 'このレポートで分かること' as const;

export const PAID_DTR_BENEFIT_BULLETS = [
  '近い人との関係で、自分らしくいられる距離感',
  '人との距離や言葉選びで、どこで無理がたまりやすいか',
  '疲れやすい条件と、崩れやすい流れ',
  '自分をどこから整えると戻りやすいか',
] as const;

/** /dtr/core reader intro — panel 01 (pre-W1 copy, display-only). */
export const PAID_DTR_INTRO_PANEL_01 = {
  stepLabel: '01',
  overlineJa: '本質の読み解き',
  leadLinesJa: [
    '自分を無理に変えなくていい。',
    '「自分の形」から、今の悩みを読み直すための土台です。',
  ],
  bodyJa:
    'このレポートでは、力が出やすい場面、無理がたまりやすい条件、戻りやすい整え方を順番に見ていきます。',
} as const;

/** /dtr/core reader hero — consult inclusion note (informational only; action via drawer hub). */
export const PAID_DTR_INTRO_CONSULT_NOTE = {
  lineJa: 'このレポートには、相談返書\u00a01件が付いています。',
} as const;

export const PAID_DTR_LIFE_USE_CASES = [
  {
    id: 'work_role',
    titleJa: '日々の役目（仕事・家庭）',
    bodyJa:
      '仕事や家庭で「ちゃんとしよう」と抱えやすい場面で、力が出やすい条件と負荷がたまりやすい流れを整理する',
  },
  {
    id: 'relationships',
    titleJa: '人との距離・関係',
    bodyJa:
      '距離感や期待のずれ、対人での消耗を、自分の出方に結びつけて読む',
  },
  {
    id: 'fatigue',
    titleJa: '消耗・疲れ',
    bodyJa:
      '休めない続きや切り替えの多さなど、崩れやすい条件を先に見える化する',
  },
  {
    id: 'decision',
    titleJa: '迷い・判断',
    bodyJa:
      '急かされる場面や見通しの立ちにくさのなかで、論点を一本化しやすくする',
  },
  {
    id: 'recovery',
    titleJa: '回復・自分への扱い',
    bodyJa:
      '戻し方・整え方・日常での使い方を、無理のない形で試せるようにする',
  },
  {
    id: 'consult_moment',
    titleJa: '相談したいとき',
    bodyJa:
      '保存版を読んだうえで、いまの悩みをレポートの章に沿って相談返書で深める',
  },
] as const;

/**
 * Paid DTR individualization framing — user-facing copy for purchase-time
 * individualized blocks (本質リズム / 補助整理) inside the 保存版 reader.
 *
 * DO NOT expose: lunarMonthKey / solarTermKey / lunarDayKey / boundaryMetadata /
 * stemLaneIndex / djb2 / 甲乙丙丁戊己庚辛壬癸 in UI surfaces.
 * These strings are for display framing only; engine logic is unchanged.
 */
export const PAID_DTR_INDIVIDUALIZATION_FRAMING = {
  /**
   * Shown near individualization blocks in the 保存版 reader
   * (e.g. just above 【この保存版だけの本質リズム】 / 【この保存版だけの補助整理】 headings).
   */
  readerContextJa:
    '保存版では、10資質の入口に加えて、生年月日から出る複合的な読み取りを、購入時点のプロフィールに合わせて本文内に整理しています。',
  /** Clarifies this is NOT a separate 鑑定 — use near the same blocks. */
  notSeparateReadingJa:
    'これは別の鑑定を追加するものではなく、この保存版を読むための補助整理です。',
  /** Snapshot-fixed notice — used on reader or My copy near individualization blocks. */
  snapshotFixedJa:
    'この補助整理は、購入時点のプロフィールをもとに保存されています。',
  /**
   * Consult-room grounding statement: keeps 相談返書 anchored to 保存版 SSOT.
   * (Supplements PAID_DTR_CONSULT_ENTRY_LAYOUT; does not replace it.)
   */
  consultGroundingJa:
    '相談返書では、この保存版に保存された内容をもとに、今の相談を1テーマずつ整理します。',
} as const;

/** Public scope boundaries — display-only; no product spec change. */
export const PAID_DTR_PUBLIC_SCOPE_CLARITY = {
  notDailyWeeklyMonthlyServiceJa:
    'M55は、日次・週次・月次の鑑定を継続して提供するサービスではありません。',
  freeTodayWeeklyContextJa:
    '無料の「今日」「今週」は、入力・表示時点の見取り図として読む補助表現です。',
  savedReportReadbackJa:
    '保存版は、購入時点の入力内容をもとにした読み返し用レポートです。',
  consultReplyDepthJa:
    '時期や状況の深掘りは、保存版に紐づく相談返書の範囲で、件数内・一テーマごとに扱います。',
} as const;

/** Saved-report pricing tiers — Product Truth SSOT (2026-06). Checkout/UI wiring is later gates. */
export const PAID_DTR_SAVED_REPORT_PRICING = {
  light: {
    productKey: DTR_CORE_LIGHT_V1_PRODUCT_KEY,
    priceYen: 1000,
    priceLabelJa: '¥1,000（税込）',
    planNameJa: '保存版ライト',
    headlineJa: '保存版レポート + 相談返書1件つき',
    audienceJa: 'まず保存版を読んで、自分の輪郭を整理したい人向け',
    includedReplyCount: REPLY_TICKET_INCLUDED_COUNT,
  },
  full: {
    productKey: DTR_CORE_FULL_V1_PRODUCT_KEY,
    priceYen: 1480,
    priceLabelJa: '¥1,480（税込）',
    planNameJa: '保存版FULL',
    recommended: true,
    headlineJa: '保存版レポート + 相談返書 合計5件まで',
    audienceJa: '保存版を読んだ後、返書で複数回深めたい人向け',
    totalReplyCap: REPLY_TICKET_TOTAL_CAP_PER_REPORT,
    /** FULL初回: initial_included=1 + purchased_count=4（合計5枠） */
    initialIncludedCount: REPLY_TICKET_INCLUDED_COUNT,
    initialPurchasedGrant: REPLY_TICKET_FULL_MAX_PURCHASED_COUNT,
  },
  lightToFullUpgrade: {
    productKey: DTR_CORE_LIGHT_TO_FULL_UPGRADE_V1_PRODUCT_KEY,
    priceYen: 600,
    priceLabelJa: '¥600（税込）',
    planNameJa: '後からFULL化',
    headlineJa: 'ライト購入後、相談返書を合計5件まで使えるようにする',
    descriptionJa:
      'ライト購入者向け。相談返書枠を合計5件まで増やします。追加1件売りではありません。',
    targetPurchasedCount: REPLY_TICKET_FULL_MAX_PURCHASED_COUNT,
  },
  walletModelJa:
    '付属1件（initial_included_count=1）+ purchased_count 最大4 = 合計5件。FULL初回は purchased_count=4 を一括付与。ライト→FULLは purchased_count を最大4まで差分付与。',
} as const;

/**
 * @legacy ¥500 単品追加相談返書 — 新規販売停止。webhook/RPC 移行完了まで product_key を残す。
 */
export const PAID_DTR_LEGACY_ADDITIONAL_REPLY_TICKET = {
  productKey: ADDITIONAL_REPLY_TICKET_PRODUCT_KEY,
  priceYen: LEGACY_ADDITIONAL_REPLY_TICKET_PRICE_YEN,
  priceLabelJa: '追加相談返書 1件 500円',
  newSalesStopped: true as const,
  noteJa:
    '移行中の Stripe セッション完了時の付与用。新 Product Truth の購入導線では使用しない。',
} as const;

export const PAID_DTR_CONSULT_REPLY = {
  primaryTermJa: '相談返書',
  bridgeTermJa: 'AI往復券',
  includedCount: REPLY_TICKET_INCLUDED_COUNT,
  additionalMaxPurchased: REPLY_TICKET_FULL_MAX_PURCHASED_COUNT,
  totalCapPerReport: REPLY_TICKET_TOTAL_CAP_PER_REPORT,
  /** Primary upgrade price (SSOT). UI 未移行フィールドは legacy* を参照中。 */
  upgradeToFullPriceYen: PAID_DTR_SAVED_REPORT_PRICING.lightToFullUpgrade.priceYen,
  upgradeToFullPriceLabelJa: '後からFULL化 ¥600',
  upgradeToFullDescriptionJa: PAID_DTR_SAVED_REPORT_PRICING.lightToFullUpgrade.descriptionJa,
  oneThemeConsultPhraseJa: '今の1テーマを整理する返書',
  /**
   * @legacy UI / 進行中 checkout 表示ブリッジ — {@link PAID_DTR_LEGACY_ADDITIONAL_REPLY_TICKET}
   * LP・ConsultRoom レーンまで変更しない。
   */
  legacyAdditionalPriceYen: PAID_DTR_LEGACY_ADDITIONAL_REPLY_TICKET.priceYen,
  legacyAdditionalPriceLabelJa: PAID_DTR_LEGACY_ADDITIONAL_REPLY_TICKET.priceLabelJa,
  /** @deprecated Use {@link PAID_DTR_CONSULT_REPLY.upgradeToFullPriceYen} in new copy; UI bridge until price-copy lane. */
  additionalPriceYen: PAID_DTR_LEGACY_ADDITIONAL_REPLY_TICKET.priceYen,
  /** @deprecated Use {@link PAID_DTR_CONSULT_REPLY.upgradeToFullPriceLabelJa} in new copy; UI bridge until price-copy lane. */
  additionalPriceLabelJa: PAID_DTR_LEGACY_ADDITIONAL_REPLY_TICKET.priceLabelJa,
  groundedInReportJa:
    '相談返書は、購入した保存版レポートの章に沿って深掘りするためのものです。別テーマの質問や、レポートと関係のない相談にはお答えできません。',
  notGenericChatJa:
    '汎用のAIチャットではありません。見えている傾向と購入した保存版を土台に、今回の論点を整理します。',
  themeExamplesJa: [
    '恋人・近い人との向き合い方',
    '仕事・スキルの伸ばし方',
    'お金・生活の整え方',
    'これからの動き方',
    '疲れたときの戻り方',
  ] as const,
  goodQuestionExamplesJa: [
    '恋人への伝え方に迷っています。保存版の対話の章を踏まえ、距離と受け取り方を整理したいです',
    '仕事でいま伸ばすところが分からず、構造の章から進め方を絞りたいです',
    'お金や生活の不安で落ち着きません。戻し方の章に沿って、いま整えられることを整理したいです',
  ] as const,
  outOfScopeExamplesJa: [
    'レポートと無関係な別テーマの相談',
    '他者の性格や相性の鑑定',
    '医療・法律・投資の判断や緊急対応',
    '結果や未来の断定・保証の要求',
  ] as const,
  whereToUseJa:
    '購入後、保存版レポート（/dtr/core）内の相談返書の入口で利用します。マイページやレポート棚からレポートを開いたあと、画面内の相談返書へ進みます。',
  consumeNoteJa:
    '1回の送信で相談返書1件を使用します。送信後の取り消しはできません。返書は保存されます。',
  capSummaryJa: '付属1件 + 追加購入最大4件まで（合計5件まで）',
  avoidOverpromisingJa: [
    '無制限の相談やチャットではありません',
    'なんでも答えるボットではありません',
    'レポート本文の生成完了をメールでお知らせする、とは約束しません',
  ] as const,
  /** 保存版紐づき・非汎用・非無制限（room / My 用の短い境界） */
  savedReportLinkedShortJa:
    '保存版に紐づく相談です。汎用チャットではなく、無制限の相談でもありません。',
  oneThemeJa: '1回の相談返書は1テーマに絞ります。',
  shortInputOkJa: '短文でも始められます。',
  longInputNarrowJa: '長文の場合は、1テーマに絞って送ってください。',
  strongEmotionJa:
    '感情が強い内容でも、正しさの判定で終わらせません。',
  conflictPerspectiveJa:
    '対人の違和感では、相手側または状況側の見え方を1つ含めて整理することがあります（悪い／悪くないの結論にはしません）。',
} as const;

/** Consult entry / ticket wallet UI copy (display-only). */
export const PAID_DTR_CONSULT_ROOM_UI = {
  ariaLabelJa: '相談返書の入口（purchaser-only）',
  roomTitleJa: '相談返書の入口',
  roomLeadJa:
    '購入した保存版に紐づく相談です。汎用チャットではなく、無制限の相談でもありません。いまの1テーマを、章に沿って整理します。',
  standalonePageLeadJa:
    '保存版に紐づく相談返書です。見えている傾向を土台に、今回の1テーマを整理します。',
  usageLabelJa: '利用状態',
  /** Display-only wallet usage lines (counts come from API; cap from Product Truth constants). */
  usageUsedCountLabelJa: '使用済み',
  usageAdditionalPurchasableLabelJa: 'あと購入できる',
  walletLoadingJa: '残数確認中です。しばらくお待ちください。',
  savedReportLinkNoteJa:
    'この保存版に紐づいて、4章の内容を深掘りできます。',
  limitReachedReadOnlyJa:
    '相談返書の利用回数の上限に達しました。これまでの返書は引き続き確認できます。',
  cannotPurchaseReportInfoJa:
    '追加購入に必要なレポート情報を確認できないため、購入操作を表示していません。',
  emptyThreadJa:
    '保存版の章に沿って、いまの1テーマをここで整理できます。',
  composeThemeSectionLabelJa: '用途を選択（1テーマ）',
  composeThemeHintJa:
    '1回の相談返書は1テーマに絞ります。短文でも始められます。長い場合は1テーマに絞ってください。',
  composeSupplementaryLabelJa: '補助質問（最大3つ）',
  composeSupplementaryHintJa: '当てはまるものがあれば選択してください',
  composeFreeInputLabelJa: '自由入力',
  composeFreeInputAriaJa: '相談内容を入力（1テーマ・全体で',
  inputPlaceholderJa:
    '今気になっていること（1テーマ）。短く書いても構いません',
  expressionHintJa:
    '返書は、状況に合わせてそっと整理する・はっきり整理する・順番にほどく、のいずれかの方向です（モード選択はありません）。',
  observationInputJa:
    '書いたことや気づいたことに触れながら整理します。正しさの判定や、なんでも肯定する約束はしません。',
  submitLabelJa: '相談返書を作成する',
  submittingLabelJa: '作成中',
  generatingReplyJa: '返答を生成しています…',
  walletLoadingShortJa: '残数確認中...',
  walletLimitReachedBodyJa:
    'このレポートで利用できる相談返書は上限に達しました。',
  walletLimitReachedHintJa:
    '別のテーマを深く扱う場合は、今後の専用レポートで整理できます。',
  walletPurchaseUnavailableJa:
    '現在、このレポートに紐づく追加購入をご利用いただけません。',
  walletPurchaseReportMissingJa:
    '追加購入の準備に必要なレポート情報を確認できませんでした。ページを再読み込みするか、しばらくしてからお試しください。',
  valueDeliverablesTitleJa: 'この返書で整理すること',
  historyMessagesAriaJa: 'これまでの相談返書',
  /** {count} = assistant reply count in thread */
  historyCountTemplateJa: '{count}件の相談返書があります',
  historyShowAllJa: 'すべて見る',
  historyShowLessJa: '閉じる',
  /** {count} = hidden reply count when collapsed */
  historyShowMoreTemplateJa: 'さらに{count}件を表示',
  openToReadJa: '開いて読む',
  closeReadJa: '閉じる',
  latestReplyBadgeJa: '最新の返書',
  loadErrorJa: '相談返書の読み込みに失敗しました。ページを再読み込みしてください。',
  composePanelTitleJa: '今の1テーマを書く',
} as const;

/** My page consult block — IA SSOT v1 (2-state copy; owned CTA only when snapshot ready). */
export const PAID_DTR_MY_PAGE_CONSULT = {
  blockTitleJa: '相談返書',
  blockIntroJa:
    '相談返書は、保存版に紐づく機能です。保存版を利用できる状態になると、保存版内から確認できます。',
  linkedScopeJa:
    '相談は保存版レポートに紐づく範囲です。汎用チャットではなく、無制限の相談でもありません。',
  capSummaryJa:
    '相談返書の利用状況は、保存版内の相談返書画面で確認できます。',
  walletFactNoteJa:
    '利用状況の確認と送信は、保存版を開いたあとの相談返書画面で行えます。',
  remainingNoteJa:
    '1回の相談につき、一つのテーマを書いて返書を受け取ります。',
  reopenNoteJa: '',
  openRoomLinkJa: '相談返書を確認する',
  sectionAriaJa: '相談返書',
} as const;

export type PaidDtrAccessFlowStepId =
  | 'sign_in'
  | 'checkout'
  | 'report_ready'
  | 'my_page'
  | 'dtr_shelf'
  | 'reader'
  | 'consult_room'
  | 'support';

export const PAID_DTR_PURCHASE_ACCESS_FLOW = [
  {
    id: 'sign_in' as const,
    titleJa: 'サインイン',
    bodyJa: '購入と保存版の利用にはログインが必要です。',
  },
  {
    id: 'checkout' as const,
    titleJa: 'お支払い',
    bodyJa:
      '商品ページから決済します。買い切りのデジタルコンテンツです（物理配送なし）。決済の確認は Stripe 経由の決済メールで行えます。',
  },
  {
    id: 'report_ready' as const,
    titleJa: '本文の準備',
    bodyJa:
      '決済後、保存版本文の生成が完了すると閲覧できます。準備中はマイページやレポート棚で状態を確認できます。',
  },
  {
    id: 'my_page' as const,
    titleJa: 'マイページ',
    bodyJa: '所有レポートの再開、プロフィール、サポート導線のハブです。',
  },
  {
    id: 'dtr_shelf' as const,
    titleJa: 'レポート棚',
    bodyJa: '保存版カードから開く・準備状況を確認する入口です。',
  },
  {
    id: 'reader' as const,
    titleJa: '保存版レポート',
    bodyJa: '4章構成の本文を読み返します。購入時点のプロフィールに基づく保存版です。',
  },
  {
    id: 'consult_room' as const,
    titleJa: '相談返書の入口',
    bodyJa: '保存版を読んだうえで、付属の相談返書（必要なら追加購入）を利用します。',
  },
  {
    id: 'support' as const,
    titleJa: 'サポート・返金',
    bodyJa: '不明点は /support、返金・キャンセルは /legal/refund をご確認ください。',
  },
] as const;

export const PAID_DTR_TRUST_BOUNDARIES = {
  digitalContentJa:
    'ウェブ上で提供するデジタルコンテンツ（レポート）です。物理配送はありません。',
  notAdviceJa: '本サービスは医療・法律・投資等の助言ではありません。',
  noGuaranteedOutcomeJa: '結果や未来を保証するものではありません。',
  profileSnapshotJa:
    '保存版は購入時点のプロフィールをもとに作成・保存されています。表示名などが現在と異なる場合があります。',
  supportLinksJa: {
    support: '/support',
    refund: '/legal/refund',
    tokushoho: '/legal/tokushoho',
  },
  priceMainProductYen: 1000,
  priceMainProductLabelJa: '¥1,000（税込）・買い切り',
} as const;

export type PaidDtrSurface =
  | 'lp'
  | 'core'
  | 'reader'
  | 'my'
  | 'shelf'
  | 'consult_room'
  | 'legal_support';

export const PAID_DTR_PAGE_INHERITANCE: Record<
  PaidDtrSurface,
  { inheritFromMaster: readonly string[]; remainLocal: readonly string[]; mustNotRepeat: readonly string[] }
> = {
  lp: {
    inheritFromMaster: [
      '§1 identity',
      '§2 value proposition (short)',
      '§3 free vs paid comparison',
      '§4 chapter preview',
      '§5 life-use cases (short)',
      '§6 consult reply summary',
      '§7 purchase flow',
      '§8 trust + FAQ bullets',
    ],
    remainLocal: ['CTA modes', 'price block', 'CheckoutTrustRow', 'expired/recovery UI'],
    mustNotRepeat: ['Full chapter body', 'ConsultRoom compose UI', 'Engine-generated text'],
  },
  core: {
    inheritFromMaster: ['§2 (short)', '§3 boundary (full)', '§6 (short)', '§2 CTA labels'],
    remainLocal: ['Free hero', 'radar', 'tendency sections', 'observation list'],
    mustNotRepeat: ['4-chapter TOC', 'Full FAQ', 'Wallet/checkout UI'],
  },
  reader: {
    inheritFromMaster: ['§4 chapter names/desc', '§2 intro lead', '§6 consult link line', '§8 snapshot notice'],
    remainLocal: ['Engine body', 'layout/CSS', 'scrollspy', 'axis visuals'],
    mustNotRepeat: ['LP sales pitch', 'Purchase CTA', 'Full consult compose copy'],
  },
  my: {
    inheritFromMaster: ['§1 names', '§7 flow summary', '§6 one-liner', '§8 support links'],
    remainLocal: ['Profile intake', 'entitlement states', 'delete dialog'],
    mustNotRepeat: ['Chapter preview full text', 'Price block'],
  },
  shelf: {
    inheritFromMaster: ['§1–§2 short', '§6 meta (1 consult included)', '§7 CTA labels'],
    remainLocal: ['Card visuals', 'ownership branching'],
    mustNotRepeat: ['Full FAQ', 'ConsultRoom details'],
  },
  consult_room: {
    inheritFromMaster: ['§6 full (scope, cap, price, examples)'],
    remainLocal: ['Compose UI', 'wallet state', 'checkout errors', 'message thread'],
    mustNotRepeat: ['4-chapter catalog', 'Product-wide sales copy'],
  },
  legal_support: {
    inheritFromMaster: ['§8 trust bullets (link-only context)'],
    remainLocal: ['Legal statute text', 'support procedures'],
    mustNotRepeat: ['Consult cap/price as authoritative legal terms — link to product page'],
  },
};

export const PAID_DTR_FORBIDDEN_CLAIMS = [
  'unlimited chat',
  'anything can be asked',
  'guaranteed result',
  'deterministic future',
  'medical/legal/investment advice as product output',
  'exact body character counts without verified approval',
  'report-ready email from M55',
  'reply-ready email from M55',
  'product update push notifications (not implemented)',
  'new divination authority claims',
  '8-chapter product structure as current truth',
  'max 3 replies per report as current truth',
  '¥700 additional reply as current truth',
  'Entry Report as primary Japanese product name',
  'Premium or Blueprint as primary product name',
  'generic public AI chat',
] as const;

/** Collect all user-facing Japanese strings for static checks (tests, lint helpers). */
/** Paid LP surface copy — Human-approved M55_PAID_LP_FINAL_COPY_SSOT_v1 (display-only). */
export const PAID_DTR_LP_COPY_VERSION = 'm55-paid-lp-final-copy-v1' as const;

export const PAID_DTR_LP = {
  version: PAID_DTR_LP_COPY_VERSION,
  hero: {
    subheadlineJa: '迷ったときに読み返すための4章を、手元に。',
    headlineJa: '入力した情報から、\n自分の出方と、いまのテーマを読み解く。',
    bodyJa:
      'M55は、あなたが入力した情報をもとに、\n比較的変わりにくい自分の出方を、\n4章の保存版として整理するパーソナルシステムです。\n\n相談返書では、その保存版に今回書いた相談文を重ね、\nいま気になっている一つのテーマを読み直します。',
    ctaLabelJa: 'FULLとライトを比べる',
    compareSectionId: 'dtr-lp-tiers',
  },
  about: {
    sectionTitleJa: 'M55とは',
    oneSentenceJa:
      'M55は、入力された情報と言葉をもとに、\n自分の出方と今のテーマを読み直し、\n本人が確かめられる視点として渡す\nパーソナルシステムです。',
    principleJa:
      '本人に代わって答えを決めるのではなく、\n現実的な見方と、次に確かめることを示します。',
  },
  informationLayers: {
    sectionTitleJa: '保存版と相談返書の情報二層',
    savedReportJa:
      '保存版では、購入時までに入力された情報をもとに、\n比較的変わりにくい自分の出方を4章で整理します。',
    consultReplyJa:
      '相談返書では、その保存版に、\n今回入力した一つの相談テーマを重ねます。\n\n書かれた内容や言葉の選び方、言い回し、文の流れ、\n繰り返し表れるテーマを手がかりに、\nいま気になっているテーマを読み直します。',
  },
  savedReport: {
    sectionTitleJa: '保存版とは',
    headlineJa: '自分の出方を、4章の流れで読み直す。',
    bodyJa:
      '保存版は、購入時までに入力された情報をもとに、\n比較的変わりにくい自分の出方を4章で整理した\nデジタルレポートです。\n\n自分に出やすい傾向、\n考え方や動き方のつながり、\n無理の出方、\n日常で扱いやすくする方法を、\n一つの流れで読める形にします。\n\n後から読み返すための\n4章の保存版として残します。\n\n保存版の4章は、\nライトとFULLで共通です。',
  },
  freeComparison: {
    sectionTitleJa: '無料ページと保存版の違い',
    bodyJa:
      '無料ページは、M55の読み解きに触れる入口です。\n保存版では、購入時までに入力された情報をもとに、\n比較的変わりにくい自分の出方を正式4章で整理します。\n保存版には、選んだプランに応じた相談返書が含まれます。',
  },
  chapters: {
    sectionTitleJa: '正式4章',
    items: [
      {
        roman: 'Ⅰ',
        titleJa: '輪郭を見る',
        introJa: 'まず、自分に出やすい傾向をつかみます。',
      },
      {
        roman: 'Ⅱ',
        titleJa: '構造を読む',
        introJa: '考え方や動き方が、どのようにつながっているかを見ます。',
      },
      {
        roman: 'Ⅲ',
        titleJa: '無理を知る',
        introJa: '負担が重なりやすい場面と、無理の出方を確かめます。',
      },
      {
        roman: 'Ⅳ',
        titleJa: '楽に扱う',
        introJa: '自分を変えすぎず、日常で扱いやすくする方法を整理します。',
      },
    ] as const,
  },
  consultReply: {
    sectionTitleJa: '相談返書とは',
    bodyJa:
      '保存版に紐づく、一つの相談テーマへの返書です。\n今回入力した相談文を保存版の内容と重ね、\n書かれた内容や言葉の選び方、文の流れなどを手がかりに、\nそのテーマを読み直します。\n件数内で利用でき、会話を続ける形式ではありません。',
  },
  tiers: {
    sectionTitleJa: 'FULL／ライト比較',
    full: {
      planNameJa: PAID_DTR_SAVED_REPORT_PRICING.full.planNameJa,
      priceLabelJa: PAID_DTR_SAVED_REPORT_PRICING.full.priceLabelJa,
      savedReportLabelJa: '保存版:',
      savedReportValueJa: '正式4章',
      consultReplyLabelJa: '相談返書:',
      consultReplyValueJa: '合計5件',
      bodyJa:
        '何度か相談しながら、深く整理したい方へ。\nライトとの差額 ¥480 で、相談返書が4件増えます。',
      ctaLabelJa: '保存版FULLを購入する',
      productKey: PAID_DTR_SAVED_REPORT_PRICING.full.productKey,
    },
    light: {
      planNameJa: PAID_DTR_SAVED_REPORT_PRICING.light.planNameJa,
      priceLabelJa: PAID_DTR_SAVED_REPORT_PRICING.light.priceLabelJa,
      savedReportLabelJa: '保存版:',
      savedReportValueJa: '正式4章',
      consultReplyLabelJa: '相談返書:',
      consultReplyValueJa: '1件',
      bodyJa:
        'まず保存版を読み、1回だけ相談したい方へ。\n価格を抑えて、必要な要点から確認できます。\n後からFULL化できます（追加 ¥600）。',
      ctaLabelJa: '保存版ライトを購入する',
      productKey: PAID_DTR_SAVED_REPORT_PRICING.light.productKey,
    },
  },
  upgrade: {
    sectionTitleJa: 'ライトからFULL化',
    paragraphsJa: [
      'ライト購入後でも、必要になったらFULL化できます。',
      '保存版を読んだあと、もう少し深く整理したくなった場合に選べます。',
      'FULL化すると、相談返書の利用上限が合計5件になります。',
    ] as const,
  },
  purchaseNotes: {
    sectionTitleJa: '購入前の確認',
    paragraphsJa: [
      '価格はすべて税込です。',
      'ライトとFULLの保存版は、同じ正式4章です。',
      '違いは、相談返書の件数です。',
      'ライトは1件、FULLは合計5件です。',
      '購入前に、いま必要な相談返書の件数をご確認ください。',
    ] as const,
    legalLinks: [
      { labelJa: 'サポート', href: '/support' },
      { labelJa: '返金', href: '/legal/refund' },
      { labelJa: '特商法', href: '/legal/tokushoho' },
      { labelJa: '利用規約', href: '/legal/terms' },
      { labelJa: 'プライバシー', href: '/legal/privacy' },
    ] as const,
  },
  faq: {
    sectionTitleJa: 'FAQ',
    items: [
      {
        questionJa: 'ライトとFULLで、保存版の内容は違いますか？',
        answerJa:
          '保存版の4章は共通です。\n違いは、利用できる相談返書の件数です。\nライト（¥1,000）は1件、FULL（¥1,480）は合計5件です。\nライトはまず読み返したい方向け、FULLは返書で複数回深めたい方向けです。',
      },
      {
        questionJa: '相談返書とは何ですか？',
        answerJa:
          '保存版に紐づく、一つの相談テーマへの返書です。\n今回入力した相談文を保存版の内容と重ね、\n書かれた内容や言葉の選び方、文の流れなどを手がかりに、\nそのテーマを読み直します。\n件数内で利用でき、会話を続ける形式ではありません。',
      },
      {
        questionJa: 'ライト購入後にFULL化できますか？',
        answerJa:
          'はい。必要になったら、あとからFULL化できます。\nFULL化すると、相談返書の利用上限が合計5件になります。\nまずライトで試してから、必要に応じて広げられます。',
      },
      {
        questionJa: '無料ページとの違いは何ですか？',
        answerJa:
          '無料ページは、M55の読み解きに触れる入口です。\n保存版では、購入時点の入力内容をもとに、\n比較的変わりにくい自分の出方を正式4章で整理します。\n保存版には、選んだプランに応じた相談返書が含まれます。',
      },
    ] as const,
  },
  cta: {
    sectionTitleJa: '最終導線',
    finalCompareLabelJa: 'プランをもう一度確認する',
  },
  operational: {
    ownedState: {
      statusLeadJa: '保存版の閲覧・準備状況はこちらから進められます。',
      openReportCtaJa: 'レポートを開く',
      recoveryLeadJa:
        '購入済みです。保存版の準備状況を確認できます（再購入は不要です）。',
      recoveryCtaJa: '準備状況を確認する',
      supportCtaJa: 'サポートに相談する',
      pendingLeadJa:
        '本文の準備が完了すると閲覧できます。しばらくしてから再度お試しください。',
      pendingCtaJa: 'レポートの準備中',
      expiredNoticeLeadJa: 'このレポートへのアクセス有効期限が切れています。',
      expiredNoticeSupportPrefixJa: 'ご不明な点は',
      expiredNoticeSupportLinkJa: 'サポート',
      expiredNoticeSupportSuffixJa: 'までご連絡ください。',
    },
  },
} as const;

/** Collect all Paid LP public strings for grep / regression tests. */
export function collectPaidDtrLpCopyStrings(): string[] {
  const lp = PAID_DTR_LP;
  const { full, light } = lp.tiers;
  const os = lp.operational.ownedState;

  const strings: string[] = [
    lp.hero.subheadlineJa,
    lp.hero.headlineJa,
    lp.hero.bodyJa,
    lp.hero.ctaLabelJa,
    lp.about.sectionTitleJa,
    lp.about.oneSentenceJa,
    lp.about.principleJa,
    lp.informationLayers.sectionTitleJa,
    lp.informationLayers.savedReportJa,
    lp.informationLayers.consultReplyJa,
    lp.savedReport.sectionTitleJa,
    lp.savedReport.headlineJa,
    lp.savedReport.bodyJa,
    lp.freeComparison.sectionTitleJa,
    lp.freeComparison.bodyJa,
    lp.chapters.sectionTitleJa,
    ...lp.chapters.items.flatMap((c) => [c.roman, c.titleJa, c.introJa]),
    lp.consultReply.sectionTitleJa,
    lp.consultReply.bodyJa,
    lp.tiers.sectionTitleJa,
    full.planNameJa,
    full.priceLabelJa,
    full.savedReportLabelJa,
    full.savedReportValueJa,
    full.consultReplyLabelJa,
    full.consultReplyValueJa,
    full.bodyJa,
    full.ctaLabelJa,
    light.planNameJa,
    light.priceLabelJa,
    light.savedReportLabelJa,
    light.savedReportValueJa,
    light.consultReplyLabelJa,
    light.consultReplyValueJa,
    light.bodyJa,
    light.ctaLabelJa,
    lp.upgrade.sectionTitleJa,
    ...lp.upgrade.paragraphsJa,
    lp.purchaseNotes.sectionTitleJa,
    ...lp.purchaseNotes.paragraphsJa,
    ...lp.purchaseNotes.legalLinks.map((l) => l.labelJa),
    lp.faq.sectionTitleJa,
    ...lp.faq.items.flatMap((f) => [f.questionJa, f.answerJa]),
    lp.cta.sectionTitleJa,
    lp.cta.finalCompareLabelJa,
    os.statusLeadJa,
    os.openReportCtaJa,
    os.recoveryLeadJa,
    os.recoveryCtaJa,
    os.supportCtaJa,
    os.pendingLeadJa,
    os.pendingCtaJa,
    os.expiredNoticeLeadJa,
    os.expiredNoticeSupportPrefixJa,
    os.expiredNoticeSupportLinkJa,
    os.expiredNoticeSupportSuffixJa,
  ];

  return strings.filter((s) => typeof s === 'string' && s.length > 0);
}

export function collectPaidDtrPublicCopyStrings(): string[] {
  const parts: string[] = [
    PAID_DTR_VALUE_PROPOSITION.oneSentenceJa,
    PAID_DTR_VALUE_PROPOSITION.leadParagraphJa,
    ...PAID_DTR_VALUE_PROPOSITION.notAClaim,
    ...PAID_DTR_FREE_VS_PAID.freeGives,
    ...PAID_DTR_FREE_VS_PAID.paidAdds,
    PAID_DTR_FREE_VS_PAID.paidIsNotMerely,
    PAID_DTR_FREE_VS_PAID.bundleNoteJa,
    ...PAID_DTR_BENEFIT_BULLETS,
    ...PAID_DTR_CHAPTERS.flatMap((c) => [
      c.title,
      c.helpsUnderstandJa,
      c.lifeConcernJa,
      c.readerDescJa,
    ]),
    ...PAID_DTR_LIFE_USE_CASES.flatMap((u) => [u.titleJa, u.bodyJa]),
    PAID_DTR_CONSULT_REPLY.groundedInReportJa,
    PAID_DTR_CONSULT_REPLY.notGenericChatJa,
    ...PAID_DTR_CONSULT_REPLY.goodQuestionExamplesJa,
    ...PAID_DTR_CONSULT_REPLY.outOfScopeExamplesJa,
    PAID_DTR_CONSULT_REPLY.whereToUseJa,
    PAID_DTR_CONSULT_REPLY.consumeNoteJa,
    PAID_DTR_CONSULT_REPLY.capSummaryJa,
    PAID_DTR_CONSULT_REPLY.savedReportLinkedShortJa,
    PAID_DTR_CONSULT_REPLY.oneThemeJa,
    PAID_DTR_CONSULT_REPLY.shortInputOkJa,
    PAID_DTR_CONSULT_REPLY.longInputNarrowJa,
    PAID_DTR_CONSULT_REPLY.strongEmotionJa,
    PAID_DTR_CONSULT_REPLY.conflictPerspectiveJa,
    ...Object.values(PAID_DTR_CONSULT_ROOM_UI),
    ...Object.values(PAID_DTR_MY_PAGE_CONSULT),
    ...PAID_DTR_CONSULT_REPLY.avoidOverpromisingJa,
    ...PAID_DTR_PURCHASE_ACCESS_FLOW.flatMap((s) => [s.titleJa, s.bodyJa]),
    PAID_DTR_TRUST_BOUNDARIES.digitalContentJa,
    PAID_DTR_TRUST_BOUNDARIES.notAdviceJa,
    PAID_DTR_TRUST_BOUNDARIES.noGuaranteedOutcomeJa,
    PAID_DTR_TRUST_BOUNDARIES.profileSnapshotJa,
  ];
  return parts;
}
