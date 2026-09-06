/**
 * Paid DTR Product Copy Master — runtime SSOT (display/copy only).
 * Governance: docs/ssot/M55_PAID_DTR_PRODUCT_COPY_MASTER_v1.md
 *
 * Do not import engine, payment, DB, or auth modules here.
 * Downstream surfaces (LP, Core, My, shelf, reader, ConsultRoom) wire in later gates.
 */

import { getCommercialProduct } from './contracts/m55CommercialFunnelContract';
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

const SELF_PREMIUM_LIGHT = getCommercialProduct('selfPremiumLight');
const SELF_PREMIUM_FULL = getCommercialProduct('selfPremiumFull');

function formatYenLabelJa(priceJpy: number): string {
  return `¥${priceJpy.toLocaleString('ja-JP')}（税込）`;
}

export const PAID_DTR_PRODUCT_COPY_VERSION = 'm55-paid-dtr-product-copy-v1' as const;

export const PAID_DTR_PRODUCT_IDENTITY = {
  version: PAID_DTR_PRODUCT_COPY_VERSION,
  primaryNameJa: LABEL_PRODUCT_JP,
  formatLabel: LABEL_FORMAT_SAVED,
  ownedStateLabel: LABEL_STATE_OWNED,
  auxiliaryNameEn: LABEL_PRODUCT_EN,
  shortNameJa: '本質を見つめ直す',
  /** User-facing primary term for the consultation feature */
  consultPrimaryTermJa: '追加読み解き',
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
    '無料の見取り図で見えた輪郭を土台に、プレミアムレポートは章立てで読み返しながら、近い人との距離・消耗・迷い・整え方を自分の暮らしの中で読み直せる有料レポートです。',
  leadParagraphJa:
    '自分の形を知ると、少し楽になる。M55は、そのための見取り図です。プレミアムレポートでは、いまの傾向を章立てで深く整理し、必要なときに追加読み解きで論点を絞り込めます。',
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
    'プレミアムレポートへ進む前に、自分の読み方の土台をつかむ',
  ] as const,
  paidAdds: [
    '4章構成で読み返せるプレミアムレポート（購入時プロフィールに基づく）',
    '力が出やすい場面・無理がたまりやすい条件・戻し方を順に整理',
    '購入に付帯する追加読み解き 1件（レポートの章に沿った深掘り）',
  ] as const,
  paidIsNotMerely: '無料ページの長文コピーではありません。章立て・保存・追加読み解きまで含む別商品です。',
  bundleNoteJa: `${LABEL_PRODUCT_JP}に加え、追加読み解きの利用が含まれます。`,
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
export const PAID_DTR_READER_HERO_READ_BACK_PREFIX_JA = 'このプレミアムレポートで読み返す' as const;

/** PremiumDrawerHub shell copy (drawer row labels are action-oriented; chapter titles from PAID_DTR_CHAPTERS). */
export const PAID_DTR_DRAWER_HUB = {
  ariaLabelJa: 'プレミアムレポートの入口',
  overlineJa: 'プレミアムレポートの入口',
  titleJa: 'このプレミアムレポートで読み返すこと',
  leadJa: '気になるところから、静かに読み返せます。',
  chapterRowLabelsJa: [
    'まず、全体を読み返す',
    '力が出やすい条件を読む',
    '無理が出やすい場面を読む',
    '戻し方と使い方を読む',
  ] as const,
  consultLabelJa: '追加読み解きで整理する',
  consultSublabelJa: 'プレミアムレポートをもとに、いま気になっていることを1テーマだけ整理する',
  summaryLabelJa: '読みのまとめ',
  summarySublabelJa: '私の取扱説明書',
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
    sublabelJa: '近づき方、伝え方、無理しやすい場面を見る',
    primaryPanel: 'chapter-3',
    primaryChapterJa: 'Ⅲ 無理を知る',
    relatedChaptersJa: ['Ⅰ 輪郭を見る', 'Ⅱ 構造を読む'],
    pillLabelJa: '読',
  },
  {
    id: 'theme-work',
    labelJa: '仕事・これからの進め方',
    sublabelJa: '仕事で無理が出やすい場面と、何から始めるかを見る',
    primaryPanel: 'chapter-2',
    primaryChapterJa: 'Ⅱ 構造を読む',
    relatedChaptersJa: ['Ⅰ 輪郭を見る', 'Ⅲ 無理を知る'],
    pillLabelJa: '読',
  },
  {
    id: 'theme-money',
    labelJa: 'お金・生活・疲れの整え方',
    sublabelJa: '生活を詰めすぎない整え方を見る',
    primaryPanel: 'chapter-4',
    primaryChapterJa: 'Ⅳ 楽に扱う',
    relatedChaptersJa: ['Ⅲ 無理を知る'],
    pillLabelJa: '読',
  },
  {
    id: 'theme-forward',
    labelJa: 'これからの動き方',
    sublabelJa: '今どこから動くか、無理の少ない順番を見る',
    primaryPanel: 'chapter-2',
    primaryChapterJa: 'Ⅱ 構造を読む',
    relatedChaptersJa: ['Ⅳ 楽に扱う', 'Ⅰ 輪郭を見る'],
    pillLabelJa: '読',
  },
  {
    id: 'theme-rest',
    labelJa: '疲れたときの戻り方',
    sublabelJa: '疲れが出るタイミングと、戻り方を見る',
    primaryPanel: 'chapter-4',
    primaryChapterJa: 'Ⅳ 楽に扱う',
    relatedChaptersJa: ['Ⅲ 無理を知る'],
    pillLabelJa: '読',
  },
] as const;

/**
 * Display-only label overrides for theme chips.
 * Keys = stored theme key (themeExamplesJa); values = shorter user-facing chip label.
 * Does NOT change the stored key or any mapping logic.
 */
export const THEME_CHIP_DISPLAY_LABEL_OVERRIDES: Readonly<Partial<Record<string, string>>> = {
  '仕事・これからの進め方': '仕事の進め方',
  'これからの動き方': '今の優先順位と動き方',
} as const;

/** PremiumDrawerHub / LP — 4-chapter surface (canonical title + job-based scent; Ⅰ〜Ⅳ preserved). */
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

const PAID_DTR_DRAWER_CHAPTER_ENTRY_IDS: readonly PaidDtrDrawerChapterEntryId[] = [
  'chapter-entry-1',
  'chapter-entry-2',
  'chapter-entry-3',
  'chapter-entry-4',
];

export const PAID_DTR_DRAWER_CHAPTER_ENTRIES: readonly PaidDtrDrawerChapterEntry[] =
  PAID_DTR_CHAPTERS.map((ch, index) => ({
    id: PAID_DTR_DRAWER_CHAPTER_ENTRY_IDS[index]!,
    pillLabelJa: ch.roman,
    labelJa: ch.title,
    sublabelJa: ch.readerDescJa,
    panel: `chapter-${index + 1}` as PaidDtrDrawerThemePrimaryPanel,
    primaryChapterJa: `${ch.roman} ${ch.title}`,
  }));

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

/** Drawer / reader chapter band — canonical title + job scent. Engine / snapshot unchanged. */
export type PaidDtrChapterDrawerIntro = {
  partId: PaidDtrReportPartId;
  hubLabelJa: string;
  hubSublabelJa: string;
  personalHeadingSuffixJa: string;
  /** Screen-reader / mapping — matches hubLabelJa (canonical title). */
  legacyChapterTitleJa: string;
};

const PAID_DTR_CHAPTER_PERSONAL_HEADING_SUFFIX: Record<PaidDtrReportPartId, string> = {
  '1': 'の形',
  '2': 'の進め方',
  '3': 'の無理の出方',
  '4': 'の整え方',
};

export const PAID_DTR_CHAPTER_DRAWER_INTRO: Record<PaidDtrReportPartId, PaidDtrChapterDrawerIntro> =
  PAID_DTR_CHAPTERS.reduce(
    (acc, ch) => {
      const partId = PAID_DTR_CHAPTER_PART_ID[ch.id];
      acc[partId] = {
        partId,
        hubLabelJa: ch.title,
        hubSublabelJa: ch.readerDescJa,
        personalHeadingSuffixJa: PAID_DTR_CHAPTER_PERSONAL_HEADING_SUFFIX[partId],
        legacyChapterTitleJa: ch.title,
      };
      return acc;
    },
    {} as Record<PaidDtrReportPartId, PaidDtrChapterDrawerIntro>
  );

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
  'ch1-identity-design': '得意な出方・消耗しやすい状態・伸びる条件',
  'ch1-structure-radar': '出方が重なるところ',
  'ch1-five-axis': '5つの力のバランス',
  'ch2-stability-panel': '力が出やすい条件と詰まりやすい条件',
  'ch2-strengths-lift': '力が自然に出やすい場面',
  'ch2-trait-interaction': '出やすい力と無理の重なり',
  'ch3-friction-warning': '無理が出やすい場面',
  'ch3-comm-flow': '言葉と距離の流れ',
  'ch3-domain-scenes': '近い人を中心にした場面の見方',
  'ch4-work-guide': '余白が戻るときの見方',
  'ch4-practical-guidance': '疲れや生活の余白が薄いときの戻し方',
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
      '{nickname}さんの読み方は、この先の章を開くときの土台です。',
    lifeJa:
      '形が見えたら、仕事・近い人・生活のどこが重いかへ進めます。',
    actionJa:
      '今いちばん気になる場面をひとつ選んでください。',
    consultQuestionJa:
      'いま気になっていることは、私のどの出方が重なって起きていますか？',
  },
  '2': {
    tendencyJa:
      '仕事の詰まりは、やる気の問題として受け取らなくて大丈夫です。',
    lifeJa:
      '追加読み解きでは、今週止まっている作業を一つ取り上げます。',
    actionJa:
      '今日決着できることと、後回しにすることを分けて見てみてください。',
    consultQuestionJa:
      '今週止まっている仕事で、後回しにしてよいものはどれですか？',
  },
  '3': {
    tendencyJa:
      '近い人との無理は、性格の弱さではなく、距離の置き方で変わります。',
    lifeJa:
      '正しさを急ぐより、感じたことを一つ返すほうが扱いやすいです。',
    actionJa:
      '次に言葉が詰まったとき、結論の前に一つだけ返すところから試せます。',
    consultQuestionJa:
      '近い人とのやりとりで、言葉と距離をどう置くと無理が減りますか？',
  },
  '4': {
    tendencyJa:
      '生活の重さは、気合いでは解けません。',
    lifeJa:
      '追加読み解きでは、いま一番重い負担を一つだけ取り上げます。',
    actionJa:
      '今の負担を一つ選んで、このレポートに沿って整理できます。',
    consultQuestionJa:
      '今の疲れや不安を軽くするために、まず一つ減らすなら何ですか？',
  },
} as const;

export const PAID_DTR_CHAPTER_CONSULT_CTA_LABEL_JA =
  '追加読み解きで整理する' as const;

export const PAID_DTR_CHAPTER_CONSULT_TRUTH_NOTE_JA =
  'プレミアムレポートをもとに、いま気になっていることを1テーマだけ整理する。送信するまで追加読み解きは使いません。' as const;

/** Chapter-end consult bridge — fixed life-language supplement (no dynamic body excerpt). */
export const PAID_DTR_CHAPTER_BRIDGE_LIFE_SUPPLEMENT_JA =
  'この章では、今の動き方の手がかりも一緒に見ています。' as const;

/** W-B3c1 pilot: chapter-1 only graph-reading and chapter-branch guidance. */
export const PAID_DTR_CHAPTER1_PILOT_GUIDE = {
  beforeIdentityGraphJa:
    '冒頭の4点で形が見えたら、ここでは「得意な出方」と「消耗しやすい状態」を並べて、いま気になっていることの位置を確かめます。',
  branchLeadJa:
    '形が見えたら、次は今いちばん重い場面へ進みます。',
  branchItemsJa: [
    '進め方が重いときは、Ⅱ「構造を読む」へ。',
    '距離や言葉が重いときは、Ⅲ「無理を知る」へ。',
    '疲れや生活の余白が重いときは、Ⅳ「楽に扱う」へ。',
  ] as const,
} as const;

/**
 * Deep-reading renewal (W-B3): chapter-end takeaways copy (display-only).
 *
 * The consult question is deliberately absent: it is rendered once, at the chapter-end
 * consult entry where it is actionable. Carrying it here as well printed the same line
 * twice inside one chapter.
 */
export type PaidDtrDeepReadingTakeaway = {
  closedTitleJa: string;
  closedLeadJa: string;
  itemsJa: readonly [string, string, string];
};

export const PAID_DTR_DEEP_READING_SECTION_TITLE_JA = 'この章で持ち帰ること' as const;

export const PAID_DTR_DEEP_READING_TAKEAWAYS: Record<PaidDtrReportPartId, PaidDtrDeepReadingTakeaway> = {
  '1': {
    closedTitleJa: 'いまの形を、最後に短く整理する',
    closedLeadJa: '力の使い方だけ、短く残します。',
    itemsJa: [
      '力が出やすいとき: 静かに拾った差分を一つ言葉にできたとき。',
      '止まりやすいとき: 急かされたり、途中で細かく割り込まれて、自分のペースを失うとき。',
      'まず意識すること: 始める前に「今日はここまで」と自分の言葉で決める。',
    ],
  },
  '2': {
    closedTitleJa: '仕事とこれからの進め方を、短く確認する',
    closedLeadJa: '今週の一手だけ、短く残します。',
    itemsJa: [
      '手が止まったときは、力不足ではなく、今日決着できる作業が決まっていない。',
      '同時に頼まれた日は、こなす量を増やさず、後回しにする作業を先に決める。',
      '一つ進めたら、その日はそこで区切る。',
    ],
  },
  '3': {
    closedTitleJa: '近い人とのやりとりを、短く確認する',
    closedLeadJa: '関係でだけ違う動きを、短く残します。',
    itemsJa: [
      '静かな一対一ほど、裏の文脈まで読みすぎやすい。',
      '不快感を内部に溜めると、距離の戻し方が分からなくなる。',
      '感じたことを一つだけ先に返す。',
    ],
  },
  '4': {
    closedTitleJa: '生活の余白と戻し方を、短く確認する',
    closedLeadJa: '今日試すことだけ、短く残します。',
    itemsJa: [
      '負担が重なると、全部を一度に決めたくなる。',
      '余白があるほど、判断が扱いやすくなる。',
      '今日決めなくていいことを一つ横に置く。',
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
  titleLine2Ja: 'プレミアムレポートをもとに、今気になっていることを1テーマだけ整理します',
  dividerChipJa: 'このプレミアムレポートの追加読み解き',
  entryContextAriaJa: '追加読み解きの入口のコンテキスト',
  continuousSupportOverlineJa: '状況が変わったときの使い方',
  continuousSupportBodyJa:
    '状況が変わったときは、このプレミアムレポートをもとに、今の感じ方や迷いを追加読み解きで見ていけます。',
  continuousSupportScopeJa:
    '※転職・異動・恋愛・相性・仕事に特化した詳しい内容などは、この読み解きの対象外です。',
  pillarFlowRefJa: '進め方を見る',
  pillarFlowTextJa:
    'このプレミアムレポートで見てきた内容から、その場面で出やすい反応を見ます。',
  pillarOverlapLabelJa: '重なりを見る',
  pillarOverlapTextJa:
    'いくつかの出方が重なるとき、どこで無理がたまりやすいかを見ます。',
  pillarRecoveryLabelJa: '戻り方を見る',
  pillarRecoveryTextJa:
    '疲れが出るタイミングに合わせて、戻りやすい方向を見ます。',
  groundingMetaLabelJa: 'もとにしている内容',
  metaReadAxesJa: '自分の形 · 進め方 · 近い人 · 整え方 · 戻し方',
} as const;

/** Consult entry-first layout — display-only (W-B2). */
export const PAID_DTR_CONSULT_ENTRY_LAYOUT = {
  essentialNotesJa: [
    'なんでも答えるAIではありません。',
    '新しい診断ではなく、今の迷いを言葉にして整えていきます。',
    '送信するまで追加読み解きは使いません。',
  ] as const,
  valueDetailsSummaryJa: '追加読み解きで見られること',
  valueDeliverableItemsJa: [
    '今の場面をいったん言葉にする',
    'プレミアムレポートから見た、あなたに出やすい流れを見る',
    '少し楽に見るための別の見方を出す',
    '今日できる小さな一歩を考える',
  ] as const,
  valueDeliverableFooterJa:
    'プレミアムレポートをもとにした追加読み解きです。結果や未来を保証するものではありません。',
  savedReportAboutSummaryJa: 'このプレミアムレポートと追加読み解きについて',
  savedReportIntroTemplateJa: 'このレポートは、{nickname}個人の出方をまとめたプレミアムレポートです。',
  savedReportIntroFallbackJa: 'このレポートは、個人の出方をまとめたプレミアムレポートです。',
  savedReportConsultLeadJa:
    '追加読み解きでは、このプレミアムレポートをもとに、今気になっていることを1テーマだけ見ていきます。',
  fixedReportBulletsJa: [
    'レポート本文は、購入時点の内容のまま変わりません',
    '今の感じ方や迷いは、追加読み解きであとから書けます',
    '追加読み解きは、このプレミアムレポートをもとに作ります',
  ] as const,
  groundingNoteTemplateJa:
    '一般的なアドバイスではなく、{nickname}専用のこのプレミアムレポートをもとに、追加読み解きを作ります。',
  groundingNoteFallbackJa:
    '一般的なアドバイスではなく、このプレミアムレポートをもとに、追加読み解きを作ります。',
} as const;

/** Consult usage card — entry display copy (tier-neutral; no fixed cap table). */
export const PAID_DTR_CONSULT_USAGE_DISPLAY = {
  availablePrimaryJa: 'このプレミアムレポートで追加読み解きを使えます。',
  availableSecondaryJa: '残数は下記で確認できます。',
  /** Legacy SSOT for in-flight tests; not used on consult entry UI surfaces. */
  purchasePrimaryLine1Ja: '今は残り0件です。',
  purchasePrimaryLine2Ja:
    'プレミアムレポートに紐づく追加読み解きを、あと{count}件まで追加できます。',
  exhaustedPrimaryJa: '今は追加読み解きを使えません。',
  exhaustedSecondaryJa: '残数はこの入口で確認できます。',
  capReachedPrimaryJa: 'このプレミアムレポートで使える追加読み解きは上限に達しています。',
  capReachedSecondaryJa: 'これまでの追加読み解きは引き続き確認できます。',
  usedCountTemplateJa: '使用済み：{used}件',
  remainingCompactTemplateJa: '残り {count}件',
  /** Legacy SSOT; not rendered on consult entry UI surfaces. */
  additionalPurchasableTemplateJa: 'あと購入できる {count}件',
} as const;

/** Consult entry LOCAL wave — neutral wallet lines (consult/my only; not LP). */
export const PAID_DTR_CONSULT_ENTRY_NEUTRAL = {
  /** Current usable reply balance at the consultation entrance (live wallet). */
  walletAvailableTemplateJa: '現在使える追加読み解き：{count}件',
  /** @deprecated Prefer walletAvailableTemplateJa — kept for compact inline surfaces. */
  walletRemainingTemplateJa: '現在使える追加読み解き：{count}件',
  walletUsedTemplateJa: '使用済み：{used}件',
  walletExhaustedJa: '今は追加読み解きを使えません。残数はこの入口で確認できます。',
} as const;

/** Legacy formatter; consult entry UI uses PAID_DTR_CONSULT_ENTRY_NEUTRAL instead. */
export function formatConsultPurchaseAddOnLine(additionalPurchasableCount: number): string {
  return PAID_DTR_CONSULT_USAGE_DISPLAY.purchasePrimaryLine2Ja.replace(
    '{count}',
    String(additionalPurchasableCount)
  );
}

export function formatConsultAvailableCountLine(available: number): string {
  return PAID_DTR_CONSULT_ENTRY_NEUTRAL.walletAvailableTemplateJa.replace(
    '{count}',
    String(available)
  );
}

/** Saved-report info — available with wallet-granted total (not hardcoded cap). */
export function formatConsultAvailableWithGrantedLine(
  available: number,
  totalGranted: number,
): string {
  return `現在使える追加読み解き：${available} / ${totalGranted}件`;
}

export function formatConsultUsedCountLine(used: number, cap?: number): string {
  if (cap !== undefined) {
    return `使用済み：${used} / ${cap}件`;
  }
  return PAID_DTR_CONSULT_ENTRY_NEUTRAL.walletUsedTemplateJa.replace('{used}', String(used));
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
  '自分に出やすい形と、力が戻りやすい場所',
  '仕事や判断で、力が出やすい条件と止まりやすい条件',
  '近い人との距離と言葉選びで、無理の出やすいところ',
  '疲れや生活の負担を、どこから軽くすると戻りやすいか',
] as const;

/**
 * /dtr/core reader intro — panel 02 opening summary.
 * Labels only; the lines come from the reader's own engine material so the
 * opening is personal rather than a restatement of the chapter map.
 * Count-free heading: the distance line depends on the reader's Chapter III body.
 */
export const PAID_DTR_OPENING_SUMMARY_HEADING_SUFFIX_JA = 'さんのレポートで、先に押さえる要点' as const;

export const PAID_DTR_OPENING_POINT_LABELS_JA = {
  core: 'いちばん土台になる力',
  grow: '力が出やすいとき',
  break: '止まりやすいとき',
  restore: '戻り方',
  distance: '人との距離での出方',
} as const;

/** Chapter I deep panel — the same person seen one layer down (no overlap with the opening). */
export const PAID_DTR_IDENTITY_LAYER_LABELS_JA = {
  natural: 'もともと得意な出方',
  fragile: '消耗しやすい状態',
  maximize: '力が伸びる条件',
} as const;

/** /dtr/core reader intro — panel 01 (pre-W1 copy, display-only). */
export const PAID_DTR_INTRO_PANEL_01 = {
  stepLabel: '01',
  overlineJa: 'レポートの読み方',
  leadLinesJa: [
    '自分を無理に変えなくていい。',
    '「自分の形」から、いま気になっていることを読み直すための土台です。',
  ],
  bodyJa:
    'このレポートでは、力が出やすい場面、無理がたまりやすい条件、戻りやすい整え方を順番に見ていきます。',
} as const;

/** /dtr/core reader — saved-report info card (tier-neutral; not current wallet balance). */
export const PAID_DTR_INTRO_CONSULT_NOTE = {
  /** Consult reply entitlement exists — tier/count agnostic; not the live remaining count. */
  lineJa: 'このプレミアムレポートで使える追加読み解きがあります。',
  /** When server wallet snapshot is unavailable — location-neutral (not “上の入口”). */
  balanceFallbackJa: '現在使える件数は、追加読み解きの入口で確認できます。',
  /** @deprecated Use balanceFallbackJa — kept for SSOT history only. */
  balancePointerJa: '現在使える件数は、追加読み解きの入口で確認できます。',
  metaLabelJa: '追加読み解き',
  metaIncludedValueJa: '入口で確認',
} as const;

/** /dtr shelf card — consult meta row (tier-neutral; no live wallet balance). */
export const PAID_DTR_SHELF_CONSULT_META = {
  labelJa: '追加読み解き',
  /** Not a fixed ticket count — wallet balance lives on ConsultRoom / report info. */
  valueJa: '追加読み解きの利用枠あり',
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
    titleJa: '読み解きを重ねたいとき',
    bodyJa:
      'プレミアムレポートを読んだうえで、いまの悩みをレポートの章に沿って追加読み解きで深める',
  },
] as const;

/**
 * Paid DTR individualization framing — user-facing copy for purchase-time
 * individualized blocks (本質リズム / 補助整理) inside the プレミアムレポート reader.
 *
 * DO NOT expose: lunarMonthKey / solarTermKey / lunarDayKey / boundaryMetadata /
 * stemLaneIndex / djb2 / 甲乙丙丁戊己庚辛壬癸 in UI surfaces.
 * These strings are for display framing only; engine logic is unchanged.
 */
export const PAID_DTR_INDIVIDUALIZATION_FRAMING = {
  /**
   * Shown near individualization blocks in the プレミアムレポート reader
   * (e.g. just above 【このプレミアムレポートだけの本質リズム】 / 【このプレミアムレポートだけの補助整理】 headings).
   */
  readerContextJa:
    'プレミアムレポートでは、10資質の入口に加えて、生年月日から出る複合的な読み取りを、購入時点のプロフィールに合わせて本文内に整理しています。',
  /** Clarifies this is NOT a separate 鑑定 — use near the same blocks. */
  notSeparateReadingJa:
    'これは別の鑑定を追加するものではなく、このプレミアムレポートを読むための補助整理です。',
  /** Snapshot-fixed notice — used on reader or My copy near individualization blocks. */
  snapshotFixedJa:
    'この補助整理は、購入時点のプロフィールをもとに保存されています。',
  /**
   * Consult-room grounding statement: keeps 追加読み解き anchored to プレミアムレポート SSOT.
   * (Supplements PAID_DTR_CONSULT_ENTRY_LAYOUT; does not replace it.)
   */
  consultGroundingJa:
    '追加読み解きでは、このプレミアムレポートに保存された内容をもとに、今の読み解きを1テーマずつ整理します。',
} as const;

/** Public scope boundaries — display-only; no product spec change. */
export const PAID_DTR_PUBLIC_SCOPE_CLARITY = {
  notDailyWeeklyMonthlyServiceJa:
    'M55は、日次・週次・月次の鑑定を継続して提供するサービスではありません。',
  freeTodayWeeklyContextJa:
    '無料の「今日」「今週」は、入力・表示時点の見取り図として読む補助表現です。',
  savedReportReadbackJa:
    'プレミアムレポートは、購入時点の入力内容をもとにした読み返し用レポートです。',
  consultReplyDepthJa:
    '時期や状況の深掘りは、プレミアムレポートに紐づく追加読み解きの範囲で、件数内・一テーマごとに扱います。',
} as const;

/** Saved-report pricing tiers — amounts/names from machine commercial contract. */
export const PAID_DTR_SAVED_REPORT_PRICING = {
  light: {
    productKey: DTR_CORE_LIGHT_V1_PRODUCT_KEY,
    priceYen: SELF_PREMIUM_LIGHT.priceJpy as number,
    priceLabelJa: formatYenLabelJa(SELF_PREMIUM_LIGHT.priceJpy as number),
    planNameJa: SELF_PREMIUM_LIGHT.publicName,
    headlineJa: 'プレミアムレポート + 追加読み解き1件つき',
    audienceJa: 'まずプレミアムレポートを読んで、自分の輪郭を整理したい人向け',
    includedReplyCount: REPLY_TICKET_INCLUDED_COUNT,
  },
  full: {
    productKey: DTR_CORE_FULL_V1_PRODUCT_KEY,
    priceYen: SELF_PREMIUM_FULL.priceJpy as number,
    priceLabelJa: formatYenLabelJa(SELF_PREMIUM_FULL.priceJpy as number),
    planNameJa: SELF_PREMIUM_FULL.publicName,
    recommended: true,
    headlineJa: 'プレミアムレポート + 追加読み解き 合計5件まで',
    audienceJa: 'プレミアムレポートを読んだ後、追加読み解きで複数回深めたい人向け',
    totalReplyCap: REPLY_TICKET_TOTAL_CAP_PER_REPORT,
    /** FULL初回: initial_included=1 + purchased_count=4（合計5枠） */
    initialIncludedCount: REPLY_TICKET_INCLUDED_COUNT,
    initialPurchasedGrant: REPLY_TICKET_FULL_MAX_PURCHASED_COUNT,
  },
  lightToFullUpgrade: {
    productKey: DTR_CORE_LIGHT_TO_FULL_UPGRADE_V1_PRODUCT_KEY,
    priceYen: 600,
    priceLabelJa: '¥600（税込）',
    planNameJa: '後からフルに切り替える',
    headlineJa: 'ライト購入後、追加読み解きを合計5件まで使えるようにする',
    descriptionJa:
      'ライト購入者向け。追加読み解き枠を合計5件まで増やします。追加1件売りではありません。',
    targetPurchasedCount: REPLY_TICKET_FULL_MAX_PURCHASED_COUNT,
  },
  walletModelJa:
    '付属1件（initial_included_count=1）+ purchased_count 最大4 = 合計5件。FULL初回は purchased_count=4 を一括付与。ライト→FULLは purchased_count を最大4まで差分付与。',
} as const;

/**
 * @legacy ¥500 単品追加読み解き — 新規販売停止。webhook/RPC 移行完了まで product_key を残す。
 */
export const PAID_DTR_LEGACY_ADDITIONAL_REPLY_TICKET = {
  productKey: ADDITIONAL_REPLY_TICKET_PRODUCT_KEY,
  priceYen: LEGACY_ADDITIONAL_REPLY_TICKET_PRICE_YEN,
  priceLabelJa: '追加読み解き 1件 500円',
  newSalesStopped: true as const,
  noteJa:
    '移行中の Stripe セッション完了時の付与用。新 Product Truth の購入導線では使用しない。',
} as const;

export const PAID_DTR_CONSULT_REPLY = {
  primaryTermJa: '追加読み解き',
  bridgeTermJa: 'AI往復券',
  includedCount: REPLY_TICKET_INCLUDED_COUNT,
  additionalMaxPurchased: REPLY_TICKET_FULL_MAX_PURCHASED_COUNT,
  totalCapPerReport: REPLY_TICKET_TOTAL_CAP_PER_REPORT,
  /** Primary upgrade price (SSOT). UI 未移行フィールドは legacy* を参照中。 */
  upgradeToFullPriceYen: PAID_DTR_SAVED_REPORT_PRICING.lightToFullUpgrade.priceYen,
  upgradeToFullPriceLabelJa: 'フルに切り替え ¥600',
  upgradeToFullDescriptionJa: PAID_DTR_SAVED_REPORT_PRICING.lightToFullUpgrade.descriptionJa,
  oneThemeConsultPhraseJa: 'いまの1テーマだけ整理する追加読み解き',
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
    '追加読み解きは、購入したプレミアムレポートの章に沿って深掘りするためのものです。別テーマの質問や、レポートと関係のない別テーマにはお答えできません。',
  notGenericChatJa:
    '汎用のAIチャットではありません。見えている傾向と購入したプレミアムレポートを土台に、今回の論点を整理します。',
  themeExamplesJa: [
    '仕事・これからの進め方',
    'これからの動き方',
    '恋人・近い人との向き合い方',
    'お金・生活・疲れの整え方',
    '疲れたときの戻り方',
  ] as const,
  goodQuestionExamplesJa: [
    '恋人への伝え方に迷っています。プレミアムレポートの対話の章を踏まえ、距離と受け取り方を整理したいです',
    '仕事でいま進め方が分からず、構造の章から優先順位を絞りたいです',
    'お金や生活・疲れで落ち着きません。戻し方の章に沿って、いま整えられることを整理したいです',
  ] as const,
  outOfScopeExamplesJa: [
    'レポートと無関係な別テーマ',
    '他者の性格や相性の鑑定',
    '医療・法律・投資の判断や緊急対応',
    '結果や未来の断定・保証の要求',
  ] as const,
  whereToUseJa:
    '購入後、プレミアムレポート（/dtr/core）内の追加読み解きの入口で利用します。マイページやレポート棚からレポートを開いたあと、画面内の追加読み解きへ進みます。',
  consumeNoteJa:
    '1回の送信で追加読み解き1件を使用します。送信後の取り消しはできません。作成した内容は保存されます。',
  capSummaryJa: '付属1件 + 追加購入最大4件まで（合計5件まで）',
  avoidOverpromisingJa: [
    '無制限の読み解きやチャットではありません',
    'なんでも答えるボットではありません',
    'レポート本文の生成完了をメールでお知らせする、とは約束しません',
  ] as const,
  /** プレミアムレポート紐づき・非汎用・非無制限（room / My 用の短い境界） */
  savedReportLinkedShortJa:
    'プレミアムレポートに紐づく読み解きです。汎用チャットではなく、無制限の読み解きでもありません。',
  oneThemeJa: '1回の追加読み解きは1テーマに絞ります。',
  shortInputOkJa: '短文でも始められます。',
  longInputNarrowJa: '長文の場合は、1テーマに絞って送ってください。',
  strongEmotionJa:
    '感情が強い内容でも、正しさの判定で終わらせません。',
  conflictPerspectiveJa:
    '対人の違和感では、相手側または状況側の見え方を1つ含めて整理することがあります（悪い／悪くないの結論にはしません）。',
} as const;

/** Consult entry / ticket wallet UI copy (display-only). */
export const PAID_DTR_CONSULT_ROOM_UI = {
  ariaLabelJa: '追加読み解きの入口（purchaser-only）',
  roomTitleJa: '追加読み解きの入口',
  roomLeadJa:
    '購入したプレミアムレポートに紐づく読み解きです。汎用チャットではなく、無制限の読み解きでもありません。いまの1テーマを、章に沿って整理します。',
  standalonePageLeadJa:
    'プレミアムレポートに紐づく追加読み解きです。見えている傾向を土台に、今回の1テーマを整理します。',
  usageLabelJa: '利用状態',
  /** Display-only wallet usage lines (counts come from API; cap from Product Truth constants). */
  usageUsedCountLabelJa: '使用済み',
  usageAdditionalPurchasableLabelJa: 'あと購入できる',
  walletLoadingJa: '残数確認中です。しばらくお待ちください。',
  savedReportLinkNoteJa:
    'このプレミアムレポートに紐づいて、内容を深掘りできます。',
  limitReachedReadOnlyJa:
    '追加読み解きの利用回数の上限に達しました。これまでの追加読み解きは引き続き確認できます。',
  cannotPurchaseReportInfoJa:
    '追加購入に必要なレポート情報を確認できないため、購入操作を表示していません。',
  emptyThreadJa:
    'このプレミアムレポートをもとに、今の1テーマをここで書けます。',
  composeThemeSectionLabelJa: '用途を選択（1テーマ）',
  composeThemeHintJa:
    '1回の追加読み解きは1テーマに絞ります。短文でも始められます。長い場合は1テーマに絞ってください。',
  step1ChapterBaseLensNoteJa:
    'Ⅰ「輪郭を見る」は、どのテーマでも土台として参照されます。',
  composeSupplementaryLabelJa: '補助質問（最大3つ）',
  composeSupplementaryHintJa: '当てはまるものがあれば選択してください',
  composeFreeInputLabelJa: '自由入力',
  composeFreeInputAriaJa: '今回のテーマを入力',
  inputPlaceholderJa:
    '今気になっていること（1テーマ）。短く書いても構いません',
  expressionHintJa:
    '追加読み解きは、状況に合わせてそっと整理する・はっきり整理する・順番にほどく、のいずれかの方向です（モード選択はありません）。',
  observationInputJa:
    '書いたことや気づいたことに触れながら整理します。正しさの判定や、なんでも肯定する約束はしません。',
  submitLabelJa: '追加読み解きを作成する',
  submittingLabelJa: '作成中',
  generatingReplyJa: '返答を生成しています…',
  walletLoadingShortJa: '残数確認中...',
  walletLimitReachedBodyJa:
    'このレポートで利用できる追加読み解きは上限に達しました。',
  walletLimitReachedHintJa:
    '別のテーマを深く扱う場合は、今後の専用レポートで整理できます。',
  walletPurchaseUnavailableJa:
    '現在、このレポートに紐づく追加購入をご利用いただけません。',
  walletPurchaseReportMissingJa:
    '追加購入の準備に必要なレポート情報を確認できませんでした。ページを再読み込みするか、しばらくしてからお試しください。',
  valueDeliverablesTitleJa: '追加読み解きで見られること',
  historyMessagesAriaJa: 'これまでの追加読み解き',
  /** {count} = assistant reply count in thread */
  historyCountTemplateJa: '{count}件の追加読み解きがあります',
  historyShowAllJa: 'すべて見る',
  historyShowLessJa: '閉じる',
  /** {count} = hidden reply count when collapsed */
  historyShowMoreTemplateJa: 'さらに{count}件を表示',
  openToReadJa: '開いて読む',
  closeReadJa: '閉じる',
  latestReplyBadgeJa: '最新の追加読み解き',
  loadErrorJa: '追加読み解きの読み込みに失敗しました。ページを再読み込みしてください。',
  composePanelTitleJa: '今の1テーマを書く',
} as const;

/** My page consult block — IA SSOT v1 (2-state copy; owned CTA only when snapshot ready). */
export const PAID_DTR_MY_PAGE_CONSULT = {
  blockTitleJa: '追加読み解き',
  blockIntroJa:
    '追加読み解きは、プレミアムレポートに紐づく機能です。プレミアムレポートを利用できる状態になると、プレミアムレポート内から確認できます。',
  linkedScopeJa:
    '読み解きはプレミアムレポートに紐づく範囲です。汎用チャットではなく、無制限の読み解きでもありません。',
  capSummaryJa:
    '追加読み解きの利用状況は、プレミアムレポート内の追加読み解き画面で確認できます。',
  walletFactNoteJa:
    '利用状況の確認と送信は、プレミアムレポートを開いたあとの追加読み解き画面で行えます。',
  remainingNoteJa:
    '1回の追加読み解きにつき、一つのテーマを書いて追加読み解きを確認します。',
  reopenNoteJa: '',
  openRoomLinkJa: '追加読み解きを確認する',
  sectionAriaJa: '追加読み解き',
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
    bodyJa: '購入とプレミアムレポートの利用にはログインが必要です。',
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
      '決済後、プレミアムレポート本文の生成が完了すると閲覧できます。準備中はマイページやレポート棚で状態を確認できます。',
  },
  {
    id: 'my_page' as const,
    titleJa: 'マイページ',
    bodyJa: '所有レポートの再開、プロフィール、サポート導線のハブです。',
  },
  {
    id: 'dtr_shelf' as const,
    titleJa: 'レポート棚',
    bodyJa: 'プレミアムレポートカードから開く・準備状況を確認する入口です。',
  },
  {
    id: 'reader' as const,
    titleJa: 'プレミアムレポート',
    bodyJa: '4章構成の本文を読み返します。購入時点のプロフィールに基づくプレミアムレポートです。',
  },
  {
    id: 'consult_room' as const,
    titleJa: '追加読み解きの入口',
    bodyJa: 'プレミアムレポートを読んだうえで、付属の追加読み解き（必要なら追加購入）を利用します。',
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
    'プレミアムレポートは購入時点のプロフィールをもとに作成・保存されています。表示名などが現在と異なる場合があります。',
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

/** /pricing hub — lightweight authority note (display-only; not LP duplicate). */
export const PAID_DTR_PRICING_AUTHORITY_NOTE_JA =
  'M55のプレミアムレポートは、生年月日から得られる日本の暦文化上の手がかりと、本人の回答による回答差分をもとに、自己理解と関係性整理に使える形へ整える参考情報です。' as const;

/** Collect all user-facing Japanese strings for static checks (tests, lint helpers). */
/** Paid LP surface copy — Human-approved M55_PAID_LP_FINAL_COPY_SSOT_v1 (display-only). */
export const PAID_DTR_LP_COPY_VERSION = 'm55-paid-lp-final-copy-v3' as const;

/** Canonical browser title for /dtr/lp (product page, not poetic tagline). */
export const PAID_DTR_LP_METADATA_TITLE_JA = 'M55 プレミアムレポート | M55' as const;

export const PAID_DTR_LP_PLAN_DECISION_SECTION_ID = 'm55-paid-questionnaire' as const;

/** In-page hash targets referenced by governed LP CTAs (hero / owned recovery). */
export const PAID_DTR_LP_GOVERNED_HASH_ANCHORS = [
  PAID_DTR_LP_PLAN_DECISION_SECTION_ID,
] as const;

export const PAID_DTR_LP = {
  version: PAID_DTR_LP_COPY_VERSION,
  metadata: {
    titleJa: PAID_DTR_LP_METADATA_TITLE_JA,
  },
  hero: {
    subheadlineJa: '生年月日と6問の回答から、自分の出方を一つの流れで読み返せるデジタルレポートです。',
    headlineJa: 'M55 プレミアムレポート',
    bodyJa:
      '自分に出やすい傾向、力が出やすい条件、\n無理の出方、日常での扱い方までを、\n一つの流れで読み返せます。\n\n購入後は同じ内容を開き直せます。\n気になったテーマは、追加読み解きで整理できます。',
    ctaLabelJa: 'プラン選択へ進む',
    compareSectionId: PAID_DTR_LP_PLAN_DECISION_SECTION_ID,
  },
  about: {
    sectionTitleJa: 'M55とは',
    oneSentenceJa:
      '生年月日から見える基調と、今回の回答に表れた傾向を重ねて、\nいまの自分に出やすい動きや、無理が重なりやすい場面を読み解きます。',
    principleJa:
      '本人に代わって答えを決めるのではなく、\n現実的な見方と、次に確かめることを示します。\n未来予測や吉凶の断定ではありません。',
  },
  authorityNote: {
    sectionTitleJa: 'M55が見ているもの',
    headlineJa: '生年月日と回答差分を、読み解きの材料にします',
    bodyParagraphsJa: [
      'M55は、生年月日から得られる日本の暦文化上の手がかりと、本人の回答による現在の感じ方を組み合わせて読み解きます。',
      'プレミアムレポートでは、その初期ベースと回答差分をもとに、自己理解と関係性整理に使える形へ整えます。',
      '表示内容は参考情報であり、医学的診断、心理検査、または将来の不確実な事実を断定するものではありません。',
    ] as const,
  },
  informationLayers: {
    sectionTitleJa: 'レポート本体と、追加読み解きの違い',
    savedReportJa:
      '生年月日から見える基調と、今回の回答に表れた傾向を重ね、\nなぜその動きが続きやすいのか、どんな場面で強みや負担として出やすいのか、\n自分をどう扱うと整いやすいのかまで読み解きます。',
    consultReplyJa:
      '追加読み解きでは、そのプレミアムレポートに、\n今回入力した一つの読み解きテーマを重ねます。\n\nプレミアムレポートの内容をもとに、いま気になっている1テーマだけを整理します。\n件数内で利用でき、会話を続ける形式ではありません。',
  },
  savedReport: {
    sectionTitleJa: 'プレミアムレポートとは',
    headlineJa: '自分の出方を、一つの流れで読み直す。',
    bodyJa:
      'プレミアムレポートは、\n自分に出やすい傾向、\n考え方や動き方のつながり、\n無理の出方、\n日常で扱いやすくする方法を、\n一つの流れで読める形にしたデジタルレポートです。\n\n購入後は、同じ内容を読み返せます。\n\nレポート本体は、\nライトとフルで共通です。',
  },
  freeComparison: {
    sectionTitleJa: '無料ページとプレミアムレポートの違い',
    bodyJa:
      '無料ページは、いま出やすい傾向の入口です。\nプレミアムレポートでは、比較的変わりにくい自分の出方まで、一つの流れで整理します。',
  },
  chapters: {
    sectionTitleJa: 'プレミアムレポートで読む流れ',
    items: PAID_DTR_DRAWER_CHAPTER_ENTRIES.map((entry) => ({
      roman: entry.pillLabelJa,
      titleJa: entry.labelJa,
      introJa: entry.sublabelJa,
    })),
  },
  consultReply: {
    sectionTitleJa: '追加読み解きとは',
    bodyJa:
      'プレミアムレポートに紐づく、一つの読み解きテーマを整理する追加読み解きです。\nプレミアムレポートの内容をもとに、いま気になっている1テーマだけを整理します。\n件数内で利用でき、会話を続ける形式ではありません。',
  },
  tiers: {
    sectionTitleJa: '読み返し方に合わせて選べます',
    sectionLeadJa:
      'どちらも同じプレミアムレポートです。違いは、追加読み解きとして使える回数です。',
    navigateToPrepCtaJa: 'プラン選択へ進む',
    full: {
      planNameJa: PAID_DTR_SAVED_REPORT_PRICING.full.planNameJa,
      priceLabelJa: PAID_DTR_SAVED_REPORT_PRICING.full.priceLabelJa,
      oneTimeLabelJa: '一回払い',
      savedReportLabelJa: 'プレミアムレポート:',
      savedReportValueJa: 'プレミアムレポート',
      consultReplyLabelJa: '追加読み解き:',
      consultReplyValueJa: '合計5件',
      bodyJa: 'プレミアムレポートを読みながら、複数のテーマを続けて整理したい方',
      ctaLabelJa: 'フルを選ぶ',
      productKey: PAID_DTR_SAVED_REPORT_PRICING.full.productKey,
    },
    light: {
      planNameJa: PAID_DTR_SAVED_REPORT_PRICING.light.planNameJa,
      priceLabelJa: PAID_DTR_SAVED_REPORT_PRICING.light.priceLabelJa,
      oneTimeLabelJa: '一回払い',
      savedReportLabelJa: 'プレミアムレポート:',
      savedReportValueJa: 'プレミアムレポート',
      consultReplyLabelJa: '追加読み解き:',
      consultReplyValueJa: '1件',
      bodyJa: 'まずプレミアムレポートを読み、必要なときに1テーマだけ深めたい方',
      upgradeNoteJa: 'ライト購入後も、¥600（税込）でフルに切り替えられます。',
      ctaLabelJa: 'ライトを選ぶ',
      productKey: PAID_DTR_SAVED_REPORT_PRICING.light.productKey,
    },
  },
  upgrade: {
    sectionTitleJa: 'ライトからフルへの切り替え',
    paragraphsJa: [
      'ライト購入後でも、必要になったらフルに切り替えられます。',
      'プレミアムレポートを読んだあと、もう少し深く整理したくなった場合に選べます。',
      'フルに切り替えると、追加読み解きの利用上限が合計5件になります。',
    ] as const,
  },
  purchaseNotes: {
    sectionTitleJa: '購入前の確認',
    checkoutFutureJa:
      'お支払い完了後は生成画面を経てプレミアムレポートを開けます。',
    legalLinksNavAriaLabelJa: '購入に関する案内',
    paragraphsJa: [
      'プレミアムレポートは、購入時点の生年月日・プロフィールにもとづく読み物です。未来予測や吉凶の断定ではありません。',
      '同じ入力内容なら、同じプレミアムレポートに戻れます。',
      '価格はすべて税込です。ライト購入後のフル切り替えは ¥600（税込）です。',
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
        questionJa: 'ライト購入後にフルへ切り替えられますか？',
        answerJa:
          'はい。必要になったら、あとからフルに切り替えられます（¥600・税込）。\n切り替えると、追加読み解きの利用上限が合計5件になります。',
      },
    ] as const,
  },
  cta: {
    sectionTitleJa: 'はじめる',
    finalCompareLabelJa: 'プラン選択へ進む',
  },
  operational: {
    ownedState: {
      statusLeadJa: 'プレミアムレポートの閲覧・準備状況はこちらから進められます。',
      openReportCtaJa: 'レポートを開く',
      recoveryLeadJa:
        '購入済みです。プレミアムレポートの準備状況を確認できます（再購入は不要です）。',
      recoveryCtaJa: '準備状況を確認する',
      supportCtaJa: 'サポートへ問い合わせる',
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
    lp.authorityNote.sectionTitleJa,
    lp.authorityNote.headlineJa,
    ...lp.authorityNote.bodyParagraphsJa,
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
    lp.tiers.sectionLeadJa,
    lp.tiers.navigateToPrepCtaJa,
    full.planNameJa,
    full.priceLabelJa,
    full.oneTimeLabelJa,
    full.savedReportLabelJa,
    full.savedReportValueJa,
    full.consultReplyLabelJa,
    full.consultReplyValueJa,
    full.bodyJa,
    full.ctaLabelJa,
    light.planNameJa,
    light.priceLabelJa,
    light.oneTimeLabelJa,
    light.savedReportLabelJa,
    light.savedReportValueJa,
    light.consultReplyLabelJa,
    light.consultReplyValueJa,
    light.bodyJa,
    light.upgradeNoteJa,
    light.ctaLabelJa,
    lp.upgrade.sectionTitleJa,
    ...lp.upgrade.paragraphsJa,
    lp.purchaseNotes.sectionTitleJa,
    lp.purchaseNotes.checkoutFutureJa,
    lp.purchaseNotes.legalLinksNavAriaLabelJa,
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
