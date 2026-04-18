import type { AxisBand, AxisDetail, AxisKey } from './types';

export const AXIS_ORDER: readonly AxisKey[] = [
  'socialEnergy',
  'stability',
  'openness',
  'cooperation',
  'structure',
] as const;

export const AXIS_PUBLIC_LABEL: Record<AxisKey, string> = {
  socialEnergy: '人とのひらき方',
  stability: '揺れへの反応',
  openness: '視点のひろがり',
  cooperation: '関わりの調和',
  structure: '進め方の軸',
};

export function scoreToBand(score: number): AxisBand {
  if (score >= 78) return 'very-high';
  if (score >= 62) return 'high';
  if (score >= 45) return 'mid';
  if (score >= 28) return 'mid-low';
  return 'low';
}

const BAND_JA: Record<AxisBand, string> = {
  'very-high': 'とても手前に出やすい',
  high: '手前に出やすい',
  mid: 'バランスの中で効きやすい',
  'mid-low': '穏やかに効きやすい',
  low: '背景で支えやすい',
};

function axisSummary(axisLabel: string, band: AxisBand): string {
  return `${axisLabel}は、${BAND_JA[band]}傾向として読み取れます。`;
}

function axisStrength(key: AxisKey, band: AxisBand): string {
  const hi = band === 'very-high' || band === 'high';
  const map: Record<AxisKey, { hi: string; lo: string }> = {
    socialEnergy: {
      hi: '人前や会話の場でエネルギーを出しやすい',
      lo: '近い距離を選び、深い関わりを育てやすい',
    },
    stability: {
      hi: '変化や刺激に敏感で、早めに整えを取りにいきやすい',
      lo: '急な揺れに対して受け身になりにくい',
    },
    openness: {
      hi: '新しい視点や仮説を受け取りやすい',
      lo: '守りの視点で現実的に詰めやすい',
    },
    cooperation: {
      hi: '相手の温度を見ながら関係を保ちやすい',
      lo: '線引きを明確にして負荷を抑えやすい',
    },
    structure: {
      hi: '段取りと優先順位を立てて進めやすい',
      lo: '柔らかい進行で場をつなぎやすい',
    },
  };
  return hi ? map[key].hi : map[key].lo;
}

function axisCaution(key: AxisKey, band: AxisBand): string {
  const map: Record<AxisKey, string> = {
    socialEnergy:
      band === 'very-high' || band === 'high'
        ? '広く応じすぎると疲れやすい'
        : '初動の自己開示が遅れ、誤解されやすい',
    stability:
      band === 'low' || band === 'mid-low'
        ? '刺激が多い場では揺れを感じやすい'
        : '変化の検知が早く、止まりどころを作りにくい',
    openness:
      band === 'very-high' || band === 'high'
        ? '選択肢が増えすぎると迷いやすい'
        : '新しい打ち手を取りにいく速度が穏やかになりやすい',
    cooperation:
      band === 'very-high' || band === 'high'
        ? '合わせすぎると本音が遅れやすい'
        : '距離を取ると冷たく見えやすい',
    structure:
      band === 'very-high' || band === 'high'
        ? '整う前に着手を急がれるとやりにくい'
        : '段取りが曖昧だと着手が遅れやすい',
  };
  return map[key];
}

export function buildAxisDetails(
  coreLabel: string,
  scores: Record<AxisKey, number>,
): AxisDetail[] {
  return AXIS_ORDER.map((key) => {
    const score = scores[key];
    const band = scoreToBand(score);
    const label = AXIS_PUBLIC_LABEL[key];
    return {
      key,
      label,
      score,
      band,
      summary: axisSummary(label, band),
      strength: axisStrength(key, band),
      caution: axisCaution(key, band),
    };
  });
}

export function compositionFromScores(scores: Record<AxisKey, number>): {
  dominantAxes: AxisKey[];
  secondaryAxes: AxisKey[];
} {
  const sorted = [...AXIS_ORDER].sort((a, b) => {
    const d = scores[b]! - scores[a]!;
    if (d !== 0) return d;
    return AXIS_ORDER.indexOf(a) - AXIS_ORDER.indexOf(b);
  });
  return {
    dominantAxes: sorted.slice(0, 2),
    secondaryAxes: sorted.slice(2, 4),
  };
}
