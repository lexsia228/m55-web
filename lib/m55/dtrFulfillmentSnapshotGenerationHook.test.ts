/**
 * Fulfillment snapshot generation hook + upsert plumbing tests.
 *
 * Covers env guard, body/metadata consistency, idempotency order, mock provider only.
 * No DB, no network, no production POST, no real provider.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import { resetCalendarBundleCacheForTests } from './calendar/loadCalendarBundle';
import { buildV2FulfillmentSnapshotFromFields } from './compositeStem/buildV2FulfillmentSnapshot';
import { DOB_PERSONALIZATION_V21_CATALOG_VERSION } from './dtrDobPersonalizationV2';
import { composePaidIndividualizationFromEngineContext } from './dtrPaidIndividualizationCompose';
import {
  DTR_HYBRID_AI_ENABLED_ENV,
  isDtrHybridAiFulfillmentEnabled,
  resolveFulfillmentSnapshotGenerationResolution,
  buildFulfillmentSnapshotGenerationResolution,
  resolveMockDtrHybridAiProvider,
  resolveFulfillmentHybridAiProvider,
  sanitizeHybridAiFallbackReason,
} from './dtrFulfillmentSnapshotGenerationHook';
import {
  createMockHybridAiProvider,
  createThrowingMockProvider,
  createForbiddenPhraseMockProvider,
} from './dtrHybridAiProvider';
import { PROHIBITED_META_KEYS } from './dtrSnapshotGenerationMeta';

const HOOK_SRC = readFileSync(
  new URL('./dtrFulfillmentSnapshotGenerationHook.ts', import.meta.url),
  'utf8',
);
const DRAFT_DB_SRC = readFileSync(
  join(process.cwd(), 'lib/m55/dtrDraftDb.ts'),
  'utf8',
);
const FULFILLMENT_SRC = readFileSync(
  join(process.cwd(), 'lib/m55/dtrCoreCheckoutFulfillment.ts'),
  'utf8',
);

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
  const ctxV21 = {
    ...built.engine_context_json,
    dobPersonalizationCatalogVersion: DOB_PERSONALIZATION_V21_CATALOG_VERSION,
  };
  const ind = composePaidIndividualizationFromEngineContext(ctxV21);
  return { ctx: ctxV21, ind };
}

async function withEnv(
  key: string,
  value: string | undefined,
  fn: () => Promise<void>,
): Promise<void> {
  const prev = process.env[key];
  if (value === undefined) {
    delete process.env[key];
  } else {
    process.env[key] = value;
  }
  try {
    await fn();
  } finally {
    if (prev === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = prev;
    }
  }
}

// ── Env guard ─────────────────────────────────────────────────────────────────

describe('Fulfillment snapshot generation hook — env guard', () => {
  it('env unset → isDtrHybridAiFulfillmentEnabled false', async () => {
    await withEnv(DTR_HYBRID_AI_ENABLED_ENV, undefined, async () => {
      assert.equal(isDtrHybridAiFulfillmentEnabled(), false);
    });
  });

  it('env blank → inactive', async () => {
    await withEnv(DTR_HYBRID_AI_ENABLED_ENV, '   ', async () => {
      assert.equal(isDtrHybridAiFulfillmentEnabled(), false);
      const { ctx, ind } = buildTestContext();
      const resolution = await resolveFulfillmentSnapshotGenerationResolution({
        engineContextJson: ctx,
        fallbackInd: ind,
        provider: createMockHybridAiProvider(),
      });
      assert.deepEqual(resolution, {});
    });
  });

  it('env invalid → inactive', async () => {
    await withEnv(DTR_HYBRID_AI_ENABLED_ENV, 'enabled', async () => {
      assert.equal(isDtrHybridAiFulfillmentEnabled(), false);
      const { ctx, ind } = buildTestContext();
      const resolution = await resolveFulfillmentSnapshotGenerationResolution({
        engineContextJson: ctx,
        fallbackInd: ind,
        provider: createMockHybridAiProvider(),
      });
      assert.deepEqual(resolution, {});
    });
  });

  it('env preview → enabled candidate', async () => {
    await withEnv(DTR_HYBRID_AI_ENABLED_ENV, 'preview', async () => {
      assert.equal(isDtrHybridAiFulfillmentEnabled(), true);
    });
  });

  it('env production → enabled candidate', async () => {
    await withEnv(DTR_HYBRID_AI_ENABLED_ENV, 'production', async () => {
      assert.equal(isDtrHybridAiFulfillmentEnabled(), true);
    });
  });
});

// ── Resolution: inactive ──────────────────────────────────────────────────────

describe('Fulfillment snapshot generation hook — inactive resolution', () => {
  it('env unset → no provider call → empty resolution', async () => {
    await withEnv(DTR_HYBRID_AI_ENABLED_ENV, undefined, async () => {
      const { ctx, ind } = buildTestContext();
      let callCount = 0;
      const trackingProvider = {
        providerId: 'mock_tracking',
        async generate(payload: unknown) {
          callCount++;
          return createMockHybridAiProvider().generate(payload as never);
        },
      };
      const resolution = await resolveFulfillmentSnapshotGenerationResolution({
        engineContextJson: ctx,
        fallbackInd: ind,
        provider: trackingProvider,
      });
      assert.deepEqual(resolution, {});
      assert.equal(callCount, 0);
    });
  });
});

// ── Resolution: hybrid success ────────────────────────────────────────────────

describe('Fulfillment snapshot generation hook — hybrid success', () => {
  it('env preview + mock success → generatedChapterBodies + hybrid_ai metadata', async () => {
    await withEnv(DTR_HYBRID_AI_ENABLED_ENV, 'preview', async () => {
      const { ctx, ind } = buildTestContext();
      const provider = createMockHybridAiProvider();
      const resolution = await resolveFulfillmentSnapshotGenerationResolution({
        engineContextJson: ctx,
        fallbackInd: ind,
        provider,
      });

      assert.ok(resolution.generationDbPayload);
      assert.equal(resolution.generationDbPayload!.generation_mode, 'hybrid_ai');
      assert.equal(resolution.generationDbPayload!.quality_passed, true);
      assert.ok(resolution.generatedChapterBodies);
      assert.ok(resolution.generatedChapterBodies!.s1_identity!.length > 30);
      assert.ok(resolution.generatedChapterBodies!.s3_essence!.length > 30);
    });
  });

  it('success: generatedChapterBodies differ from deterministic base (body consistency)', async () => {
    await withEnv(DTR_HYBRID_AI_ENABLED_ENV, 'preview', async () => {
      const { ctx, ind } = buildTestContext();
      const resolution = await buildFulfillmentSnapshotGenerationResolution({
        engineContextJson: ctx,
        fallbackInd: ind,
        provider: createMockHybridAiProvider(),
      });

      const deterministic = buildV2FulfillmentSnapshotFromFields({
        nickname: 'test',
        birthDate: '1985-06-15',
        birthTime: '12:00:00',
        birthTimeUnknown: false,
        country: 'JP',
        birthplace: null,
        timezone: 'Asia/Tokyo',
      }, { dobPersonalizationV2Enabled: true });

      const detS1 = deterministic.envelope_json.payload.fullSections.find((s) => s.id === 's1_identity')?.body ?? '';
      assert.notEqual(resolution.generatedChapterBodies!.s1_identity, detS1);
    });
  });
});

// ── Resolution: hybrid fallback ───────────────────────────────────────────────

describe('Fulfillment snapshot generation hook — hybrid fallback', () => {
  it('env preview + provider throw → no generatedChapterBodies + hybrid_ai_fallback', async () => {
    await withEnv(DTR_HYBRID_AI_ENABLED_ENV, 'preview', async () => {
      const { ctx, ind } = buildTestContext();
      const resolution = await resolveFulfillmentSnapshotGenerationResolution({
        engineContextJson: ctx,
        fallbackInd: ind,
        provider: createThrowingMockProvider(),
      });

      assert.equal(resolution.generationDbPayload!.generation_mode, 'hybrid_ai_fallback');
      assert.equal(resolution.generationDbPayload!.quality_passed, false);
      assert.equal(resolution.generatedChapterBodies, undefined);
      const code = resolution.generationDbPayload!.generation_meta_json.fallbackReasonCode;
      assert.ok(code?.includes('provider_throw'));
      assert.ok(!code?.includes('Error:'));
      assert.ok(!code?.includes('simulated'));
      assert.ok(!code?.includes('mock provider'));
    });
  });

  it('env preview + validator fail → no generatedChapterBodies + quality_fail code', async () => {
    await withEnv(DTR_HYBRID_AI_ENABLED_ENV, 'preview', async () => {
      const { ctx, ind } = buildTestContext();
      const resolution = await resolveFulfillmentSnapshotGenerationResolution({
        engineContextJson: ctx,
        fallbackInd: ind,
        provider: createForbiddenPhraseMockProvider(),
      });

      assert.equal(resolution.generationDbPayload!.generation_mode, 'hybrid_ai_fallback');
      assert.equal(resolution.generatedChapterBodies, undefined);
      assert.ok(resolution.generationDbPayload!.generation_meta_json.fallbackReasonCode?.includes('quality_fail'));
    });
  });
});

// ── Metadata safety ───────────────────────────────────────────────────────────

describe('Fulfillment snapshot generation hook — metadata safety', () => {
  it('resolution does not contain prohibited keys', async () => {
    const { ctx, ind } = buildTestContext();
    const resolution = await buildFulfillmentSnapshotGenerationResolution({
      engineContextJson: ctx,
      fallbackInd: ind,
      provider: createMockHybridAiProvider(),
    });
    const serialized = JSON.stringify(resolution);
    for (const key of PROHIBITED_META_KEYS) {
      assert.ok(!serialized.includes(`"${key}"`), `Prohibited key "${key}" in resolution`);
    }
  });
});

// ── Upsert idempotency order (source inspection) ──────────────────────────────

describe('dtrDraftDb upsert — idempotency + resolution order', () => {
  it('existingVisible check precedes resolveFulfillmentSnapshotGenerationResolution', () => {
    const upsertBlock = DRAFT_DB_SRC.slice(
      DRAFT_DB_SRC.indexOf('export async function upsertDtrReportSnapshotAtFulfillment'),
    );
    const visibleIdx = upsertBlock.indexOf('getVisibleDtrReportSnapshot(params.userId, params.productId)');
    const resolveIdx = upsertBlock.indexOf('resolveFulfillmentSnapshotGenerationResolution');
    assert.ok(visibleIdx >= 0);
    assert.ok(resolveIdx >= 0);
    assert.ok(visibleIdx < resolveIdx, 'existingVisible must precede hybrid resolution');
  });

  it('existingVisible early return precedes hybrid resolution', () => {
    const upsertBlock = DRAFT_DB_SRC.slice(
      DRAFT_DB_SRC.indexOf('export async function upsertDtrReportSnapshotAtFulfillment'),
    );
    const earlyReturnIdx = upsertBlock.indexOf('if (existingVisible) {');
    const resolveIdx = upsertBlock.indexOf('resolveFulfillmentSnapshotGenerationResolution');
    assert.ok(earlyReturnIdx < resolveIdx);
  });

  it('generatedChapterBodies passed to buildV2FulfillmentSnapshot when present', () => {
    assert.ok(DRAFT_DB_SRC.includes('generatedChapterBodies'));
    assert.ok(DRAFT_DB_SRC.includes('buildV2FulfillmentSnapshot(params.sessionMetadata, draft, { generatedChapterBodies })'));
  });

  it('resolveFulfillmentHybridAiProvider used — no direct openai import in dtrDraftDb', () => {
    assert.ok(DRAFT_DB_SRC.includes('resolveFulfillmentHybridAiProvider()'));
    assert.ok(!DRAFT_DB_SRC.includes('resolveMockDtrHybridAiProvider()'));
    assert.ok(!DRAFT_DB_SRC.includes('openai'));
    assert.ok(!DRAFT_DB_SRC.toLowerCase().includes('gemini'));
  });
});

// ── Fulfillment wiring ────────────────────────────────────────────────────────

describe('Fulfillment snapshot generation hook — fulfillment wiring', () => {
  it('dtrCoreCheckoutFulfillment does not call hook directly — upsert handles resolution', () => {
    assert.equal(FULFILLMENT_SRC.includes('resolveFulfillmentSnapshotGenerationDbPayload'), false);
    assert.equal(FULFILLMENT_SRC.includes('resolveFulfillmentSnapshotGenerationResolution'), false);
    assert.equal(FULFILLMENT_SRC.includes('dtrFulfillmentSnapshotGenerationHook'), false);
    assert.ok(FULFILLMENT_SRC.includes('upsertDtrReportSnapshotAtFulfillment'));
  });

  it('fulfillment does not pass generationDbPayload — internal resolution in upsert', () => {
    const upsertCall = FULFILLMENT_SRC.slice(
      FULFILLMENT_SRC.indexOf('upsertDtrReportSnapshotAtFulfillment({'),
      FULFILLMENT_SRC.indexOf('if (!snap.ok)'),
    );
    assert.equal(upsertCall.includes('generationDbPayload'), false);
    assert.equal(upsertCall.includes('generatedChapterBodies'), false);
  });

  it('grant order unchanged — included reply before snapshot upsert', () => {
    const fulfillBlock = FULFILLMENT_SRC.slice(
      FULFILLMENT_SRC.indexOf('await grantInitialIncludedReplyIfNeeded(db'),
    );
    assert.ok(
      fulfillBlock.indexOf('await grantInitialIncludedReplyIfNeeded(db') <
        fulfillBlock.indexOf('upsertDtrReportSnapshotAtFulfillment({'),
    );
  });
});

// ── Boundary safety ───────────────────────────────────────────────────────────

describe('Fulfillment snapshot generation hook — boundary safety', () => {
  it('resolveMockDtrHybridAiProvider returns mock only', () => {
    const provider = resolveMockDtrHybridAiProvider();
    assert.equal(provider.providerId, 'mock_pass');
  });

  it('hook source does not call fetch', () => {
    assert.ok(!HOOK_SRC.includes('fetch('));
  });

  it('hook source does not import supabase or stripe', () => {
    assert.ok(!HOOK_SRC.includes('getSupabaseAdmin'));
    assert.ok(!HOOK_SRC.includes("from '../stripe"));
  });

  it('hook source does not import consult/reply/ticket paths', () => {
    assert.ok(!HOOK_SRC.includes("from './reply"));
    assert.ok(!HOOK_SRC.includes('ticket'));
  });

  it('hook source does not contain birth-time or forbidden copy phrases', () => {
    assert.ok(!HOOK_SRC.includes('生まれ時刻'));
    assert.ok(!HOOK_SRC.includes('読み取りです'));
    assert.ok(!HOOK_SRC.includes('このタイプ'));
    assert.ok(!HOOK_SRC.includes('miさん'));
  });
});

// ── Provider resolver wiring ────────────────────────────────────────────────────

describe('Fulfillment snapshot generation hook — provider resolver wiring', () => {
  it('env unset → resolveFulfillmentHybridAiProvider returns mock only', async () => {
    await withEnv(DTR_HYBRID_AI_ENABLED_ENV, undefined, async () => {
      const provider = resolveFulfillmentHybridAiProvider();
      assert.equal(provider.providerId, 'mock_pass');
    });
  });

  it('env invalid → resolveFulfillmentHybridAiProvider returns mock only', async () => {
    await withEnv(DTR_HYBRID_AI_ENABLED_ENV, 'enabled', async () => {
      const provider = resolveFulfillmentHybridAiProvider();
      assert.equal(provider.providerId, 'mock_pass');
    });
  });

  it('env preview → resolveFulfillmentHybridAiProvider returns openai provider id', async () => {
    await withEnv(DTR_HYBRID_AI_ENABLED_ENV, 'preview', async () => {
      const provider = resolveFulfillmentHybridAiProvider();
      assert.equal(provider.providerId, 'openai_gpt-4.1-mini');
    });
  });

  it('env production → resolveFulfillmentHybridAiProvider returns openai provider id', async () => {
    await withEnv(DTR_HYBRID_AI_ENABLED_ENV, 'production', async () => {
      const provider = resolveFulfillmentHybridAiProvider();
      assert.equal(provider.providerId.startsWith('openai_'), true);
    });
  });

  it('env preview + explicit mock provider in resolution → mock used, no API key needed', async () => {
    await withEnv(DTR_HYBRID_AI_ENABLED_ENV, 'preview', async () => {
      const savedKey = process.env['OPENAI_API_KEY'];
      delete process.env['OPENAI_API_KEY'];
      try {
        const { ctx, ind } = buildTestContext();
        const resolution = await resolveFulfillmentSnapshotGenerationResolution({
          engineContextJson: ctx,
          fallbackInd: ind,
          provider: createMockHybridAiProvider(),
        });
        assert.equal(resolution.generationDbPayload!.generation_mode, 'hybrid_ai');
      } finally {
        if (savedKey !== undefined) process.env['OPENAI_API_KEY'] = savedKey;
      }
    });
  });
});

// ── fallbackReason sanitize ─────────────────────────────────────────────────────

describe('Fulfillment snapshot generation hook — fallbackReason sanitize', () => {
  it('sanitize maps raw SDK timeout error to provider_timeout', () => {
    const raw = 'provider_throw: Error: mock provider error: simulated timeout';
    assert.equal(sanitizeHybridAiFallbackReason(raw), 'provider_throw: provider_timeout');
  });

  it('sanitize maps missing api key error to provider_missing_api_key', () => {
    const raw = 'provider_throw: Error: openai_provider_missing_api_key';
    assert.equal(sanitizeHybridAiFallbackReason(raw), 'provider_throw: provider_missing_api_key');
  });

  it('sanitize maps malformed output error safely', () => {
    const raw = 'provider_throw: Error: provider_malformed_output: invalid JSON';
    const safe = sanitizeHybridAiFallbackReason(raw);
    assert.equal(safe, 'provider_throw: provider_malformed_output: invalid json');
  });

  it('sanitize strips api key patterns from reason', () => {
    const raw = 'provider_throw: Error: Authentication failed sk-abc123secretkey';
    assert.equal(sanitizeHybridAiFallbackReason(raw), 'provider_throw');
  });

  it('sanitize strips stack traces from reason', () => {
    const raw = 'provider_throw: Error: fail\n    at Object.generate (/path/file.ts:10:5)';
    assert.equal(sanitizeHybridAiFallbackReason(raw), 'provider_throw');
  });

  it('quality_fail codes preserved safely', () => {
    const raw = 'quality_fail:forbidden_phrase,section_too_short';
    assert.equal(sanitizeHybridAiFallbackReason(raw), 'quality_fail:forbidden_phrase,section_too_short');
  });

  it('provider timeout via OpenAI provider throw → safe metadata only', async () => {
    await withEnv(DTR_HYBRID_AI_ENABLED_ENV, 'preview', async () => {
      const { ctx, ind } = buildTestContext();
      const throwingProvider = {
        providerId: 'mock_timeout',
        async generate(): Promise<never> {
          throw new Error('provider_timeout');
        },
      };
      const resolution = await resolveFulfillmentSnapshotGenerationResolution({
        engineContextJson: ctx,
        fallbackInd: ind,
        provider: throwingProvider,
      });
      const code = resolution.generationDbPayload!.generation_meta_json.fallbackReasonCode;
      assert.equal(code, 'provider_throw: provider_timeout');
      assert.ok(!JSON.stringify(resolution).includes('sk-'));
    });
  });

  it('metadata does not contain raw prompt/response/body on fallback', async () => {
    await withEnv(DTR_HYBRID_AI_ENABLED_ENV, 'preview', async () => {
      const { ctx, ind } = buildTestContext();
      const resolution = await resolveFulfillmentSnapshotGenerationResolution({
        engineContextJson: ctx,
        fallbackInd: ind,
        provider: createThrowingMockProvider(),
      });
      const serialized = JSON.stringify(resolution);
      for (const banned of ['choices', 'messages', 'rawPrompt', 'rawResponse', 'birth_date', 'email']) {
        assert.ok(!serialized.includes(`"${banned}"`), `Banned key "${banned}" in resolution`);
      }
    });
  });
});
