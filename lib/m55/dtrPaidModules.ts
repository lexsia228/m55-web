/**
 * Paid-only analysis modules for DTR Entry Report.
 * Provides per-stem structured data for the 4 additional analysis modules.
 * Index = stemLaneIndex (0–9): 甲乙丙丁戊己庚辛壬癸
 *
 * Axis vocabulary follows M55 structural dimensions (not five-element ontology):
 *   [思考軸, 推進軸, 安定軸, 精度軸, 感受軸]
 *   0: absent  1: 共鳴  2: 副軸  3: 主軸
 */

export const AXIS_LABELS = ['思考軸', '推進軸', '安定軸', '精度軸', '感受軸'] as const;
export const AXIS_LEVEL_LABELS = ['—', '共鳴', '副軸', '主軸'] as const;

/** Accent color per axis — used for dot indicators in the axis card grid. */
export const AXIS_COLORS = [
  '#B8A87C',  // 思考軸 — warm amber
  '#C4826A',  // 推進軸 — warm coral
  '#7EA882',  // 安定軸 — calm green
  '#7A9CB4',  // 精度軸 — cool blue
  '#9E92BE',  // 感受軸 — soft purple
] as const;

/** One-line description per axis — shown in axis card grid. */
export const AXIS_DESCS = [
  '考え方の傾向と構造化力',
  '行動・発信・推進力',
  '安定・継続・基盤定着',
  '精度・品質・実務設計',
  '感受・察知・内的感性',
] as const;

export type AxisEntry = {
  /** [思考軸, 推進軸, 安定軸, 精度軸, 感受軸] — 0: absent, 1: resonant, 2: secondary, 3: primary */
  balance: readonly [number, number, number, number, number];
  note: string;
};

/** Paid Module 01 — three summary rows; handles “no single Lv3” linkage patterns (e.g. 丁). */
export function axisVizSummaryDisplay(balance: readonly [number, number, number, number, number]): {
  primaryLabel: string;
  primaryVal: string;
  assistLabel: string;
  assistVal: string;
  growLabel: string;
  growVal: string;
} {
  const primaryNames = AXIS_LABELS.filter((_, i) => balance[i] === 3);
  const secondaryNames = AXIS_LABELS.filter((_, i) => balance[i] === 2);
  const resonantNames = AXIS_LABELS.filter((_, i) => balance[i] === 1);
  const quietNames = AXIS_LABELS.filter((_, i) => balance[i] === 0);

  const growOrdered =
    AXIS_LABELS.filter((_, i) => balance[i] === 0 || balance[i] === 1).join(' · ') || '—';

  if (primaryNames.length > 0) {
    return {
      primaryLabel: '最優先の主軸',
      primaryVal: primaryNames.join(' · '),
      assistLabel: '補助の副軸',
      assistVal: secondaryNames.length > 0 ? secondaryNames.join(' · ') : '—',
      growLabel: '整えると伸びる軸',
      growVal: growOrdered,
    };
  }

  if (secondaryNames.length >= 2) {
    return {
      primaryLabel: '輪郭をつくる連動',
      primaryVal: `${secondaryNames.join(' · ')}（副軸同格）`,
      assistLabel: '補助で効く軸',
      assistVal: resonantNames.length > 0 ? resonantNames.join(' · ') : '同格の連動に集約',
      growLabel: '整えると伸びる軸',
      growVal: growOrdered,
    };
  }

  if (secondaryNames.length === 1) {
    const only = secondaryNames[0]!;
    return {
      primaryLabel: '輪郭をつくる連動',
      primaryVal: `${only}が前面（副軸中心）`,
      assistLabel: '補助で効く軸',
      assistVal: resonantNames.length > 0 ? resonantNames.join(' · ') : '—',
      growLabel: '整えると伸びる軸',
      growVal: growOrdered,
    };
  }

  if (resonantNames.length > 0) {
    return {
      primaryLabel: '厚みを足す共鳴',
      primaryVal: resonantNames.join(' · '),
      assistLabel: '補助の副軸',
      assistVal: '—',
      growLabel: '整えると伸びる軸',
      growVal: growOrdered,
    };
  }

  return {
    primaryLabel: '輪郭をつくる連動',
    primaryVal: quietNames.length > 0 ? quietNames.join(' · ') : '—',
    assistLabel: '補助の副軸',
    assistVal: '—',
    growLabel: '整えると伸びる軸',
    growVal: '—',
  };
}

/** Per-stem structural axis data. */
export const AXIS_DATA: readonly AxisEntry[] = [
  /* 0 甲 */ { balance: [3, 2, 0, 0, 2], note: '思考軸が主軸。推進・感受が補完する推進型構成。' },
  /* 1 乙 */ { balance: [3, 0, 2, 0, 1], note: '思考軸の柔軟性が中心。安定軸との接続で調整力を持つ。' },
  /* 2 丙 */ { balance: [1, 3, 0, 0, 2], note: '推進軸が主軸。感受軸が表現を深める。' },
  /* 3 丁 */ {
    balance: [0, 2, 0, 2, 2],
    note: '単独主軸に固定せず、推進・精度・感受の連動が輪郭をつくる内向型。精緻さが質を生む。',
  },
  /* 4 戊 */ { balance: [0, 1, 3, 0, 1], note: '安定軸が主軸。定着と継続に特化した構成。' },
  /* 5 己 */ { balance: [2, 2, 3, 0, 1], note: '安定軸が中心で思考・推進を育む。統合型の構成。' },
  /* 6 庚 */ { balance: [2, 2, 0, 3, 0], note: '精度軸が主軸。思考・推進の駆動力が実行力を加える。' },
  /* 7 辛 */ { balance: [0, 0, 1, 3, 3], note: '精度軸と感受軸が双軸。精緻さと感性が共鳴する。' },
  /* 8 壬 */ { balance: [2, 2, 0, 0, 3], note: '感受軸が主軸（広域）。推進・思考の探索力が加わる。' },
  /* 9 癸 */ { balance: [0, 0, 2, 2, 3], note: '感受軸が主軸（精細）。安定・精度の観察深度が高まる。' },
] as const;

/**
 * Per-stem primary strength–friction relationship note.
 * Describes how the main strength and the main friction are two sides of the same structure.
 */
export const INTERACTION_NOTE: readonly string[] = [
  '方針を先に固める力と、その後の変更を受け入れにくさが表裏になる。',
  '場を読んで接続する力と、自分の軸が曖昧になりやすさが表裏になる。',
  '熱量で場を動かす力と、発信が届かないときの消耗が表裏になる。',
  '深く磨き続ける力と、外への発信タイミングの遅さが表裏になる。',
  '揺れない安定性と、変化対応への抵抗感が表裏になる。',
  '育て統合する力と、抱え込み過多になりやすさが表裏になる。',
  '速く決め完遂する力と、切りすぎによる摩擦が表裏になる。',
  '精度を引き上げる力と、完璧主義による速度低下が表裏になる。',
  '越境し接続する力と、拡散しすぎることが表裏になる。',
  '細部を読み洞察する力と、外への発信の遅さが表裏になる。',
] as const;

/** Parse 【header】\ncontent blocks from a DTR section body. */
export function parseBlockItems(body: string): Array<{ header: string; content: string }> {
  const items: Array<{ header: string; content: string }> = [];
  const regex = /【([^】]+)】\n([\s\S]+?)(?=\n\n【|\n【|$)/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(body)) !== null) {
    items.push({ header: match[1].trim(), content: match[2].trim() });
  }
  return items;
}

/** Extract first sentence after a label within a section body. Returns '' if not found. */
export function extractAfterLabel(body: string, label: string): string {
  const idx = body.indexOf(label);
  if (idx === -1) return '';
  const start = idx + label.length;
  const periodIdx = body.indexOf('。', start);
  if (periodIdx === -1) return body.slice(start, Math.min(start + 100, body.length)).trim();
  return body.slice(start, periodIdx + 1).trim();
}

/** Return the first sentence of a text block. */
export function firstSentence(text: string): string {
  const idx = text.indexOf('。');
  return idx !== -1 ? text.slice(0, idx + 1) : text.slice(0, 80);
}
