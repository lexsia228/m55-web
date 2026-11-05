/**
 * POST /api/compatibility/reports/[reportId]/consult/send
 * Pair-only included additional reading (1 per owned report). Isolated from Self Premium wallets.
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import OpenAI from 'openai';
import {
  getOwnedCompatibilityReport,
  isOpaqueCompatibilityId,
} from '../../../../../../../lib/m55/compatibility/compatibilityCommerceDb';
import {
  commitCompatibilityConsultReply,
  loadCompatibilityConsultRoom,
  releaseCompatibilityConsultSendReservation,
  reserveCompatibilityConsultSend,
} from '../../../../../../../lib/m55/compatibility/compatibilityConsultDb';
import { buildCompatibilityConsultReportContext } from '../../../../../../../lib/m55/compatibility/compatibilityConsultReportContext';
import {
  buildCompatibilityConsultSystemPrompt,
  isCompatibilityConsultReplyThemeId,
  resolveCompatibilityConsultQuestionChapterFocus,
} from '../../../../../../../lib/m55/compatibility/compatibilityConsultPrompt';
import {
  classifyM55AiSafetyInput,
  isConsultSafetyBlocked,
} from '../../../../../../../lib/m55/ai/m55AiSafetyPolicy';
import {
  isConsultOutputSafetyBlocked,
  sanitizeM55AiTextOutput,
} from '../../../../../../../lib/m55/ai/m55AiOutputSanitizer';
import { applyM55ConsultReplyQualityPasses } from '../../../../../../../lib/m55/ai/m55ConsultReplyQualitySanitizer';
import { validateConsultSendRequest } from '../../../../../../../lib/m55/consult/consultSendRequest.zod';
import {
  CONSULT_REPLY_GENERATION,
  CONSULT_REPLY_GENERATION_INCOMPLETE_USER_MESSAGE_JA,
  countConsultReplyBlocks,
  normalizeConsultReplyParagraphBreaks,
  validateConsultReplyCompleteness,
  type ConsultReplyCompletenessResult,
} from '../../../../../../../lib/m55/consult/consultReplyGenerationContract';
import {
  attemptConsultReplyLengthRepair,
  isConsultReplyLengthRepairable,
} from '../../../../../../../lib/m55/consult/consultReplyLengthRepair';
import { hashUserIdForLedgerLog } from '../../../../../../../lib/m55/reply/readReplyWalletProbe';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const NO_STORE = { 'Cache-Control': 'private, no-store, max-age=0' };
const OPENAI_REQUEST_TIMEOUT_MS = 120_000;

type RouteParams = { params: Promise<{ reportId: string }> };

class ConsultReplyOutputBlockedError extends Error {
  readonly safeText: string;

  constructor(safeText: string) {
    super('consult_output_blocked');
    this.name = 'ConsultReplyOutputBlockedError';
    this.safeText = safeText;
  }
}

function postProcessConsultReplyDraft(raw: string): string {
  const outputSafety = sanitizeM55AiTextOutput(raw, { surface: 'consult', locale: 'ja-JP' });
  if (isConsultOutputSafetyBlocked(outputSafety)) {
    throw new ConsultReplyOutputBlockedError(outputSafety.safeText);
  }
  let text = outputSafety.safeText;
  const qualityResult = applyM55ConsultReplyQualityPasses(text);
  text = qualityResult.text;
  return normalizeConsultReplyParagraphBreaks(text);
}

type ConsultReplyFinalizeResult = {
  content: string;
  completeness: ConsultReplyCompletenessResult;
  retryAttempted: boolean;
  repairSucceeded: boolean;
};

async function finalizeConsultReplyWithOptionalRepair(
  openai: OpenAI,
  systemPrompt: string,
  initialRaw: string,
): Promise<ConsultReplyFinalizeResult> {
  let retryAttempted = false;
  let raw = initialRaw;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const content = postProcessConsultReplyDraft(raw);
    const completeness = validateConsultReplyCompleteness(content);
    if (completeness.ok) {
      return { content, completeness, retryAttempted, repairSucceeded: retryAttempted };
    }

    const canRepair =
      attempt === 0 && !completeness.ok && isConsultReplyLengthRepairable(completeness.reason);
    if (!canRepair) {
      return { content, completeness, retryAttempted, repairSucceeded: false };
    }

    retryAttempted = true;
    const repair = await attemptConsultReplyLengthRepair(openai, systemPrompt, content);
    if (!repair.repairedText) {
      return { content, completeness, retryAttempted, repairSucceeded: false };
    }
    raw = repair.repairedText;
  }

  const content = postProcessConsultReplyDraft(raw);
  const completeness = validateConsultReplyCompleteness(content);
  return { content, completeness, retryAttempted, repairSucceeded: false };
}

function mapReserveError(result: { errorCode: string }): NextResponse {
  const code = result.errorCode;
  if (code === 'NO_CREDITS') {
    return NextResponse.json(
      { error: '追加読み解きの利用枠が残っていません。' },
      { status: 403, headers: NO_STORE },
    );
  }
  if (code === 'REPORT_NOT_OWNED' || code === 'THREAD_SCOPE_MISMATCH') {
    return NextResponse.json({ error: 'not_owned' }, { status: 403, headers: NO_STORE });
  }
  if (
    code === 'COMMIT_IN_PROGRESS' ||
    code === 'COMMIT_CONFLICT' ||
    code === 'ACTIVE_SEND_IN_PROGRESS'
  ) {
    return NextResponse.json(
      { error: 'Send already in progress. Reload and try again.' },
      { status: 409, headers: NO_STORE },
    );
  }
  if (code === 'IDEMPOTENCY_CONFLICT') {
    return NextResponse.json(
      { error: 'この送信キーは別の内容で既に使われています。' },
      { status: 409, headers: NO_STORE },
    );
  }
  if (code === 'REPLAY_CONTENT_MISSING') {
    return NextResponse.json(
      { error: 'Stored reply unavailable. Reload and try again.' },
      { status: 503, headers: NO_STORE },
    );
  }
  if (code === 'RPC_ERROR' || code === 'RPC_PARSE') {
    return NextResponse.json({ error: 'unavailable' }, { status: 503, headers: NO_STORE });
  }
  return NextResponse.json({ error: 'unavailable' }, { status: 503, headers: NO_STORE });
}

function mapCommitError(result: { errorCode: string; message: string }): NextResponse {
  const code = result.errorCode;
  if (code === 'NO_CREDITS') {
    return NextResponse.json(
      { error: '追加読み解きの利用枠が残っていません。' },
      { status: 403, headers: NO_STORE },
    );
  }
  if (code === 'REPORT_NOT_OWNED' || code === 'THREAD_SCOPE_MISMATCH') {
    return NextResponse.json({ error: 'not_owned' }, { status: 403, headers: NO_STORE });
  }
  if (
    code === 'COMMIT_IN_PROGRESS' ||
    code === 'COMMIT_CONFLICT' ||
    code === 'ACTIVE_SEND_IN_PROGRESS' ||
    code === 'ATTEMPT_TOKEN_MISMATCH' ||
    code === 'RESERVATION_EXPIRED' ||
    code === 'RESERVATION_REQUIRED'
  ) {
    return NextResponse.json(
      { error: 'Send already in progress. Reload and try again.' },
      { status: 409, headers: NO_STORE },
    );
  }
  if (code === 'IDEMPOTENCY_CONFLICT') {
    return NextResponse.json(
      { error: 'この送信キーは別の内容で既に使われています。' },
      { status: 409, headers: NO_STORE },
    );
  }
  if (code === 'REPLAY_CONTENT_MISSING') {
    return NextResponse.json(
      { error: 'Stored reply unavailable. Reload and try again.' },
      { status: 503, headers: NO_STORE },
    );
  }
  return NextResponse.json(
    { error: 'Commit failed. Reload and try again.' },
    { status: 500, headers: NO_STORE },
  );
}

export async function POST(req: NextRequest, ctx: RouteParams) {
  const { reportId: rawId } = await ctx.params;
  const ownedReportId = rawId?.trim() ?? '';

  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: NO_STORE });
  }
  if (!isOpaqueCompatibilityId(ownedReportId)) {
    return NextResponse.json({ error: 'not_found' }, { status: 404, headers: NO_STORE });
  }

  const idempotencyKey = req.headers.get('x-idempotency-key')?.trim() ?? '';
  if (!idempotencyKey || idempotencyKey.length < 8 || idempotencyKey.length > 128) {
    return NextResponse.json(
      { error: 'X-Idempotency-Key is required (8-128 characters).' },
      { status: 400, headers: NO_STORE },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400, headers: NO_STORE });
  }

  const requestValidation = validateConsultSendRequest(body);
  if (!requestValidation.ok) {
    return NextResponse.json(
      { error: requestValidation.error },
      { status: requestValidation.status, headers: NO_STORE },
    );
  }

  const { composedUserMessage: userMessage, catalogEntry } = requestValidation;

  if (!isCompatibilityConsultReplyThemeId(requestValidation.data.reply_theme_id)) {
    return NextResponse.json(
      { error: 'このテーマは、二人の相性レポートの追加読み解きでは選べません。' },
      { status: 422, headers: NO_STORE },
    );
  }

  const safety = classifyM55AiSafetyInput(userMessage, { surface: 'consult' });
  if (isConsultSafetyBlocked(safety)) {
    return NextResponse.json(
      {
        error: 'blocked',
        safeMessage:
          safety.safeMessage ??
          'この内容は、この二人の相性レポートをもとにした読み解きでは扱えません。',
      },
      { status: 422, headers: NO_STORE },
    );
  }

  const owned = await getOwnedCompatibilityReport(userId, ownedReportId);
  if (!owned) {
    return NextResponse.json({ error: 'not_owned' }, { status: 403, headers: NO_STORE });
  }

  const roomLoad = await loadCompatibilityConsultRoom(userId, ownedReportId);
  if (!roomLoad.ok) {
    return NextResponse.json({ error: 'unavailable' }, { status: 503, headers: NO_STORE });
  }

  const { thread } = roomLoad.room;

  const reserve = await reserveCompatibilityConsultSend({
    ownerUserId: userId,
    ownedReportId,
    threadId: thread.id,
    idempotencyKey,
    userMessage,
  });

  if (!reserve.ok) {
    return mapReserveError(reserve);
  }

  if (reserve.mode === 'replay') {
    return NextResponse.json(
      {
        ok: true,
        mode: 'replay',
        consumptionApplied: false,
        creditsRemaining: reserve.threadCreditsRemaining,
        creditsTotal: reserve.threadCreditsTotal,
        state: reserve.threadState,
        assistantContent: reserve.assistantContent,
      },
      { headers: NO_STORE },
    );
  }

  const attemptToken = reserve.attemptToken;
  let reservationReleased = false;

  const releaseReservation = async (): Promise<void> => {
    if (reservationReleased) return;
    reservationReleased = true;
    await releaseCompatibilityConsultSendReservation({
      ownerUserId: userId,
      ownedReportId,
      idempotencyKey,
      attemptToken,
    });
  };

  const reportContext = buildCompatibilityConsultReportContext(owned.snapshot, {
    focusChapterKeys: resolveCompatibilityConsultQuestionChapterFocus(catalogEntry),
  });
  if (!reportContext) {
    await releaseReservation();
    return NextResponse.json(
      { error: 'Report context missing. Reload and try again.' },
      { status: 409, headers: NO_STORE },
    );
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    await releaseReservation();
    return NextResponse.json(
      { error: 'AI service is not configured.' },
      { status: 503, headers: NO_STORE },
    );
  }

  let aiContent: string;
  try {
    const openai = new OpenAI({ apiKey, timeout: OPENAI_REQUEST_TIMEOUT_MS });
    const systemPrompt = buildCompatibilityConsultSystemPrompt(
      reportContext,
      userMessage,
      catalogEntry,
    );

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      max_tokens: CONSULT_REPLY_GENERATION.openAiMaxTokens,
      temperature: 0.55,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
    });
    const initialRaw = completion.choices[0]?.message?.content?.trim() ?? '';
    if (!initialRaw) {
      await releaseReservation();
      return NextResponse.json(
        { error: CONSULT_REPLY_GENERATION_INCOMPLETE_USER_MESSAGE_JA },
        { status: 503, headers: NO_STORE },
      );
    }

    let finalized: ConsultReplyFinalizeResult;
    try {
      finalized = await finalizeConsultReplyWithOptionalRepair(openai, systemPrompt, initialRaw);
    } catch (e) {
      if (e instanceof ConsultReplyOutputBlockedError) {
        await releaseReservation();
        return NextResponse.json(
          { error: 'blocked', safeMessage: e.safeText },
          { status: 422, headers: NO_STORE },
        );
      }
      throw e;
    }

    aiContent = finalized.content;
    if (!finalized.completeness.ok) {
      await releaseReservation();
      console.error(
        '[compatibility/consult/send] completeness failed',
        JSON.stringify({
          userHash: hashUserIdForLedgerLog(userId),
          ownedReportIdPresent: true,
          reason: finalized.completeness.reason,
          length: aiContent.length,
          blockCount: countConsultReplyBlocks(aiContent),
        }),
      );
      return NextResponse.json(
        { error: CONSULT_REPLY_GENERATION_INCOMPLETE_USER_MESSAGE_JA },
        { status: 503, headers: NO_STORE },
      );
    }
  } catch (e) {
    await releaseReservation();
    console.error(
      '[compatibility/consult/send] AI call failed',
      JSON.stringify({ userHash: hashUserIdForLedgerLog(userId), ownedReportIdPresent: true }),
      e,
    );
    return NextResponse.json(
      { error: 'AI service error. Please try again.' },
      { status: 503, headers: NO_STORE },
    );
  }

  const commit = await commitCompatibilityConsultReply({
    ownerUserId: userId,
    ownedReportId,
    threadId: thread.id,
    idempotencyKey,
    userMessage,
    assistantMessage: aiContent,
    attemptToken,
  });

  if (!commit.ok) {
    await releaseReservation();
    console.error(
      '[compatibility/consult/send] commit failed',
      JSON.stringify({
        userHash: hashUserIdForLedgerLog(userId),
        code: commit.errorCode,
      }),
    );
    return mapCommitError(commit);
  }

  reservationReleased = true;

  return NextResponse.json(
    {
      ok: true,
      mode: commit.mode,
      consumptionApplied: commit.consumptionApplied,
      creditsRemaining: commit.threadCreditsRemaining,
      creditsTotal: commit.threadCreditsTotal,
      state: commit.threadState,
      assistantContent: commit.assistantContent,
    },
    { headers: NO_STORE },
  );
}
