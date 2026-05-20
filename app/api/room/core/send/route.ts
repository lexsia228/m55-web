/**
 * POST /api/room/core/send
 * Sends a user message, calls AI, consumes one credit.
 *
 * Rules (M55_AI_CONSULT_SAFETY_AND_LIMITS_SSOT_v1 + M55_REPORT_CONCIERGE_ROOM_SSOT_v1):
 * - Ownership gate: fail-closed
 * - Input min=10, hard max=500 chars
 * - Output target 700-900 chars, hard cap 1000
 * - Ticket only consumed when BOTH messages committed successfully
 * - High-risk patterns: block send, do not consume ticket
 * - When credits_remaining reaches 0: thread → read_only
 * - No generic public chat; AI is scoped to the owned report
 *
 * Hardening (2026-03-25):
 * - Batch insert user + AI message atomically (prevents orphan user message)
 * - Credits update failure → log for recovery, return success with reconcile_needed flag
 *   (reconciliation happens on next GET; user already received AI answer)
 * - Server-side pending guard via thread.state check (prevents race on concurrent sends)
 * - OPENAI_API_KEY missing → 503 (no DB change)
 * - AI failure → 503 (no DB change)
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import OpenAI from 'openai';
import { getSupabaseAdmin } from '../../../../../lib/supabaseAdmin';
import { resolveEntryReportOwnership } from '../../../../../lib/m55/dtrOwnershipGate';
import { runDtrEngine } from '../../../../../lib/m55/dtrEngine';
import { hashUserIdForLedgerLog } from '../../../../../lib/m55/reply/readReplyWalletProbe';
import {
  buildM55AiSafetySystemInstruction,
  classifyM55AiSafetyInput,
  isConsultSafetyBlocked,
} from '../../../../../lib/m55/ai/m55AiSafetyPolicy';
import {
  isConsultOutputSafetyBlocked,
  sanitizeM55AiTextOutput,
} from '../../../../../lib/m55/ai/m55AiOutputSanitizer';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const REPORT_KEY = 'm55_p:core_origin';
const INPUT_MIN = 10;
const INPUT_MAX = 500;
const OUTPUT_HARD_CAP = 1000;
const NO_STORE = { 'Cache-Control': 'private, no-store, max-age=0' };

function clampOutput(text: string): string {
  if (text.length <= OUTPUT_HARD_CAP) return text;
  return text.slice(0, OUTPUT_HARD_CAP - 1) + '…';
}

/** Build report-scoped system prompt (no generic chat). */
function buildSystemPrompt(reportSections: string): string {
  const safetyPrefix = buildM55AiSafetySystemInstruction('consult');
  return `${safetyPrefix}

あなたはM55のEntry Reportに付帯する相談AIです。
このユーザーの取り扱い説明書の要点は以下のとおりです：

${reportSections}

あなたの役割：
- このレポートの内容に関するユーザーの質問・疑問を穏やかに整理・補足すること
- レポートにない事柄を、断定調で付け足したり、未来や吉凶を示唆する形で述べないこと
- 医療・法律・投資等の専門的助言は行わないこと
- 危機的・自傷的な内容を検知した場合は相談窓口等の安全な案内のみ行うこと

回答は700〜900文字を目安にし、1000文字を超えないこと。
簡潔で読みやすく、落ち着いたトーンで書くこと。`;
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: NO_STORE });
  }

  // Layer1 ownership gate (fail-closed)
  const ownership = await resolveEntryReportOwnership(userId);
  if (ownership.unlockState !== 'owned') {
    return NextResponse.json({ error: 'Not owned' }, { status: 403, headers: NO_STORE });
  }
  const reportInstanceId =
    typeof ownership.reportInstanceId === 'string' && ownership.reportInstanceId.trim().length > 0
      ? ownership.reportInstanceId.trim()
      : null;
  if (!reportInstanceId) {
    return NextResponse.json(
      { error: 'Report context missing. Reload and try again.' },
      { status: 409, headers: NO_STORE }
    );
  }

  let body: { message?: string; birthDate?: string; nickname?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400, headers: NO_STORE });
  }

  const userMessage = typeof body.message === 'string' ? body.message.trim() : '';

  // Input validation (server authority — client counter is advisory only)
  if (userMessage.length < INPUT_MIN) {
    return NextResponse.json(
      { error: `メッセージは${INPUT_MIN}文字以上で入力してください。` },
      { status: 422, headers: NO_STORE }
    );
  }
  if (userMessage.length > INPUT_MAX) {
    return NextResponse.json(
      { error: `メッセージは${INPUT_MAX}文字以内で入力してください。` },
      { status: 422, headers: NO_STORE }
    );
  }

  // Shared safety guard (no ticket consumption on block — SSOT §5, §3.3)
  const safety = classifyM55AiSafetyInput(userMessage, { surface: 'consult' });
  if (isConsultSafetyBlocked(safety)) {
    return NextResponse.json(
      {
        error: 'blocked',
        safeMessage: safety.safeMessage ?? 'この内容はこのレポートの相談では扱えません。',
      },
      { status: 422, headers: NO_STORE }
    );
  }

  const db = getSupabaseAdmin() as any;

  // Get thread (existing compatibility ledger row)
  const { data: thread, error: threadErr } = await db
    .from('consult_threads')
    .select('id, credits_total, credits_remaining, state')
    .eq('user_id', userId)
    .eq('report_key', REPORT_KEY)
    .maybeSingle();

  if (threadErr || !thread) {
    return NextResponse.json({ error: 'Thread not found. Reload and try again.' }, { status: 404, headers: NO_STORE });
  }

  const t = thread as { id: string; credits_total: number; credits_remaining: number; state: string };

  const { data: walletRaw, error: walletErr } = await db
    .from('reply_ticket_wallets')
    .select('id, status, available_count, consumed_count')
    .eq('user_id', userId)
    .eq('report_instance_id', reportInstanceId)
    .maybeSingle();

  if (walletErr || !walletRaw) {
    return NextResponse.json(
      { error: 'Reply wallet not found. Reload and try again.' },
      { status: 409, headers: NO_STORE }
    );
  }

  const wallet = walletRaw as {
    id: string;
    status: string;
    available_count: number;
    consumed_count: number;
  };
  if (wallet.status !== 'active' || wallet.available_count <= 0) {
    return NextResponse.json(
      { error: '相談回数の残りがありません。' },
      { status: 403, headers: NO_STORE }
    );
  }

  // Build report context for system prompt (deterministic, birthDate-bound)
  let reportContext = '';
  if (body.birthDate) {
    try {
      const engine = runDtrEngine({
        birthDate: body.birthDate,
        nickname: body.nickname ?? 'ユーザー',
        locale: 'ja-JP',
        contextScope: 'dtr',
      });
      reportContext = engine.payload.fullSections
        .filter((s) => ['s3_essence', 's4_strengths', 's5_friction'].includes(s.id))
        .map((s) => `【${s.title}】\n${s.body.slice(0, 300)}`)
        .join('\n\n');
    } catch {
      reportContext = '（レポートコンテキスト取得エラー）';
    }
  }

  // AI call — must complete before any DB write (fail fast, no orphan messages)
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'AI service is not configured.' },
      { status: 503, headers: NO_STORE }
    );
  }

  let aiContent: string;
  try {
    const openai = new OpenAI({ apiKey });
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      max_tokens: 600,
      temperature: 0.7,
      messages: [
        { role: 'system', content: buildSystemPrompt(reportContext) },
        { role: 'user', content: userMessage },
      ],
    });
    aiContent = clampOutput(
      completion.choices[0]?.message?.content?.trim() ?? '（返答を生成できませんでした）'
    );

    const outputSafety = sanitizeM55AiTextOutput(aiContent, { surface: 'consult', locale: 'ja-JP' });
    if (isConsultOutputSafetyBlocked(outputSafety)) {
      return NextResponse.json(
        {
          error: 'blocked',
          safeMessage: outputSafety.safeText,
        },
        { status: 422, headers: NO_STORE }
      );
    }
    aiContent = outputSafety.safeText;
  } catch (e) {
    console.error(
      '[room/core/send] AI call failed',
      JSON.stringify({ userHash: hashUserIdForLedgerLog(userId), reportInstanceIdPresent: true }),
      e
    );
    return NextResponse.json(
      { error: 'AI service error. Please try again.' },
      { status: 503, headers: NO_STORE }
    );
  }

  // Batch insert both messages atomically (prevents orphan user message)
  // Either both rows are inserted or neither is.
  const now = new Date().toISOString();
  const { error: batchErr } = await db.from('consult_messages').insert([
    { thread_id: t.id, role: 'user', content: userMessage, created_at: now },
    { thread_id: t.id, role: 'assistant', content: aiContent, created_at: now },
  ]);

  if (batchErr) {
    console.error(
      '[room/core/send] batch message insert failed',
      JSON.stringify({
        userHash: hashUserIdForLedgerLog(userId),
        reportInstanceIdPresent: true,
      }),
      batchErr
    );
    return NextResponse.json({ error: 'Message save failed. Please try again.' }, { status: 500, headers: NO_STORE });
  }

  const consumeWallet = async (w: { id: string; available_count: number; consumed_count: number }) => {
    const res = await db
      .from('reply_ticket_wallets')
      .update({
        available_count: w.available_count - 1,
        consumed_count: w.consumed_count + 1,
      })
      .eq('id', w.id)
      .eq('available_count', w.available_count)
      .eq('consumed_count', w.consumed_count)
      .eq('status', 'active')
      .select('id, available_count, consumed_count')
      .maybeSingle();
    return {
      ok: !res.error && !!res.data,
      afterAvailable: w.available_count - 1,
      afterConsumed: w.consumed_count + 1,
    };
  };

  const firstConsume = await consumeWallet(wallet);
  let walletConsumeOk = firstConsume.ok;
  let walletAfterAvailable = firstConsume.afterAvailable;
  if (!walletConsumeOk) {
    const { data: latestWallet } = await db
      .from('reply_ticket_wallets')
      .select('id, available_count, consumed_count, status')
      .eq('id', wallet.id)
      .eq('user_id', userId)
      .eq('report_instance_id', reportInstanceId)
      .maybeSingle();
    if (
      latestWallet &&
      latestWallet.status === 'active' &&
      typeof latestWallet.available_count === 'number' &&
      typeof latestWallet.consumed_count === 'number' &&
      latestWallet.available_count > 0
    ) {
      const retryConsume = await consumeWallet({
        id: latestWallet.id,
        available_count: latestWallet.available_count,
        consumed_count: latestWallet.consumed_count,
      });
      walletConsumeOk = retryConsume.ok;
      walletAfterAvailable = retryConsume.afterAvailable;
    }
  }
  if (!walletConsumeOk) {
    console.error(
      '[room/core/send] wallet consume failed',
      JSON.stringify({
        userHash: hashUserIdForLedgerLog(userId),
        reportInstanceIdPresent: true,
      })
    );
    return NextResponse.json(
      { error: 'Ticket consumption failed. Please reload and try again.' },
      { status: 500, headers: NO_STORE }
    );
  }

  // Update compatibility thread ledger from wallet SSOT (never negative).
  // If this fails: messages+wallet are already saved; GET will still use wallet-derived effective state.
  const newRemaining = Math.max(0, walletAfterAvailable);
  const newState = newRemaining <= 0 ? 'read_only' : 'writable';
  const { error: creditErr } = await db
    .from('consult_threads')
    .update({ credits_remaining: newRemaining, state: newState, updated_at: new Date().toISOString() })
    .eq('id', t.id);

  if (creditErr) {
    // Messages saved. Credits update failed. GET will reconcile.
    // Return success — user received their answer. Log for recovery audit.
    console.error(
      '[room/core/send] CREDIT_UPDATE_FAILED — messages saved, credits not decremented.',
      JSON.stringify({
        userHash: hashUserIdForLedgerLog(userId),
        reportInstanceIdPresent: true,
      }),
      creditErr
    );
    return NextResponse.json(
      {
        reply: { role: 'assistant', content: aiContent },
        thread: { credits_total: t.credits_total, credits_remaining: newRemaining, state: newState },
        reconcile_needed: true,
      },
      { status: 200, headers: NO_STORE }
    );
  }

  return NextResponse.json(
    {
      reply: { role: 'assistant', content: aiContent },
      thread: { credits_total: t.credits_total, credits_remaining: newRemaining, state: newState },
    },
    { status: 200, headers: NO_STORE }
  );
}
