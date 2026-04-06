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

/** TYPE_04 凍結正本（core_copy_final.txt） */
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
      body: '広く浅い関係より、限られた相手と深く信頼を築くほうが自然です。',
      load: '初対面が続く場面では、思っている以上に疲れがたまりやすくなります。',
    },
    {
      key: 'stability' as const,
      hook: '小さな変化を拾いやすい',
      body: '空気の変化や相手の反応を、早めに受け取りやすい傾向があります。',
      load: '刺激が多い場面では、想像以上に負荷がかかりやすくなります。',
    },
    {
      key: 'openness' as const,
      hook: '深掘りで力が出やすい',
      body: '新しいアイデアを次々に出すより、一つのテーマを深く考えるほうが自然です。',
      load: '拡散的な流れが続くと、焦点が定まりにくくなります。',
    },
    {
      key: 'cooperation' as const,
      hook: '状況に応じて立ち位置を調整できる',
      body: '周囲の流れを見ながら、自然に立ち位置を調整しやすい傾向があります。',
      load: '調整役が続くと、自分の意見を後回しにしやすくなります。',
    },
    {
      key: 'structure' as const,
      hook: '準備があるほど安定する',
      body: '事前に流れを想定してから動くことで、安定した力が出やすくなります。',
      load: '急な変更が続くと、本来の判断力が使いにくくなります。',
    },
  ],
  lifestyle: [
    {
      title: '学びや活動の中で',
      body: '整った流れの中では、理解の深さと丁寧さが信頼につながりやすくなります。',
    },
    {
      title: '人との関わりの中で',
      body: '広く浅く関わるより、信頼できる相手と深くつながるほうが自然です。',
    },
    {
      title: '近い距離の関係の中で',
      body: '安心できる距離が保てるほど、本来のやさしさや誠実さが出やすくなります。',
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
    body: '人との距離感、感受性、発想の広さ、協調性、段取り力の5つから、基本の出方を見ます。',
  },
  {
    title: '力が出やすい場面と、負荷がかかりやすい場面を見る',
    body: '強みとして出やすい形と、疲れやすい条件を整理します。',
  },
  {
    title: '今の悩みに合わせて、AIチャットで具体的に相談できる',
    body: '見えてきた傾向をもとに、今の悩みを具体的に整理できます。',
  },
];

export const STATIC_AI_EXPLAINER = {
  lead: [
    '一般的なAIチャットは、その場で入力された内容をもとに返答します。',
    'M55では、統合パーソナルアルゴリズムを使って、見えている傾向やエッセンスを先に整理したうえで対話します。',
    'そのため、今の悩みを、自分の出やすい傾向に沿って深めやすくなります。',
  ] as const,
  items: [
    {
      title: '見えている傾向を前提に話せる',
      body: 'その場の気分だけではなく、見えている本質や傾向に沿って相談できます。',
    },
    {
      title: '入力をそのまま広げない',
      body: '入力された内容をそのまま膨らませるのではなく、軸を整理しながら返します。',
    },
    {
      title: '今の悩みに落とし込める',
      body: '人との関係、疲れやすさ、動き方の迷いを、自分の流れと結びつけて考えられます。',
    },
  ] as const,
};

export const STATIC_CTA = {
  title: '保存版レポートで深く読む',
  lines: [
    '結果を、あとから読み返せる形で整理して持っておけます。',
    '保存版では、レポートに加えて相談返書も受け取れます。',
  ] as const,
};

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

/** 傾向と負荷：TYPE_04 は凍結文、その他は軸ごとの strength / caution を意味中心で表示 */
export function tendencyAxesForResult(result: CoreResult) {
  if (result.coreType === 'TYPE_04') {
    return FREEZE_TYPE_04.tendencyAxes.map((row) => ({
      formal: AXIS_FORMAL_JA[row.key],
      hook: row.hook,
      body: row.body,
      load: row.load,
    }));
  }
  const byKey = new Map<AxisKey, (typeof result.axisDetails)[0]>();
  for (const d of result.axisDetails) byKey.set(d.key, d);
  return AXIS_ORDER.map((key) => {
    const d = byKey.get(key)!;
    return {
      formal: AXIS_FORMAL_JA[key],
      hook: d.strength,
      body: d.summary,
      load: d.caution,
    };
  });
}

export function lifestyleTriptych(result: CoreResult) {
  if (result.coreType === 'TYPE_04') {
    return [...FREEZE_TYPE_04.lifestyle];
  }
  return [
    { title: '学びや活動の中で', body: result.workStyle.summary },
    { title: '人との関わりの中で', body: result.relationships.summary },
    { title: '近い距離の関係の中で', body: result.love.summary },
  ] as const;
}

export function alignStepsForResult(result: CoreResult) {
  if (result.coreType === 'TYPE_04') {
    return [...FREEZE_TYPE_04.alignSteps];
  }
  const c = result.cautions;
  return [
    { phase: 'まず', body: c[0] ?? 'いまの負荷が少し抜ける置き場を一つ決める' },
    { phase: '次に', body: c[1] ?? '急ぎの連続に気づいたら、一度間を置く' },
    { phase: 'そして', body: c[2] ?? '次の一歩を小さくして、整え直す' },
  ];
}

export function observationBulletsForResult(result: CoreResult): string[] {
  if (result.coreType === 'TYPE_04') {
    return [...FREEZE_TYPE_04.observationBullets];
  }
  const out = [...result.strengths, ...result.cautions].filter(Boolean);
  return out.slice(0, 5);
}
