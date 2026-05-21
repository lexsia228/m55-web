import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { resetCalendarBundleCacheForTests } from '../calendar/loadCalendarBundle';
import { GOLDEN_1983_02_28_V2 } from './pipeline.golden.test';
import { runM55CompositeStemPipeline } from './pipeline';
import { buildV2FulfillmentSnapshotFromFields } from './buildV2FulfillmentSnapshot';
import { isCompositeV2FulfillmentWriteEnabled } from './featureFlag';
import {
  isV2FulfillmentProfileComplete,
  resolveFulfillmentProfileFields,
} from './parseFulfillmentMetadata';
import { M55CompositeStemError } from './types';
import { ENGINE_VERSION_V2 } from './constants';
import { essenceStemLaneIndex } from '../essenceEngine';

const GOLDEN_FULFILLMENT_FIELDS = {
  nickname: 'golden',
  birthDate: '1983-02-28',
  birthTime: '12:00:00',
  birthTimeUnknown: false,
  country: 'JP',
  birthplace: '東京都',
  timezone: 'Asia/Tokyo',
};

test('GOLDEN_1983_02_28_V2 pipeline — GX-01 still pass', () => {
  resetCalendarBundleCacheForTests();
  const result = runM55CompositeStemPipeline(GOLDEN_1983_02_28_V2);
  assert.equal(result.stemLaneIndex, 9);
  assert.equal(result.stemChar, '癸');
  assert.equal(result.paid.publicTitle, 'アナリスト');
});

test('v2 context builder — 1983 golden fulfillment snapshot', () => {
  resetCalendarBundleCacheForTests();
  const built = buildV2FulfillmentSnapshotFromFields(GOLDEN_FULFILLMENT_FIELDS);

  assert.equal(built.engine_version, ENGINE_VERSION_V2);
  assert.equal(built.profile_snapshot.engineVersion, ENGINE_VERSION_V2);
  assert.equal(built.profile_snapshot.calculationMode, 'full');
  assert.equal(built.envelope_json.engineVersion, ENGINE_VERSION_V2);
  assert.equal(built.envelope_json.contractVersion, 'v2');
  assert.equal(built.envelope_json.auditMeta.stemLaneIndex, 9);
  assert.equal(built.envelope_json.auditMeta.stemChar, '癸');
  assert.equal(built.engine_context_json.stemLaneIndex, 9);
  assert.equal(built.engine_context_json.stemChar, '癸');
  assert.ok(built.engine_context_json.boundaryMetadata.lunarDayKey);
  assert.ok(built.engine_context_json.boundaryMetadata.solarTermKey);
  assert.equal(built.engine_context_json.boundaryMetadata.lunarYearKey, 1983);
});

test('legacy path — flag off omits v2 engine columns in builder contract', () => {
  const prev = process.env.M55_COMPOSITE_ENGINE_V2_FULFILLMENT_WRITE_ENABLED;
  process.env.M55_COMPOSITE_ENGINE_V2_FULFILLMENT_WRITE_ENABLED = 'false';
  assert.equal(isCompositeV2FulfillmentWriteEnabled(), false);
  const legacyStem = essenceStemLaneIndex('1983-02-28');
  assert.equal(legacyStem, 3);
  if (prev === undefined) delete process.env.M55_COMPOSITE_ENGINE_V2_FULFILLMENT_WRITE_ENABLED;
  else process.env.M55_COMPOSITE_ENGINE_V2_FULFILLMENT_WRITE_ENABLED = prev;
});

test('fail-closed — incomplete v2 profile', () => {
  assert.equal(
    isV2FulfillmentProfileComplete({
      ...GOLDEN_FULFILLMENT_FIELDS,
      birthTime: null,
      birthTimeUnknown: false,
    }),
    false,
  );
  assert.throws(
    () =>
      buildV2FulfillmentSnapshotFromFields({
        ...GOLDEN_FULFILLMENT_FIELDS,
        birthTime: null,
        birthTimeUnknown: false,
      }),
    (e: unknown) => e instanceof M55CompositeStemError && e.code === 'M55_COMPOSITE_INCOMPLETE_PROFILE',
  );
});

test('fail-closed — no JDN fallback in v2 builder', () => {
  resetCalendarBundleCacheForTests();
  const built = buildV2FulfillmentSnapshotFromFields(GOLDEN_FULFILLMENT_FIELDS);
  assert.notEqual(built.engine_context_json.stemLaneIndex, essenceStemLaneIndex('1983-02-28'));
});

test('dtrDraftDb — insert-only, no UPDATE/DELETE/backfill in source', () => {
  const src = readFileSync(new URL('../dtrDraftDb.ts', import.meta.url), 'utf8');
  assert.equal(/\.\s*update\s*\(/i.test(src), false);
  assert.equal(/\bDELETE\b/i.test(src), false);
  assert.equal(/backfill/i.test(src), false);
  assert.ok(src.includes('.insert('));
  assert.ok(src.includes('if (existing)'));
});
