/**
 * Display-only normalization for legacy public terminology in stored paid-report bodies.
 * Does not mutate stored snapshots or user-provided fields (nickname, answers, themes).
 *
 * Apply only at generated snapshot body boundaries (e.g. DtrFullReader.snapshotBodyParas).
 */

/** Longest-match-first replacements for known legacy generated phrases only. */
const PAID_REPORT_GENERATED_DISPLAY_REPLACEMENTS: readonly {
  readonly from: string;
  readonly to: string;
}[] = [
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

export function normalizePaidReportPublicDisplayText(text: string): string {
  if (!text.includes('保存版')) return text;
  let out = text;
  for (const { from, to } of PAID_REPORT_GENERATED_DISPLAY_REPLACEMENTS) {
    if (out.includes(from)) {
      out = out.split(from).join(to);
    }
  }
  return out;
}
