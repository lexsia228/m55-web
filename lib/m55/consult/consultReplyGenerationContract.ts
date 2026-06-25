/**
 * Lane A consult reply — generation length / structure contract (SSOT-aligned).
 * Used by send route validation before ticket-consuming RPC.
 */

export const CONSULT_REPLY_GENERATION = {
  /** Standard target band (Japanese characters). */
  targetMinJa: 1200,
  targetMaxJa: 1800,
  /** Minimum acceptable complete reply (safety refusal paths exempt). */
  minimumAcceptableJa: 1000,
  /** Soft upper guidance for prompt — not a hard truncate. */
  hardUpperGuidanceJa: 2200,
  /** Server-side reject if model output exceeds this (no mid-cut save). */
  outputHardCapJa: 2400,
  /** Must match m55_consult_reply_commit RPC assistant_message max after migration. */
  assistantMessageRpcMaxJa: 2800,
  openAiMaxTokens: 2400,
  minBlockCount: 4,
  maxBlockCount: 5,
} as const;

export type ConsultReplyCompletenessFailureReason =
  | 'empty'
  | 'truncation_ellipsis'
  | 'exceeds_hard_cap'
  | 'below_minimum_length'
  | 'insufficient_blocks'
  | 'too_many_blocks'
  | 'incomplete_sentence_end';

export type ConsultReplyCompletenessResult =
  | { ok: true }
  | { ok: false; reason: ConsultReplyCompletenessFailureReason };

const COMPLETE_SENTENCE_END = /[。！？!?」』]$/;

/** Count blank-line-separated blocks (same contract as prompt / ConsultReplyCard). */
export function countConsultReplyBlocks(text: string): number {
  return text
    .trim()
    .split(/\n{2,}/)
    .map((p) => p.replace(/\n+/g, ' ').trim())
    .filter(Boolean).length;
}

export function isConsultReplyShortReplyExempt(text: string): boolean {
  const markers = [
    'お答えできません',
    'この内容は',
    '扱えません',
    '専門家',
    'もう少し具体的',
    '状況を教えて',
    '安全な案内',
  ] as const;
  return markers.some((m) => text.includes(m));
}

/**
 * Fail-closed completeness check before m55_consult_reply_commit.
 * Does not consume tickets — caller must skip RPC when ok is false.
 */
export function validateConsultReplyCompleteness(
  text: string,
  options?: { exemptMinimumAndBlocks?: boolean },
): ConsultReplyCompletenessResult {
  const trimmed = text.trim();
  const exempt =
    options?.exemptMinimumAndBlocks === true || isConsultReplyShortReplyExempt(trimmed);

  if (!trimmed) return { ok: false, reason: 'empty' };
  if (trimmed.endsWith('…') || trimmed.endsWith('...')) {
    return { ok: false, reason: 'truncation_ellipsis' };
  }
  if (trimmed.length > CONSULT_REPLY_GENERATION.outputHardCapJa) {
    return { ok: false, reason: 'exceeds_hard_cap' };
  }
  if (!exempt && trimmed.length < CONSULT_REPLY_GENERATION.minimumAcceptableJa) {
    return { ok: false, reason: 'below_minimum_length' };
  }

  if (!exempt) {
    const blocks = countConsultReplyBlocks(trimmed);
    if (blocks < CONSULT_REPLY_GENERATION.minBlockCount) {
      return { ok: false, reason: 'insufficient_blocks' };
    }
    if (blocks > CONSULT_REPLY_GENERATION.maxBlockCount + 1) {
      return { ok: false, reason: 'too_many_blocks' };
    }
  }

  if (!COMPLETE_SENTENCE_END.test(trimmed)) {
    return { ok: false, reason: 'incomplete_sentence_end' };
  }

  return { ok: true };
}

export const CONSULT_REPLY_GENERATION_INCOMPLETE_USER_MESSAGE_JA =
  '返書の作成が完了しませんでした。しばらくしてから再度お試しください。解決しない場合はサポートをご利用ください。';
