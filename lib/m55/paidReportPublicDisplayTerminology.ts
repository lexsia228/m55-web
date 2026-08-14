/**
 * Display-only normalization for legacy public terminology in stored paid-report bodies.
 * Does not mutate stored snapshots or user-provided fields (nickname, answers, themes).
 *
 * Apply only at generated snapshot body boundaries (e.g. DtrFullReader.snapshotBodyParas).
 */

type DisplayReplacement = { readonly from: string; readonly to: string };

/** Longest-match-first replacements for known legacy generated phrases only. */
const PAID_REPORT_GENERATED_DISPLAY_REPLACEMENTS: readonly DisplayReplacement[] = [
  { from: '保存版ライト', to: 'M55 プレミアムレポート ライト' },
  { from: '保存版FULL', to: 'M55 プレミアムレポート フル' },
  { from: '保存版フル', to: 'M55 プレミアムレポート フル' },
  { from: '保存版レポート', to: 'プレミアムレポート' },
  { from: '【この保存版だけの本質リズム】', to: '【このプレミアムレポートだけの本質リズム】' },
  { from: '【この保存版だけの補助整理】', to: '【このプレミアムレポートだけの補助整理】' },
  { from: 'この保存版だけの本質リズム', to: 'このプレミアムレポートだけの本質リズム' },
  { from: 'この保存版だけの補助整理', to: 'このプレミアムレポートだけの補助整理' },
  { from: 'この保存版には', to: 'このプレミアムレポートには' },
  { from: 'この保存版で', to: 'このプレミアムレポートで' },
  { from: '保存版の情報', to: 'プレミアムレポートの情報' },
  { from: '保存版の入口', to: 'プレミアムレポートの入口' },
] as const;

/**
 * Catalog phrases that read as an internal analytical label rather than as Japanese a buyer
 * would use about themselves. Fixed at display time for the same reason as the legacy terms
 * above: the stored body and its fingerprint keep the original wording, so already-purchased
 * reports pick the phrasing up on re-read without any snapshot rewrite.
 *
 * 「何の関わりとして呼ばれているか」 is not idiomatic — 関わり does not take として this way.
 * The surrounding sentences are about 曖昧な期待 and about being asked to relate in a
 * particular way, so the natural form of the same question is what the reader is being asked.
 *
 * 「本質リズム」 is leftover internal selector language. After calendar causality was
 * removed, the block is the condition under which judgment stays stable — say that.
 */
export const PAID_DTR_ESSENCE_RHYTHM_PUBLIC_HEADING_JA = '判断が安定しやすい条件' as const;

const PAID_REPORT_NATURAL_PHRASING_REPLACEMENTS: readonly DisplayReplacement[] = [
  {
    from: '「自分は何の関わりとして呼ばれているか」',
    to: '「自分がどんな関わり方を求められているか」',
  },
  {
    from: 'このプレミアムレポートだけの本質リズム',
    to: PAID_DTR_ESSENCE_RHYTHM_PUBLIC_HEADING_JA,
  },
  {
    from: 'この保存版だけの本質リズム',
    to: PAID_DTR_ESSENCE_RHYTHM_PUBLIC_HEADING_JA,
  },
] as const;

function applyReplacements(text: string, rules: readonly DisplayReplacement[]): string {
  let out = text;
  for (const { from, to } of rules) {
    if (out.includes(from)) {
      out = out.split(from).join(to);
    }
  }
  return out;
}

export function normalizePaidReportPublicDisplayText(text: string): string {
  const legacyNormalized = text.includes('保存版')
    ? applyReplacements(text, PAID_REPORT_GENERATED_DISPLAY_REPLACEMENTS)
    : text;
  return applyReplacements(legacyNormalized, PAID_REPORT_NATURAL_PHRASING_REPLACEMENTS);
}
