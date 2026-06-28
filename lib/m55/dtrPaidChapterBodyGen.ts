/**
 * Generation interface + fake/deterministic provider for paid DTR chapter bodies.
 *
 * Interface contract:
 *   materialPack + seedBodies → GeneratedChapterBodiesOutput
 *
 * This gate: fake/deterministic provider only.
 * Real AI provider (OpenAI/Gemini) activation is a separate gate.
 * All real providers MUST respect the ChapterBodyProvider interface.
 */

import type { ChapterMaterialPack } from './dtrPaidChapterMaterialPack';
import type { GeneratedChapterBodiesInput } from './dtrPaidChapterBodyJudge';
import { judgePaidDtrChapterBodies } from './dtrPaidChapterBodyJudge';
import {
  createFakeChapterBodyRepairProvider,
  type ChapterBodyRepairProvider,
} from './dtrPaidChapterBodyRepair';
import type { PaidDtrGeneratedChapterBodies } from './dtrEngine';
import { checkNaturalness } from './dtrVisibleCopyNaturalness';
import {
  buildPaidDtrChapterBodyEvent,
  emitGenerationQualityEvent,
} from './generationQualityAnalytics';

// ── Types ──

export type GeneratedChapterBodiesOutput = GeneratedChapterBodiesInput;

export type ChapterBodyProvider = {
  /**
   * Generate individualized chapter bodies for s1–s4.
   * MUST incorporate DOB-v2 material from materialPack.
   * MUST NOT re-judge main trait / auxiliary tendency.
   * seedBodies are style baseline / constraint — NOT verbatim output.
   */
  generate(materialPack: ChapterMaterialPack): Promise<GeneratedChapterBodiesOutput>;
};

// ── Fake / deterministic provider ──

const SEASON_PHRASES: Readonly<Record<string, string>> = {
  winter: '冷えや静けさが深まる時期の生まれとして',
  spring: '春の立ち上がりを感じる時期の生まれとして',
  summer: '熱量が外へ向きやすい夏の時期の生まれとして',
  autumn: '見直しと整理に向きやすい秋の時期の生まれとして',
};

const PHASE_PHRASES: Readonly<Record<string, string>> = {
  early: '始めるときは小さく試しながら進む方向性があります',
  mid:   '続けることで流れを確かめながら整えていく動き方があります',
  late:  '区切りをつけてから次へ進むことで安定しやすくなります',
};

const CHAPTER_HINTS: Readonly<Record<string, string>> = {
  s1_identity:    '自分の核として意識することで、動き出しの方向が見えやすくなります。',
  s2_composition: '構成として見たとき、この配置を活かすことで流れが生まれます。',
  s3_essence:     '本質の安定のために、生活の節目を意識することが大切です。',
  s4_strengths:   '強みを活かすために、日々の場面でこのリズムを意識します。',
};

function buildFakeSectionBody(
  materialPack: ChapterMaterialPack,
  sectionId: string,
): string {
  const seasonPhrase = SEASON_PHRASES[materialPack.seasonGroup] ?? '生まれのリズムとして';
  const phasePhrase  = PHASE_PHRASES[materialPack.lunarPhase]   ?? '動き出すタイミングがあります';
  const seasonKw = materialPack.seasonJudgeKeywords[0] ?? '季節';
  const phaseKw  = materialPack.phaseJudgeKeywords[0]  ?? '始める';
  const hint = CHAPTER_HINTS[sectionId] ?? 'このリズムを日常に取り入れていきます。';

  // Build a body that:
  // - References DOB-v2 material (season + phase keywords present)
  // - Is NOT verbatim seed (completely different structure from STEM_SEED_BODIES)
  // - Meets minimum character count (>300 stripped)
  // - Contains no forbidden celestial-stem characters (甲乙丙丁戊己庚辛壬癸)
  return [
    `生年月日の細かなリズムから見ると、${seasonPhrase}、${phasePhrase}。`,
    ``,
    `${materialPack.publicTitle}の動き方において、${seasonKw}の影響が土台として現れやすくなります。`,
    ``,
    `日常の中で${phaseKw}場面を意識すると、本来の動き方が安定してきます。${hint}`,
    ``,
    `生活の節目ごとに、このリズムを活かす場面を持つことで、続けやすくなります。`,
    `このリズムを日常に取り入れることで、自分のペースを保ちながら前に進みやすくなります。`,
    `節目ごとに立ち止まって確かめることも、長く続けるための大切な習慣のひとつです。`,
    `【DOB-v2 generated / test-only】`,
  ].join('\n');
}

/**
 * Creates a fake, deterministic ChapterBodyProvider for local tests.
 * Does NOT call any real AI provider.
 *
 * The fake provider:
 * - Incorporates DOB-v2 season/phase material (passes Judge check)
 * - Produces text structurally different from seed (avoids template_verbatim)
 * - Respects M55 tone (no cold language, no internal labels)
 *
 * Accepts per-section overrides for testing Judge/Repair edge cases.
 */
export function createFakeChapterBodyProvider(overrides?: {
  s1_identity?: string;
  s2_composition?: string;
  s3_essence?: string;
  s4_strengths?: string;
}): ChapterBodyProvider {
  return {
    async generate(materialPack): Promise<GeneratedChapterBodiesOutput> {
      return {
        s1_identity:    overrides?.s1_identity    ?? buildFakeSectionBody(materialPack, 's1_identity'),
        s2_composition: overrides?.s2_composition ?? buildFakeSectionBody(materialPack, 's2_composition'),
        s3_essence:     overrides?.s3_essence     ?? buildFakeSectionBody(materialPack, 's3_essence'),
        s4_strengths:   overrides?.s4_strengths   ?? buildFakeSectionBody(materialPack, 's4_strengths'),
      };
    },
  };
}

// ── Full pipeline (generation → judge → repair → re-judge) ──
// Orchestrates the complete quality gate for tests.
// Production async integration is a separate gate.

export type ChapterBodyGenPipelineResult =
  | { ok: true; bodies: PaidDtrGeneratedChapterBodies; judgeVerdicts: string[] }
  | { ok: false; reason: 'judge_fail' | 'repair_rejudge_fail' | 'generation_error'; detail: string };

/**
 * Run the full chapter body generation pipeline (generate → judge → repair? → re-judge).
 * Fail-closed: only returns ok:true if final judge is PASS.
 *
 * Used in tests with fake providers. Production integration is a separate gate.
 */
export async function runChapterBodyGenPipeline(
  materialPack: ChapterMaterialPack,
  provider: ChapterBodyProvider,
  repairProvider?: ChapterBodyRepairProvider,
): Promise<ChapterBodyGenPipelineResult> {
  // 1. Generate
  let generated: GeneratedChapterBodiesOutput;
  try {
    generated = await provider.generate(materialPack);
  } catch (e) {
    return { ok: false, reason: 'generation_error', detail: String(e) };
  }

  // 2. Judge
  const judgeResult = judgePaidDtrChapterBodies(generated, materialPack);
  if (judgeResult.verdict === 'PASS') {
    // Analytics: emit per-section quality metrics (fire-and-forget; does not block)
    for (const section of judgeResult.sections) {
      const sectionBody = (generated as Record<string, string>)[section.sectionId] ?? '';
      emitGenerationQualityEvent(buildPaidDtrChapterBodyEvent(
        sectionBody,
        checkNaturalness(sectionBody),
        judgeResult,
        {
          provider_id: 'fake_deterministic',
          stem_lane_index: materialPack.stemLaneIndex,
          chapter_id: section.sectionId,
          dob_v2_flags: {
            season_group: materialPack.seasonGroup ?? null,
            lunar_phase_bucket: materialPack.lunarPhase ?? null,
            birth_time_unknown: materialPack.birthTimeUnknown ?? false,
          },
          final_status: 'accepted',
        },
      ));
    }
    return {
      ok: true,
      bodies: generated,
      judgeVerdicts: judgeResult.sections.map((s) => `${s.sectionId}:PASS`),
    };
  }

  if (judgeResult.verdict === 'FAIL') {
    // Analytics: emit failure metrics per section
    for (const section of judgeResult.sections.filter((s) => s.verdict === 'FAIL')) {
      const sectionBody = (generated as Record<string, string>)[section.sectionId] ?? '';
      emitGenerationQualityEvent(buildPaidDtrChapterBodyEvent(
        sectionBody,
        checkNaturalness(sectionBody),
        judgeResult,
        {
          provider_id: 'fake_deterministic',
          stem_lane_index: materialPack.stemLaneIndex,
          chapter_id: section.sectionId,
          dob_v2_flags: {
            season_group: materialPack.seasonGroup ?? null,
            lunar_phase_bucket: materialPack.lunarPhase ?? null,
            birth_time_unknown: materialPack.birthTimeUnknown ?? false,
          },
          final_status: 'rejected',
        },
      ));
    }
    return {
      ok: false,
      reason: 'judge_fail',
      detail: judgeResult.sections
        .filter((s) => s.verdict === 'FAIL')
        .map((s) => `${s.sectionId}: ${s.failedChecks.map((c) => c.check).join(', ')}`)
        .join(' | '),
    };
  }

  // 3. MINOR_FIX — attempt one-pass repair if provider is available
  const repairer = repairProvider ?? createFakeChapterBodyRepairProvider();
  const repairedBodies: GeneratedChapterBodiesOutput = { ...generated };

  for (const section of judgeResult.sections) {
    if (section.verdict === 'MINOR_FIX') {
      const repaired = await repairer.repair({
        sectionId: section.sectionId,
        body: (generated as Record<string, string>)[section.sectionId] ?? '',
        materialPack,
        failedChecks: section.failedChecks.map((c) => c.check),
      });
      if (repaired.changed) {
        (repairedBodies as Record<string, string>)[section.sectionId] = repaired.body;
      }
    }
  }

  // 4. Re-judge
  const reJudgeResult = judgePaidDtrChapterBodies(repairedBodies, materialPack);
  if (reJudgeResult.verdict === 'PASS') {
    // Analytics: emit post-repair success metrics
    for (const section of reJudgeResult.sections) {
      const sectionBody = (repairedBodies as Record<string, string>)[section.sectionId] ?? '';
      emitGenerationQualityEvent(buildPaidDtrChapterBodyEvent(
        sectionBody,
        checkNaturalness(sectionBody),
        reJudgeResult,
        {
          provider_id: 'fake_deterministic',
          stem_lane_index: materialPack.stemLaneIndex,
          chapter_id: section.sectionId,
          dob_v2_flags: {
            season_group: materialPack.seasonGroup ?? null,
            lunar_phase_bucket: materialPack.lunarPhase ?? null,
            birth_time_unknown: materialPack.birthTimeUnknown ?? false,
          },
          repair_attempted: true,
          repair_count: 1,
          final_status: 'accepted',
        },
      ));
    }
    return {
      ok: true,
      bodies: repairedBodies,
      judgeVerdicts: reJudgeResult.sections.map((s) => `${s.sectionId}:PASS`),
    };
  }

  // Repair did not resolve all issues — fail-closed
  // Analytics: emit repair failure
  for (const section of reJudgeResult.sections.filter((s) => s.verdict !== 'PASS')) {
    const sectionBody = (repairedBodies as Record<string, string>)[section.sectionId] ?? '';
    emitGenerationQualityEvent(buildPaidDtrChapterBodyEvent(
      sectionBody,
      checkNaturalness(sectionBody),
      reJudgeResult,
      {
        provider_id: 'fake_deterministic',
        stem_lane_index: materialPack.stemLaneIndex,
        chapter_id: section.sectionId,
        dob_v2_flags: {
          season_group: materialPack.seasonGroup ?? null,
          lunar_phase_bucket: materialPack.lunarPhase ?? null,
          birth_time_unknown: materialPack.birthTimeUnknown ?? false,
        },
        repair_attempted: true,
        repair_count: 1,
        final_status: 'failed_guardrail',
      },
    ));
  }
  return {
    ok: false,
    reason: 'repair_rejudge_fail',
    detail: reJudgeResult.sections
      .filter((s) => s.verdict !== 'PASS')
      .map((s) => `${s.sectionId}: ${s.failedChecks.map((c) => c.check).join(', ')}`)
      .join(' | '),
  };
}
