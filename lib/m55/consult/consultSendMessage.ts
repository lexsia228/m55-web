/**
 * Lane A consult send — user message parsing and theme-only input contract.
 * Used by ConsultRoom (client compose) and /api/room/core/send (server validation).
 */

import { PAID_DTR_DRAWER_THEME_ENTRIES } from '../paidDtrProductCopy';
import { CONSULT_REPLY_GENERATION } from './consultReplyGenerationContract';
import {
  isKnownConsultTheme,
  resolveConsultReplyPartByTheme,
} from './consultReplyThemePartMap';

export const CONSULT_SEND_INPUT_MAX = 500;

export type ParsedConsultUserMessage = {
  theme: string | null;
  supplementaryLines: string[];
  freeBody: string;
  isThemeOnly: boolean;
};

export type ConsultSendInputValidationResult =
  | { ok: true; parsed: ParsedConsultUserMessage }
  | { ok: false; error: string; status: 422 };

/** Body-present generation instruction — appended when user supplied free text (non-theme-only). */
export const CONSULT_BODY_PRESENT_GENERATION_INSTRUCTION_JA = `【相談返書 — 自由記述あり（必須の長さ・構成）】
- ユーザーはテーマに加えて具体の相談文を書いています。この具体語を各段落に必ず戻してください。
- 抽象的な短文や汎用アドバイスで終わらせないこと。相談テーマと保存版の傾向から場面を具体化し、5段落すべて書き切ってください。
- ${CONSULT_REPLY_GENERATION.minimumAcceptableJa}文字未満は保存されません。目安は${CONSULT_REPLY_GENERATION.targetMinJa}〜${CONSULT_REPLY_GENERATION.targetMaxJa}日本語文字で、${CONSULT_REPLY_GENERATION.minBlockCount}〜${CONSULT_REPLY_GENERATION.maxBlockCount}つのまとまった段落として完結させてください。途中で終えないこと。
- 水増しや同じ言い回しの繰り返しで長さを稼がないこと。相談の論点・保存版の傾向・別の見方・見直す目印・今日の一手まで各段落に役割を持たせて書くこと。
- 2段落目は「保存版から見ると」、3段落目は「少しほどく」、4段落目は「見直すときの目印」、5段落目は「今日やることは1つだけです。」で自然に始めること（見出し・番号は付けない）。上記の返書出力形式・完了条件と同じ契約です。
- 相談文から拾った論点（3〜5個）を1段落目に反映し、今日の一手まで必ず書き切ること。`;

/** Theme-only generation instruction — appended to system prompt anchors when body is blank. */
export const CONSULT_THEME_ONLY_GENERATION_INSTRUCTION_JA = `【テーマのみ相談 — 有効な相談として扱う】
- ユーザーは自由記述を空欄にしています。これは不備ではありません。
- 選択されたテーマと保存版の内容だけをもとに、今の相談として成立する返書を作成してください。
- ユーザーに「詳しく書いてください」「相談内容がありません」と返さず、このテーマで今できる整理と今日の一手まで書いてください。
- 自由記述が空欄でも、短く済ませず、選択テーマを今の相談の枠として扱ってください。テーマの見方から場面を一つ具体化し、保存版の傾向とつなげ、無理が出やすいところ、少しほどく見方、見直す目印、今日の一手まで書き切ってください。
- ${CONSULT_REPLY_GENERATION.minimumAcceptableJa}文字未満は保存されません。目安は${CONSULT_REPLY_GENERATION.targetMinJa}〜${CONSULT_REPLY_GENERATION.targetMaxJa}日本語文字で、${CONSULT_REPLY_GENERATION.minBlockCount}〜${CONSULT_REPLY_GENERATION.maxBlockCount}つのまとまった段落として完結させてください。途中で終えないこと。
- 水増しや同じ言い回しの繰り返しで長さを稼がないこと。テーマ・テーマの見方・保存版の傾向から場面を深め、各段落に役割を持たせて書くこと。
- 2段落目は「保存版から見ると」、3段落目は「少しほどく」、4段落目は「見直すときの目印」、5段落目は「今日やることは1つだけです。」で自然に始めること（見出し・番号は付けない）。上記の返書出力形式・完了条件と同じ契約です。
- テーマラベルとテーマの見方をもとに、今の場面を具体化して書いてください。一般論や汎用コーチングで埋めないでください。`;

export function resolveConsultThemeDescription(theme: string): string {
  const entry = PAID_DTR_DRAWER_THEME_ENTRIES.find((e) => e.labelJa === theme);
  return entry?.sublabelJa ?? '';
}

/** Parse composed consult message (theme line + optional supplementary + optional free body). */
export function parseConsultUserMessage(raw: string): ParsedConsultUserMessage {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { theme: null, supplementaryLines: [], freeBody: '', isThemeOnly: false };
  }

  let theme: string | null = null;
  const supplementaryLines: string[] = [];
  const freeBodyParts: string[] = [];

  for (const block of trimmed.split(/\n{2,}/)) {
    const b = block.trim();
    if (!b) continue;
    if (b.startsWith('【テーマ】')) {
      theme = b.replace('【テーマ】', '').trim() || null;
      continue;
    }
    if (b.startsWith('【補助')) {
      for (const line of b.split('\n')) {
        const t = line.trim();
        if (t.startsWith('・')) supplementaryLines.push(t);
      }
      continue;
    }
    freeBodyParts.push(b);
  }

  const freeBody = freeBodyParts.join('\n\n').trim();
  const isThemeOnly = Boolean(theme) && !freeBody && supplementaryLines.length === 0;

  return { theme, supplementaryLines, freeBody, isThemeOnly };
}

/** Server-side send input validation — theme required; free body optional. */
export function validateConsultSendInput(raw: string): ConsultSendInputValidationResult {
  const trimmed = raw.trim();
  const parsed = parseConsultUserMessage(trimmed);

  if (!parsed.theme) {
    return { ok: false, error: 'テーマを選択してください。', status: 422 };
  }
  if (!isKnownConsultTheme(parsed.theme)) {
    return { ok: false, error: '有効なテーマを選択してください。', status: 422 };
  }
  if (trimmed.length > CONSULT_SEND_INPUT_MAX) {
    return {
      ok: false,
      error: `メッセージは${CONSULT_SEND_INPUT_MAX}文字以内で入力してください。`,
      status: 422,
    };
  }

  return { ok: true, parsed };
}

/** Build user-message anchors for system prompt (prompt-only; no ticket impact). */
export function buildConsultUserAnchors(parsed: ParsedConsultUserMessage): string {
  const theme = parsed.theme?.trim() ?? '';
  if (!theme) return '';

  const themeDescription = resolveConsultThemeDescription(theme);
  const part = resolveConsultReplyPartByTheme(theme);

  if (parsed.isThemeOnly) {
    return `【今回の相談アンカー（テーマのみ — 有効）】
- テーマ: ${theme}
- テーマの見方: ${themeDescription || '（保存版の章に沿う）'}
- 主章候補: ${part.roman}「${part.name}」
${CONSULT_THEME_ONLY_GENERATION_INSTRUCTION_JA}
- 1段落目は、このテーマで今しんどくなりやすい場面を保存版の傾向語と接続して具体化すること（テーマの見方から場面を一つ選ぶ）
- 2〜4段落目は保存版の傾向・別の見方・見直す目印を、このテーマの場面に沿って深めること
- 5段落目は必ず「今日やることは1つだけです。」で始め、このテーマに紐づく行動を1つだけ書くこと`;
  }

  const quoteParts = [...parsed.supplementaryLines, parsed.freeBody].filter(Boolean);
  const quote = quoteParts.join(' ').trim().slice(0, 280);

  return `【今回の相談アンカー（ユーザー原文）】
- テーマ: ${theme}
- テーマの見方: ${themeDescription || '（保存版の章に沿う）'}
- 主章候補: ${part.roman}「${part.name}」
- 具体語は本文に必ず戻す: ${quote || '（短文）'}
${CONSULT_BODY_PRESENT_GENERATION_INSTRUCTION_JA}
- 相談文から拾った論点（3〜5個）を1段落目に反映すること
- 自由記述は補助情報として使い、テーマと保存版の接地を優先すること`;
}

/** Composed message for theme-only send (client/server contract). */
export function buildThemeOnlyConsultMessage(theme: string): string {
  return `【テーマ】${theme}`;
}
