/**
 * Preview-only isolated Hybrid AI probe.
 *
 * Purpose: Verify the Hybrid AI output contract against a real OpenAI provider
 *          without DB writes, checkout, or purchase.
 *
 * Security:
 * - Returns 404 unless VERCEL_ENV === 'preview'.
 * - POST only; GET/HEAD → 404.
 * - Raw prompt, response, chapter bodies, and API key are never returned.
 * - Summary-only output for gate verification.
 *
 * Gate: CATEGORY-2-M55-HYBRID-AI-PREVIEW-ISOLATED-REAL-CALL-FAST-REV1
 * Branch: preview/hybrid-ai-activation-check
 */
import { NextRequest, NextResponse } from "next/server";
import { buildV2FulfillmentSnapshotFromFields } from "@/lib/m55/compositeStem/buildV2FulfillmentSnapshot";
import { composePaidIndividualizationFromEngineContext } from "@/lib/m55/dtrPaidIndividualizationCompose";
import { DOB_PERSONALIZATION_V21_CATALOG_VERSION } from "@/lib/m55/dtrDobPersonalizationV2";
import {
  buildFulfillmentSnapshotGenerationResolution,
  resolveRealDtrHybridAiProvider,
} from "@/lib/m55/dtrFulfillmentSnapshotGenerationHook";
import { PROHIBITED_META_KEYS } from "@/lib/m55/dtrSnapshotGenerationMeta";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ── Phrase check patterns (mirrors dtrHybridAiQualityValidator constants) ─────

const FORBIDDEN_PHRASES_CHECK: readonly string[] = [
  'このタイプ', 'こういう人は', 'タイプの人', 'そういう人は',
  '読み取りです', '正午基準', '補正した読み取り',
  '観測', '外部化', '感受の解像度', '微細な信号', '観測所型',
  'miさん', '分析結果', '判定します',
];

const FORBIDDEN_INTERNAL_PATTERNS: readonly RegExp[] = [
  /[甲乙丙丁戊己庚辛壬癸]/,
  /\b(xiaohan|dahan|lichun|yushui|jingzhe|chunfen|qingming|guyu)\b/,
  /\b(lixia|xiaoman|mangzhong|xiazhi|xiaoshu|dashu)\b/,
  /\b(liqiu|chushu|bailu|qiufen|hanlu|shuangjiang)\b/,
  /\b(lidong|xiaoxue|daxue|dongzhi)\b/,
  /stemLane|stemIdx|lunarDay|solarTerm|lunarMonth/,
];

const BIRTH_TIME_PATTERNS: readonly RegExp[] = [
  /出生時刻/, /生まれた時刻/, /誕生時刻/, /誕生時間/, /出生時間/,
  /\d{1,2}時\d{1,2}分/,
  /午前\d/, /午後\d/,
  /子の刻|丑の刻|寅の刻|卯の刻|辰の刻|巳の刻|午の刻|未の刻|申の刻|酉の刻|戌の刻|亥の刻/,
];

function countNonWhitespaceChars(text: string): number {
  return [...text.replace(/\s/g, '')].length;
}

function sanitizeErrorMessage(msg: string): string {
  if (/sk-|api.?key/i.test(msg)) return 'error_redacted_contains_secret';
  return msg.slice(0, 300);
}

// ── Route handlers ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  if (process.env.VERCEL_ENV !== 'preview') {
    return new NextResponse(null, { status: 404, headers: { 'Cache-Control': 'no-store' } });
  }

  let body: { birthDate?: unknown; timezone?: unknown; country?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 });
  }

  const birthDate = typeof body.birthDate === 'string' ? body.birthDate.trim() : null;
  if (!birthDate || !/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) {
    return NextResponse.json({ ok: false, error: 'invalid_birth_date' }, { status: 400 });
  }

  const timezone = typeof body.timezone === 'string' ? body.timezone : 'Asia/Tokyo';
  const country = typeof body.country === 'string' ? body.country : 'JP';

  try {
    const built = buildV2FulfillmentSnapshotFromFields(
      {
        nickname: 'probe',
        birthDate,
        birthTime: null,
        birthTimeUnknown: true,
        country,
        birthplace: null,
        timezone,
      },
      { dobPersonalizationV2Enabled: true },
    );

    const engineCtx = {
      ...built.engine_context_json,
      dobPersonalizationCatalogVersion: DOB_PERSONALIZATION_V21_CATALOG_VERSION,
    };

    const fallbackInd = composePaidIndividualizationFromEngineContext(engineCtx);
    const provider = resolveRealDtrHybridAiProvider();

    const resolution = await buildFulfillmentSnapshotGenerationResolution({
      engineContextJson: engineCtx,
      fallbackInd,
      provider,
    });

    const payload = resolution.generationDbPayload;
    const bodies = resolution.generatedChapterBodies;

    const sectionLengths = {
      s1: bodies?.s1_identity != null ? countNonWhitespaceChars(bodies.s1_identity) : 0,
      s2: bodies?.s2_composition != null ? countNonWhitespaceChars(bodies.s2_composition) : 0,
      s3: bodies?.s3_essence != null ? countNonWhitespaceChars(bodies.s3_essence) : 0,
      s4: bodies?.s4_strengths != null ? countNonWhitespaceChars(bodies.s4_strengths) : 0,
    };

    const allChapterText = [
      bodies?.s1_identity ?? '',
      bodies?.s2_composition ?? '',
      bodies?.s3_essence ?? '',
      bodies?.s4_strengths ?? '',
    ].join('\n');

    const forbiddenPhrasePresent =
      FORBIDDEN_PHRASES_CHECK.some((p) => allChapterText.includes(p)) ||
      FORBIDDEN_INTERNAL_PATTERNS.some((p) => p.test(allChapterText));

    const birthTimePhrasePresent = BIRTH_TIME_PATTERNS.some((p) => p.test(allChapterText));

    const metaKeys = Object.keys(payload?.generation_meta_json ?? {});
    const metaProhibitedKeysPresent = metaKeys.some((k) => PROHIBITED_META_KEYS.has(k));

    return NextResponse.json(
      {
        ok: true,
        birthDate,
        generation_mode: payload?.generation_mode ?? 'none',
        quality_passed: payload?.quality_passed ?? false,
        provider_kind: payload?.generation_meta_json?.providerKind ?? null,
        prompt_version: payload?.generation_meta_json?.promptVersion ?? null,
        quality_validator_version: payload?.generation_meta_json?.qualityValidatorVersion ?? null,
        fallback_reason_code: payload?.generation_meta_json?.fallbackReasonCode ?? null,
        quality_failure_codes: payload?.generation_meta_json?.qualityFailureCodes ?? null,
        elapsed_ms: payload?.generation_meta_json?.elapsedMs ?? null,
        section_lengths: sectionLengths,
        forbidden_phrase_present: forbiddenPhrasePresent,
        birth_time_phrase_present: birthTimePhrasePresent,
        metadata_prohibited_keys_present: metaProhibitedKeysPresent,
        db_write: false,
        schema_version: payload?.generation_meta_json?.schemaVersion ?? null,
      },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (err: unknown) {
    const rawMsg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { ok: false, error: sanitizeErrorMessage(rawMsg) },
      { status: 500 },
    );
  }
}

export async function GET() {
  return new NextResponse(null, { status: 404, headers: { 'Cache-Control': 'no-store' } });
}

export async function HEAD() {
  return new NextResponse(null, { status: 404, headers: { 'Cache-Control': 'no-store' } });
}
