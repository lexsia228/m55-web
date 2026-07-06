/**
 * Lane A consult send — user message parsing and question-select input contract.
 * Used by ConsultRoom (selection UI) and /api/room/core/send (server validation + compose).
 */

import type { ConsultQuestionCatalogEntry } from './consultQuestionCatalog.v1';
import { PAID_DTR_DRAWER_THEME_ENTRIES } from '../paidDtrProductCopy';
import {
  CONSULT_REPLY_GENERATION,
  CONSULT_REPLY_QUALITY_VOICE_JA,
} from './consultReplyGenerationContract';
import {
  isKnownConsultTheme,
  resolveConsultReplyPartByTheme,
} from './consultReplyThemePartMap';

export const CONSULT_SEND_INPUT_MAX = 500;

export type ParsedConsultUserMessage = {
  theme: string | null;
  question: string | null;
  supplementaryLines: string[];
  freeBody: string;
  /** Legacy theme-only messages (no 【質問】 line). */
  isThemeOnlyLegacy: boolean;
  /** New question-select composed messages. */
  isQuestionSelect: boolean;
  /** @deprecated Use isThemeOnlyLegacy — kept for existing call sites during transition. */
  isThemeOnly: boolean;
};

export type ConsultSendInputValidationResult =
  | { ok: true; parsed: ParsedConsultUserMessage }
  | { ok: false; error: string; status: 422 };

export type ComposedReplyValidationResult =
  | { ok: true }
  | { ok: false; error: string; status: 422 };

/** Body-present generation instruction — legacy history only; not reachable from new API. */
export const CONSULT_BODY_PRESENT_GENERATION_INSTRUCTION_JA = `【相談返書 — 自由記述あり（必須の長さ・構成）】
- ユーザーはテーマに加えて具体の相談文を書いています。この具体語を各段落に必ず戻してください。
- 抽象的な短文や汎用アドバイスで終わらせないこと。相談テーマと保存版の傾向から場面を具体化し、5段落すべて書き切ってください。
- ${CONSULT_REPLY_GENERATION.minimumAcceptableJa}文字未満は保存されません。目安は${CONSULT_REPLY_GENERATION.targetMinJa}〜${CONSULT_REPLY_GENERATION.targetMaxJa}日本語文字で、${CONSULT_REPLY_GENERATION.minBlockCount}〜${CONSULT_REPLY_GENERATION.maxBlockCount}つのまとまった段落として完結させてください。途中で終えないこと。
- 水増しや同じ言い回しの繰り返しで長さを稼がないこと。相談の論点・保存版の傾向・別の見方・見直す目印・今日の一手まで各段落に役割を持たせて書くこと。
- 2段落目は「保存版から見ると」、3段落目は「少しほどく」、4段落目は「見直すときの目印」、5段落目は「今日やることは1つだけです。」で自然に始めること（見出し・番号は付けない）。上記の返書出力形式・完了条件と同じ契約です。
- 相談文から拾った論点（3〜5個）を1段落目に反映し、今日の一手まで必ず書き切ること。

${CONSULT_REPLY_QUALITY_VOICE_JA}`;

/** Theme-only generation instruction — legacy history only. */
export const CONSULT_THEME_ONLY_GENERATION_INSTRUCTION_JA = `【テーマのみ相談 — 有効な相談として扱う】
- ユーザーは自由記述を空欄にしています。これは不備ではありません。
- 選択されたテーマと保存版の内容だけをもとに、今の相談として成立する返書を作成してください。
- ユーザーに「詳しく書いてください」「相談内容がありません」と返さず、このテーマで今できる整理と今日の一手まで書いてください。
- 自由記述が空欄でも、短く済ませず、選択テーマを今の相談の枠として扱ってください。テーマの見方から場面を一つ具体化し、保存版の傾向とつなげ、無理が出やすいところ、少しほどく見方、見直す目印、今日の一手まで書き切ってください。
- ${CONSULT_REPLY_GENERATION.minimumAcceptableJa}文字未満は保存されません。目安は${CONSULT_REPLY_GENERATION.targetMinJa}〜${CONSULT_REPLY_GENERATION.targetMaxJa}日本語文字で、${CONSULT_REPLY_GENERATION.minBlockCount}〜${CONSULT_REPLY_GENERATION.maxBlockCount}つのまとまった段落として完結させてください。途中で終えないこと。
- 水増しや同じ言い回しの繰り返しで長さを稼がないこと。テーマ・テーマの見方・保存版の傾向から場面を深め、各段落に役割を持たせて書くこと。
- 2段落目は「保存版から見ると」、3段落目は「少しほどく」、4段落目は「見直すときの目印」、5段落目は「今日やることは1つだけです。」で自然に始めること（見出し・番号は付けない）。上記の返書出力形式・完了条件と同じ契約です。
- テーマラベルとテーマの見方をもとに、今の場面を具体化して書いてください。一般論や汎用コーチングで埋めないでください。

${CONSULT_REPLY_QUALITY_VOICE_JA}`;

/** Question-select generation instruction — appended when user selected theme + question. */
export const CONSULT_QUESTION_SELECT_GENERATION_INSTRUCTION_JA = `【追加読み解き — 選択式（自由記述なし）】
- ユーザーはテーマと質問を選択しました。自由記述はありません。選択された質問は保存版を読み返す焦点です。
- これは新しい鑑定ではなく、購入時点の保存版の続きとして書いてください。
- 保存版抜粋の傾向語を2〜4個、そのまま本文に戻すこと。一般論・汎用コーチングで埋めない。snapshot内の語彙を使う。
- 主章は1つ名指し、補助章は最大1つまで。
- ${CONSULT_REPLY_GENERATION.minimumAcceptableJa}文字未満は保存されません。目安は${CONSULT_REPLY_GENERATION.targetMinJa}〜${CONSULT_REPLY_GENERATION.targetMaxJa}日本語文字で、${CONSULT_REPLY_GENERATION.minBlockCount}〜${CONSULT_REPLY_GENERATION.maxBlockCount}つのまとまった段落として完結させてください。
- 2段落目は「保存版から見ると」、3段落目は「少しほどく」、4段落目は「見直すときの目印」、5段落目は「今日やることは1つだけです。」で自然に始めること。
- 生年月日・snapshot ID などの個人情報や内部識別子を本文に出さないこと。

${CONSULT_REPLY_QUALITY_VOICE_JA}`;

export function resolveConsultThemeDescription(theme: string): string {
  const entry = PAID_DTR_DRAWER_THEME_ENTRIES.find((e) => e.labelJa === theme);
  return entry?.sublabelJa ?? '';
}

/** Server-side compose for question-select send. */
export function composeReplyUserMessage(themeLabelJa: string, questionLabelJa: string): string {
  return `【テーマ】${themeLabelJa}\n【質問】${questionLabelJa}`;
}

export function validateComposedReplyMessage(raw: string): ComposedReplyValidationResult {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { ok: false, error: 'テーマと質問を選択してください。', status: 422 };
  }
  if (trimmed.length > CONSULT_SEND_INPUT_MAX) {
    return {
      ok: false,
      error: `メッセージは${CONSULT_SEND_INPUT_MAX}文字以内で入力してください。`,
      status: 422,
    };
  }
  const parsed = parseConsultUserMessage(trimmed);
  if (!parsed.isQuestionSelect) {
    return { ok: false, error: 'テーマと質問の形式が不正です。', status: 422 };
  }
  return { ok: true };
}

/** Parse composed consult message (theme / question / legacy supplementary / legacy free body). */
export function parseConsultUserMessage(raw: string): ParsedConsultUserMessage {
  const trimmed = raw.trim();
  if (!trimmed) {
    return {
      theme: null,
      question: null,
      supplementaryLines: [],
      freeBody: '',
      isThemeOnlyLegacy: false,
      isQuestionSelect: false,
      isThemeOnly: false,
    };
  }

  let theme: string | null = null;
  let question: string | null = null;
  const supplementaryLines: string[] = [];
  const freeBodyLines: string[] = [];
  let inSupplementaryBlock = false;

  for (const line of trimmed.split('\n')) {
    const b = line.trim();
    if (!b) {
      if (inSupplementaryBlock) inSupplementaryBlock = false;
      if (freeBodyLines.length > 0 && freeBodyLines[freeBodyLines.length - 1] !== '') {
        freeBodyLines.push('');
      }
      continue;
    }
    if (b.startsWith('【テーマ】')) {
      theme = b.replace('【テーマ】', '').trim() || null;
      inSupplementaryBlock = false;
      continue;
    }
    if (b.startsWith('【質問】')) {
      question = b.replace('【質問】', '').trim() || null;
      inSupplementaryBlock = false;
      continue;
    }
    if (b.startsWith('【補助')) {
      inSupplementaryBlock = true;
      continue;
    }
    if (inSupplementaryBlock && b.startsWith('・')) {
      supplementaryLines.push(b);
      continue;
    }
    inSupplementaryBlock = false;
    freeBodyLines.push(b);
  }

  const freeBody = freeBodyLines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
  const isQuestionSelect =
    Boolean(theme) && Boolean(question) && !freeBody && supplementaryLines.length === 0;
  const isThemeOnlyLegacy =
    Boolean(theme) && !question && !freeBody && supplementaryLines.length === 0;

  return {
    theme,
    question,
    supplementaryLines,
    freeBody,
    isThemeOnlyLegacy,
    isQuestionSelect,
    isThemeOnly: isThemeOnlyLegacy,
  };
}

/** Legacy server-side send input validation — theme required; free body optional. */
export function validateConsultSendInput(raw: string): ConsultSendInputValidationResult {
  const trimmed = raw.trim();
  const parsed = parseConsultUserMessage(trimmed);

  if (!parsed.theme) {
    return { ok: false, error: 'テーマを選択してください。', status: 422 };
  }
  if (!parsed.isQuestionSelect && !isKnownConsultTheme(parsed.theme)) {
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

function formatChapterAnchor(entry: ConsultQuestionCatalogEntry): string {
  const primary = `${entry.primaryChapterRoman}（主章候補）`;
  if (entry.secondaryChapterRoman) {
    return `${primary} / 補助章候補: ${entry.secondaryChapterRoman}`;
  }
  return primary;
}

/** Build user-message anchors for system prompt (prompt-only; no ticket impact). */
export function buildConsultUserAnchors(
  parsed: ParsedConsultUserMessage,
  catalogEntry?: ConsultQuestionCatalogEntry | null,
): string {
  const theme = parsed.theme?.trim() ?? '';
  if (!theme) return '';

  const themeDescription = resolveConsultThemeDescription(theme);
  const part = resolveConsultReplyPartByTheme(theme);

  if (parsed.isQuestionSelect && catalogEntry) {
    return `【今回の追加読み解きアンカー（選択式 — 自由記述なし）】
- テーマ: ${theme}
- 読み返したい焦点: ${parsed.question ?? catalogEntry.labelJa}
- 質問焦点: ${catalogEntry.promptFocusAnchor}
- grounding: ${catalogEntry.grounding_target}
- 主章候補: ${formatChapterAnchor(catalogEntry)} / 参照章: ${part.roman}「${part.name}」
${CONSULT_QUESTION_SELECT_GENERATION_INSTRUCTION_JA}
- 1段落目は、選択された質問焦点を保存版の傾向語と接続して具体化すること
- 2〜4段落目は保存版の傾向・別の見方・見直す目印を、この焦点に沿って深めること
- 5段落目は必ず「今日やることは1つだけです。」で始め、この焦点に紐づく行動を1つだけ書くこと`;
  }

  if (parsed.isThemeOnlyLegacy) {
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

/** Composed message for theme-only send (legacy client/server contract). */
export function buildThemeOnlyConsultMessage(theme: string): string {
  return `【テーマ】${theme}`;
}

/** Composed message for question-select send. */
export function buildQuestionSelectConsultMessage(
  themeLabelJa: string,
  questionLabelJa: string,
): string {
  return composeReplyUserMessage(themeLabelJa, questionLabelJa);
}
