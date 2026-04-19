/**
 * Paid-only analysis modules for DTR Entry Report.
 * Provides per-stem structured data for the 4 additional analysis modules.
 * Index = stemLaneIndex (0–9): 甲乙丙丁戊己庚辛壬癸
 */

export const ELEMENT_LABELS = ['木', '火', '土', '金', '水'] as const;
export const ELEMENT_LEVEL_LABELS = ['—', '共鳴', '副軸', '主軸'] as const;

export type AxisEntry = {
  /** [wood木, fire火, earth土, metal金, water水] — 0: absent, 1: resonant, 2: secondary, 3: primary */
  balance: readonly [number, number, number, number, number];
  note: string;
};

/** Per-stem five-element axis data. */
export const AXIS_DATA: readonly AxisEntry[] = [
  /* 0 甲 */ { balance: [3, 2, 0, 0, 2], note: '木が主軸。火・水が補完する推進型構成。' },
  /* 1 乙 */ { balance: [3, 0, 2, 0, 1], note: '木の柔軟性が中心。土との接続で調整力を持つ。' },
  /* 2 丙 */ { balance: [1, 3, 0, 0, 2], note: '火が主軸。水の感受性が表現を深める。' },
  /* 3 丁 */ { balance: [0, 2, 0, 2, 2], note: '火の内炎型。金・水の精緻さが質を生む。' },
  /* 4 戊 */ { balance: [0, 1, 3, 0, 1], note: '土が主軸。安定と継続に特化した構成。' },
  /* 5 己 */ { balance: [2, 2, 3, 0, 1], note: '土が中心で木・火を育む。統合型の構成。' },
  /* 6 庚 */ { balance: [2, 2, 0, 3, 0], note: '金が主軸。木・火の推進力が実行力を加える。' },
  /* 7 辛 */ { balance: [0, 0, 1, 3, 3], note: '金と水が双軸。精緻さと感性が共鳴する。' },
  /* 8 壬 */ { balance: [2, 2, 0, 0, 3], note: '水が主軸（広域）。火・木の探索力が加わる。' },
  /* 9 癸 */ { balance: [0, 0, 2, 2, 3], note: '水が主軸（精細）。土・金の観察精度が深まる。' },
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
