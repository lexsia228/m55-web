import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { resetCalendarBundleCacheForTests } from './calendar/loadCalendarBundle';
import { buildV2FulfillmentSnapshotFromFields } from './compositeStem/buildV2FulfillmentSnapshot';
import {
  composePaidIndividualizationFromEngineContext,
  resolvePaidIndividualizationVersion,
} from './dtrPaidIndividualizationCompose';
import { DOB_PERSONALIZATION_V2_CATALOG_VERSION } from './dtrDobPersonalizationV2';

function baseContext() {
  resetCalendarBundleCacheForTests();
  return buildV2FulfillmentSnapshotFromFields({
    nickname: 'synthetic',
    birthDate: '1980-01-07',
    birthTime: '12:00:00',
    birthTimeUnknown: false,
    country: 'JP',
    birthplace: null,
    timezone: 'Asia/Tokyo',
  }).engine_context_json;
}

describe('paid DTR individualization compose', () => {
  it('missing version resolves to v1', () => {
    const ctx = baseContext();
    assert.equal(resolvePaidIndividualizationVersion(ctx), 'v1');
    const ind = composePaidIndividualizationFromEngineContext(ctx);
    assert.equal(ind.version, undefined);
    assert.equal(ind.fingerprint, ctx.displayFingerprint);
    assert.doesNotMatch(ind.essenceRhythmNote, /生年月日の細かなリズム/);
  });

  it('explicit v1 resolves to v1', () => {
    const ctx = { ...baseContext(), paidIndividualizationVersion: 'v1' as const };
    assert.equal(resolvePaidIndividualizationVersion(ctx), 'v1');
    const ind = composePaidIndividualizationFromEngineContext(ctx);
    assert.equal(ind.version, undefined);
    assert.equal(ind.fingerprint, ctx.displayFingerprint);
  });

  it('explicit v2 resolves to v2', () => {
    const ctx = {
      ...baseContext(),
      paidIndividualizationVersion: 'v2' as const,
      dobPersonalizationCatalogVersion: DOB_PERSONALIZATION_V2_CATALOG_VERSION,
    };
    assert.equal(resolvePaidIndividualizationVersion(ctx), 'v2');
    const ind = composePaidIndividualizationFromEngineContext(ctx);
    assert.equal(ind.version, 'v2');
    assert.equal(ind.dobPersonalizationCatalogVersion, DOB_PERSONALIZATION_V2_CATALOG_VERSION);
    assert.match(ind.essenceRhythmNote, /生年月日の細かなリズム/);
  });

  it('compose does not read feature flag and v1 module does not import compose', () => {
    const composeSrc = readFileSync(new URL('./dtrPaidIndividualizationCompose.ts', import.meta.url), 'utf8');
    const v1Src = readFileSync(new URL('./dtrPaidIndividualization.ts', import.meta.url), 'utf8');
    assert.doesNotMatch(composeSrc, /isDobPersonalizationV2FulfillmentEnabled/);
    assert.doesNotMatch(composeSrc, /DOB_PERSONALIZATION_V2_FULFILLMENT_ENABLED/);
    assert.doesNotMatch(composeSrc, /dobPersonalizationFeatureFlag/);
    assert.doesNotMatch(v1Src, /dtrPaidIndividualizationCompose/);
  });
});
