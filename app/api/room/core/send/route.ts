/**
 * POST /api/room/core/send
 * Sends a user message, calls AI, consumes one credit via m55_consult_reply_commit RPC.
 *
 * Rules (M55_AI_CONSULT_SAFETY_AND_LIMITS_SSOT_v1 + M55_REPORT_CONCIERGE_ROOM_SSOT_v1):
 * - Ownership gate: fail-closed
 * - Input: theme required; free body optional; hard max=500 chars (theme included)
 * - Output target 1,200-1,800 JA chars (SSOT §7.2); server hard cap 2,400; no mid-cut save
 * - Ticket only consumed when RPC succeeds (messages + wallet + ledger atomic)
 * - High-risk patterns: block send, do not consume ticket
 * - When credits_remaining reaches 0: thread → read_only
 * - No generic public chat; AI is scoped to the owned report
 *
 * Contract-C (2026-05-23):
 * - X-Idempotency-Key required
 * - No pre-RPC message insert · no direct wallet UPDATE
 * - AI success → db.rpc('m55_consult_reply_commit') only
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import OpenAI from 'openai';
import { getSupabaseAdmin } from '../../../../../lib/supabaseAdmin';
import { buildConsultReportContextFromEnvelope } from '../../../../../lib/m55/consult/consultReportContext';
import { resolveDisplayedDtrEnvelope } from '../../../../../lib/m55/compositeStem/resolveDisplayedDtrEnvelope';
import { getVisibleDtrReportSnapshotByInstanceId } from '../../../../../lib/m55/dtrDraftDb';
import { resolveEntryReportOwnership } from '../../../../../lib/m55/dtrOwnershipGate';
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
import { applyM55ConsultReplyQualityPasses } from '../../../../../lib/m55/ai/m55ConsultReplyQualitySanitizer';
import {
  buildConsultUserAnchors,
  parseConsultUserMessage,
  validateConsultSendInput,
} from '../../../../../lib/m55/consult/consultSendMessage';
import {
  CONSULT_REPLY_GENERATION,
  CONSULT_REPLY_GENERATION_INCOMPLETE_USER_MESSAGE_JA,
  CONSULT_REPLY_PROMPT_COMPLETION_REQUIREMENTS_JA,
  countConsultReplyBlocks,
  normalizeConsultReplyParagraphBreaks,
  validateConsultReplyCompleteness,
} from '../../../../../lib/m55/consult/consultReplyGenerationContract';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const REPORT_KEY = 'm55_p:core_origin';
const NO_STORE = { 'Cache-Control': 'private, no-store, max-age=0' };

type RpcCommitResult = {
  ok: boolean;
  mode?: string;
  consumption_applied?: boolean;
  wallet_before?: number;
  wallet_after?: number;
  thread_state?: string;
  thread_credits_remaining?: number;
  thread_credits_total?: number;
  assistant_content?: string;
  error_code?: string;
  message?: string;
};

function parseRpcResult(raw: unknown): RpcCommitResult | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  if (typeof o.ok !== 'boolean') return null;
  const out: RpcCommitResult = { ok: o.ok };
  if (typeof o.mode === 'string') out.mode = o.mode;
  if (typeof o.consumption_applied === 'boolean') out.consumption_applied = o.consumption_applied;
  if (typeof o.wallet_before === 'number') out.wallet_before = o.wallet_before;
  if (typeof o.wallet_after === 'number') out.wallet_after = o.wallet_after;
  if (typeof o.thread_state === 'string') out.thread_state = o.thread_state;
  if (typeof o.thread_credits_remaining === 'number') {
    out.thread_credits_remaining = o.thread_credits_remaining;
  }
  if (typeof o.thread_credits_total === 'number') out.thread_credits_total = o.thread_credits_total;
  if (typeof o.assistant_content === 'string') out.assistant_content = o.assistant_content;
  if (typeof o.error_code === 'string') out.error_code = o.error_code;
  if (typeof o.message === 'string') out.message = o.message;
  return out;
}

function mapRpcErrorToResponse(rpc: RpcCommitResult): NextResponse {
  const code = rpc.error_code ?? 'INTERNAL';
  const msg = rpc.message ?? 'Commit failed. Please try again.';
  switch (code) {
    case 'INVALID_ARGUMENT':
      return NextResponse.json({ error: msg }, { status: 422, headers: NO_STORE });
    case 'IDEMPOTENCY_CONFLICT':
    case 'COMMIT_IN_PROGRESS':
    case 'FORBIDDEN_NULL_SCOPE':
      return NextResponse.json({ error: msg }, { status: 409, headers: NO_STORE });
    case 'THREAD_NOT_FOUND':
      return NextResponse.json({ error: msg }, { status: 404, headers: NO_STORE });
    case 'WALLET_NOT_FOUND':
    case 'WALLET_NOT_ACTIVE':
    case 'WALLET_NO_BALANCE':
      return NextResponse.json({ error: msg }, { status: 403, headers: NO_STORE });
    default:
      return NextResponse.json({ error: msg }, { status: 500, headers: NO_STORE });
  }
}

/** Lane A consult reply grounding (prompt-only; context from purchased snapshot envelope). */
const CONSULT_PROMPT_GROUNDING_JA = `【相談返書の商品境界】
- これは汎用のAIチャットではない。購入済み保存版レポートに紐づく「相談返書」として、上記に提供された抜粋の範囲で1テーマを整理する。
- 無制限の相談や、なんでも答えるボットではない。1回の回答は相談返書1件分の整理に留める。
- 上記抜粋にない事柄を、新しい鑑定・相性・未来・吉凶として断定で付け足さない。
- 医療の診断・治療、法律の勝敗・手続、投資・金融の推奨、転職・進路の可否判断の代替は行わない。
- 占い・予言・成功保証・「必ず」「絶対」による結果断定は行わない。
- 「誰にでも起こりうる」「一般的には」「他者と比較せず」だけで埋めない。相談文と抜粋の具体に戻す。

【反同調（感情は受け止め、裁判はしない）】
- ユーザーの感情や疲れは認める。ただし「あなたは悪くない」「あなたは正しい」「相手が悪い」と結論づけない。
- 正しさの判定・裁判・どちらが正しいかの決着はしない。ユーザーの自己正当化だけをきれいに補強する返答にしない。
- 対人の違和感・対立・関係で無理が出やすい場面がテーマのときは、相手側または状況側から見える可能性を1つ、非攻撃的に置く（悪い／悪くないの結論にはしない）。
- 別れろ・辞めろ・絶対に距離を置け等の絶対助言はしない。通知やメールで結果を届ける約束もしない。
- ユーザーの判断を奪わない。正解を押しつけず、考える材料を渡す。
- 長い共感だけで始めない。「受け止めます」「自然なことです」だけで冒頭を終えない。
- 「自分が悪い／相手が悪い」の二択に急がない。相手に確認する前に、言葉・距離・タイミングへ分ける。

【保存版への接地】
- 主章は抜粋の章タイトルを1つ名指しする。補助章は最大1つまで。それ以上の章を並べない。
- 抜粋の傾向語を2〜4個、そのまま本文に戻す（新ラベル・別名化・資質の作り替えはしない）。
- 相談文の具体語（人・場面・迷いの言葉）を各段落に最低1回は戻す。
- 購入時点の保存版の読み直しであり、新しい診断・鑑定ではない。
- 一般論・自己啓発・比較・カフェや外出など相談と無関係な例は入れない。

【返書の出力形式 — 必須（画面表示と一致）】
- 必ず5段落に分ける（最低4段落）。段落間は空行1つ（改行2つ）だけにする。見出し・番号・箇条書き記号は付けない。
- Ⅰ「自分の形を知る」（保存版の輪郭章）は独立テーマではないが、全返書の土台として2ブロック目以降で参照してよい。
- 1ブロック目＝今の場面の整理：相談文から論点を3〜5個拾い、どこで無理が出やすいか・どこで疲れが出やすいか・どこから小さく整えられるかを示す。今回扱う範囲と扱わない範囲を1文ずつ入れる。
- 2ブロック目＝保存版から見ると：主章1つ（補助章は最大1つ）を名指しし、傾向語2〜4個をそのまま使って相談と接続する。
- 3ブロック目＝少しほどく見方：反対視点または現実的制約を1つ（非断罪）。責任を決める前に言葉・伝わり方・距離など2〜3点に分ける。
- 4ブロック目＝見直すときの目印：言葉・距離・タイミング・疲れ・期待のずれのうち、関係するものだけを短く整理する。
- 5ブロック目＝今日の一手：必ず「今日やることは1つだけです。」で始め、相談の具体に紐づく行動を1つだけ書く。例（仕事テーマ）：今進めている仕事について、相手が10秒で返せる確認を1つ送る。全部説明せず、途中で一度だけ方向を見てもらう。返事がない時間を、自分への否定として扱わない。話し合い・相手確認・関係修復を最初の一手にしない。保存版の読み返しCTAはUIに任せ、今日の一手の本文に「保存版を読み返す」を入れない。
- 同じ言い回し（短いやりとり・反応を見る・整える・見直す）を複数ブロックで繰り返さない。各ブロックは1つの役割だけを担う：1段落目＝今どこがしんどいか、2段落目＝保存版のどことつながるか、3段落目＝別の見方はないか、4段落目＝どのサインが出たら小さく区切るか、5段落目＝今日の1つの行動。

${CONSULT_REPLY_PROMPT_COMPLETION_REQUIREMENTS_JA}

【資質名・表現】
- レポートに現れる資質名（例：プロデューサー等）は改名・別名化・新ラベルへの作り替えをしない。
- 性別に基づく性格・相性・適性の断定はしない。

【文体 — M55の日常語】
- 保存版を読み返すような、生活感のある落ち着いた日本語で書く。
- 負荷・消耗・ストレス・不安・自己否定・要因・フィードバックループ・コミュニケーション・再構築・軽減・有効・リフレッシュ等の冷たい語やセルフヘルプ定型句は避ける。
- 「ここが論点になりやすいです」「重要です」「大切です」を繰り返さない。
- 周囲とのコミュニケーションを増やす、リフレッシュの時間を設定する、自分自身を労わる等の汎用アドバイスは入れない。
- 同じ言い回しを段落ごとに繰り返さない。`;

/** Build report-scoped system prompt (no generic chat). */
function buildSystemPrompt(reportSections: string, userMessage: string): string {
  const safetyPrefix = buildM55AiSafetySystemInstruction('consult');
  const parsed = parseConsultUserMessage(userMessage);
  const userAnchors = buildConsultUserAnchors(parsed);
  const anchorsBlock = userAnchors ? `\n${userAnchors}\n` : '';

  return `${safetyPrefix}

あなたはM55のEntry Reportに付帯する相談AIです。
このユーザーの取り扱い説明書の要点は以下のとおりです：

${reportSections}
${anchorsBlock}
${CONSULT_PROMPT_GROUNDING_JA}

あなたの役割：
- このレポートの内容に関するユーザーの質問・疑問を穏やかに整理・補足すること
- レポートにない事柄を、断定調で付け足したり、未来や吉凶を示唆する形で述べないこと
- 医療・法律・投資等の専門的助言は行わないこと
- 危機的・自傷的な内容を検知した場合は相談窓口等の安全な案内のみ行うこと

回答は1,200〜1,800日本語文字を目標とし、2,200文字を超えないこと。
必ず5段落（最低4段落）・段落間は空行1つ（改行2つ）のみ・最終文は「。」で終えること。${CONSULT_REPLY_GENERATION.minimumAcceptableJa}文字未満は保存されない。保存版を読み返すような日常語で、冷たいビジネス語やセルフヘルプ定型句を避けて書くこと。`;
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: NO_STORE });
  }

  const idempotencyKey = req.headers.get('x-idempotency-key')?.trim() ?? '';
  if (!idempotencyKey || idempotencyKey.length < 8 || idempotencyKey.length > 128) {
    return NextResponse.json(
      { error: 'X-Idempotency-Key is required (8-128 characters).' },
      { status: 400, headers: NO_STORE }
    );
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

  const inputValidation = validateConsultSendInput(userMessage);
  if (!inputValidation.ok) {
    return NextResponse.json(
      { error: inputValidation.error },
      { status: inputValidation.status, headers: NO_STORE },
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

  // Pre-RPC read-only wallet check (fast 403 before LLM cost — no mutation)
  const { data: walletRaw, error: walletErr } = await db
    .from('reply_ticket_wallets')
    .select('status, available_count')
    .eq('user_id', userId)
    .eq('report_instance_id', reportInstanceId)
    .maybeSingle();

  if (walletErr || !walletRaw) {
    return NextResponse.json(
      { error: 'Reply wallet not found. Reload and try again.' },
      { status: 409, headers: NO_STORE }
    );
  }

  const wallet = walletRaw as { status: string; available_count: number };
  if (wallet.status !== 'active' || wallet.available_count <= 0) {
    return NextResponse.json(
      { error: '相談回数の残りがありません。' },
      { status: 403, headers: NO_STORE }
    );
  }

  // Build report context from purchased snapshot envelope (read-only; fail-closed before LLM)
  const snapRow = await getVisibleDtrReportSnapshotByInstanceId(userId, reportInstanceId);
  if (!snapRow) {
    return NextResponse.json(
      { error: 'Report context missing. Reload and try again.' },
      { status: 409, headers: NO_STORE }
    );
  }

  const displayedRead = resolveDisplayedDtrEnvelope(snapRow);
  if (!displayedRead.ok) {
    return NextResponse.json(
      { error: 'Report context missing. Reload and try again.' },
      { status: 409, headers: NO_STORE },
    );
  }

  const reportContext = buildConsultReportContextFromEnvelope(displayedRead.envelope, {
    redactNickname: typeof body.nickname === 'string' ? body.nickname.trim() : '',
  });
  if (!reportContext) {
    return NextResponse.json(
      { error: 'Report context missing. Reload and try again.' },
      { status: 409, headers: NO_STORE }
    );
  }

  // AI call — must complete before RPC (fail fast, no DB mutation)
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
      max_tokens: CONSULT_REPLY_GENERATION.openAiMaxTokens,
      temperature: 0.55,
      messages: [
        { role: 'system', content: buildSystemPrompt(reportContext, userMessage) },
        { role: 'user', content: userMessage },
      ],
    });
    aiContent = completion.choices[0]?.message?.content?.trim() ?? '';

    if (!aiContent) {
      console.error(
        '[room/core/send] AI returned empty content',
        JSON.stringify({ userHash: hashUserIdForLedgerLog(userId), reportInstanceIdPresent: true })
      );
      return NextResponse.json(
        { error: CONSULT_REPLY_GENERATION_INCOMPLETE_USER_MESSAGE_JA },
        { status: 503, headers: NO_STORE }
      );
    }

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
    const qualityResult = applyM55ConsultReplyQualityPasses(aiContent);
    aiContent = qualityResult.text;

    aiContent = normalizeConsultReplyParagraphBreaks(aiContent);
    const completeness = validateConsultReplyCompleteness(aiContent);
    if (!completeness.ok) {
      console.error(
        '[room/core/send] consult reply completeness failed',
        JSON.stringify({
          userHash: hashUserIdForLedgerLog(userId),
          reportInstanceIdPresent: true,
          reason: completeness.reason,
          length: aiContent.length,
          blockCount: countConsultReplyBlocks(aiContent),
          isThemeOnly: inputValidation.parsed.isThemeOnly,
        })
      );
      return NextResponse.json(
        { error: CONSULT_REPLY_GENERATION_INCOMPLETE_USER_MESSAGE_JA },
        { status: 503, headers: NO_STORE }
      );
    }
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

  const { data: rpcRaw, error: rpcErr } = await db.rpc('m55_consult_reply_commit', {
    p_user_id: userId,
    p_report_instance_id: reportInstanceId,
    p_consult_thread_id: t.id,
    p_idempotency_key: idempotencyKey,
    p_user_message: userMessage,
    p_assistant_message: aiContent,
    p_message_created_at: new Date().toISOString(),
  });

  if (rpcErr) {
    console.error(
      '[room/core/send] m55_consult_reply_commit RPC error',
      JSON.stringify({
        userHash: hashUserIdForLedgerLog(userId),
        reportInstanceIdPresent: true,
      }),
      rpcErr
    );
    return NextResponse.json(
      { error: 'Ticket consumption failed. Please reload and try again.' },
      { status: 500, headers: NO_STORE }
    );
  }

  const rpc = parseRpcResult(rpcRaw);
  if (!rpc) {
    return NextResponse.json(
      { error: 'Invalid commit response. Please reload and try again.' },
      { status: 500, headers: NO_STORE }
    );
  }

  if (!rpc.ok) {
    return mapRpcErrorToResponse(rpc);
  }

  const assistantContent = rpc.assistant_content ?? aiContent;
  const threadCreditsTotal =
    typeof rpc.thread_credits_total === 'number' ? rpc.thread_credits_total : t.credits_total;
  const threadCreditsRemaining =
    typeof rpc.thread_credits_remaining === 'number'
      ? rpc.thread_credits_remaining
      : Math.max(0, (rpc.wallet_after ?? wallet.available_count - 1));
  const threadState =
    rpc.thread_state === 'read_only' || rpc.thread_state === 'writable'
      ? rpc.thread_state
      : threadCreditsRemaining <= 0
        ? 'read_only'
        : 'writable';

  return NextResponse.json(
    {
      reply: { role: 'assistant', content: assistantContent },
      thread: {
        credits_total: threadCreditsTotal,
        credits_remaining: threadCreditsRemaining,
        state: threadState,
      },
      mode: rpc.mode ?? 'consumed',
      consumption_applied: rpc.consumption_applied ?? true,
    },
    { status: 200, headers: NO_STORE }
  );
}
