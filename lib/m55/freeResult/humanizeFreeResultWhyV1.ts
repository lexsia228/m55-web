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
  { from: /同じ方向に重なると、?/g, to: '' },
  { from: /側に寄っています/g, to: 'ほうが出やすい' },
  { from: /候補を比べてから閉じる側/g, to: '候補を並べてから、答えを一つに絞るほう' },
  { from: /内側で続きやすい/g, to: 'そのあとも続きやすい' },
];

const CUSTOMER_COPY_FRAGMENT_BANS: readonly RegExp[] = [
  /側に重なっています/,
  /同じ方向に重なると/,
  /〜よう人/,
  /よう人$/,
  /締めたよう人/,
  /相談で進んだよう人/,
  /本人の中では内側では/,
  /本人の中では本人の中では/,
  /「[^」]*しているよう」に見えやすい/,
  /したいが先に立つ/,
  /土台の始め方/,
  /土台の決め方/,
  /土台の戻り方/,
  /土台の距離/,
  /土台の変化/,
  /候補を比べてから閉じる側/,
  /classifier/i,
  /debug/i,
];

export function normalizeCustomerCopyJa(text: string): string {
  return text.replace(/\s/g, '').replace(/[。、！？「」『』]/g, '');
}

export function customerCopyFragmentViolations(text: string): string[] {
  const hits: string[] = [];
  for (const pattern of CUSTOMER_COPY_FRAGMENT_BANS) {
    if (pattern.test(text)) hits.push(pattern.source);
  }
  return hits;
}

export function assertCustomerCopyJa(text: string): void {
  const violations = customerCopyFragmentViolations(text);
  if (violations.length > 0) {
    throw new Error(`customer copy fragment leak: ${violations.join(', ')}`);
  }
}

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

function formatAnswerWhyLine(headlineJa: string): string {
  const humanized = humanizeFreeResultWhyLineJa(headlineJa);
  if (humanized.includes('今回の回答では')) {
    return humanized.endsWith('。') ? humanized : `${humanized}。`;
  }
  const trimmed = humanized.replace(/。$/u, '').trim();
  if (!trimmed) return '今回の回答では、いまの選び方が重なりました。';
  return `今回の回答では、${trimmed}。`;
}

function buildFusedWhyLine(input: {
  fusedStackJa: string;
  fusedSceneJa: string;
  bodyJa: string;
}): string {
  const scene = humanizeFreeResultWhyLineJa(input.fusedSceneJa.trim());
  if (scene.length >= 12) {
    const sceneCore = scene.replace(/。$/u, '').trim();
    return `この二つを合わせると、${sceneCore}。`;
  }

  const fusedParts = input.fusedStackJa
    .split('。')
    .map((part) => part.trim())
    .filter((part) => part.length > 8);
  const fusedLead =
    fusedParts.find((part) => /見え|残り|出やす|続き|分かれ|重な/.test(part)) ??
    fusedParts[fusedParts.length - 1] ??
    input.bodyJa.split('。')[0]?.trim() ??
    input.bodyJa;

  const fusedHuman = humanizeFreeResultWhyLineJa(`${fusedLead}。`)
    .replace(/^今回の回答では、?/, '')
    .replace(/^今回は/, '')
    .replace(/。$/u, '')
    .trim();

  if (!fusedHuman) {
    return 'この二つを合わせると、場面によって出方が分かれやすくなります。';
  }
  return `この二つを合わせると、${fusedHuman}。`;
}

export function buildHumanizedConciseWhyJa(input: {
  birthBaseJa: string;
  currentExpressionJa: string;
  fusedStackJa: string;
  fusedSceneJa: string;
  bodyJa: string;
}): readonly [string, string, string] {
  const birthLine = humanizeFreeResultWhyLineJa(input.birthBaseJa);
  const answerLine = formatAnswerWhyLine(input.currentExpressionJa);
  const fusedLine = buildFusedWhyLine(input);
  return [birthLine, answerLine, fusedLine];
}
