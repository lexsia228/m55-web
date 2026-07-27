/**
 * M55 Commercial Funnel — machine product truth (top authority for verifiable product facts).
 * Human principles: docs/ssot/M55_COMMERCIAL_FUNNEL_SSOT.md
 * Do not treat target contract fields as current runtime truth.
 */

export const M55_COMMERCIAL_FUNNEL_CONTRACT_VERSION = 'v1' as const;

export const M55_ENFORCEMENT_STATUS = 'PENDING_SELF_FUNNEL_IMPLEMENTATION' as const;

export type ProductStatus = 'LIVE' | 'LIVE_PUBLIC' | 'NOT_LIVE';

export type PurchaseType = 'none' | 'one_time';

export type ReportChapter = {
  order: number;
  titleJa: string;
};

export type CommercialProduct = {
  productKey: string;
  status: ProductStatus;
  availability: string;
  publicName: string;
  purpose: string;
  inputRequirements: readonly string[];
  loginRequirement: 'none' | 'required';
  purchaseType: PurchaseType;
  currency: 'JPY';
  priceJpy: number | null;
  reportChapters: number;
  additionalThemes: number;
  benefits: readonly string[];
  freeVsPaidBoundary: string;
  ctaLabel: string | null;
  href: string | null;
  showHomePaidCta: boolean;
  prohibitedClaims: readonly string[];
};

export const M55_REPORT_CHAPTERS: readonly ReportChapter[] = [
  { order: 1, titleJa: 'Ⅰ 輪郭を見る' },
  { order: 2, titleJa: 'Ⅱ 構造を読む' },
  { order: 3, titleJa: 'Ⅲ 無理を知る' },
  { order: 4, titleJa: 'Ⅳ 楽に扱う' },
] as const;

export const M55_PROHIBITED_CLAIMS = [
  '相性鑑定',
  '占い',
  '霊視',
  '運命',
  '相手の本音',
  '未来予測',
  '復縁できる',
  '結婚できる',
  '必ず改善する',
  '相性スコア',
  '10タイプ',
  '基本タイプ',
] as const;

export const M55_LEGACY_RUNTIME_DEBT = {
  preResultThemeSelectionStepJa: '今の関心',
  legacyPublicTerms: ['保存版', '見取り図'] as const,
  runtimeCopyAuthorities: [
    'lib/m55/topFreeEntryPublicCopy.ts',
    'lib/m55/paidDtrProductCopy.ts',
    'lib/m55/freeResult/questionnaireCopyV1.ts',
  ] as const,
  resolutionLane: '個人無料→個人Premiumファネル一括実装',
} as const;

export const M55_CURRENT_RUNTIME_STATE = {
  productionMainSha: 'd4e7b7c3426d901d1ba8460e136040bf209a64de',
  selfFree: {
    preResultThemeSelection: false,
    themeSelectionStepLabelJa: null,
    questionnaireIncludesCurrentInterest: false,
    legacyTermsInPublicCopy: true,
    freeResultIncludesActionSuggestions: false,
    canonicalFreeResultCount: 'single canonical via DOB + five core answers',
  },
  selfPremium: {
    publicNameDrift: {
      ssotPublicNameLight: 'M55 プレミアムレポート ライト',
      ssotPublicNameFull: 'M55 プレミアムレポート フル',
      runtimeLegacyNames: [] as const,
    },
  },
  pairPremium: {
    commerceEnvGated: true,
    productionE2EComplete: false,
    homePaidCtaVisible: false,
  },
} as const;

export const M55_TARGET_COMMERCIAL_CONTRACT = {
  selfFree: {
    preResultThemeSelection: false,
    inputFlow: ['生年月日', '中核質問'],
    singleCanonicalFreeResult: true,
    purpose: 'RECOGNITION_AND_TRUST',
    premiumThemeSelectionTiming: 'after_purchase',
  },
  selfPremium: {
    freeBoundary: '無料=何が起きやすいか / 有料=なぜ・条件・構造・扱い方',
  },
  pairFree: {
    centerDefinition: 'あなた＋関係を知りたい相手',
    answerer: 'ユーザー本人',
  },
} as const;

export const M55_DEFERRED_RUNTIME_ASSERTIONS = [
  {
    id: 'no_pre_result_theme_selection_step',
    description: '「今の関心」step が存在しない',
    enforcement: 'PENDING_SELF_FUNNEL_IMPLEMENTATION',
  },
  {
    id: 'no_public_mitorizu_copy',
    description: '「見取り図」public copy が 0',
    enforcement: 'PENDING_SELF_FUNNEL_IMPLEMENTATION',
  },
  {
    id: 'no_public_hozonban_copy',
    description: '「保存版」public copy が 0',
    enforcement: 'PENDING_SELF_FUNNEL_IMPLEMENTATION',
  },
] as const;

export const M55_COMMERCIAL_PRODUCTS = {
  selfFree: {
    productKey: 'self_free_v1',
    status: 'LIVE',
    availability: 'PUBLIC_NO_LOGIN',
    publicName: '個人無料読み解き',
    purpose: 'RECOGNITION_AND_TRUST',
    inputRequirements: ['生年月日', '中核質問'],
    loginRequirement: 'none',
    purchaseType: 'none',
    currency: 'JPY',
    priceJpy: null,
    reportChapters: 0,
    additionalThemes: 0,
    benefits: [
      '今の自分に出やすい反応',
      '考え、動き始める順番',
      '人と関わるときの距離',
      '負担が表れ始めるサイン',
      '表れやすい資質',
    ],
    freeVsPaidBoundary:
      '無料は「何が起きやすいか」の認識・信頼。有料は「なぜ・条件・構造・扱い方」。',
    ctaLabel: '無料で見てみる',
    href: '/core',
    showHomePaidCta: false,
    prohibitedClaims: M55_PROHIBITED_CLAIMS,
  },
  pairFree: {
    productKey: 'pair_free_v1',
    status: 'LIVE_PUBLIC',
    availability: 'PUBLIC_NO_LOGIN',
    publicName: '2人の距離の読み解き',
    purpose: 'PAIR_FLOW_ENTRY',
    inputRequirements: [
      '二人分の生年月日',
      '回答者はユーザー本人（相手が回答したものではない）',
    ],
    loginRequirement: 'none',
    purchaseType: 'none',
    currency: 'JPY',
    priceJpy: null,
    reportChapters: 0,
    additionalThemes: 0,
    benefits: ['二人の間に今表れやすい流れの入口'],
    freeVsPaidBoundary:
      '無料=今表れやすい流れの入口。有料=なぜ・違い・ペース差・すれ違い順・扱い方（未 LIVE）。',
    ctaLabel: null,
    href: '/synastry',
    showHomePaidCta: false,
    prohibitedClaims: M55_PROHIBITED_CLAIMS,
  },
  selfPremiumLight: {
    productKey: 'dtr_core_light_v1',
    status: 'LIVE',
    availability: 'LOGIN_REQUIRED',
    publicName: 'M55 プレミアムレポート ライト',
    purpose: 'DEPTH_STRUCTURE_HANDLING',
    inputRequirements: ['生年月日', '中核質問', '購入後に追加 theme 選択'],
    loginRequirement: 'required',
    purchaseType: 'one_time',
    currency: 'JPY',
    priceJpy: 1000,
    reportChapters: 4,
    additionalThemes: 1,
    benefits: [
      '同じ4章レポート',
      '追加読み解き1件',
      '全体像＋最も気になる一つ',
    ],
    freeVsPaidBoundary:
      '無料結果を土台に、背景・条件・構造・扱い方まで読み解く。',
    ctaLabel: 'プレミアムレポートを見る',
    href: '/purchase',
    showHomePaidCta: true,
    prohibitedClaims: M55_PROHIBITED_CLAIMS,
  },
  selfPremiumFull: {
    productKey: 'dtr_core_full_v1',
    status: 'LIVE',
    availability: 'LOGIN_REQUIRED',
    publicName: 'M55 プレミアムレポート フル',
    purpose: 'DEPTH_STRUCTURE_HANDLING',
    inputRequirements: ['生年月日', '中核質問', '購入後に複数 theme 選択'],
    loginRequirement: 'required',
    purchaseType: 'one_time',
    currency: 'JPY',
    priceJpy: 1480,
    reportChapters: 4,
    additionalThemes: 5,
    benefits: [
      '同じ4章レポート',
      '追加読み解き合計5件',
      '複数の関心をまとめて深める',
    ],
    freeVsPaidBoundary:
      '無料結果を土台に、背景・条件・構造・扱い方まで読み解く。',
    ctaLabel: 'プレミアムレポートを見る',
    href: '/purchase',
    showHomePaidCta: true,
    prohibitedClaims: M55_PROHIBITED_CLAIMS,
  },
  pairPremium: {
    productKey: 'compatibility_report_full_v1',
    status: 'NOT_LIVE',
    availability: 'ENV_GATED_SANDBOX_ONLY',
    publicName: '二人の相性レポート',
    purpose: 'PAIR_DEPTH_NOT_LIVE',
    inputRequirements: [
      '二人分の生年月日',
      'ユーザー本人の回答',
      'Production E2E 未完了',
    ],
    loginRequirement: 'required',
    purchaseType: 'one_time',
    currency: 'JPY',
    priceJpy: 1480,
    reportChapters: 6,
    additionalThemes: 0,
    benefits: [
      'なぜその流れになりやすいか',
      '二人の違い',
      '会話や距離のペース差',
      'すれ違いが続く順番',
      '違いをどう扱えるか',
      '次に試せること',
    ],
    freeVsPaidBoundary:
      'repo authority: lib/m55/compatibility/compatibilityCommerceAuthority.ts。Sandbox 存在のみでは LIVE 扱いしない。',
    ctaLabel: null,
    href: null,
    showHomePaidCta: false,
    prohibitedClaims: M55_PROHIBITED_CLAIMS,
  },
} as const satisfies Record<string, CommercialProduct>;

export type CommercialProductKey = keyof typeof M55_COMMERCIAL_PRODUCTS;

export function getCommercialProduct(key: CommercialProductKey): CommercialProduct {
  return M55_COMMERCIAL_PRODUCTS[key];
}

export const M55_PAIR_RELATION_SUPPORT = {
  好きな人: { status: 'SUPPORTED', repoMapping: 'R1 片思い' },
  恋人: { status: 'SUPPORTED', repoMapping: 'R3 付き合っている' },
  パートナー: { status: 'SUPPORTED', repoMapping: 'R3 / R6' },
  夫婦: { status: 'SUPPORTED', repoMapping: 'R6 長く一緒にいることを考えている' },
  家族: { status: 'UNSUPPORTED', repoMapping: 'RELATION_STATUS_CATALOG に該当なし' },
  友人: { status: 'UNSUPPORTED', repoMapping: 'RELATION_STATUS_CATALOG に該当なし' },
} as const;

export const M55_COMMERCIAL_STATE_REGISTRY = {
  HOME_COMMERCIAL_FOUNDATION: 'CLOSED_GREEN',
  HOME_FINAL_DESIGN_COPY_PRODUCT_SSOT: 'NOT_YET',
  COMPLETED_GREEN: 'M55 Commercial Funnel SSOT構築 (PR #74)',
  ACTIVE_LANE: '個人無料→個人Premiumファネルの一括実装',
  POST_MERGE_NEXT_SINGLE_ACTION:
    'PRIMARY_MAIN_HOME（M55_WORKTREE-home-final-ia-v1）で main を checkout し origin/main の merge SHA を確認 → M55_SELF_FUNNEL_CONTRACT.md の target と current runtime gap を照合 → Self free→Premium 実装 PR のスコープ確定（本 lane では SSOT/docs のみ merge 済み）',
  PAIR_PREMIUM_LANE: 'LATER — roadmap step 3（二人向け無料→有料）',
  PROHIBITED_AHEAD_OF_SELF_FUNNEL: ['Stripe変更', 'Pair runtime変更', 'HOME final SSOT', 'DO_NOT_USE worktree での実装'],
  CURRENT_SAFE_WORKTREE: '/Users/lexsia/Documents/M55_WORKTREE-home-final-ia-v1',
  STALE_DO_NOT_USE_WORKTREE: '/Users/lexsia/Documents/M55_CANONICAL-cross-page-card-polish',
  STALE_WORKTREE_REASON:
    'compatibility commerce core は main へ merge 済み。branch は main より古く、QA artifact と未 commit .gitignore 変更あり。',
} as const;

export const M55_ROADMAP_ORDER = [
  'Commercial Funnel SSOT',
  '個人無料→個人Premium',
  '二人向け無料→有料',
  'HOME最終統合',
  'HOME正式SSOT',
  'ファネル計測',
  '全ページvisual統一',
] as const;
