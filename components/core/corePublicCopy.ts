import { AXIS_ORDER } from '../../lib/m55/coreResult/axisMeta';
import type { AxisKey, CoreResult } from '../../lib/m55/coreResult/types';
import { AXIS_FORMAL_JA } from './corePublicAxisLabels';

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
  if (Number.isNaN(d.getTime())) return '初回観測';
  return `初回観測 ${d.getFullYear()}年${d.getMonth() + 1}月`;
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
    body: '人との距離感、感受性、発想、協調、段取りの5つから、基本の出方を見ます。',
  },
  {
    title: '力が出やすい場面と、負荷がかかりやすい場面を見る',
    body: '同じ資質でも、安定して出やすい場面と、乱れやすい条件があります。M55ではその差も含めて整理します。',
  },
  {
    title: 'この先の深掘りにつながる入口が見える',
    body: 'ここで見えてきた輪郭は、4章の保存版や、保存版に紐づく相談返書で、いまの悩みや迷いを読み直す土台になります。',
  },
];

export const STATIC_AI_EXPLAINER = {
  title: '相談返書の読み方',
  lead: [
    'M55の相談返書は、その場の入力だけを広げる一般的な会話ではありません。',
    '先に見えている tさん固有の傾向を土台にして、いまのテーマをどこから読むべきかを整理します。',
    'そのため、同じ悩みの相談でも、返ってくる整理は人によって変わります。見えている出方が違うからです。',
  ] as const,
  items: [
    {
      title: '見えている傾向や組み合わせを前提に整理する',
      body: 'その場の言葉だけでなく、すでに読み出されている輪郭を土台にします。',
    },
    {
      title: '入力をそのまま広げない',
      body: '書かれた悩みを増幅するのではなく、今の論点を要る形に絞ります。',
    },
    {
      title: '今の悩みを、自分の流れに結びつける',
      body: '一般論として返すのではなく、いま見えている自分の出方に結びつけて扱います。',
    },
  ] as const,
};

export const STATIC_CTA = {
  title: '4章の保存版',
  intro:
    '無料の見取り図で見えた輪郭を、\n正式4章の保存版として読み返せる形に整理します。',
  benefitsHeading: '保存版で整理できること',
  benefits: [
    '仕事や学びで、どこに力が出やすいか',
    '人間関係で、どこで無理がたまりやすいか',
    '疲れやすい条件と、崩れやすい流れ',
    '自分をどこから整えると戻りやすいか',
  ] as const,
  bundleNote:
    '相談返書は、保存版に紐づく一つの相談テーマへの返書です。会話を続ける形式ではありません。',
} as const;

const TENDENCY_LIFE_SUFFIX: readonly string[] = [
  ' 日々の場面でも、だいたい同じ感触が立ち上がりやすいです。',
  ' 仕事や学びの場面でも、同じ読み方で捉えやすいです。',
  ' 人との距離やペースの場面で、こう感じやすい傾向が表れやすいです。',
  ' 関係の調整や判断の場面で、同じ感触が出やすいです。',
  ' 段取りや進め方の場面で、こう扱いやすい傾向が表れやすいです。',
];

const TENDENCY_LOAD_PREFIX: readonly string[] = [
  '負荷が集中すると、',
  '余力が浅いときほど、',
  '切迫が続くと、',
  '詰まりが続くと、',
  '押し切られると、',
];

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
  if (result.coreType === 'TYPE_04') {
    return FREEZE_TYPE_04.tendencyAxes.map((row) => ({
      formal: AXIS_FORMAL_JA[row.key],
      tendency: row.hook,
      life: row.body,
      load: row.load,
    }));
  }
  const byKey = new Map<AxisKey, (typeof result.axisDetails)[0]>();
  for (const d of result.axisDetails) byKey.set(d.key, d);
  return AXIS_ORDER.map((key, i) => {
    const d = byKey.get(key)!;
    return {
      formal: AXIS_FORMAL_JA[key],
      tendency: d.strength,
      life: `${d.summary}${TENDENCY_LIFE_SUFFIX[i % TENDENCY_LIFE_SUFFIX.length]}`,
      load: `${TENDENCY_LOAD_PREFIX[i % TENDENCY_LOAD_PREFIX.length]}${d.caution}`,
    };
  });
}

export function lifestyleTriptych(result: CoreResult) {
  if (result.coreType === 'TYPE_04') {
    return [...FREEZE_TYPE_04.lifestyle];
  }
  return [
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
  ] as const;
}

export function alignStepsForResult(result: CoreResult) {
  if (result.coreType === 'TYPE_04') {
    return [...FREEZE_TYPE_04.alignSteps];
  }
  return [
    { phase: 'まず', body: '落ち着いて考えを整理できる時間を作る' },
    { phase: '次に', body: '急な変更や、見通しのない流れに負荷が集まりやすいことを意識する' },
    { phase: 'そして', body: '順番を作り、考えを置ける余白を確保する' },
  ];
}

export function observationBulletsForResult(result: CoreResult): string[] {
  if (result.coreType === 'TYPE_04') {
    return [...FREEZE_TYPE_04.observationBullets];
  }
  return [
    '深さで理解する傾向があります。',
    '速さより、納得を大事にします。',
    '刺激より、整った流れで力が出ます。',
    '小さな違和感を見落としにくいです。',
    '準備があるほど本来の力が出ます。',
  ];
}