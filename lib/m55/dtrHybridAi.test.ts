/**
 * Hybrid AI snapshot generation tests.
 *
 * All tests use mock providers — no real AI provider is called.
 * Covers orchestration, quality validator, prompt builder, and fallback behaviour.
 *
 * No DB, no network, no production POST.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { resetCalendarBundleCacheForTests } from './calendar/loadCalendarBundle';
import { buildV2FulfillmentSnapshotFromFields } from './compositeStem/buildV2FulfillmentSnapshot';
import { composePaidIndividualizationFromEngineContext } from './dtrPaidIndividualizationCompose';
import { DOB_PERSONALIZATION_V21_CATALOG_VERSION } from './dtrDobPersonalizationV2';
import { buildPaidDtrChapterMaterialPack } from './dtrPaidChapterMaterialPack';
import { buildHybridAiPromptPayload, HYBRID_AI_PROMPT_VERSION } from './dtrHybridAiPrompt';
import { validateHybridAiOutput } from './dtrHybridAiQualityValidator';
import {
  runHybridAiSnapshotGeneration,
  buildDeterministicSnapshotCandidate,
  HYBRID_AI_QUALITY_VERSION,
} from './dtrHybridAiSnapshotGeneration';
import {
  buildDtrSnapshotGenerationDbPayload,
  PROHIBITED_META_KEYS,
} from './dtrSnapshotGenerationMeta';
import {
  createMockHybridAiProvider,
  createThrowingMockProvider,
  createForbiddenPhraseMockProvider,
  createTooShortMockProvider,
  createMalformedMockProvider,
} from './dtrHybridAiProvider';

// ── Fixture helpers ───────────────────────────────────────────────────────────

function buildTestContext(birthDate = '1985-06-15') {
  resetCalendarBundleCacheForTests();
  const built = buildV2FulfillmentSnapshotFromFields({
    nickname: 'test',
    birthDate,
    birthTime: '12:00:00',
    birthTimeUnknown: false,
    country: 'JP',
    birthplace: null,
    timezone: 'Asia/Tokyo',
  }, { dobPersonalizationV2Enabled: true });
  // Use v2.1 catalog to build materialPack/prompt (as future Commit B would)
  const ctxV21 = {
    ...built.engine_context_json,
    dobPersonalizationCatalogVersion: DOB_PERSONALIZATION_V21_CATALOG_VERSION,
  };
  const ind = composePaidIndividualizationFromEngineContext(ctxV21);
  return { ctx: ctxV21, ind, materialPack: buildPaidDtrChapterMaterialPack(ctxV21, ind) };
}

// ── Orchestration tests ───────────────────────────────────────────────────────

describe('Hybrid AI snapshot generation — orchestration', () => {
  it('mock provider success + validator pass → hybrid_ai candidate accepted', async () => {
    const { ctx, ind } = buildTestContext();
    const provider = createMockHybridAiProvider();
    const result = await runHybridAiSnapshotGeneration(ctx, ind, provider);
    assert.equal(result.ok, true);
    assert.equal(result.mode, 'hybrid_ai');
    assert.equal(result.meta.generationMode, 'hybrid_ai');
    assert.equal(result.meta.qualityPassed, true);
    assert.ok(result.ok && result.sections.s1_identity.length > 30);
    assert.ok(result.ok && result.sections.s3_essence.length > 30);
  });

  it('provider throws → fallback returned with ok=false', async () => {
    const { ctx, ind } = buildTestContext();
    const provider = createThrowingMockProvider();
    const result = await runHybridAiSnapshotGeneration(ctx, ind, provider);
    assert.equal(result.ok, false);
    assert.equal(result.mode, 'hybrid_ai_fallback');
    assert.equal(result.meta.qualityPassed, false);
    assert.match(result.failReason, /provider_throw/);
    // fallback ind must be the original deterministic individualization
    assert.ok(!result.ok && result.fallbackInd.fingerprint.length > 0);
  });

  it('provider returns forbidden phrase → quality fails → fallback', async () => {
    const { ctx, ind } = buildTestContext();
    const provider = createForbiddenPhraseMockProvider('このタイプの人は必ず成功します');
    const result = await runHybridAiSnapshotGeneration(ctx, ind, provider);
    assert.equal(result.ok, false);
    assert.equal(result.mode, 'hybrid_ai_fallback');
    assert.match(result.failReason, /quality_fail/);
    assert.ok(!result.ok && result.qualityResult !== undefined);
    assert.ok(!result.ok && result.qualityResult!.overallFailCodes.includes('forbidden_phrase'));
  });

  it('provider returns too-short output → quality fails → fallback', async () => {
    const { ctx, ind } = buildTestContext();
    const provider = createTooShortMockProvider();
    const result = await runHybridAiSnapshotGeneration(ctx, ind, provider);
    assert.equal(result.ok, false);
    assert.match(result.failReason, /quality_fail/);
    assert.ok(!result.ok && result.qualityResult!.overallFailCodes.includes('section_too_short'));
  });

  it('provider returns malformed output (empty strings) → quality fails → fallback', async () => {
    const { ctx, ind } = buildTestContext();
    const provider = createMalformedMockProvider();
    const result = await runHybridAiSnapshotGeneration(ctx, ind, provider);
    assert.equal(result.ok, false);
    assert.ok(!result.ok && result.qualityResult!.overallFailCodes.includes('section_empty'));
  });

  it('deterministic snapshot candidate always ok=false with deterministic mode', () => {
    const { ind } = buildTestContext();
    const result = buildDeterministicSnapshotCandidate(ind);
    assert.equal(result.ok, false);
    assert.equal(result.mode, 'deterministic');
    assert.equal(result.meta.generationMode, 'deterministic');
    // Even in deterministic mode, qualityPassed=true (no AI failure)
    assert.equal(result.meta.qualityPassed, true);
  });

  it('meta contains prompt version and quality version', async () => {
    const { ctx, ind } = buildTestContext();
    const provider = createMockHybridAiProvider();
    const result = await runHybridAiSnapshotGeneration(ctx, ind, provider);
    assert.equal(result.meta.aiPromptVersion, HYBRID_AI_PROMPT_VERSION);
    assert.equal(result.meta.qualityVersion, HYBRID_AI_QUALITY_VERSION);
  });

  it('no real provider call occurs — mock is synchronously inspectable', async () => {
    const { ctx, ind } = buildTestContext();
    let callCount = 0;
    const trackingProvider = {
      providerId: 'mock_tracking',
      async generate(payload: unknown) {
        callCount++;
        return createMockHybridAiProvider().generate(payload as never);
      },
    };
    await runHybridAiSnapshotGeneration(ctx, ind, trackingProvider);
    assert.equal(callCount, 1, 'provider.generate called exactly once');
  });
});

// ── Quality validator tests ───────────────────────────────────────────────────

describe('Hybrid AI quality validator', () => {
  const goodBody = (role: string) =>
    `この保存版では、${role}として、生年月日のリズムが自然に反映されています。`
    + `生まれのリズムから見ると、始める場面で力が出やすい形があります。`
    + `土台を先に整えるほど、動き出しが安定しやすくなります。`
    + `日々の節目を意識することが、長く続けるための助けになります。`;

  it('valid bodies → pass', () => {
    const result = validateHybridAiOutput({
      s1_identity: goodBody('自分の輪郭'),
      s2_composition: goodBody('進め方の組み立て'),
      s3_essence: goodBody('安定の核心') + '生年月日の細かなリズムから見ると、そのリズムが安定の土台です。',
      s4_strengths: goodBody('生活リズム'),
    });
    assert.equal(result.pass, true);
    assert.equal(result.overallFailCodes.length, 0);
  });

  it('forbidden phrase → fail with forbidden_phrase code', () => {
    const result = validateHybridAiOutput({
      s1_identity: goodBody('自分') + 'このタイプは特別です。',
      s2_composition: goodBody('進め方'),
      s3_essence: goodBody('安定'),
      s4_strengths: goodBody('生活'),
    });
    assert.equal(result.pass, false);
    assert.ok(result.overallFailCodes.includes('forbidden_phrase'));
  });

  it('too short section → fail with section_too_short', () => {
    const result = validateHybridAiOutput({
      s1_identity: '短い',
      s2_composition: goodBody('進め方'),
      s3_essence: goodBody('安定'),
      s4_strengths: goodBody('生活'),
    });
    assert.equal(result.pass, false);
    assert.ok(result.overallFailCodes.includes('section_too_short'));
    const s1Result = result.sections.find((s) => s.sectionId === 's1_identity');
    assert.ok(s1Result && !s1Result.pass);
  });

  it('hard claim → fail with hard_claim code', () => {
    const result = validateHybridAiOutput({
      s1_identity: goodBody('自分') + 'あなたは絶対に成功します。',
      s2_composition: goodBody('進め方'),
      s3_essence: goodBody('安定'),
      s4_strengths: goodBody('生活'),
    });
    assert.equal(result.pass, false);
    assert.ok(result.overallFailCodes.includes('hard_claim'));
  });

  it('internal label (solarTerm key) → fail with internal_label', () => {
    const result = validateHybridAiOutput({
      s1_identity: goodBody('自分') + 'xiaohanの頃の生まれです。',
      s2_composition: goodBody('進め方'),
      s3_essence: goodBody('安定'),
      s4_strengths: goodBody('生活'),
    });
    assert.equal(result.pass, false);
    assert.ok(result.overallFailCodes.includes('internal_label'));
  });

  it('repeated sentence (3+ times) → fail with repeated_sentence', () => {
    const repeated = 'このリズムを日常に取り入れることで、自分のペースが保てます。';
    const result = validateHybridAiOutput({
      s1_identity: goodBody('自分') + repeated + repeated + repeated,
      s2_composition: goodBody('進め方'),
      s3_essence: goodBody('安定'),
      s4_strengths: goodBody('生活'),
    });
    assert.equal(result.pass, false);
    assert.ok(result.overallFailCodes.includes('repeated_sentence'));
  });

  it('empty section → fail with section_empty', () => {
    const result = validateHybridAiOutput({
      s1_identity: '',
      s2_composition: goodBody('進め方'),
      s3_essence: goodBody('安定'),
      s4_strengths: goodBody('生活'),
    });
    assert.equal(result.pass, false);
    assert.ok(result.overallFailCodes.includes('section_empty'));
  });
});

// ── Prompt builder tests ──────────────────────────────────────────────────────

describe('Hybrid AI prompt builder', () => {
  it('prompt includes v2.1 materialPack fields (season, phase descriptions)', () => {
    const { materialPack, ind } = buildTestContext();
    const payload = buildHybridAiPromptPayload(materialPack, ind);
    // seasonDescription should be a human-readable string, not an internal key
    assert.ok(payload.dobContext.seasonDescription.length > 5);
    assert.ok(!payload.dobContext.seasonDescription.includes('summer'));
    assert.ok(!payload.dobContext.seasonDescription.includes('autumn'));
    // phaseDescription should be human-readable
    assert.ok(payload.dobContext.phaseDescription.length > 5);
  });

  it('prompt does not include raw internal solarTerm keys in user-facing fields', () => {
    const { materialPack, ind } = buildTestContext();
    const payload = buildHybridAiPromptPayload(materialPack, ind);
    const promptText = JSON.stringify(payload.traitContext) + JSON.stringify(payload.dobContext);
    const solarTermKeys = ['xiaohan', 'dahan', 'lichun', 'yushui', 'mangzhong', 'xiazhi'];
    for (const key of solarTermKeys) {
      assert.ok(!promptText.includes(key), `Raw solarTerm key "${key}" found in user-facing prompt fields`);
    }
  });

  it('prompt does not expose stem codes (甲乙丙丁) in user-facing instructions', () => {
    const { materialPack, ind } = buildTestContext();
    const payload = buildHybridAiPromptPayload(materialPack, ind);
    const combined = JSON.stringify(payload.traitContext) + JSON.stringify(payload.sections);
    assert.ok(!combined.match(/[甲乙丙丁戊己庚辛壬癸]/), 'Stem codes found in prompt');
  });

  it('prompt includes forbidden phrase list as constraint', () => {
    const { materialPack, ind } = buildTestContext();
    const payload = buildHybridAiPromptPayload(materialPack, ind);
    assert.ok(payload.systemConstraints.forbiddenPhrases.includes('このタイプ'));
    assert.ok(payload.systemConstraints.forbiddenPhrases.includes('読み取りです'));
    assert.ok(payload.systemConstraints.forbiddenPhrases.includes('miさん'));
  });

  it('prompt includes fallback material from v2.1 ind', () => {
    const { materialPack, ind } = buildTestContext();
    const payload = buildHybridAiPromptPayload(materialPack, ind);
    assert.ok(payload.fallbackMaterial.s3Note.length > 10);
    // s3Note should be the essenceRhythmNote from v2.1
    assert.equal(payload.fallbackMaterial.s3Note, ind.essenceRhythmNote);
  });

  it('all four section specs are present', () => {
    const { materialPack, ind } = buildTestContext();
    const payload = buildHybridAiPromptPayload(materialPack, ind);
    const sectionIds = payload.sections.map((s) => s.sectionId);
    assert.ok(sectionIds.includes('s1_identity'));
    assert.ok(sectionIds.includes('s2_composition'));
    assert.ok(sectionIds.includes('s3_essence'));
    assert.ok(sectionIds.includes('s4_strengths'));
  });
});

// ── Boundary tests ────────────────────────────────────────────────────────────

describe('Hybrid AI boundary safety', () => {
  it('existing deterministic v2 fallback still available — old v2 ind is valid', () => {
    resetCalendarBundleCacheForTests();
    const built = buildV2FulfillmentSnapshotFromFields({
      nickname: 'test',
      birthDate: '1980-01-07',
      birthTime: '12:00:00',
      birthTimeUnknown: false,
      country: 'JP',
      birthplace: null,
      timezone: 'Asia/Tokyo',
    }, { dobPersonalizationV2Enabled: true });
    // Old v2 catalog (dob-v2-2026-06)
    const ind = composePaidIndividualizationFromEngineContext(built.engine_context_json);
    const candidate = buildDeterministicSnapshotCandidate(ind);
    assert.equal(candidate.mode, 'deterministic');
    assert.ok(!candidate.ok && candidate.fallbackInd.fingerprint.startsWith('dobv2-'));
  });

  it('v2.1 fallback also available as deterministic candidate', () => {
    const { ind } = buildTestContext('1985-07-22');
    const candidate = buildDeterministicSnapshotCandidate(ind);
    assert.equal(candidate.mode, 'deterministic');
    assert.ok(!candidate.ok && candidate.fallbackInd.fingerprint.startsWith('dobv21-'));
  });

  it('consult reply source files not imported by any hybrid module', () => {
    const hybridFiles = [
      'dtrHybridAiProvider.ts',
      'dtrHybridAiPrompt.ts',
      'dtrHybridAiQualityValidator.ts',
      'dtrHybridAiSnapshotGeneration.ts',
    ];
    for (const file of hybridFiles) {
      const src = readFileSync(
        new URL(`./${file}`, import.meta.url),
        'utf8',
      );
      assert.ok(!src.includes('consult'), `File ${file} references consult path`);
      assert.ok(!src.includes('reply'), `File ${file} references reply path`);
      assert.ok(!src.includes('ticket'), `File ${file} references ticket path`);
    }
  });

  it('hybrid modules do not import from DB or migration paths', () => {
    const hybridFiles = [
      'dtrHybridAiProvider.ts',
      'dtrHybridAiPrompt.ts',
      'dtrHybridAiQualityValidator.ts',
      'dtrHybridAiSnapshotGeneration.ts',
    ];
    for (const file of hybridFiles) {
      const src = readFileSync(
        new URL(`./${file}`, import.meta.url),
        'utf8',
      );
      assert.ok(!src.includes('supabase'), `File ${file} imports from supabase`);
      assert.ok(!src.includes('migrations'), `File ${file} imports from migrations`);
      assert.ok(!src.includes('process.env'), `File ${file} reads process.env`);
    }
  });

  it('buildV2FulfillmentSnapshot.ts unchanged — new fulfillment still old v2 catalog', () => {
    resetCalendarBundleCacheForTests();
    const built = buildV2FulfillmentSnapshotFromFields({
      nickname: 'test',
      birthDate: '1990-09-09',
      birthTime: '10:00:00',
      birthTimeUnknown: false,
      country: 'JP',
      birthplace: null,
      timezone: 'Asia/Tokyo',
    }, { dobPersonalizationV2Enabled: true });
    assert.equal(built.engine_context_json.paidIndividualizationVersion, 'v2');
    // Must still be old catalog — fulfillment switch (Commit B) not applied
    assert.equal(built.engine_context_json.dobPersonalizationCatalogVersion, 'dob-v2-2026-06');
  });
});

// ── Generation DB payload integration ────────────────────────────────────────

describe('Hybrid AI → generation DB payload', () => {
  it('hybrid_ai success candidate produces valid DB payload', async () => {
    const { ctx, ind } = buildTestContext();
    const provider = createMockHybridAiProvider();
    const result = await runHybridAiSnapshotGeneration(ctx, ind, provider);
    assert.equal(result.ok, true);

    // Build DB payload from meta
    const dbPayload = buildDtrSnapshotGenerationDbPayload(result.meta);
    assert.equal(dbPayload.generation_mode, 'hybrid_ai');
    assert.equal(dbPayload.quality_passed, true);
    assert.equal(dbPayload.generation_meta_json.schemaVersion, '1');
    assert.equal(dbPayload.generation_meta_json.selectedMode, 'hybrid_ai');
  });

  it('hybrid_ai_fallback candidate produces valid DB payload with quality_passed=false', async () => {
    const { ctx, ind } = buildTestContext();
    const { buildFulfillmentSnapshotGenerationResolution } = await import('./dtrFulfillmentSnapshotGenerationHook');
    const result = await buildFulfillmentSnapshotGenerationResolution({
      engineContextJson: ctx,
      fallbackInd: ind,
      provider: createThrowingMockProvider(),
    });
    assert.ok(result.generationDbPayload);
    assert.equal(result.generationDbPayload!.generation_mode, 'hybrid_ai_fallback');
    assert.equal(result.generationDbPayload!.quality_passed, false);

    const dbPayload = result.generationDbPayload!;
    assert.ok(dbPayload.generation_meta_json.fallbackReasonCode?.includes('provider_throw'));
    assert.ok(!dbPayload.generation_meta_json.fallbackReasonCode?.includes('Error:'));
    assert.ok(!dbPayload.generation_meta_json.fallbackReasonCode?.includes('mock provider'));
  });

  it('deterministic candidate produces valid DB payload', () => {
    const { ind } = buildTestContext();
    const result = buildDeterministicSnapshotCandidate(ind);
    const dbPayload = buildDtrSnapshotGenerationDbPayload(result.meta);
    assert.equal(dbPayload.generation_mode, 'deterministic');
    assert.equal(dbPayload.quality_passed, true);
  });

  it('generation DB payload does not contain prohibited keys', async () => {
    const { ctx, ind } = buildTestContext();
    const provider = createMockHybridAiProvider();
    const result = await runHybridAiSnapshotGeneration(ctx, ind, provider);
    const dbPayload = buildDtrSnapshotGenerationDbPayload(result.meta);
    const serialized = JSON.stringify(dbPayload);
    for (const key of PROHIBITED_META_KEYS) {
      assert.ok(!serialized.includes(`"${key}"`), `Prohibited key "${key}" found in DB payload`);
    }
  });

  it('generation DB payload for fallback (forbidden phrase) contains failure code', async () => {
    const { ctx, ind } = buildTestContext();
    const provider = createForbiddenPhraseMockProvider();
    const result = await runHybridAiSnapshotGeneration(ctx, ind, provider);
    assert.equal(result.ok, false);

    const dbPayload = buildDtrSnapshotGenerationDbPayload(result.meta);
    assert.equal(dbPayload.generation_mode, 'hybrid_ai_fallback');
    assert.ok(dbPayload.generation_meta_json.fallbackReasonCode?.includes('quality_fail'));
  });

  it('legacy path: inactive env means no generation columns in insert (source inspection)', () => {
    const src = readFileSync(
      new URL('./dtrDraftDb.ts', import.meta.url),
      'utf8',
    );
    // generationDbPayload must be optional (test override)
    assert.ok(src.includes('generationDbPayload?: DtrSnapshotGenerationDbPayload'));
    // Generation columns only written in conditional block
    assert.ok(src.includes('if (generationDbPayload)'));
    // Hybrid resolution runs after existingVisible check
    assert.ok(src.includes('resolveFulfillmentSnapshotGenerationResolution'));
    const upsertBlock = src.slice(src.indexOf('export async function upsertDtrReportSnapshotAtFulfillment'));
    assert.ok(
      upsertBlock.indexOf('getVisibleDtrReportSnapshot') <
        upsertBlock.indexOf('resolveFulfillmentSnapshotGenerationResolution'),
    );
    // Base insertRow must not have generation_mode unconditionally
    const baseInsertBlock = src.slice(
      src.indexOf('const insertRow: Record<string, unknown>'),
      src.indexOf('if (generationDbPayload)'),
    );
    assert.ok(!baseInsertBlock.includes('generation_mode'));
    assert.ok(!baseInsertBlock.includes('quality_passed'));
  });
});
