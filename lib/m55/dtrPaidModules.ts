/**
 * Paid-only analysis modules for DTR Entry Report.
 * Provides per-stem structured data for the 4 additional analysis modules.
 * Index = stemLaneIndex (0–9): 甲乙丙丁戊己庚辛壬癸
 *
 * Axis vocabulary (display): 考える / 進める / 支える / 整える / 感じ取る — M55 structural dimensions.
 * Index order in balance tuples:
 *   [考える力, 進める力, 支える力, 整える力, 感じ取る力]
 *   0: absent  1: 共鳴  2: 副軸  3: 主軸
 */

/** Purchaser-facing names (no 「軸」suffix — life language for premium deep-read). */
export const AXIS_LABELS = ['考える力', '進める力', '支える力', '整える力', '感じ取る力'] as const;
export const AXIS_LEVEL_LABELS = ['—', '響き合う', '支えになる力', '中心'] as const;

/** Wave A1: renderer-only fallbacks when extraction yields empty or em-dash (not stored in snapshot). */
export const DTR_DISPLAY_FALLBACK_STRENGTH =
  '小さな手ごたえが見えると、動きやすくなりやすいです。';
export const DTR_DISPLAY_FALLBACK_LOAD =
  '決めきれないとき、内側が少し重く感じやすいです。';
export const DTR_DISPLAY_FALLBACK_RECOVERY =
  '先に小さな区切りを決めると、戻りやすくなります。';
export const DTR_DISPLAY_FALLBACK_TIMING =
  'いつもより重い週は、先に休む時間を短く決めておくと楽です。';

/** Axis / legacy call sites — life-language, no 「項目」. */
export const DTR_DISPLAY_FALLBACK_NEUTRAL = '今はまだはっきり出ていない傾向です。';
export const DTR_DISPLAY_FALLBACK_SOFT = DTR_DISPLAY_FALLBACK_LOAD;
export const DTR_DISPLAY_FALLBACK_CONSULT =
  '気になる場面は、追加読み解きで一緒に整理できます。';
export const DTR_DISPLAY_FALLBACK_UNWORDED = DTR_DISPLAY_FALLBACK_RECOVERY;

/** Blocks career-heavy copy on 出方 / 戻し方 / タイミング (not プロデューサー title). */
const DTR_CAREER_SLOT_PATTERN =
  /ポジション|マネジメント|プロデューサー的|統合・調整が求められる|複数の業務|人・企画・プロダクト|人を育てる役割/;

const DTR_MISPLACED_LIFE_SLOT_PATTERN = /状態管理を後回し|後回しにしやすい/;

export function isDtrCareerHeavyDisplay(text: string): boolean {
  const t = text.trim();
  return t.length > 0 && DTR_CAREER_SLOT_PATTERN.test(t);
}

export function isDtrMisplacedForLifeSlot(text: string): boolean {
  const t = text.trim();
  return t.length > 0 && DTR_MISPLACED_LIFE_SLOT_PATTERN.test(t);
}

export function isDtrBlockedForLifeSlot(text: string): boolean {
  return isDtrCareerHeavyDisplay(text) || isDtrMisplacedForLifeSlot(text);
}

const RENDERER_EMPTY_MARK = '—';

export function isRendererEmptyDisplay(value: string | undefined | null): boolean {
  if (value == null) return true;
  const t = value.trim();
  return !t || t === RENDERER_EMPTY_MARK;
}

export function dtrDisplayOrFallback(
  value: string,
  fallback: string = DTR_DISPLAY_FALLBACK_NEUTRAL,
): string {
  return isRendererEmptyDisplay(value) ? fallback : value.trim();
}

export function normalizeDisplaySentenceForDedupe(text: string): string {
  return text.trim().replace(/\s+/g, '');
}

export type PickUniqueDisplayOptions = {
  /** Omit career / misplaced life-hint lines from 出方・戻し方・タイミング. */
  blockLifeMisplacement?: boolean;
};

/** Pick first non-empty candidate not already used in this visible block; else fallback. */
export function pickUniqueDisplaySentence(
  candidates: readonly string[],
  used: Set<string>,
  fallback: string,
  options?: PickUniqueDisplayOptions,
): string {
  for (const raw of candidates) {
    if (isRendererEmptyDisplay(raw)) continue;
    const display = raw.trim();
    if (options?.blockLifeMisplacement && isDtrBlockedForLifeSlot(display)) continue;
    const key = normalizeDisplaySentenceForDedupe(display);
    if (used.has(key)) continue;
    used.add(key);
    return display;
  }
  return fallback;
}

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
  '筋道を立てて整理する力',
  '動かす・前に進める力',
  '続けられる土台をつくる力',
  '形を整えて仕上げる力',
  '空気やニュアンスを拾う力',
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
    AXIS_LABELS.filter((_, i) => balance[i] === 0 || balance[i] === 1).join('・') ||
    DTR_DISPLAY_FALLBACK_UNWORDED;

  if (primaryNames.length > 0) {
    return {
      primaryLabel: 'どの力が前に出やすいか',
      primaryVal: primaryNames.join('・'),
      assistLabel: '支えになっている力',
      assistVal:
        secondaryNames.length > 0
          ? secondaryNames.join('・')
          : DTR_DISPLAY_FALLBACK_NEUTRAL,
      growLabel: '整うと使いやすくなる力',
      growVal: growOrdered,
    };
  }

  if (secondaryNames.length >= 2) {
    return {
      primaryLabel: '今の形をつくっている力',
      primaryVal: `${secondaryNames.join('・')}が、同じくらい支えています`,
      assistLabel: '支えになっている力',
      assistVal: resonantNames.length > 0
        ? resonantNames.join('・')
        : 'いくつかの力が重なって、今の形をつくっています',
      growLabel: '整うと使いやすくなる力',
      growVal: growOrdered,
    };
  }

  if (secondaryNames.length === 1) {
    const only = secondaryNames[0]!;
    return {
      primaryLabel: '今の形をつくっている力',
      primaryVal: `${only}が、いちばん前に出やすい土台です`,
      assistLabel: '支えになっている力',
      assistVal:
        resonantNames.length > 0
          ? resonantNames.join('・')
          : DTR_DISPLAY_FALLBACK_NEUTRAL,
      growLabel: '整うと使いやすくなる力',
      growVal: growOrdered,
    };
  }

  if (resonantNames.length > 0) {
    return {
      primaryLabel: '一緒に響き合う力',
      primaryVal: resonantNames.join('・'),
      assistLabel: '支えになっている力',
      assistVal: DTR_DISPLAY_FALLBACK_NEUTRAL,
      growLabel: '整うと使いやすくなる力',
      growVal: growOrdered,
    };
  }

  return {
    primaryLabel: '今の形をつくっている力',
    primaryVal:
      quietNames.length > 0 ? quietNames.join('・') : DTR_DISPLAY_FALLBACK_NEUTRAL,
    assistLabel: '支えになっている力',
    assistVal: DTR_DISPLAY_FALLBACK_NEUTRAL,
    growLabel: '整うと使いやすくなる力',
    growVal: growOrdered,
  };
}

/** Per-stem structural axis data. */
export const AXIS_DATA: readonly AxisEntry[] = [
  /* 0 甲 */ { balance: [3, 2, 0, 0, 2], note: '考える力が中心に立ち、進める力と感じ取る力が輪郭を補います。' },
  /* 1 乙 */ { balance: [3, 0, 2, 0, 1], note: '考える力が柔らかく中心にあり、支える力とつながって調整しやすいです。' },
  /* 2 丙 */ { balance: [1, 3, 0, 0, 2], note: '進める力が前に出て、感じ取る力が表現に厚みを足します。' },
  /* 3 丁 */ {
    balance: [0, 2, 0, 2, 2],
    note: '進める・整える・感じ取る力が同じくらい重なり、内側で丁寧に形をつくりやすいです。',
  },
  /* 4 戊 */ { balance: [0, 1, 3, 0, 1], note: '支える力が中心にあり、続けられる形をつくりやすいです。' },
  /* 5 己 */ { balance: [2, 2, 3, 0, 1], note: '支える力を中心に、考える力と進める力が育ち合う統合型です。' },
  /* 6 庚 */ { balance: [2, 2, 0, 3, 0], note: '整える力が中心に立ち、考える力と進める力が実行に乗りやすいです。' },
  /* 7 辛 */ { balance: [0, 0, 1, 3, 3], note: '整える力と感じ取る力が並び立ち、細かさと感性が響き合います。' },
  /* 8 壬 */ { balance: [2, 2, 0, 0, 3], note: '感じ取る力が広く前に出て、考える力と進める力が探索を助けます。' },
  /* 9 癸 */ { balance: [0, 0, 2, 2, 3], note: '感じ取る力が細やかに前に出て、支える力と整える力が観察を支えます。' },
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
