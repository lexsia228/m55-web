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

export const PAID_DTR_CONSULT_REPLY = {
  primaryTermJa: '相談返書',
  bridgeTermJa: 'AI往復券',
  includedCount: 1,
  additionalMaxPurchased: 4,
  totalCapPerReport: 5,
  additionalPriceYen: 500,
  additionalPriceLabelJa: '追加相談返書 1件 500円',
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
    '購入後、保存版レポート（/dtr/core）内の相談返書ルームで利用します。マイページやレポート棚からレポートを開いたあと、画面内の相談返書へ進みます。',
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

/** Consult room / ticket wallet UI copy (display-only). */
export const PAID_DTR_CONSULT_ROOM_UI = {
  ariaLabelJa: '相談返書ルーム（purchaser-only）',
  roomTitleJa: '相談返書ルーム',
  roomLeadJa:
    '購入した保存版に紐づく相談です。汎用チャットではなく、無制限のやりとりでもありません。いまの1テーマを、章に沿って整理します。',
  usageLabelJa: '利用状態',
  /** Display-only wallet usage lines (counts come from API; cap from Product Truth constants). */
  usageUsedCountLabelJa: '使用済み',
  usageAdditionalPurchasableLabelJa: 'あと購入できる',
  walletLoadingJa: '残数確認中です。しばらくお待ちください。',
  savedReportLinkNoteJa:
    'この本質の読み解きに紐づいて、4章の内容を深掘りできます。',
  addOnCapNoteJa: '付属1件 + 追加購入4件までが上限です。',
  limitReachedAdditionalJa:
    'このレポートで利用できる追加相談返書は上限に達しました。',
  limitReachedReadOnlyJa:
    '相談返書の利用回数の上限に達しました。これまでのやりとりは引き続き確認できます。',
  purchaseOnlyInRoomPrefixJa:
    '追加相談返書の購入はこのルーム内でのみ申し込み可能です。上限は合計',
  purchaseOnlyInRoomSuffixJa: '件です。',
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
  walletPurchaseRetryNoteJa:
    'この本質の読み解きに紐づいて、今の相談をもう一度整理できます。',
} as const;

/** My page consult block (functional UI only — not emotional story). */
export const PAID_DTR_MY_PAGE_CONSULT = {
  blockTitleJa: '相談返書（保存版に紐づく）',
  blockIntroJa:
    '保存版の再開・相談返書の残数確認の入口です（機能案内）。',
  linkedScopeJa:
    '相談は保存版レポートに紐づく範囲です。汎用チャットではなく、無制限の相談でもありません。',
  capSummaryJa:
    '付属1件 + 追加最大4件 = 合計5件まで（残数・送信は相談返書ルームで確認）',
  remainingNoteJa:
    '相談返書の残り回数・送信は、保存版レポート内の相談返書ルームで確認できます。',
  reopenNoteJa:
    '保存版の再開は、上のレポート一覧またはレポート棚から行えます。',
  openRoomLinkJa: '相談返書ルームを開く',
  sectionAriaJa: '相談と保存の目安',
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
    titleJa: '相談返書ルーム',
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
