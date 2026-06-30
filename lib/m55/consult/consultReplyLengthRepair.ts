/**
 * Lane A consult reply — bounded length repair (max 1 attempt, pre-RPC only).
 * Does not consume tickets; caller must re-validate after repair.
 */

import type OpenAI from 'openai';
import {
  CONSULT_REPLY_GENERATION,
  CONSULT_REPLY_PROMPT_COMPLETION_REQUIREMENTS_JA,
  CONSULT_REPLY_QUALITY_VOICE_JA,
  type ConsultReplyCompletenessFailureReason,
} from './consultReplyGenerationContract';

export const CONSULT_REPLY_LENGTH_REPAIRABLE_REASONS = [
  'below_minimum_length',
] as const satisfies readonly ConsultReplyCompletenessFailureReason[];

export type ConsultReplyLengthRepairableReason =
  (typeof CONSULT_REPLY_LENGTH_REPAIRABLE_REASONS)[number];

export function isConsultReplyLengthRepairable(
  reason: ConsultReplyCompletenessFailureReason,
): reason is ConsultReplyLengthRepairableReason {
  return (CONSULT_REPLY_LENGTH_REPAIRABLE_REASONS as readonly string[]).includes(reason);
}

/** User message for the single bounded repair call — draft text stays out of server logs. */
export const CONSULT_REPLY_LENGTH_REPAIR_USER_PREFIX_JA = `【返書の長さ補強 — 1回のみ】
以下の相談返書ドラフトはサーバー最低文字数（${CONSULT_REPLY_GENERATION.minimumAcceptableJa}字）を満たしていません。
構造・役割・相談の具体性を維持しつつ、各段落を深めて${CONSULT_REPLY_GENERATION.targetMinJa}〜${CONSULT_REPLY_GENERATION.targetMaxJa}日本語文字の完成返書に書き直してください。

必須:
- 5段落（最低4段落）。段落間は空行1つ（改行2つ）のみ。見出し・番号・箇条書き記号は付けない。
- 相談文の具体語と保存版の傾向語を各段落に戻す。抽象的な短文で終わらせない。
- 2段落目は保存版から見ると、3段落目は少しほどく、4段落目は見直すときの目印、5段落目は必ず「今日やることは1つだけです。」で始め、行動は1つだけ。
- 水増し・同じ言い回しの繰り返しで長さを稼がない。各段落に1役割だけ持たせる。
- ${CONSULT_REPLY_GENERATION.minimumAcceptableJa}文字未満・${CONSULT_REPLY_GENERATION.outputHardCapJa}文字超は保存されない。最終文は必ず「。」で終える。

${CONSULT_REPLY_PROMPT_COMPLETION_REQUIREMENTS_JA}

${CONSULT_REPLY_QUALITY_VOICE_JA}

--- ドラフト（このまま保存不可） ---
`;

export function buildConsultReplyLengthRepairUserMessage(draft: string): string {
  return `${CONSULT_REPLY_LENGTH_REPAIR_USER_PREFIX_JA}${draft.trim()}`;
}

export type ConsultReplyLengthRepairAttempt = {
  repairedText: string | null;
};

/**
 * One bounded LLM repair when draft fails below_minimum_length only.
 * Returns null repairedText on API/empty failure — caller fail-closes.
 */
export async function attemptConsultReplyLengthRepair(
  openai: OpenAI,
  systemPrompt: string,
  draft: string,
): Promise<ConsultReplyLengthRepairAttempt> {
  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      max_tokens: CONSULT_REPLY_GENERATION.openAiMaxTokens,
      temperature: 0.45,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: buildConsultReplyLengthRepairUserMessage(draft) },
      ],
    });
    const repairedText = completion.choices[0]?.message?.content?.trim() ?? '';
    if (!repairedText) {
      return { repairedText: null };
    }
    return { repairedText };
  } catch {
    return { repairedText: null };
  }
}
