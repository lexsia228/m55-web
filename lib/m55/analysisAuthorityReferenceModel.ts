import { PAID_DTR_SAVED_REPORT_PRICING } from './paidDtrProductCopy';
import { COMPATIBILITY_REPORT_PRODUCT_AUTHORITY } from './compatibility/compatibilityCommerceAuthority';

/**
 * M55 public product-truth SSOT.
 * Explains how calendar references + answers become user-facing readings and
 * keeps public product/payment explanations tied to existing product authorities.
 */

export const M55_ANALYSIS_AUTHORITY_REFERENCE_MODEL_VERSION = 'v2' as const;

export type M55AnalysisAuthorityReferenceModelVersion =
  typeof M55_ANALYSIS_AUTHORITY_REFERENCE_MODEL_VERSION;

export type M55ReferenceSource = {
  readonly id: string;
  readonly labelJa: string;
  readonly roleJa: string;
};

export type M55ExplanationStep = {
  readonly order: number;
  readonly labelJa: string;
};

export type M55CompatibilityExplanationModel = {
  readonly publicNameJa: string;
  readonly displayAxesJa: readonly string[];
  readonly boundariesJa: readonly string[];
};

export type M55VisualizationHcdModel = {
  readonly principlesJa: readonly string[];
  readonly prohibitionsJa: readonly string[];
};

export type M55LegalSafetyBoundaries = {
  readonly isNotJa: readonly string[];
  readonly complianceFramingJa: readonly string[];
};

export type M55AnalysisAuthorityReferenceModel = {
  readonly version: M55AnalysisAuthorityReferenceModelVersion;
  readonly pipelineSummaryJa: readonly string[];
  readonly whatM55IsJa: readonly string[];
  readonly whatM55IsNotJa: readonly string[];
};

export const M55_ANALYSIS_AUTHORITY_REFERENCE_MODEL: M55AnalysisAuthorityReferenceModel = {
  version: M55_ANALYSIS_AUTHORITY_REFERENCE_MODEL_VERSION,
  pipelineSummaryJa: [
    'M55は、生年月日から得られる日本の暦文化上の手がかりと、本人の回答による現在の感じ方を組み合わせて、自己理解と関係性の距離を読み解く参考情報サービスである。',
    '生年月日は、干支・十干十二支・二十四節気・季節位置など、日本の暦文化上の初期ベースを作るために使う。',
    '質問回答は、現在の感じ方・行動傾向・関係性の差分を補正するために使う。',
    '出力は、ユーザー語の文章・グラフ・距離表示・注意点として可視化する。',
    '本サービスは、医学的診断、心理検査、治療、カウンセリング、または将来の不確実な事実を断定するものではない。',
  ],
  whatM55IsJa: [
    '文化的参照体系と回答差分による自己理解・関係性整理の読み解き',
    '生年月日から得られる日本の暦文化上の手がかりと、本人回答による現在の感じ方を組み合わせる参考情報サービス',
    '透明な説明責任、誤認防止、利用者保護を前提にした compliance-by-design のプロダクト',
  ],
  whatM55IsNotJa: [
    '医学的診断',
    '心理検査',
    '治療',
    'カウンセリング',
    '適性検査の証明',
    '将来断定',
    '運命断定',
    '当たる保証',
    '霊的効能',
    '超自然的保証',
    '占い・鑑定・相談としての断定サービス',
    '医療・法律・投資助言',
    'マッチングサービス',
  ],
} as const;

export const M55_ANALYSIS_ALLOWED_TERMS = [
  'compliance-by-design',
  '誤認防止',
  '利用者保護',
  '透明な説明責任',
  '文化的参照体系',
  '日本の暦文化',
  '季節位置',
  '回答差分',
  '自己理解',
  '関係性整理',
  '2人の距離の読み解き',
  '人間中心設計',
  'アクセシビリティ',
  'わかりやすい可視化',
  '医学的診断・心理検査ではない',
  '将来の不確実な事実を断定しない',
  '参考情報としての読み解き',
  '保存版',
  '追加読み解き',
  '出やすい傾向',
  '調整しやすい点',
  '今日の一手',
  '距離',
  '噛み合いやすい点',
  'ズレやすい点',
  '近づけ方',
  '無理に詰めない方がよい点',
] as const;

/** Positioning / compliance denylist — not a repo-wide text ban. */
export const M55_ANALYSIS_PROHIBITED_TERMS = [
  '規約回避',
  'クローラー無力化',
  'Stripe通過保証',
  '審査突破保証',
  '完全回避',
  '検知回避',
  '言葉のロンダリング',
  '必ず除外される',
  '絶対に安全',
  '占いとして通す',
  'オカルトを隠す',
  '未来がわかる',
  '運命を断定',
  '当たる',
  '必ず改善',
  '心理診断',
  '医学的診断',
  '治療',
  'カウンセリング',
  '適性検査として証明済み',
  '結婚できます',
  '復縁できます',
  '離婚すべき',
  '転職成功',
  '投資成功',
  '霊的効能',
  '超自然的保証',
  '不安を煽る課金誘導',
  '期限切れ恐怖訴求',
  '今買わないと悪くなる',
  '相性が良い',
  '相性が悪い',
  '相性◯%',
] as const;

export const M55_PERSONAL_ANALYSIS_EXPLANATION_ORDER: readonly M55ExplanationStep[] = [
  { order: 1, labelJa: '暦文化上の初期ベース' },
  { order: 2, labelJa: '回答差分' },
  { order: 3, labelJa: '今見えている傾向' },
  { order: 4, labelJa: '読み解き' },
  { order: 5, labelJa: '注意点 / 決めつけではないこと' },
  { order: 6, labelJa: '次に整理できるテーマ' },
] as const;

export const M55_COMPATIBILITY_EXPLANATION_MODEL: M55CompatibilityExplanationModel = {
  publicNameJa: '2人の距離の読み解き',
  displayAxesJa: [
    '距離',
    '噛み合いやすい点',
    'ズレやすい点',
    '近づけ方',
    '無理に詰めない方がよい点',
  ],
  boundariesJa: [
    '良い/悪い断定をしない',
    '相手の人格を断定しない',
    '関係継続・結婚・別れ・復縁・成功失敗を断定しない',
    '関係整理のデジタルレポートとして扱う',
  ],
} as const;

export const M55_VISUALIZATION_HCD_MODEL: M55VisualizationHcdModel = {
  principlesJa: [
    '一目で理解できる粒度、特にスマホ',
    '「不足/欠陥」ではなく「出やすい傾向/調整しやすい点」と表現する',
    '見出し構造と読み上げ順序を壊さない',
    '1セクション1目的',
    '説明責任の順序を守る',
  ],
  prohibitionsJa: [
    '不安を煽る赤・警告・危険ラベルを乱用しない',
    'スコア優劣・%・ランキング禁止',
  ],
} as const;

export const M55_LEGAL_SAFETY_BOUNDARIES: M55LegalSafetyBoundaries = {
  isNotJa: [
    '医学的診断・心理検査・治療・カウンセリングではない',
    '将来の不確実な事実を断定しない',
    '健康・治療効果を主張しない',
    '標準医療の代替ではない',
    '占い・鑑定・相談としての断定サービスではない',
    '医療・法律・投資助言ではない',
    'マッチングサービスではない',
  ],
  complianceFramingJa: [
    'compliance-by-design',
    '誤認防止',
    '利用者保護',
    '透明な説明責任',
  ],
} as const;

export const M55_REFERENCE_SOURCES: readonly M55ReferenceSource[] = [
  {
    id: 'ndl',
    labelJa: '国立国会図書館（日本の暦）',
    roleJa: '干支・十干十二支・暦注など文化的参照体系の根拠。科学的診断根拠ではない。',
  },
  {
    id: 'naoj',
    labelJa: '国立天文台（暦要項・二十四節気）',
    roleJa: '二十四節気と太陽黄経に基づく季節位置・暦上の区切りの根拠。',
  },
  {
    id: 'kokugakuin',
    labelJa: '國學院大學 / 國學院大學博物館',
    roleJa: '土御門家・陰陽道・天文道・日本思想史の歴史文化文脈。科学的診断根拠ではない。',
  },
  {
    id: 'digital_agency',
    labelJa: 'デジタル庁アクセシビリティ導入ガイドブック',
    roleJa: 'スマホ対応・読み上げ順序・わかりやすい説明のUI根拠。',
  },
  {
    id: 'jis_iso_hcd',
    labelJa: 'JIS Z 8530 / ISO 9241-210',
    roleJa: '人間中心設計。理解しやすい順序、不安を煽らない設計、操作しやすい画面構成。',
  },
  {
    id: 'mhlw_ejim',
    labelJa: '厚生労働省eJIM',
    roleJa: '標準医療の代替ではない線引き。健康・治療効果を主張しない安全境界。',
  },
  {
    id: 'caa_tokushoho',
    labelJa: '消費者庁 / 特定商取引法ガイド',
    roleJa: '価格・支払時期・役務提供時期・返品/解除条件の誤認防止。',
  },
] as const;

export const M55_USER_FACING_POSITIONING_COPY = [
  'M55は、生年月日の暦リズムと、選択式の質問による現在の感じ方を重ねて、自分や二人の関係を整理する読み解きサービスです。',
  '干支、季節、二十四節気などの歴史ある暦の考え方を参照しながら、それを現代の言葉とグラフに翻訳し、ユーザー自身が「なぜそう見えるのか」を理解できる形で表示します。',
  '本サービスは、医学的・心理学的な診断、治療、未来予測、吉凶判定、相性の点数化ではありません。自分の傾向、相手との違い、今の距離感を整理するための参考情報として提供されます。',
] as const;

export const M55_PUBLIC_COMMERCIAL_TRUTH = {
  summaryJa:
    'M55は、生年月日の暦リズムと選択式の質問を重ね、考え方・動き方・負担が出やすい場面を整理する自己理解と関係性整理のための読み解きシステムです。',
  inputs: {
    personalJa: [
      '本人の生年月日',
      '現在の表れ方を確認する5つの選択式質問',
      '今、確かめたい関心テーマ',
      '保存版では購入前の追加質問',
    ] as const,
    compatibilityJa: [
      '二人分の生年月日',
      '入力者から観察できる現在の二人についての6つの選択式質問',
      '今、確かめたい関係の焦点',
    ] as const,
  },
  processing: {
    frameworkJa:
      '10資質は、M55独自の整理フレームです。科学的な性格診断や医療・臨床上の分類ではありません。',
    personalFreeJa:
      '個人の無料見取り図は、生年月日の暦リズムと選択式回答をM55の固定ルールで組み合わせます。同じ入力には同じ組み立てを返し、生成AIは使用しません。',
    personalSavedJa:
      '個人の保存版は、M55の固定ルールと検査済みの文章素材を土台に4章で組み立てます。新しい保存版では、提供設定に応じて章の文章表現に生成AIを使う場合があります。品質条件を満たさない場合は固定ルールの本文へ戻します。',
    personalAdditionalJa:
      '追加読み解きは、購入済み保存版と選んだ1テーマを土台に生成AIで文章を組み立てます。汎用チャットではなく、利用可能件数の範囲で1テーマずつ扱います。',
    compatibilityFreeJa:
      '二人の無料見取り図は、二人分の生年月日と現在の回答をM55の固定ルールで組み合わせます。同じ入力には同じ結果を返し、生成AIは使用しません。',
    compatibilitySavedJa:
      '二人の保存版は、無料結果と同じ入力をM55の固定ルールで6章に展開します。生成AIは使用せず、購入したアカウントへ保存します。',
  },
  outputs: {
    personalFreeJa:
      '土台と現在の回答を分けて、5つの視点、今の関心、最初の小さな行動まで表示します。',
    personalSavedJa:
      '仕事・近い関係・生活と疲れの場面まで、4章の保存版としてウェブ上に保存し、購入したアカウントから読み返せます。',
    compatibilityFreeJa:
      '二人の反応の重なりと違い、現在続きやすい連鎖、最初に確かめる行動まで表示します。',
    compatibilitySavedJa:
      `場面ごとの深掘り、距離が広がる前のサイン、伝える速度の違い、戻るための言葉と行動を${COMPATIBILITY_REPORT_PRODUCT_AUTHORITY.reportCount}件・6章で保存します。`,
  },
  limitationsJa: [
    '医学的・心理学的な診断ではありません。',
    '未来予測、吉凶判定、運命の断定ではありません。',
    '相性の点数、順位、優劣を示しません。',
    '医療・法律・投資その他の専門判断や、本人の意思決定に代わるものではありません。',
  ] as const,
  commercial: {
    personal: {
      chapterCount: 4,
      light: PAID_DTR_SAVED_REPORT_PRICING.light,
      full: PAID_DTR_SAVED_REPORT_PRICING.full,
      upgrade: PAID_DTR_SAVED_REPORT_PRICING.lightToFullUpgrade,
    },
    compatibility: {
      ...COMPATIBILITY_REPORT_PRODUCT_AUTHORITY,
      chapterCount: 6,
    },
    currencyJa: '日本円（JPY）',
    taxJa: '表示価格は税込です。',
    billingJa: '買い切りの一回払いです。自動更新はありません。',
    deliveryJa:
      '決済確認後に本文を生成し、準備が完了すると購入したアカウントでウェブ閲覧できます。物理配送はありません。',
    ownershipJa:
      '購入したアカウントに保存され、読み解きホームから再開し、マイページで履歴を確認できます。',
    paymentProcessorJa:
      '支払いはStripe Checkoutで処理されます。選べる決済手段は、利用端末・地域・Checkout環境により異なります。',
    dataHandlingJa:
      '入力内容はレポートの組み立てと提供に必要な範囲で扱います。決済情報はStripeが処理し、M55はカード番号を保存しません。',
    supportHref: '/support',
    refundHref: '/legal/refund',
    termsHref: '/legal/terms',
    privacyHref: '/legal/privacy',
    businessHref: '/legal/tokushoho',
  },
} as const;

/** Flat blob for positioning / compliance audits. */
export function m55AnalysisAuthorityPositioningBlob(): string {
  return [
    ...M55_ANALYSIS_AUTHORITY_REFERENCE_MODEL.pipelineSummaryJa,
    ...M55_ANALYSIS_AUTHORITY_REFERENCE_MODEL.whatM55IsJa,
    ...M55_ANALYSIS_AUTHORITY_REFERENCE_MODEL.whatM55IsNotJa,
    ...M55_USER_FACING_POSITIONING_COPY,
    ...M55_LEGAL_SAFETY_BOUNDARIES.isNotJa,
    ...M55_LEGAL_SAFETY_BOUNDARIES.complianceFramingJa,
  ].join('\n');
}
