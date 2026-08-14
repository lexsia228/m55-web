import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { resolveCanonicalBirthProfileV2 } from './canonicalBirthProfileV2';
import { resolveCoreStemAuthority, birthProfileFromNormalizeInput } from '../coreResult/resolveCoreStemAuthority';
import { essenceStemLaneIndex } from '../essenceEngine';
import { composePaidIndividualizationFromEngineContext } from '../dtrPaidIndividualizationCompose';
import { birthProfileToFulfillmentFields } from '../compositeStem/fulfillmentProfileFields';
import {
  isV2FulfillmentProfileComplete,
  toCompositeCanonicalInput,
} from '../compositeStem/parseFulfillmentMetadata';
import { runM55CompositeStemPipelineClient } from '../compositeStem/pipeline.client';
import { ENGINE_VERSION_V2 } from '../compositeStem/constants';
import { DOB_PERSONALIZATION_V21_CATALOG_VERSION } from '../dtrDobPersonalizationV2';

const FIXTURES = [
  '1983-02-28',
  '1992-12-19',
  '1919-11-01',
  '2000-02-29',
  '2024-02-29',
  '1999-12-31',
  '2000-01-01',
  '1990-05-14',
  '1992-08-20',
] as const;

describe('canonical birth profile v2 stem authority', () => {
  it('matches Core and Premium composite stem, not essenceStemLaneIndex', () => {
    for (const birthDate of FIXTURES) {
      const profile = resolveCanonicalBirthProfileV2({ birthDate });
      assert.equal(profile.ok, true, birthDate);
      if (!profile.ok) continue;
      const core = resolveCoreStemAuthority(
        birthProfileFromNormalizeInput({ birthDate, country: 'JP' }),
      );
      assert.ok(core, birthDate);
      assert.equal(profile.value.stemLane, core!.stemLaneIndex, birthDate);
      assert.equal(profile.value.sourceVersion, ENGINE_VERSION_V2);

      const fields = birthProfileToFulfillmentFields(
        birthProfileFromNormalizeInput({ birthDate, country: 'JP' }),
      );
      assert.ok(fields && isV2FulfillmentProfileComplete(fields));
      const composite = runM55CompositeStemPipelineClient(toCompositeCanonicalInput(fields!));
      assert.equal(profile.value.stemLane, composite.stemLaneIndex, `premium ${birthDate}`);

      const legacy = essenceStemLaneIndex(birthDate);
      if (birthDate === '1983-02-28' || birthDate === '1992-12-19') {
        assert.notEqual(profile.value.stemLane, legacy, `legacy divergence ${birthDate}`);
      }
    }
  });

  it('is deterministic and year-sensitive through lunar/solar, not a second calendar', () => {
    const a = resolveCanonicalBirthProfileV2({ birthDate: '1983-02-28' });
    const b = resolveCanonicalBirthProfileV2({ birthDate: '1983-02-28' });
    const c = resolveCanonicalBirthProfileV2({ birthDate: '1993-02-28' });
    assert.equal(a.ok && b.ok, true);
    if (!a.ok || !b.ok || !c.ok) return;
    assert.equal(a.value.stableFingerprint, b.value.stableFingerprint);
    assert.notEqual(a.value.stableFingerprint, c.value.stableFingerprint);
  });

  it('feeds the existing DTR v2.1 catalog without discarding stem×band×season×lunar', () => {
    const profile = resolveCanonicalBirthProfileV2({ birthDate: '1983-02-28' });
    assert.equal(profile.ok, true);
    if (!profile.ok) return;
    const fields = birthProfileToFulfillmentFields(
      birthProfileFromNormalizeInput({ birthDate: '1983-02-28', country: 'JP' }),
    );
    const composite = runM55CompositeStemPipelineClient(toCompositeCanonicalInput(fields!));
    const ind = composePaidIndividualizationFromEngineContext({
      engineVersion: composite.engineVersion,
      inputVersion: composite.inputVersion,
      correctionVersion: composite.correctionVersion,
      calculationMode: composite.calculationMode,
      stemLaneIndex: composite.stemLaneIndex,
      stemChar: composite.stemChar,
      normalizedBirthContext: composite.normalizedBirthContext,
      boundaryMetadata: composite.boundaryMetadata,
      staticFingerprint: composite.staticFingerprint,
      displayFingerprint: composite.displayFingerprint,
      paidIndividualizationVersion: 'v2',
      dobPersonalizationCatalogVersion: DOB_PERSONALIZATION_V21_CATALOG_VERSION,
    });
    assert.ok(ind.s1IdentityRhythmNote);
    assert.ok(ind.s2CompositionRhythmNote);
    assert.equal(profile.value.stemLane, composite.stemLaneIndex);
  });
});
