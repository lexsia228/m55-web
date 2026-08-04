/**
 * Deterministic additional-reading reply renderer for quality matrix tests.
 * Pure function — no fetch, AI SDK, process.env, DB, RPC, or ticket mutation.
 */

import type { ConsultQuestionCatalogEntry } from './consultQuestionCatalog.v1';

export type DeterministicConsultRenderInput = {
  catalogEntry: ConsultQuestionCatalogEntry;
  reportContext: string;
  uiThemeLabel: string;
  uiQuestionLabel: string;
};

const DAILY_OPENERS = [
  'こういう場面で、出やすい動きがあります。',
  'いまの場面では、まず入口を一つに絞ると整いやすいです。',
  '小さく整えるなら、今日見る場所を一つに置きます。',
] as const;

function pickTendencyToken(reportContext: string): string {
  const match = reportContext.match(
    /【抜粋からそのまま使える傾向語の例】\n([^\n]+)/,
  );
  if (match?.[1]) {
    const first = match[1].split(' / ').map((s) => s.trim()).find(Boolean);
    if (first) return first;
  }
  if (reportContext.includes('本質リズム')) return 'リズムの出方';
  if (reportContext.includes('補助整理')) return '補助の見方';
  return 'プレミアムレポートの傾向';
}

function pickChapterHint(entry: ConsultQuestionCatalogEntry): string {
  if (entry.secondaryChapterRoman) {
    return `主章候補${entry.primaryChapterRoman}と補助章候補${entry.secondaryChapterRoman}`;
  }
  return `主章候補${entry.primaryChapterRoman}`;
}

/**
 * Build a five-paragraph synthetic reply aligned with consult contracts.
 * Does not call AI. Does not consume tickets.
 */
export function renderDeterministicConsultReply(
  input: DeterministicConsultRenderInput,
): string {
  const { catalogEntry, reportContext, uiThemeLabel, uiQuestionLabel } = input;
  const tendency = pickTendencyToken(reportContext);
  const chapterHint = pickChapterHint(catalogEntry);
  const opener = DAILY_OPENERS[catalogEntry.reply_question_id.length % DAILY_OPENERS.length];

  const p1 =
    `${opener}` +
    `${uiThemeLabel}の入口で「${uiQuestionLabel}」に沿って見ると、` +
    `${tendency}が場面に出やすいです。` +
    `質問焦点は、${catalogEntry.promptFocusAnchor}。`;

  const p2 =
    `プレミアムレポートの${chapterHint}を読み返すと、` +
    `いまの焦点「${catalogEntry.labelJa}」に近い手がかりが残っています。` +
    `抽象だけで進めず、出やすい場面に落とします。`;

  const p3 =
    `別の見方としては、${catalogEntry.grounding_target}の範囲で、` +
    `無理が重なる前の小さな区切りを先に置くと整いやすいです。` +
    `入口にしやすいのは、ひとつだけ区切ることです。`;

  const p4 =
    `見直す目印は、${uiQuestionLabel}に戻ることです。` +
    `大きく変えず、小さく整えるなら、今日見る場所を一つに絞ります。`;

  const p5 =
    `今日やることは1つだけです。` +
    `${uiThemeLabel}の場面で、${uiQuestionLabel}に沿って、` +
    `まず入口にしやすい一手を一つだけ置きます。`;

  return [p1, p2, p3, p4, p5].join('\n\n');
}
