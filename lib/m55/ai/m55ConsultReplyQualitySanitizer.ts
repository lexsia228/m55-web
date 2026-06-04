/**
 * Post-generation quality / tone passes for Lane A consult replies.
 * Runs only after output-side safety sanitizer returns allow (no block / 422).
 * Does not replace medical/legal/financial/refusal handling — see m55AiOutputSanitizer.
 */
export type M55ConsultReplyQualityCategory =
  | 'generic_advice'
  | 'over_empathy_counseling'
  | 'outcome_guarantee'
  | 'other_check_first'
  | 'heavy_self_mgmt';

export type ApplyM55ConsultReplyQualityResult = {
  text: string;
  replacementCount: number;
  categoriesTriggered: M55ConsultReplyQualityCategory[];
};

type PhraseRule = {
  category: M55ConsultReplyQualityCategory;
  from: string;
  to: string;
};

type RegexRule = {
  category: M55ConsultReplyQualityCategory;
  pattern: RegExp;
  replace: (substring: string) => string;
};

/** Do not deliver quality-mangled ultra-short output. */
const MIN_OUTPUT_LENGTH = 50;

/**
 * Scoped phrase replacements (longest match first).
 * Avoid standalone 修復 / 深化 — too broad per TARGET-MAPPING.
 */
const PHRASE_RULES_UNSORTED: PhraseRule[] = [
  {
    category: 'other_check_first',
    from: '相手の意見や気持ちを確認する',
    to: 'いまの中で、言葉と距離を一度分けてみる',
  },
  {
    category: 'generic_advice',
    from: 'してみてはいかがでしょうか',
    to: 'いまの場面では、ここだけ試せます',
  },
  {
    category: 'generic_advice',
    from: 'してみてはどうでしょうか',
    to: 'いまの場面では、ここだけ試せます',
  },
  {
    category: 'generic_advice',
    from: '手助けになると思います',
    to: '整理の材料になりやすいです',
  },
  {
    category: 'generic_advice',
    from: '役立つかもしれません',
    to: '保存版の観点で見直しやすくなります',
  },
  {
    category: 'generic_advice',
    from: '役に立つかもしれません',
    to: '保存版の観点で見直しやすくなります',
  },
  {
    category: 'heavy_self_mgmt',
    from: '自分の限界を意識する',
    to: 'いま抱えすぎている線を見る',
  },
  {
    category: 'heavy_self_mgmt',
    from: '自分の限界を意識',
    to: 'いま抱えすぎている線を見',
  },
  {
    category: 'other_check_first',
    from: '相手に直接尋ねてみる',
    to: 'いまの中で、言葉と距離を一度分けてみる',
  },
  {
    category: 'other_check_first',
    from: 'あなたはどう思っているの？',
    to: 'いま自分の中で、どこが引っかかっているかを見る',
  },
  {
    category: 'over_empathy_counseling',
    from: '深化につながる',
    to: '見え方を深めやすくする',
  },
  {
    category: 'outcome_guarantee',
    from: '安定につながる',
    to: '落ち着きを取り戻しやすくする材料になる',
  },
  {
    category: 'over_empathy_counseling',
    from: '関係の修復',
    to: '距離の取り直し',
  },
  {
    category: 'over_empathy_counseling',
    from: '心的負担',
    to: '負荷がたまりやすい状態',
  },
  {
    category: 'over_empathy_counseling',
    from: '心の安定',
    to: '落ち着いて考え直す余白',
  },
  {
    category: 'generic_advice',
    from: 'お勧めします',
    to: 'まずはここからで十分です',
  },
  {
    category: 'generic_advice',
    from: 'おすすめします',
    to: 'まずはここからで十分です',
  },
  {
    category: 'generic_advice',
    from: '効果的です',
    to: '整理しやすくなります',
  },
  {
    category: 'generic_advice',
    from: '効果的な',
    to: '整理しやすい',
  },
  {
    category: 'generic_advice',
    from: '重要です',
    to: 'ここが論点になりやすいです',
  },
  {
    category: 'generic_advice',
    from: '大切です',
    to: 'ここが論点になりやすいです',
  },
  {
    category: 'over_empathy_counseling',
    from: '受け止めます',
    to: 'その気持ちの重さは自然です',
  },
  {
    category: 'other_check_first',
    from: 'どう思っているの？',
    to: 'いま自分の中で、どこが引っかかっているかを見る',
  },
  {
    category: 'generic_advice',
    from: '誰にでも起こりうる',
    to: 'この保存版の傾向として見える範囲では',
  },
  {
    category: 'over_empathy_counseling',
    from: 'まずは受け入れることが大切',
    to: 'いまの負荷の置き所を見る',
  },
  {
    category: 'generic_advice',
    from: '焦らず自分のペースで',
    to: 'いまの場面で選べる歩幅で',
  },
  {
    category: 'generic_advice',
    from: '一般的には',
    to: 'この抜粋では',
  },
  {
    category: 'generic_advice',
    from: '自分の心の声に耳を傾ける',
    to: '相談文の具体語と照らす',
  },
  {
    category: 'generic_advice',
    from: '新しいカフェに行ってみる',
    to: 'いま書いた場面に近い小さな一手にする',
  },
  {
    category: 'generic_advice',
    from: '他者と比較せず',
    to: '保存版の章の観点だけに留める',
  },
  {
    category: 'generic_advice',
    from: '無理に行動しなくて大丈夫です',
    to: '今日の一手は1つに絞る',
  },
  {
    category: 'generic_advice',
    from: '自分らしく進みましょう',
    to: '保存版の章を読み直して選び直す',
  },
  {
    category: 'over_empathy_counseling',
    from: '自然なことです',
    to: 'その重さは場面に応じて出やすい',
  },
];

const PHRASE_RULES = [...PHRASE_RULES_UNSORTED].sort((a, b) => b.from.length - a.from.length);

const REGEX_RULES: RegexRule[] = [
  {
    category: 'outcome_guarantee',
    pattern: /([^。\n]{1,40})につながります/g,
    replace: (lead) => `${lead}を見えやすくする材料になります`,
  },
  {
    category: 'outcome_guarantee',
    pattern: /([^。\n]{1,40})できるでしょう/g,
    replace: (lead) => `${lead}を選び直しやすくなるかもしれません`,
  },
];

const PHRASE_OCCURRENCE_LIMITS: {
  phrase: string;
  maxKeep: number;
  replacement: string;
  category: M55ConsultReplyQualityCategory;
}[] = [
  { phrase: 'かもしれません', maxKeep: 2, replacement: 'なりやすいです', category: 'generic_advice' },
  {
    phrase: 'ここが論点になりやすいです',
    maxKeep: 2,
    replacement: 'ここが論点になりやすいです',
    category: 'generic_advice',
  },
];

/** Chapter title lines from report context — do not rewrite. */
const CHAPTER_TITLE_LINE = /^\s*【[^】]+】\s*$/;

function applyPhraseRules(
  line: string,
  categories: Set<M55ConsultReplyQualityCategory>,
): { text: string; count: number } {
  let text = line;
  let count = 0;

  for (const rule of PHRASE_RULES) {
    if (!text.includes(rule.from)) continue;
    const parts = text.split(rule.from);
    if (parts.length <= 1) continue;
    text = parts.join(rule.to);
    count += parts.length - 1;
    categories.add(rule.category);
  }

  return { text, count };
}

function applyRegexRules(
  line: string,
  categories: Set<M55ConsultReplyQualityCategory>,
): { text: string; count: number } {
  let text = line;
  let count = 0;

  for (const rule of REGEX_RULES) {
    text = text.replace(rule.pattern, (...args: string[]) => {
      count += 1;
      categories.add(rule.category);
      return rule.replace(args[1] ?? '');
    });
  }

  return { text, count };
}

function limitPhraseOccurrences(
  text: string,
  categories: Set<M55ConsultReplyQualityCategory>,
): { text: string; count: number } {
  let out = text;
  let count = 0;

  for (const rule of PHRASE_OCCURRENCE_LIMITS) {
    if (!out.includes(rule.phrase)) continue;
    const parts = out.split(rule.phrase);
    if (parts.length <= 1) continue;

    let seen = 0;
    const rebuilt: string[] = [];
    for (let i = 0; i < parts.length; i += 1) {
      rebuilt.push(parts[i] ?? '');
      if (i < parts.length - 1) {
        seen += 1;
        if (seen <= rule.maxKeep) {
          rebuilt.push(rule.phrase);
        } else {
          count += 1;
          categories.add(rule.category);
          rebuilt.push(rule.replacement);
        }
      }
    }
    out = rebuilt.join('');
  }

  return { text: out, count };
}

function applyToLine(
  line: string,
  categories: Set<M55ConsultReplyQualityCategory>,
): { text: string; count: number } {
  if (CHAPTER_TITLE_LINE.test(line)) {
    return { text: line, count: 0 };
  }

  const phrase = applyPhraseRules(line, categories);
  const regex = applyRegexRules(phrase.text, categories);
  return { text: regex.text, count: phrase.count + regex.count };
}

/**
 * Light phrase quality passes on safety-allowed consult reply text.
 * Never blocks, refuses, or short-circuits RPC.
 */
export function applyM55ConsultReplyQualityPasses(
  input: string,
): ApplyM55ConsultReplyQualityResult {
  const trimmed = input.trim();
  if (!trimmed) {
    return { text: trimmed, replacementCount: 0, categoriesTriggered: [] };
  }

  const categories = new Set<M55ConsultReplyQualityCategory>();
  let replacementCount = 0;
  const lines = trimmed.split('\n');
  const outLines: string[] = [];

  for (const line of lines) {
    const applied = applyToLine(line, categories);
    outLines.push(applied.text);
    replacementCount += applied.count;
  }

  let text = outLines.join('\n');
  const limited = limitPhraseOccurrences(text, categories);
  text = limited.text;
  replacementCount += limited.count;

  // Fail-closed only when a long reply would be over-shortened by replacements.
  if (
    trimmed.length >= MIN_OUTPUT_LENGTH &&
    text.trim().length < MIN_OUTPUT_LENGTH
  ) {
    return { text: trimmed, replacementCount: 0, categoriesTriggered: [] };
  }

  return {
    text,
    replacementCount,
    categoriesTriggered: [...categories],
  };
}
