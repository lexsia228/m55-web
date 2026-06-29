/**
 * Fulfillment snapshot generation hook tests.
 *
 * Verifies:
 * - Production runtime guard is off (legacy path)
 * - resolve returns undefined when inactive
 * - buildHybridFulfillmentGenerationDbPayload produces safe payloads (mock provider)
 * - hybrid success / fallback metadata shapes
 * - fulfillment wiring passes generationDbPayload through
 * - no env / fetch / real provider / consult boundary
 *
 * No DB, no network, no production POST.
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
  DTR_HYBRID_AI_FULFILLMENT_RUNTIME_ACTIVATED,
  isDtrHybridAiFulfillmentRuntimeActivated,
  resolveFulfillmentSnapshotGenerationDbPayload,
  buildHybridFulfillmentGenerationDbPayload,
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

// ── Runtime guard ─────────────────────────────────────────────────────────────

describe('Fulfillment snapshot generation hook — runtime guard', () => {
  it('DTR_HYBRID_AI_FULFILLMENT_RUNTIME_ACTIVATED is hardcoded false', () => {
    assert.equal(DTR_HYBRID_AI_FULFILLMENT_RUNTIME_ACTIVATED, false);
    assert.equal(isDtrHybridAiFulfillmentRuntimeActivated(), false);
  });

  it('resolveFulfillmentSnapshotGenerationDbPayload returns undefined when inactive', async () => {
    const result = await resolveFulfillmentSnapshotGenerationDbPayload();
    assert.equal(result, undefined);
  });

  it('resolve returns undefined even when ctx is provided but runtime inactive', async () => {
    const { ctx, ind } = buildTestContext();
    const provider = createMockHybridAiProvider();
    const result = await resolveFulfillmentSnapshotGenerationDbPayload({
      engineContextJson: ctx,
      fallbackInd: ind,
      provider,
    });
    assert.equal(result, undefined, 'inactive runtime must not run hybrid path');
  });
});

// ── Hybrid payload builder (local tests — mock provider only) ─────────────────

describe('Fulfillment snapshot generation hook — hybrid payload builder', () => {
  it('mock success → hybrid_ai generationDbPayload', async () => {
    const { ctx, ind } = buildTestContext();
    const provider = createMockHybridAiProvider();
    const payload = await buildHybridFulfillmentGenerationDbPayload({
      engineContextJson: ctx,
      fallbackInd: ind,
      provider,
    });
    assert.equal(payload.generation_mode, 'hybrid_ai');
    assert.equal(payload.quality_passed, true);
    assert.equal(payload.generation_meta_json.schemaVersion, '1');
    assert.equal(payload.generation_meta_json.selectedMode, 'hybrid_ai');
  });

  it('provider throw → hybrid_ai_fallback generationDbPayload', async () => {
    const { ctx, ind } = buildTestContext();
    const provider = createThrowingMockProvider();
    const payload = await buildHybridFulfillmentGenerationDbPayload({
      engineContextJson: ctx,
      fallbackInd: ind,
      provider,
    });
    assert.equal(payload.generation_mode, 'hybrid_ai_fallback');
    assert.equal(payload.quality_passed, false);
    assert.ok(payload.generation_meta_json.fallbackReasonCode?.includes('provider_throw'));
  });

  it('forbidden phrase → hybrid_ai_fallback with quality_fail code', async () => {
    const { ctx, ind } = buildTestContext();
    const provider = createForbiddenPhraseMockProvider();
    const payload = await buildHybridFulfillmentGenerationDbPayload({
      engineContextJson: ctx,
      fallbackInd: ind,
      provider,
    });
    assert.equal(payload.generation_mode, 'hybrid_ai_fallback');
    assert.equal(payload.quality_passed, false);
    assert.ok(payload.generation_meta_json.fallbackReasonCode?.includes('quality_fail'));
  });

  it('payload does not contain prohibited keys', async () => {
    const { ctx, ind } = buildTestContext();
    const provider = createMockHybridAiProvider();
    const payload = await buildHybridFulfillmentGenerationDbPayload({
      engineContextJson: ctx,
      fallbackInd: ind,
      provider,
    });
    const serialized = JSON.stringify(payload);
    for (const key of PROHIBITED_META_KEYS) {
      assert.ok(!serialized.includes(`"${key}"`), `Prohibited key "${key}" in payload`);
    }
  });
});

// ── Fulfillment wiring (source inspection) ────────────────────────────────────

describe('Fulfillment snapshot generation hook — fulfillment wiring', () => {
  it('dtrCoreCheckoutFulfillment imports resolveFulfillmentSnapshotGenerationDbPayload', () => {
    assert.ok(FULFILLMENT_SRC.includes('resolveFulfillmentSnapshotGenerationDbPayload'));
    assert.ok(FULFILLMENT_SRC.includes("from './dtrFulfillmentSnapshotGenerationHook'"));
  });

  it('fulfillment passes generationDbPayload to upsertDtrReportSnapshotAtFulfillment', () => {
    const upsertBlock = FULFILLMENT_SRC.slice(
      FULFILLMENT_SRC.indexOf('resolveFulfillmentSnapshotGenerationDbPayload'),
      FULFILLMENT_SRC.indexOf('if (!snap.ok)'),
    );
    assert.ok(upsertBlock.includes('generationDbPayload'));
    assert.ok(upsertBlock.includes('upsertDtrReportSnapshotAtFulfillment'));
  });

  it('fulfillment does not activate hybrid runtime inline', () => {
    assert.equal(FULFILLMENT_SRC.includes('DTR_HYBRID_AI_FULFILLMENT_RUNTIME_ACTIVATED = true'), false);
    assert.equal(FULFILLMENT_SRC.includes('createMockHybridAiProvider'), false);
    assert.equal(FULFILLMENT_SRC.includes('runHybridAiSnapshotGeneration'), false);
  });

  it('grant order unchanged — included reply before snapshot upsert', () => {
    const fulfillBlock = FULFILLMENT_SRC.slice(
      FULFILLMENT_SRC.indexOf('await grantInitialIncludedReplyIfNeeded(db'),
    );
    assert.ok(
      fulfillBlock.indexOf('await grantInitialIncludedReplyIfNeeded(db') <
        fulfillBlock.indexOf('resolveFulfillmentSnapshotGenerationDbPayload()'),
    );
    assert.ok(
      fulfillBlock.indexOf('resolveFulfillmentSnapshotGenerationDbPayload()') <
        fulfillBlock.indexOf('upsertDtrReportSnapshotAtFulfillment({'),
    );
  });
});

// ── Boundary safety ───────────────────────────────────────────────────────────

describe('Fulfillment snapshot generation hook — boundary safety', () => {
  it('hook source does not read process.env in executable code', () => {
    const codeOnly = HOOK_SRC.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
    assert.ok(!codeOnly.includes('process.env'));
  });

  it('hook source does not call fetch', () => {
    assert.ok(!HOOK_SRC.includes('fetch('));
  });

  it('hook source does not import supabase or checkout module paths', () => {
    assert.ok(!HOOK_SRC.includes("from '../supabase"));
    assert.ok(!HOOK_SRC.includes("from './supabase"));
    assert.ok(!HOOK_SRC.includes('getSupabaseAdmin'));
    assert.ok(!HOOK_SRC.includes("from '../stripe"));
    assert.ok(!HOOK_SRC.includes("from './dtrCoreCheckoutFulfillment"));
  });

  it('hook source does not import consult/reply/ticket paths', () => {
    assert.ok(!HOOK_SRC.includes("from './reply"));
    assert.ok(!HOOK_SRC.includes('consult'));
    assert.ok(!HOOK_SRC.includes('ticket'));
  });

  it('hook source does not contain birth-time or forbidden copy phrases', () => {
    assert.ok(!HOOK_SRC.includes('生まれ時刻'));
    assert.ok(!HOOK_SRC.includes('読み取りです'));
    assert.ok(!HOOK_SRC.includes('このタイプ'));
    assert.ok(!HOOK_SRC.includes('miさん'));
  });
});
