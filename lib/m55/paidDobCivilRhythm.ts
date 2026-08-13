/**
 * Paid DTR civil birth-date rhythm selectors.
 * Civil dayBand / lunar month / solar term stay INTERNAL selectors.
 * Customer copy is tendency / condition / action — no DOB→behavior causality.
 */
import { dayBandFromDay } from './individualization/dobAxisLookupV1';

export type CivilDayBand = 'early' | 'mid' | 'late';
export type SeasonGroup = 'winter' | 'spring' | 'summer' | 'autumn';

export const PAID_CHAPTER_SEMANTIC_FAMILY = {
  s1: 'self_perception',
  s2: 'work_decision',
  s3: 'essence_stability',
  s4: 'fatigue_recovery',
  s5: 'overload_signal',
  s6: 'relation_distance',
  s7: 'reset_tool',
} as const;

export type PaidChapterSemanticFamily =
  (typeof PAID_CHAPTER_SEMANTIC_FAMILY)[keyof typeof PAID_CHAPTER_SEMANTIC_FAMILY];

export function civilDayFromEffectiveDate(effectiveLocalDate: string): number {
  const day = Number.parseInt(effectiveLocalDate.split('-')[2] ?? '1', 10);
  return Number.isFinite(day) ? day : 1;
}

export function civilDayBandFromEffectiveDate(effectiveLocalDate: string): CivilDayBand {
  return dayBandFromDay(civilDayFromEffectiveDate(effectiveLocalDate));
}

export function civilDayBandPublicLabel(band: CivilDayBand): string {
  if (band === 'early') return '月初めに近い生まれ';
  if (band === 'mid') return '月の中頃の生まれ';
  return '月の後半に近い生まれ';
}

/** S3 stability — no month-position causality. */
export const ESSENCE_STABILITY_BY_BAND: Readonly<Record<CivilDayBand, string>> = {
  early: '動き出す前に、自分が納得できる向きが見えているほど、力の出方が安定します。',
  mid: '一度始めた流れを途中で短く見直すほど、判断のぶれを抑えやすくなります。',
  late: '次へ急いで移るより、見えている事実を一つ確かめてから進む方が、判断のぶれを抑えやすい傾向があります。',
};

/** Season-selected essence application. Selector stays internal. */
export const SEASON_ESSENCE_CONTEXT: Readonly<Record<SeasonGroup, string>> = {
  winter: '急がず土台を温めてから動くほど、扱いやすくなります。',
  spring: '最初から大きく決めるより、小さく始めて確かめる余白を置くと、次の一手が見えやすくなります。',
  summer: '動く前に休息のリズムを先に確保すると、後半まで続けやすくなります。',
  autumn: '範囲を先に絞ってから集中するほど、無理なく進みやすくなります。',
};

/** Chapter I — self pattern. */
export const S1_IDENTITY_BY_BAND: Readonly<Record<CivilDayBand, string>> = {
  early: '新しいことを始める前に、向きだけ短く確かめると力が入りやすくなります。',
  mid: '続けながら一度立てた方向を確かめると、自分の形が安定しやすくなります。',
  late: '次に進む前に、静かに拾った差分を一つ言葉にすると輪郭がはっきりしやすくなります。',
};

/** Chapter II — stem work-scene (from existing seed/interaction), then band decision. */
export const S2_STEM_WORK_SCENE: readonly string[] = [
  '仕事では、進む向きが見えない作業ほど判断が止まりやすい形です。',
  '仕事では、場の流れを読みすぎると、自分の優先が後回しになりやすい形です。',
  '仕事では、熱量で動ける一方、反応が薄いと次の一手が止まりやすい形です。',
  '仕事では、深く磨き続けるほど、外へ出すタイミングが遅れやすい形です。',
  '仕事では、安定した手順があるほど進みやすく、急な変更で詰まりやすい形です。',
  '仕事では、複数をまとめて進められる一方、抱え込みで判断が重くなりやすい形です。',
  '仕事では、速く切って完了できる一方、切り方が先に立ちすぎやすい形です。',
  '仕事では、精度を上げるほど価値が出る一方、完了が遅れやすい形です。',
  '仕事では、広くつなげるほど動きやすい一方、範囲が散って判断が薄まりやすい形です。',
  '仕事では、人が見落としやすい変化を拾うほど価値が出る一方、出す前の確認が長くなりやすい形です。',
];

/** Chapter II — work / decision. Distinct from fatigue and reset. */
export const S2_COMPOSITION_BY_BAND: Readonly<Record<CivilDayBand, string>> = {
  early: '着手する範囲を先に一つに絞ると、判断が前に進みやすくなります。',
  mid: '途中の根拠が足りない点だけを確認してから進むと、やり直しが減りやすくなります。',
  late: '全部を同時に進めようとせず、今日答えを出せる論点だけを先に切ると動きやすくなります。',
};

/** Chapter IV — fatigue / daily recovery. Body and pacing, not work-decision. */
export const S4_RECOVERY_BY_BAND: Readonly<Record<CivilDayBand, string>> = {
  early: '疲れが出やすいときは、始める量を減らして短い休みを挟むほど戻りやすくなります。',
  mid: '疲れが出やすいときは、同じ刺激が続く前に、静かな時間を先に確保すると持続しやすくなります。',
  late: '疲れが出やすいときは、頭の処理をいったん止めて、体のリズムを先に戻すほど回復しやすくなります。',
};

/** S5 overload — how overextension begins + stop condition. Not a positive tidy-up instruction. */
export const S5_FRICTION_BY_BAND: Readonly<Record<CivilDayBand, string>> = {
  early: '一度に抱える量が増えるほど、動き出す前から負荷が重なりやすくなります。止める合図は、「まだ足せそう」と感じたときです。',
  mid: '区切りを置かずに同じペースを続けるほど、詰まりやすくなります。止める合図は、見直しが作業そのものになったときです。',
  late: '確信が持てるまで抱え続けるほど、発信が止まって無理が残りやすくなります。止める合図は、「まだ足りない」が何度も出たときです。',
};

/** Chapter III — close relationships / distance. */
export const S6_RELATION_BY_BAND: Readonly<Record<CivilDayBand, string>> = {
  early: '最初の一言を急ぐほど、距離が詰まりすぎやすくなります。',
  mid: '短く区切って返すほど、会話のリズムが保ちやすくなります。',
  late: '相手の裏を読み終わるまで黙っているほど、距離が固まりやすくなります。感じたことを一つだけ先に返すと扱いやすくなります。',
};

/** S7 reset tool — one concrete writing exercise. Must not clone S2/S4. */
export const S7_AUXILIARY_BY_BAND: Readonly<Record<CivilDayBand, string>> = {
  early: '迷ったときは、今日やることを一列だけ書いて、それ以外は見ないようにすると戻りやすくなります。',
  mid: '迷ったときは、いま続いていることを3行で書き、次に触る一行だけ丸を付けると置き方が見えやすくなります。',
  late: '迷ったときは、気になっていることを3行だけ書き、次に見る一行を丸で囲むと、頭の処理を手放しやすくなります。',
};

/** Life/fatigue variants selected by lunar month internally. */
export const S4_LIFE_BY_LUNAR_MONTH: readonly string[] = [
  '生活では、刺激の量を先に決めておくほど、力が無理なく出やすくなります。',
  '体のリズムを丁寧に守るほど、力が安定しやすくなります。',
  '小さく動いて早めに休むほど、力を回復しやすくなります。',
  '立てた生活の流れを続けるほど、力が伝わりやすくなります。',
  '休息を先に確保するほど、力が長く続きやすくなります。',
  '小さく始めてから広げるほど、力を消耗しにくくなります。',
  '切り替えをはっきり置くほど、生活のペースが安定しやすくなります。',
  'ペースを落として体を休めるほど、力が戻りやすくなります。',
  '一度立ち止まって刺激を減らすほど、力が戻りやすくなります。',
  '急がずに休むほど、力を出しやすくなります。',
  '新しい刺激より手元の生活を守るほど、力が合いやすくなります。',
  '一日の終わりに処理を止めるほど、翌日の力が戻りやすくなります。',
];

/** Relation variants selected by lunar month internally. */
export const S6_LIFE_RELATION_BY_LUNAR_MONTH: readonly string[] = [
  '距離を急に詰めすぎるほど、やりとりが重くなりやすい形です。',
  '相手の反応を急いで読み取ろうとするほど、疲れやすくなります。',
  '小さく確かめながら距離を取るほど、関係が扱いやすくなります。',
  '言葉を一度に多く出すほど、すれ違いが起きやすい形です。',
  '休息を挟まずに関わるほど、距離感が崩れやすくなります。',
  '早く答えを出そうとするほど、やりとりが硬くなりやすい形です。',
  '切り替えを急ぐほど、相手との距離が詰まりやすくなります。',
  '抱え込みながら関わるほど、会話が重くなりやすい形です。',
  '一度立ち止まって距離を確かめるほど、関係が戻りやすくなります。',
  '急いで距離を詰めるほど、やりとりが疲れやすくなります。',
  '新しい関わりを一度に増やすほど、距離感が崩れやすい形です。',
  '終えた関係を整理してから次へ進むほど、会話が扱いやすくなります。',
];

export function seasonGroupForSolarTerm(key: string): SeasonGroup {
  if (/^(xiaohan|dahan|lidong|xiaoxue|daxue|dongzhi)$/.test(key)) return 'winter';
  if (/^(lichun|yushui|jingzhe|chunfen|qingming|guyu)$/.test(key)) return 'spring';
  if (/^(lixia|xiaoman|mangzhong|xiazhi|xiaoshu|dashu)$/.test(key)) return 'summer';
  return 'autumn';
}

export const UNSUPPORTED_CALENDAR_CAUSALITY_PATTERNS: readonly RegExp[] = [
  /雨水の頃の生まれとして/,
  /解けはじめる/,
  /解ける季節に近い生まれとして/,
  /[春夏秋冬].{0,6}の頃の生まれとして/,
  /旧暦/,
  /時期の生まれとして/,
  /時期の生まれです/,
  /月初めに近い生まれとして/,
  /月の中頃の生まれとして/,
  /月の後半に近い生まれとして/,
];

export type CivilDayBandCopyViolation =
  | 'civil_late_must_not_say_mid'
  | 'civil_early_phase_mismatch'
  | 'civil_mid_must_not_say_late'
  | 'unsupported_calendar_causality';

export function collectCivilDayBandCopyViolations(
  effectiveLocalDate: string,
  text: string,
): CivilDayBandCopyViolation[] {
  const band = civilDayBandFromEffectiveDate(effectiveLocalDate);
  const violations: CivilDayBandCopyViolation[] = [];

  if (band === 'late' && text.includes('月の中頃')) {
    violations.push('civil_late_must_not_say_mid');
  }
  if (band === 'early' && /月の後半|月の中頃/.test(text)) {
    violations.push('civil_early_phase_mismatch');
  }
  if (band === 'mid' && text.includes('月の後半')) {
    violations.push('civil_mid_must_not_say_late');
  }

  for (const pattern of UNSUPPORTED_CALENDAR_CAUSALITY_PATTERNS) {
    if (pattern.test(text)) {
      violations.push('unsupported_calendar_causality');
      break;
    }
  }

  return violations;
}

/** Normalize for cross-section duplicate detection. */
export function normalizeNarrativeSentence(sentence: string): string {
  return sentence
    .replace(/\s+/g, '')
    .replace(/[、。！？…「」『』]/g, '')
    .trim();
}

export function countNormalizedSentenceOccurrences(
  sections: readonly string[],
  minSentenceChars = 12,
): Map<string, number> {
  const counts = new Map<string, number>();
  for (const body of sections) {
    const sentences = body.split(/[。！？]/).map((s) => s.trim()).filter((s) => s.length >= minSentenceChars);
    const seenInSection = new Set<string>();
    for (const sentence of sentences) {
      const normalized = normalizeNarrativeSentence(sentence);
      if (!normalized || seenInSection.has(normalized)) continue;
      seenInSection.add(normalized);
      counts.set(normalized, (counts.get(normalized) ?? 0) + 1);
    }
  }
  return counts;
}
