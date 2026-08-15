/**
 * Presentation-only Japanese for free-result "why" copy.
 * Keeps fused semantics; removes internal axis vocabulary from customer text.
 */

import { humanizePrivatePresentationJa } from '../narrative/humanizePrivatePresentationV1';

const WHY_REPLACEMENTS: readonly Readonly<{ from: RegExp; to: string }>[] = [
  { from: /土台の始め方も今回の答えも、/, to: '今回の回答では、' },
  { from: /土台の決め方も今回の答えも、/, to: '今回の回答では、' },
  { from: /土台の戻り方も今回の答えも、/, to: '今回の回答では、' },
  { from: /土台の距離の取り方も今回の答えも、/, to: '今回の回答では、' },
  { from: /土台の変化への向き合い方も今回の答えも、/, to: '今回の回答では、' },
  { from: /今回の答えでは/g, to: '今回は' },
  { from: /側に重なっています/g, to: 'ほうが重なります' },
  { from: /側に寄っています/g, to: 'ほうが出やすい' },
  { from: /候補を比べてから閉じる側/g, to: '候補を並べてから、答えを一つに絞るほう' },
  { from: /内側で続きやすい/g, to: 'そのあとも続きやすい' },
];

export function humanizeFreeResultWhyLineJa(text: string): string {
  let next = text.trim();
  if (next.startsWith('生年月日の土台では、')) {
    next = `生年月日から見ると、${next.slice('生年月日の土台では、'.length)}`;
  }
  next = humanizePrivatePresentationJa(next);
  for (const rule of WHY_REPLACEMENTS) {
    next = next.replace(rule.from, rule.to);
  }
  return next.replace(/基調です。?$/, '傾向が見えます。');
}

export function buildHumanizedConciseWhyJa(input: {
  birthBaseJa: string;
  fusedStackJa: string;
  bodyJa: string;
}): readonly [string, string] {
  const birthLine = humanizeFreeResultWhyLineJa(input.birthBaseJa);
  const fusedLead =
    input.fusedStackJa.split('。').find((part) => part.trim().length > 12)?.trim() ??
    input.bodyJa.split('。')[0]?.trim() ??
    input.bodyJa;
  const answerLine = humanizeFreeResultWhyLineJa(`${fusedLead}。`);
  return [birthLine, answerLine];
}
