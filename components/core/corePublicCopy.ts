import type { CoreResult } from '../../lib/m55/coreResult/types';
import { M55_COMMERCIAL_FENCE } from '../../lib/m55/commercialUx/assetLedger/commercialFence';
import { M55_COMMERCIAL_TERMINOLOGY } from '../../lib/m55/commercialUx/terminology';
import {
  freeCoreAlignSteps,
  freeCoreAxisRowsForResult,
  freeCoreLifestyleTriptych,
  freeCoreObservationBullets,
} from '../../lib/m55/coreFreePublicDisplay';
import { PAID_DTR_SAVED_REPORT_PRICING } from '../../lib/m55/paidDtrProductCopy';

/** ニックネームを差し込み（主語「あなた」は使わない） */
export function withNickname(text: string, nickname: string): string {
  return text.replace(/\bt\b/g, nickname.trim());
}

export const CORE_TYPE_EN_TAG: Record<string, string> = {
  TYPE_01: 'OBSERVANT',
  TYPE_02: 'RESONANT',
  TYPE_03: 'STRUCTURAL',
  TYPE_04: 'ANALYST',
  TYPE_05: 'HARMONIC',
  TYPE_06: 'INTUITIVE',
  TYPE_07: 'CORE_SEEKER',
  TYPE_08: 'DRIVER',
  TYPE_09: 'RELATIONAL',
  TYPE_10: 'INTEGRATOR',
};

export function formatFirstObservationJa(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '最初の記録';
  return `最初の記録 ${d.getFullYear()}年${d.getMonth() + 1}月`;
}

/** TYPE_04 凍結正本 */
export const FREEZE_TYPE_04 = {
  heroTagline: '静かに見て、深く考える人。',
  heroBody: [
    'まず全体を見てから動く傾向があります。',
    '落ち着いた環境では、理解の深さと丁寧さが自然に強みとして表れます。',
  ] as const,
  tendencyAxes: [
    {
      key: 'socialEnergy' as const,
      hook: '少人数で深く関わりやすい',
      body: '広く浅い関係より、限られた相手と深く信頼を築くほうが自然です。会議や雑談、少人数の場面では、距離感の感触としてこう出やすいです。',
      load: '初対面が続く場面では、思っている以上に疲れがたまりやすくなります。余力が浅いときほど、負荷が静かに積み上がりやすいです。',
    },
    {
      key: 'stability' as const,
      hook: '小さな変化を拾いやすい',
      body: '空気の変化や相手の反応を、早めに受け取りやすい傾向があります。情報が増える場面では、違和感の感触が先に立ち上がりやすいです。',
      load: '刺激が多い場面では、想像以上に負荷がかかりやすくなります。切迫が続くと、判断の余白が削られやすいです。',
    },
    {
      key: 'openness' as const,
      hook: '深掘りで力が出やすい',
      body: '新しいアイデアを次々に出すより、一つのテーマを深く考えるほうが自然です。学びや検討の場面では、掘り下げるほど輪郭がはっきりしやすいです。',
      load: '拡散的な流れが続くと、焦点が定まりにくくなります。話題が次々に増えると、手元の整理が追いつきにくいです。',
    },
    {
      key: 'cooperation' as const,
      hook: '状況に応じて立ち位置を調整できる',
      body: '周囲の流れを見ながら、自然に立ち位置を調整しやすい傾向があります。合意形成や調整の場面では、空気を読みながら進めやすいです。',
      load: '調整役が続くと、自分の意見を後回しにしやすくなります。合わせが続くと、本音の言語化が遅れやすいです。',
    },
    {
      key: 'structure' as const,
      hook: '準備があるほど安定する',
      body: '事前に流れを想定してから動くことで、安定した力が出やすくなります。段取りや手順が見える場面ほど、本来の判断力が使いやすいです。',
      load: '急な変更が続くと、本来の判断力が使いにくくなります。見通しが途切れると、整え直しに時間を取りやすいです。',
    },
  ],
  lifestyle: [
    {
      title: '仕事や判断の場面で',
      body: '整った流れの中では、理解の深さと丁寧さが信頼につながりやすくなります。資料を読む、課題を進める、議論する場面では、結論を急かされないほど本来の質が出やすいです。',
    },
    {
      title: '人との距離感の中で',
      body: '広く浅く関わるより、信頼できる相手と深くつながるほうが自然です。対面やチャットの距離感が読みにくい場面では、少人数のほうが負荷がたまりにくいです。',
    },
    {
      title: '近い関係の中で',
      body: '安心できる距離が保てるほど、本来のやさしさや誠実さが出やすくなります。親しい相手との約束や衝突の場面では、落ち着いて言葉を選びやすいです。',
    },
  ] as const,
  alignSteps: [
    { phase: 'まず', body: '落ち着いて考えを整理できる時間を作る' },
    { phase: '次に', body: '急な変更や、見通しのない流れに負荷が集まりやすいことを意識する' },
    { phase: 'そして', body: '順番を作り、考えを置ける余白を確保する' },
  ] as const,
  observationBullets: [
    '深さで理解する傾向があります。',
    '速さより、納得を大事にします。',
    '刺激より、整った流れで力が出ます。',
    '小さな違和感を見落としにくいです。',
    '準備があるほど本来の力が出ます。',
  ] as const,
} as const;

export const STATIC_M55_READ_STEPS: readonly {
  title: string;
  body: string;
}[] = [
  {
    title: 'ふだん出やすい傾向を見る',
    body: '人との距離感、感受性、発想、協調、段取りの5つから、いまの輪郭をつかみます。',
  },
  {
    title: '力が出やすい場面と、しんどくなりやすい場面を分ける',
    body: '同じ資質でも、うまくいきやすい条件と、無理がたまりやすい条件があります。ここでは、その差を短く整理します。',
  },
  {
    title: 'プレミアムレポート・追加読み解きへ続く入口をつかむ',
    body: 'ここまでの輪郭は、プレミアムレポートで深まります。必要になったら、追加読み解きでいまの1テーマを重ねて読み直せます。',
  },
];

export const STATIC_AI_EXPLAINER = {
  title: '追加読み解きについて',
  lead: [
    'M55の追加読み解きは、なんでも答えるAIではありません。',
    '購入済みレポートに入力した一つの読み解きテーマを重ね、いま気になっている論点を読み直します。',
    '同じ引っかかりでも、見えている輪郭が違えば、返ってくる整理も変わります。',
  ] as const,
  items: [
    {
      title: '購入済みレポートの傾向を土台にする',
      body: 'その場の言葉だけでなく、すでに読み出されている輪郭を前提に整理します。',
    },
    {
      title: '入力をそのまま広げない',
      body: '書かれた内容を増幅するのではなく、今の論点を必要な形に絞ります。',
    },
    {
      title: 'いま気になっていることを、自分の流れにつなげる',
      body: '一般論として返すのではなく、いま見えている自分の傾向に結びつけて扱います。',
    },
  ] as const,
};

export const STATIC_CTA = {
  title: 'プレミアムレポート',
  intro:
    '個人無料読み解きでは、輪郭まで確認できました。\nプレミアムレポートでは、力が出やすい場面、無理がたまりやすい条件、整え直し方まで含めて、読み返せる形に残します。',
  benefitsHeading: 'プレミアムレポートで深まること',
  benefits: [
    '仕事や学びで、どこに力が出やすいか',
    '人間関係で、どこで無理がたまりやすいか',
    '疲れやすい条件と、崩れやすい流れ',
    '自分をどこから整えると戻りやすいか',
  ] as const,
  bundleNote:
    'その先で必要になったら、追加読み解きで購入済みレポートに沿って、いまの1テーマだけ整理できます。会話を続ける形式ではありません。',
} as const;

/**
 * Free→paid conversion bridge on /core (after free result outcome).
 * Single personalized Premium bridge — CTA routes to paid questions on /dtr/lp.
 */
export function buildPremiumBridgeTitle(traitName: string): string {
  return `「${traitName}」の結果を、さらに深く読み解く`;
}

const LIGHT_PLAN = PAID_DTR_SAVED_REPORT_PRICING.light;
const FULL_PLAN = PAID_DTR_SAVED_REPORT_PRICING.full;

export const STATIC_FREE_TO_PAID_BRIDGE = {
  overline: M55_COMMERCIAL_FENCE.productNameJa,
  supportingJa:
    '個人無料読み解きでは、いま表れやすい動きまで確認できます。プレミアムレポートでは、その動きが続く背景、力が出やすい条件、負担が重なる順番、整え直しやすい順番まで整理します。',
  freeLayerLabelJa: '個人無料読み解き',
  freeLayerBodyJa: M55_COMMERCIAL_FENCE.free.summaryJa,
  premiumLayerLabelJa: 'プレミアムレポート',
  premiumLayerBodyJa: M55_COMMERCIAL_FENCE.premium.summaryJa,
  effortJa: 'あと6問・約1〜2分。プラン選択とお支払いは次の画面です。',
  lockedHeadingsHeadingJa: M55_COMMERCIAL_FENCE.lockedPreviewHeadingJa,
  primaryCtaJa: M55_COMMERCIAL_TERMINOLOGY.premiumBridgeCta,
  ctaSupportJa: '正解はありません。あとで回答を確認できます。',
  secondaryCtaJa: '無料結果を続けて読む',
  priceNoteJa: `${LIGHT_PLAN.planNameJa} ${LIGHT_PLAN.priceLabelJa} ／ ${FULL_PLAN.planNameJa} ${FULL_PLAN.priceLabelJa}。どちらも買い切りです。違いは、購入後に追加で読み解けるテーマ数です。`,
  safetyNote:
    '医療・法律・投資等の助言、診断、未来や結果の保証ではありません。追加読み解きは購入済みレポートをもとにした1テーマ整理です。',
  /** @deprecated Plan cards live on plan selection only — kept for legacy test aliases. */
  chapters: [
    { roman: 'Ⅰ', titleJa: '輪郭を見る' },
    { roman: 'Ⅱ', titleJa: '構造を読む' },
    { roman: 'Ⅲ', titleJa: '無理を知る' },
    { roman: 'Ⅳ', titleJa: '楽に扱う' },
  ] as const,
  /** @deprecated Prefer priceNoteJa — kept for legacy template consumers. */
  priceNoteTemplate: '{lightPlanName} {lightPriceLabel} ／ {fullPlanName} {fullPriceLabel}',
  /** @deprecated */
  title: 'プレミアムレポート',
  /** @deprecated */
  outcomesJa: [] as const,
} as const;

/** @deprecated Prefer STATIC_FREE_TO_PAID_BRIDGE — alias for gradual test migration. */
export const STATIC_COMMERCIAL_CONVERSION = {
  overline: STATIC_FREE_TO_PAID_BRIDGE.overline,
  title: STATIC_FREE_TO_PAID_BRIDGE.overline,
  intro: STATIC_FREE_TO_PAID_BRIDGE.supportingJa,
  previewHeading: STATIC_FREE_TO_PAID_BRIDGE.lockedHeadingsHeadingJa,
  previewRows: STATIC_FREE_TO_PAID_BRIDGE.chapters.map((c) => ({
    label: `${c.roman} ${c.titleJa}`,
    teaser: '',
  })),
  priceValueTemplate: STATIC_FREE_TO_PAID_BRIDGE.priceNoteTemplate,
  fullCompareNoteTemplate: '',
  ctaLabel: STATIC_FREE_TO_PAID_BRIDGE.primaryCtaJa,
  safetyNote: STATIC_FREE_TO_PAID_BRIDGE.safetyNote,
} as const;

function splitSummaryTwo(summary: string): [string, string] {
  const s = summary.trim();
  const i = s.indexOf('。');
  if (i === -1) return [s, ''];
  const a = s.slice(0, i + 1);
  const b = s.slice(i + 1).trim();
  return [a, b];
}

export function heroNarrative(result: CoreResult): {
  tagline: string;
  body: [string, string];
} {
  if (result.coreType === 'TYPE_04') {
    return {
      tagline: FREEZE_TYPE_04.heroTagline,
      body: [...FREEZE_TYPE_04.heroBody],
    };
  }
  const [a, b] = splitSummaryTwo(result.coreSummary);
  if (b) {
    return { tagline: a, body: [b, ''] };
  }
  const s0 = result.strengths[0] ?? '';
  const s1 = result.strengths[1] ?? '';
  return { tagline: a, body: [s0, s1] };
}

export function tendencyAxesForResult(result: CoreResult) {
  return freeCoreAxisRowsForResult(result);
}

export function lifestyleTriptych(result: CoreResult) {
  return freeCoreLifestyleTriptych(result);
}

export function alignStepsForResult(result: CoreResult) {
  return freeCoreAlignSteps(result);
}

export function observationBulletsForResult(result: CoreResult): string[] {
  return freeCoreObservationBullets(result);
}