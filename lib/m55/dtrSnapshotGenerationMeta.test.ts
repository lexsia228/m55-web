/**
 * Tests for dtrSnapshotGenerationMeta — DB-safe generation metadata builder.
 *
 * Covers:
 * - Valid mode enum
 * - Allowlist builder drops unknown keys
 * - Prohibited keys throw immediately
 * - buildDtrSnapshotGenerationDbPayload maps SnapshotGenerationMeta correctly
 * - Legacy path compatibility (no metadata → columns stay NULL)
 * - No birth-time / forbidden phrases introduced
 * - No PII / raw prompt / raw body ever stored
 *
 * No DB, no network, no AI, no process.env.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import {
  VALID_GENERATION_MODES,
  isValidDtrSnapshotGenerationMode,
  buildDtrSnapshotGenerationMetaJson,
  buildDtrSnapshotGenerationDbPayload,
  assertNoProhibitedMetaKeys,
  PROHIBITED_META_KEYS,
} from './dtrSnapshotGenerationMeta';

const SRC = readFileSync(new URL('./dtrSnapshotGenerationMeta.ts', import.meta.url), 'utf8');
const DRAFT_DB_SRC = readFileSync(new URL('./dtrDraftDb.ts', import.meta.url), 'utf8');

// ── 1. GenerationMode enum ────────────────────────────────────────────────────

describe('DtrSnapshotGenerationMode', () => {
  it('VALID_GENERATION_MODES contains exactly 3 values', () => {
    assert.deepEqual(VALID_GENERATION_MODES, ['deterministic', 'hybrid_ai', 'hybrid_ai_fallback']);
  });

  it('isValidDtrSnapshotGenerationMode accepts all three valid modes', () => {
    assert.ok(isValidDtrSnapshotGenerationMode('deterministic'));
    assert.ok(isValidDtrSnapshotGenerationMode('hybrid_ai'));
    assert.ok(isValidDtrSnapshotGenerationMode('hybrid_ai_fallback'));
  });

  it('isValidDtrSnapshotGenerationMode rejects invalid modes', () => {
    assert.equal(isValidDtrSnapshotGenerationMode(''), false);
    assert.equal(isValidDtrSnapshotGenerationMode('ai'), false);
    assert.equal(isValidDtrSnapshotGenerationMode('HYBRID_AI'), false);
    assert.equal(isValidDtrSnapshotGenerationMode(null), false);
    assert.equal(isValidDtrSnapshotGenerationMode(undefined), false);
    assert.equal(isValidDtrSnapshotGenerationMode(1), false);
  });

  it('invalid generation_mode cannot be produced by buildDtrSnapshotGenerationDbPayload', () => {
    assert.throws(
      () => buildDtrSnapshotGenerationDbPayload({ generationMode: 'invalid' as never, qualityPassed: true }),
      /Invalid generation mode/,
    );
  });
});

// ── 2. Prohibited key guard ───────────────────────────────────────────────────

describe('Prohibited key guard', () => {
  const prohibited = [
    'rawPrompt', 'prompt', 'systemPrompt', 'userPrompt',
    'rawResponse', 'responseText', 'rawBody', 'fullBody', 'body',
    'reportText', 'snapshotBody', 'chapterBody',
    'user_id', 'userId', 'email', 'nickname', 'name',
    'birth_date', 'birthDate', 'dob', 'dateOfBirth',
    'consultationText', 'userInput', 'userMessage',
  ];

  for (const key of prohibited) {
    it(`assertNoProhibitedMetaKeys throws for "${key}"`, () => {
      assert.throws(
        () => assertNoProhibitedMetaKeys({ [key]: 'some value' }),
        /Prohibited key/,
      );
    });

    it(`buildDtrSnapshotGenerationMetaJson throws for key "${key}"`, () => {
      assert.throws(
        () => buildDtrSnapshotGenerationMetaJson({ [key]: 'some value' }),
        /Prohibited key/,
      );
    });
  }

  it('PROHIBITED_META_KEYS has all expected PII keys', () => {
    assert.ok(PROHIBITED_META_KEYS.has('rawPrompt'));
    assert.ok(PROHIBITED_META_KEYS.has('user_id'));
    assert.ok(PROHIBITED_META_KEYS.has('email'));
    assert.ok(PROHIBITED_META_KEYS.has('birthDate'));
    assert.ok(PROHIBITED_META_KEYS.has('nickname'));
    assert.ok(PROHIBITED_META_KEYS.has('dob'));
    assert.ok(PROHIBITED_META_KEYS.has('body'));
    assert.ok(PROHIBITED_META_KEYS.has('rawResponse'));
  });
});

// ── 3. buildDtrSnapshotGenerationMetaJson — allowlist builder ─────────────────

describe('buildDtrSnapshotGenerationMetaJson', () => {
  it('accepts all valid allowlisted keys', () => {
    const result = buildDtrSnapshotGenerationMetaJson({
      catalogVersion: 'dob-v2-2026-06',
      paidIndVersion: 'v2',
      promptVersion: 'hybrid-prompt-v1-2026-07',
      qualityValidatorVersion: 'hybrid-quality-v1-2026-07',
      materialPackVersion: 'dob-v2.1-2026-07',
      providerKind: 'mock',
      selectedMode: 'hybrid_ai',
      fallbackReasonCode: 'none',
      qualityFailureCodes: ['forbidden_phrase'],
      retryCount: 1,
      elapsedMs: 1500,
      estimatedTokenClass: 'medium',
      generatedAtIso: '2026-07-01T00:00:00.000Z',
    });

    assert.equal(result.schemaVersion, '1');
    assert.equal(result.catalogVersion, 'dob-v2-2026-06');
    assert.equal(result.paidIndVersion, 'v2');
    assert.equal(result.promptVersion, 'hybrid-prompt-v1-2026-07');
    assert.equal(result.selectedMode, 'hybrid_ai');
    assert.deepEqual(result.qualityFailureCodes, ['forbidden_phrase']);
    assert.equal(result.retryCount, 1);
    assert.equal(result.elapsedMs, 1500);
  });

  it('silently drops unknown keys', () => {
    const result = buildDtrSnapshotGenerationMetaJson({
      catalogVersion: 'dob-v2-2026-06',
      unknownKey: 'should be dropped',
      anotherUnknown: { nested: true },
    });
    assert.equal(result.catalogVersion, 'dob-v2-2026-06');
    assert.equal(Object.prototype.hasOwnProperty.call(result, 'unknownKey'), false);
    assert.equal(Object.prototype.hasOwnProperty.call(result, 'anotherUnknown'), false);
  });

  it('always sets schemaVersion to "1"', () => {
    const result = buildDtrSnapshotGenerationMetaJson({});
    assert.equal(result.schemaVersion, '1');
  });

  it('truncates overly long strings', () => {
    const longString = 'a'.repeat(500);
    const result = buildDtrSnapshotGenerationMetaJson({ catalogVersion: longString });
    assert.ok(result.catalogVersion !== undefined && result.catalogVersion.length <= 201);
  });

  it('clamps retryCount to [0, 100]', () => {
    const r1 = buildDtrSnapshotGenerationMetaJson({ retryCount: -5 });
    assert.equal(r1.retryCount, 0);
    const r2 = buildDtrSnapshotGenerationMetaJson({ retryCount: 9999 });
    assert.equal(r2.retryCount, 100);
  });

  it('clamps elapsedMs to [0, 600000]', () => {
    const r1 = buildDtrSnapshotGenerationMetaJson({ elapsedMs: -100 });
    assert.equal(r1.elapsedMs, 0);
    const r2 = buildDtrSnapshotGenerationMetaJson({ elapsedMs: 99999999 });
    assert.equal(r2.elapsedMs, 600_000);
  });

  it('caps qualityFailureCodes array at 20 items', () => {
    const codes = Array.from({ length: 30 }, (_, i) => `code_${i}`);
    const result = buildDtrSnapshotGenerationMetaJson({ qualityFailureCodes: codes });
    assert.ok(result.qualityFailureCodes !== undefined && result.qualityFailureCodes.length <= 20);
  });

  it('rejects invalid selectedMode silently (drops it)', () => {
    const result = buildDtrSnapshotGenerationMetaJson({ selectedMode: 'invalid_mode' });
    assert.equal(result.selectedMode, undefined);
  });

  it('empty input produces only schemaVersion', () => {
    const result = buildDtrSnapshotGenerationMetaJson({});
    assert.equal(result.schemaVersion, '1');
    const keys = Object.keys(result).filter((k) => k !== 'schemaVersion');
    assert.equal(keys.length, 0);
  });
});

// ── 4. buildDtrSnapshotGenerationDbPayload — hybrid success ──────────────────

describe('buildDtrSnapshotGenerationDbPayload — hybrid_ai success', () => {
  it('produces correct DB payload for hybrid_ai success', () => {
    const payload = buildDtrSnapshotGenerationDbPayload({
      generationMode: 'hybrid_ai',
      qualityPassed: true,
      catalogVersion: 'dob-v2.1-2026-07',
      paidIndVersion: 'v2',
      aiPromptVersion: 'hybrid-prompt-v1-2026-07',
      qualityVersion: 'hybrid-quality-v1-2026-07',
      sourceMaterialVersion: 'dob-v2.1-2026-07',
      aiModelProvider: 'mock',
    });

    assert.equal(payload.generation_mode, 'hybrid_ai');
    assert.equal(payload.quality_passed, true);
    assert.equal(payload.generation_meta_json.schemaVersion, '1');
    assert.equal(payload.generation_meta_json.selectedMode, 'hybrid_ai');
    assert.equal(payload.generation_meta_json.catalogVersion, 'dob-v2.1-2026-07');
    assert.equal(payload.generation_meta_json.providerKind, 'mock');
    assert.ok(payload.generation_meta_json.generatedAtIso !== undefined);
  });

  it('generation_meta_json for hybrid_ai does not contain prohibited fields', () => {
    const payload = buildDtrSnapshotGenerationDbPayload({
      generationMode: 'hybrid_ai',
      qualityPassed: true,
      catalogVersion: 'dob-v2.1-2026-07',
      aiModelProvider: 'mock',
    });
    const serialized = JSON.stringify(payload.generation_meta_json);
    for (const key of PROHIBITED_META_KEYS) {
      assert.ok(!serialized.includes(`"${key}"`), `Prohibited key "${key}" found in meta JSON`);
    }
  });
});

// ── 5. buildDtrSnapshotGenerationDbPayload — hybrid fallback ─────────────────

describe('buildDtrSnapshotGenerationDbPayload — hybrid_ai_fallback', () => {
  it('produces correct DB payload for fallback', () => {
    const payload = buildDtrSnapshotGenerationDbPayload({
      generationMode: 'hybrid_ai_fallback',
      qualityPassed: false,
      fallbackReason: 'quality_fail: forbidden_phrase,section_too_short',
      qualityFailureCodes: ['forbidden_phrase', 'section_too_short'],
    });

    assert.equal(payload.generation_mode, 'hybrid_ai_fallback');
    assert.equal(payload.quality_passed, false);
    assert.ok(payload.generation_meta_json.fallbackReasonCode?.includes('forbidden_phrase'));
    assert.deepEqual(payload.generation_meta_json.qualityFailureCodes, [
      'forbidden_phrase',
      'section_too_short',
    ]);
  });

  it('fallback payload does not contain raw output or PII', () => {
    const payload = buildDtrSnapshotGenerationDbPayload({
      generationMode: 'hybrid_ai_fallback',
      qualityPassed: false,
      fallbackReason: 'quality_fail',
    });
    const serialized = JSON.stringify(payload);
    assert.ok(!serialized.includes('rawPrompt'));
    assert.ok(!serialized.includes('userId'));
    assert.ok(!serialized.includes('birthDate'));
    assert.ok(!serialized.includes('email'));
    assert.ok(!serialized.includes('nickname'));
  });
});

// ── 6. buildDtrSnapshotGenerationDbPayload — deterministic ───────────────────

describe('buildDtrSnapshotGenerationDbPayload — deterministic', () => {
  it('produces correct DB payload for deterministic mode', () => {
    const payload = buildDtrSnapshotGenerationDbPayload({
      generationMode: 'deterministic',
      qualityPassed: true,
      catalogVersion: 'dob-v2-2026-06',
    });

    assert.equal(payload.generation_mode, 'deterministic');
    assert.equal(payload.quality_passed, true);
    assert.equal(payload.generation_meta_json.selectedMode, 'deterministic');
  });
});

// ── 7. Legacy path compatibility — dtrDraftDb.ts source inspection ────────────

describe('dtrDraftDb.ts legacy path compatibility', () => {
  it('generationDbPayload is optional in upsertDtrReportSnapshotAtFulfillment', () => {
    assert.ok(
      DRAFT_DB_SRC.includes('generationDbPayload?: DtrSnapshotGenerationDbPayload'),
      'generationDbPayload must be optional',
    );
  });

  it('generation columns only written when generationDbPayload is provided', () => {
    assert.ok(
      DRAFT_DB_SRC.includes('if (generationDbPayload)'),
      'generation columns must be conditionally written',
    );
  });

  it('insertRow structure is unchanged for legacy path (no unconditional generation fields)', () => {
    // Verify that the base insertRow does not include generation_mode unconditionally
    const insertRowBlock = DRAFT_DB_SRC.slice(
      DRAFT_DB_SRC.indexOf('const insertRow: Record<string, unknown>'),
      DRAFT_DB_SRC.indexOf('if (generationDbPayload)'),
    );
    assert.ok(!insertRowBlock.includes('generation_mode'));
    assert.ok(!insertRowBlock.includes('quality_passed'));
    assert.ok(!insertRowBlock.includes('generation_meta_json'));
  });

  it('dtrDraftDb.ts imports DtrSnapshotGenerationDbPayload from dtrSnapshotGenerationMeta', () => {
    assert.ok(
      DRAFT_DB_SRC.includes("from './dtrSnapshotGenerationMeta'"),
      'dtrDraftDb.ts must import from dtrSnapshotGenerationMeta',
    );
  });

  it('dtrDraftDb.ts has no .update() or .delete() calls', () => {
    assert.equal(DRAFT_DB_SRC.includes('.update('), false);
    assert.equal(DRAFT_DB_SRC.includes('.delete('), false);
  });
});

// ── 8. Source-level safety checks ─────────────────────────────────────────────

describe('dtrSnapshotGenerationMeta.ts source safety', () => {
  it('source does not contain birth-time phrases', () => {
    assert.ok(!SRC.includes('生まれ時刻'), 'must not contain 生まれ時刻');
    assert.ok(!SRC.includes('一日の細かな時間'), 'must not contain 一日の細かな時間');
    assert.ok(!SRC.includes('正午基準'), 'must not contain 正午基準');
  });

  it('source does not contain forbidden copy phrases', () => {
    assert.ok(!SRC.includes('読み取りです'), 'must not contain 読み取りです');
    assert.ok(!SRC.includes('このタイプ'), 'must not contain このタイプ');
    assert.ok(!SRC.includes('miさん'), 'must not contain miさん');
    assert.ok(!SRC.includes('分析結果'), 'must not contain 分析結果');
  });

  it('source does not import from supabase or DB paths', () => {
    assert.ok(!SRC.includes("from '../supabase"), 'must not import supabase');
    assert.ok(!SRC.includes("from './supabase"), 'must not import supabase');
    assert.ok(!SRC.includes('getSupabaseAdmin'), 'must not call getSupabaseAdmin');
    assert.ok(!SRC.includes('fetch('), 'must not call fetch');
    // process.env appears only in the file-level JSDoc comment, not in executable code
    const codeOnly = SRC.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
    assert.ok(!codeOnly.includes('process.env'), 'must not read process.env in executable code');
  });

  it('source does not import from consult/reply/checkout module paths', () => {
    // consultationText appears in PROHIBITED_META_KEYS (intentional guard), but no import path
    assert.ok(!SRC.includes("from './consult"), 'must not import from consult module');
    assert.ok(!SRC.includes("from './reply"), 'must not import from reply module');
    assert.ok(!SRC.includes("from './checkout"), 'must not import from checkout module');
    assert.ok(!SRC.includes("from './ticket"), 'must not import from ticket module');
  });

  it('source does not contain forbidden output terms (OpenAI / Gemini)', () => {
    assert.ok(!SRC.toLowerCase().includes('openai'), 'must not reference openai');
    assert.ok(!SRC.toLowerCase().includes('gemini'), 'must not reference gemini');
  });
});
