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

export const PAID_DTR_BENEFITS_HEADING = 'このレポートで分かること' as const;

export const PAID_DTR_BENEFIT_BULLETS = [
  '近い人との関係で、自分らしくいられる距離感',
  '人との距離や言葉選びで、どこで無理がたまりやすいか',
  '疲れやすい条件と、崩れやすい流れ',
  '自分をどこから整えると戻りやすいか',
] as const;

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
    '近い人との距離',
    '言葉を選びすぎてしまう場面',
    '断れなかったあとの疲れ',
    '平気なふりをしてしまうとき',
    'ひとりで戻る時間の作り方',
  ] as const,
  goodQuestionExamplesJa: [
    '大切な人にほど言葉を選びすぎてしまい、あとから疲れます。保存版の「無理がたまる条件」に当てはめると、どこから整えるのが現実的ですか',
    '断れなかった出来事のあとに、ひとりで抱え込みやすくなります。距離の章を踏まえて、いまの論点を絞りたいです',
    '平気なふりが続いていて落ち着きません。戻し方の章に沿って、今日できる小さな一歩を整理したいです',
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
    '1回の送信で返書チケット1件を消費します。送信後の取り消しはできません。返書は保存されます。',
  capSummaryJa: '付属1件 + 追加購入最大4件まで（合計5件まで）',
  avoidOverpromisingJa: [
    '無制限の相談やチャットではありません',
    'なんでも答えるボットではありません',
    'レポート本文の生成完了をメールでお知らせする、とは約束しません',
  ] as const,
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
    ...PAID_DTR_CONSULT_REPLY.avoidOverpromisingJa,
    ...PAID_DTR_PURCHASE_ACCESS_FLOW.flatMap((s) => [s.titleJa, s.bodyJa]),
    PAID_DTR_TRUST_BOUNDARIES.digitalContentJa,
    PAID_DTR_TRUST_BOUNDARIES.notAdviceJa,
    PAID_DTR_TRUST_BOUNDARIES.noGuaranteedOutcomeJa,
    PAID_DTR_TRUST_BOUNDARIES.profileSnapshotJa,
  ];
  return parts;
}
