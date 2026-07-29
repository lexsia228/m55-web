/**
 * M55 複合読み解きモデル — machine-readable method and authority.
 *
 * Every public sentence about how M55 works derives from this module. The nine
 * inputs below are the composition authorities that actually exist in
 * `lib/m55/individualization`; nothing here describes a capability the runtime
 * does not have, and no claim above LEVEL 1 may reach runtime copy.
 *
 * Document SSOT: docs/ssot/M55_METHOD_AND_AUTHORITY_SSOT_v1.md
 */

/** The only public name for the method. */
export const M55_METHOD_PUBLIC_NAME = 'M55 複合読み解きモデル' as const;

/** The single canonical detailed method page. No competing route may exist. */
export const M55_METHOD_CANONICAL_ROUTE = '/how-m55-works' as const;

export const M55_METHOD_ROUTE_LINK_LABEL_JA = 'M55の読み解き方を見る' as const;

export type MethodInputId =
  | 'dob_base'
  | 'free_expression'
  | 'paid_depth'
  | 'align'
  | 'diverge'
  | 'intensity'
  | 'hesitation'
  | 'reactive_context'
  | 'reply_affinity';

/** When an input starts contributing to the reading. */
export type MethodInputStage = 'free' | 'premium';

export type MethodInput = {
  id: MethodInputId;
  /**
   * The field on `IndividualizationFingerprint` this input is derived from. Kept
   * for traceability in review; never rendered.
   */
  fingerprintField: string;
  stage: MethodInputStage;
  /** Daily Japanese. No internal vocabulary, no scores, no version strings. */
  publicLabelJa: string;
  publicDescriptionJa: string;
};

export const M55_METHOD_INPUTS: readonly MethodInput[] = [
  {
    id: 'dob_base',
    fingerprintField: 'dobBase',
    stage: 'free',
    publicLabelJa: '変わりにくい土台',
    publicDescriptionJa:
      '生年月日から、時期によって動きにくい傾向の土台を置きます。ここは日々の気分では変わりません。',
  },
  {
    id: 'free_expression',
    fingerprintField: 'freeExpression',
    stage: 'free',
    publicLabelJa: '今の回答に表れる傾向',
    publicDescriptionJa:
      '無料の5つの回答から、いま表に出ている動き方を読みます。土台とは分けて扱います。',
  },
  {
    id: 'paid_depth',
    fingerprintField: 'paidDepth',
    stage: 'premium',
    publicLabelJa: '踏み込んだ状況の手がかり',
    publicDescriptionJa:
      'プレミアムの6つの回答から、負担が出る場面と戻り方の手がかりを加えます。',
  },
  {
    id: 'align',
    fingerprintField: 'alignItems',
    stage: 'free',
    publicLabelJa: '近いところ',
    publicDescriptionJa: '土台と今の回答が同じ方向を向いている点を、重なりとして取り出します。',
  },
  {
    id: 'diverge',
    fingerprintField: 'divergeItems',
    stage: 'free',
    publicLabelJa: 'ずれるところ',
    publicDescriptionJa:
      '土台と今の回答が違う方向を向いている点を、ずれとして取り出します。どちらが正しいとは扱いません。',
  },
  {
    id: 'intensity',
    fingerprintField: 'intensity',
    stage: 'premium',
    publicLabelJa: '重なりの強さ',
    publicDescriptionJa: '同じ話題に手がかりがいくつ集まっているかで、記述の濃さを決めます。',
  },
  {
    id: 'hesitation',
    fingerprintField: 'hesitation',
    stage: 'free',
    publicLabelJa: '止まりやすさ',
    publicDescriptionJa: '決める前に止まりやすい状況が回答に表れているかを見ます。',
  },
  {
    id: 'reactive_context',
    fingerprintField: 'reactiveContext',
    stage: 'free',
    publicLabelJa: '表れやすい場面',
    publicDescriptionJa: '回答から、傾向が表に出やすい生活の場面を選び出します。',
  },
  {
    id: 'reply_affinity',
    fingerprintField: 'replyAffinity',
    stage: 'free',
    publicLabelJa: '扱いやすいテーマ',
    publicDescriptionJa:
      'ここまでの読み解きと相性のよいテーマの並びを決めます。追加読み解きの入口になります。',
  },
] as const;

/** The concise model shown on HOME and repeated in compact placements. */
export type MethodStep = {
  order: 1 | 2 | 3 | 4;
  titleJa: string;
  bodyJa: string;
  /** Inputs this step is built from. */
  inputIds: readonly MethodInputId[];
};

export const M55_METHOD_STEPS: readonly MethodStep[] = [
  {
    order: 1,
    titleJa: '変わりにくい土台を置く',
    bodyJa: '生年月日から、動きにくい傾向の土台を先に置きます。',
    inputIds: ['dob_base'],
  },
  {
    order: 2,
    titleJa: '今の反応を別に見る',
    bodyJa: 'いまの回答から表れている動き方を、土台と混ぜずに読みます。',
    inputIds: ['free_expression', 'hesitation'],
  },
  {
    order: 3,
    titleJa: '近い点とずれる点を出す',
    bodyJa: '二つを重ねて、揃っているところと食い違うところを取り出します。',
    inputIds: ['align', 'diverge'],
  },
  {
    order: 4,
    titleJa: '生活の場面へ戻す',
    bodyJa: '負担が重なりやすい場面と、扱いやすいテーマの順に整理します。',
    inputIds: ['reactive_context', 'reply_affinity', 'intensity'],
  },
] as const;

/**
 * Canonical sentences. Placements quote these verbatim so one wording change
 * reaches every surface and no surface can drift into a stronger claim.
 */
export const M55_METHOD_CANONICAL_COPY = {
  explanationJa:
    'M55は、生年月日だけでも、今の回答だけでも人を決めません。変わりにくい土台と、今表れている反応を別々に見て、近いところとずれるところ、負担が重なりやすい場面を一つの読み解きに組み立てます。',
  reproducibilityJa:
    '中核となる整理は、版管理された固定規則で行われます。同じ入力を同じ版で処理した場合、同じ読み解きの土台が再現されます。',
  boundaryJa: '診断、占い、未来予測、相手の気持ちの断定ではありません。',
  premiumDifferenceHeadingJa: '無料とPremiumで重ねる情報の違い',
  premiumDifferenceFreeJa:
    '無料では、土台と今の回答を重ねて、近い点とずれる点までを読み解きます。',
  premiumDifferencePremiumJa:
    'Premiumでは、6つの回答を加えて、負担が出る場面と戻り方まで踏み込みます。読み解ける範囲が増えるという違いで、当たり方が上がるという意味ではありません。',
  compactFreeResultHeadingJa: 'この結果の組み立て',
  compactReportHeadingJa: 'このレポートの組み立て',
  homeHeadingJa: 'M55の読み解きの組み立て',
} as const;

/** LEVEL 1 — claimable today. Runtime copy may use these and nothing else. */
export const M55_AUTHORITY_LEVEL_1 = [
  'transparent inputs',
  'deterministic core composition',
  'versioning',
  'reproducibility of the reading foundation',
  'privacy boundaries',
  'Product Truth',
  'sample outputs',
  'QA and visual quality',
] as const;

/** LEVEL 2 — allowed only once the named evidence exists. Not for runtime copy. */
export const M55_AUTHORITY_LEVEL_2 = [
  'anonymized aggregate outcome studies',
  'test-retest evaluation',
  'user comprehension studies',
  'expert review',
  'external audit',
] as const;

/** LEVEL 3 — prohibited until independently validated. Never permitted. */
export const M55_AUTHORITY_LEVEL_3 = [
  'scientifically validated',
  'clinical validity',
  'diagnostic accuracy',
  'psychological measurement authority',
  'predictive accuracy',
] as const;

/**
 * Japanese and English phrases that assert authority M55 does not hold. The
 * verifier rejects any of these in governed public copy.
 */
export const M55_UNSUPPORTED_AUTHORITY_PHRASES = [
  '科学的に証明',
  '科学的に実証',
  '科学的根拠',
  '心理診断',
  '心理検査',
  '性格診断',
  '医学的',
  '臨床的',
  '専門医',
  '医師監修',
  '専門家監修',
  '専門家が監修',
  '監修済み',
  '的中率',
  '適合率',
  '正確度',
  '精度は',
  '当たる占い',
  '占い師',
  'AIがあなたを理解',
  'AIが理解します',
  '未来を予測',
  '将来を予測',
  '相手の気持ちがわかる',
  '相手の本音がわかる',
  '万人が利用',
  '利用者数',
  '研究参加者',
  'scientifically validated',
  'clinically validated',
  'diagnostic accuracy',
  'predictive accuracy',
] as const;

/**
 * Numeric authority patterns: an accuracy percentage or a participant count is
 * an unsupported claim regardless of wording.
 */
export const M55_UNSUPPORTED_AUTHORITY_PATTERNS: readonly RegExp[] = [
  /(的中|精度|正確|一致率)[^。]{0,8}\d+\s*[%％]/,
  /\d+\s*[%％][^。]{0,8}(的中|精度|正確)/,
  /\d[\d,]*\s*(人|名)[^。]{0,6}(利用|参加|検証|調査)/,
];

/** Every phrase in `text` that asserts authority M55 does not hold. */
export function unsupportedAuthorityClaims(text: string): readonly string[] {
  const hits: string[] = [];
  for (const phrase of M55_UNSUPPORTED_AUTHORITY_PHRASES) {
    if (text.includes(phrase)) hits.push(phrase);
  }
  for (const pattern of M55_UNSUPPORTED_AUTHORITY_PATTERNS) {
    const match = text.match(pattern);
    if (match) hits.push(match[0]);
  }
  return hits;
}

/** Internal vocabulary that must never surface to a reader. */
export const M55_INTERNAL_VOCABULARY_NOT_FOR_DISPLAY = [
  'dob_base',
  'free_expression',
  'paid_depth',
  'reactive_context',
  'reply_affinity',
  'fingerprint',
  'fp-v1',
  'dal-v1',
  'ptrm-v1',
  'chapterBias',
  'dobFp',
] as const;

export type MethodSectionId =
  | 'single_input_is_not_enough'
  | 'inputs_used'
  | 'stable_foundation'
  | 'current_answers'
  | 'align_and_diverge'
  | 'premium_depth'
  | 'life_scenes'
  | 'reproducibility_and_versioning'
  | 'storage_and_privacy'
  | 'what_m55_does_not_do';

export type MethodSection = {
  id: MethodSectionId;
  order: number;
  titleJa: string;
  bodyJa: readonly string[];
  /** Rendered as the section's list, when the section has one. */
  itemsJa?: readonly { labelJa: string; descriptionJa: string }[];
};

const FREE_STAGE_INPUTS = M55_METHOD_INPUTS.filter((i) => i.stage === 'free');
const PREMIUM_STAGE_INPUTS = M55_METHOD_INPUTS.filter((i) => i.stage === 'premium');

export const M55_METHOD_SECTIONS: readonly MethodSection[] = [
  {
    id: 'single_input_is_not_enough',
    order: 1,
    titleJa: '一つの情報だけで決めない',
    bodyJa: [
      M55_METHOD_CANONICAL_COPY.explanationJa,
      '生年月日だけを見ると、いまの状況が抜け落ちます。今の回答だけを見ると、そのときの気分に寄ります。M55はこの二つを分けて置き、重ねるところで読み解きます。',
    ],
  },
  {
    id: 'inputs_used',
    order: 2,
    titleJa: '入力として使うもの',
    bodyJa: [
      '使うのは、生年月日と、あなたが選んだ回答だけです。ほかの利用者との比較や、外部から取得した情報は使いません。',
    ],
    itemsJa: M55_METHOD_INPUTS.map((input) => ({
      labelJa: input.publicLabelJa,
      descriptionJa: input.publicDescriptionJa,
    })),
  },
  {
    id: 'stable_foundation',
    order: 3,
    titleJa: '変わりにくい土台',
    bodyJa: [
      '生年月日から置く土台は、日や気分で入れ替わりません。読み解きの基準点として、いつも同じ場所に置かれます。',
      '土台は良い悪いを表しません。動きやすい方向と、負担がたまりやすい方向を示す手がかりです。',
    ],
  },
  {
    id: 'current_answers',
    order: 4,
    titleJa: '今の回答に表れること',
    bodyJa: [
      `無料の回答からは、${FREE_STAGE_INPUTS.filter((i) => i.id !== 'dob_base')
        .map((i) => i.publicLabelJa)
        .join('、')}を読みます。`,
      '回答に正解はありません。選び直せば、読み解きもその入力に合わせて組み立て直されます。',
    ],
  },
  {
    id: 'align_and_diverge',
    order: 5,
    titleJa: '近い点とずれる点',
    bodyJa: [
      '土台と今の回答が同じ方向を向いていれば、その傾向は表に出やすいと読みます。違う方向を向いていれば、いま無理が寄っている場所として読みます。',
      'ずれは欠点ではありません。どこに力がかかっているかを示す情報として扱います。',
    ],
  },
  {
    id: 'premium_depth',
    order: 6,
    titleJa: 'Premiumで加わる深さ',
    bodyJa: [
      M55_METHOD_CANONICAL_COPY.premiumDifferencePremiumJa,
      `加わるのは、${PREMIUM_STAGE_INPUTS.map((i) => i.publicLabelJa).join('と')}です。`,
    ],
  },
  {
    id: 'life_scenes',
    order: 7,
    titleJa: '生活場面への整理',
    bodyJa: [
      '読み解きは、抽象的な性格の言葉で終わらせません。負担が表れやすい場面と、戻りやすい手順の形に置き直します。',
      '扱いやすいテーマの順も示します。何から見ると整理しやすいかの目安です。',
    ],
  },
  {
    id: 'reproducibility_and_versioning',
    order: 8,
    titleJa: '再現性と版管理',
    bodyJa: [
      M55_METHOD_CANONICAL_COPY.reproducibilityJa,
      '規則を更新するときは版を分けます。購入済みのレポートは、購入時の版のまま読み返せます。',
      'これは統計的な検証を経た精度の主張ではありません。同じ入力から同じ土台が出るという、処理の一貫性についての説明です。',
    ],
  },
  {
    id: 'storage_and_privacy',
    order: 9,
    titleJa: '保存とプライバシー',
    bodyJa: [
      '無料の読み解きは、ログインなしで開けます。保存すると、あとから同じ結果を開けます。',
      '共有用のカードには、生年月日や回答そのものは載せません。読み解きの表現だけを載せます。',
    ],
  },
  {
    id: 'what_m55_does_not_do',
    order: 10,
    titleJa: 'M55が行わないこと',
    bodyJa: [
      M55_METHOD_CANONICAL_COPY.boundaryJa,
      '医療・法律・投資などの専門的判断の代わりにはなりません。優劣や順位もつけません。',
      '相手の気持ちや、これから起きることを言い当てるものではありません。',
    ],
  },
] as const;

export type MethodPlacementId =
  | 'home'
  | 'core_free_result'
  | 'dtr_lp'
  | 'purchased_report'
  | 'pricing_checkout_prep'
  | 'footer_nav';

export type MethodPlacement = {
  id: MethodPlacementId;
  /** Where the placement is rendered. */
  route: string;
  ownerFile: string;
  /** Machine hook the route-consumption tests assert on. */
  testId: string;
  /** Required position, stated so a review can check the order by reading. */
  positionJa: string;
  /** Whether the placement links to the canonical method route. */
  linksToCanonicalRoute: boolean;
  /** Depth of copy allowed here. */
  density: 'four_step' | 'compact' | 'difference' | 'link_only';
};

export const M55_METHOD_PLACEMENTS: readonly MethodPlacement[] = [
  {
    id: 'home',
    route: '/home',
    ownerFile: 'components/home/HomeMethodModel.tsx',
    testId: 'm55-method-home',
    positionJa: '一般的な価値説明のあと、Premiumの価値比較の前',
    linksToCanonicalRoute: true,
    density: 'four_step',
  },
  {
    id: 'core_free_result',
    route: '/core',
    ownerFile: 'components/core/CoreMethodCompact.tsx',
    testId: 'm55-method-core-free-result',
    positionJa: '結果の説明のあと、Premiumブリッジの前',
    linksToCanonicalRoute: true,
    density: 'compact',
  },
  {
    id: 'dtr_lp',
    route: '/dtr/lp',
    ownerFile: 'components/dtr/DtrMethodDifference.tsx',
    testId: 'm55-method-dtr-difference',
    positionJa: 'プラン選択の前',
    linksToCanonicalRoute: true,
    density: 'difference',
  },
  {
    id: 'purchased_report',
    route: '/dtr/lp',
    ownerFile: 'components/dtr/DtrMethodReportNote.tsx',
    testId: 'm55-method-purchased-report',
    positionJa: '購入済みレポート本文の冒頭',
    linksToCanonicalRoute: true,
    density: 'compact',
  },
  {
    id: 'pricing_checkout_prep',
    route: '/pricing',
    ownerFile: 'components/pages/M55MethodTrustLink.tsx',
    testId: 'm55-method-trust-link',
    positionJa: '価格表の近く',
    linksToCanonicalRoute: true,
    density: 'link_only',
  },
  {
    id: 'footer_nav',
    route: '*',
    ownerFile: 'app/_components/PublicFooter.tsx',
    testId: 'm55-method-footer-link',
    positionJa: 'フッターの共通リンク',
    linksToCanonicalRoute: true,
    density: 'link_only',
  },
] as const;

export function methodPlacementById(id: MethodPlacementId): MethodPlacement | undefined {
  return M55_METHOD_PLACEMENTS.find((p) => p.id === id);
}

/** Inputs contributing at the given stage, in authority order. */
export function methodInputsForStage(stage: MethodInputStage): readonly MethodInput[] {
  return M55_METHOD_INPUTS.filter((input) => input.stage === stage);
}
