import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { resolveCanonicalBirthProfileV2 } from '../individualization/canonicalBirthProfileV2';
import { buildFreeDepthAnalysisV1 } from './buildFreeDepthAnalysisV1';
import { composePaidIndividualizationFromEngineContext } from '../dtrPaidIndividualizationCompose';
import { birthProfileFromNormalizeInput } from '../coreResult/resolveCoreStemAuthority';
import { birthProfileToFulfillmentFields } from '../compositeStem/fulfillmentProfileFields';
import {
  isV2FulfillmentProfileComplete,
  toCompositeCanonicalInput,
} from '../compositeStem/parseFulfillmentMetadata';
import { runM55CompositeStemPipelineClient } from '../compositeStem/pipeline.client';
import { DOB_PERSONALIZATION_V21_CATALOG_VERSION } from '../dtrDobPersonalizationV2';

const STARTS = ['try_first', 'map_first', 'ask_first'] as const;
const DECISIONS = ['sort_first', 'deadline_first', 'wait_first'] as const;
const RECOVERIES = ['pause_short', 'shrink_task', 'change_scene'] as const;
const DISTANCES = ['middle_steady', 'close_careful', 'solo_reset'] as const;
const CHANGES = ['adjust_fast', 'observe_first', 'rebuild_slow'] as const;

function mulberry32(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function answersAt(i: number): Record<string, string> {
  return {
    'free.start_style': `free.start_style.${STARTS[i % 3]}`,
    'free.decision_style': `free.decision_style.${DECISIONS[Math.floor(i / 3) % 3]}`,
    'free.recovery_style': `free.recovery_style.${RECOVERIES[Math.floor(i / 9) % 3]}`,
    'free.distance_style': `free.distance_style.${DISTANCES[Math.floor(i / 27) % 3]}`,
    'free.change_style': `free.change_style.${CHANGES[Math.floor(i / 81) % 3]}`,
    'free.primary_theme': 'free.primary_theme.report_preview',
  };
}

function iso(y: number, m: number, d: number): string {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

describe('personalization resolution v2 personal cohort', () => {
  it('1000 synthetic users: complete-reading collision among distinct profiles stays low', () => {
    const rng = mulberry32(0x4d3535);
    const rows: { key: string; opening: string; first: string; pattern: string }[] = [];
    for (let i = 0; i < 1000; i += 1) {
      const y = 1950 + Math.floor(rng() * 70);
      const m = 1 + Math.floor(rng() * 12);
      const d = 1 + Math.floor(rng() * 28);
      const birthDate = iso(y, m, d);
      const profile = resolveCanonicalBirthProfileV2({ birthDate });
      if (!profile.ok) continue;
      const freeAnswerSet = answersAt(i);
      const built = buildFreeDepthAnalysisV1({ birthDate, freeAnswerSet });
      if (!built.ok) continue;
      rows.push({
        key: `${profile.value.stableFingerprint}|${i % 243}`,
        opening: built.value.headlineJa,
        first: built.value.headlineJa.split('。')[0] ?? '',
        pattern: built.value.manifestationJa.slice(0, 12),
      });
    }
    assert.ok(rows.length >= 900, `resolved ${rows.length}`);
    const byOpening = new Map<string, Set<string>>();
    for (const row of rows) {
      const set = byOpening.get(row.opening) ?? new Set();
      set.add(row.key);
      byOpening.set(row.opening, set);
    }
    const distinctKeys = new Set(rows.map((r) => r.key)).size;
    let colliding = 0;
    let largest = 0;
    for (const set of byOpening.values()) {
      if (set.size > 1) colliding += set.size;
      if (set.size > largest) largest = set.size;
    }
    const share = colliding / distinctKeys;
    assert.ok(share <= 0.02, `complete-reading colliding share ${share} largest ${largest}`);
    assert.ok(largest <= 3, `largest cluster ${largest}`);
  });

  it('Premium DTR v2.1 concatenations stay unique across stem×band×season×lunar and consume answers as application not paraphrase', () => {
    const a = resolveCanonicalBirthProfileV2({ birthDate: '1983-02-28' });
    const b = resolveCanonicalBirthProfileV2({ birthDate: '1990-05-14' });
    assert.equal(a.ok && b.ok, true);
    if (!a.ok || !b.ok) return;
    const fieldsA = birthProfileToFulfillmentFields(
      birthProfileFromNormalizeInput({ birthDate: '1983-02-28', country: 'JP' }),
    );
    const fieldsB = birthProfileToFulfillmentFields(
      birthProfileFromNormalizeInput({ birthDate: '1990-05-14', country: 'JP' }),
    );
    const ca = runM55CompositeStemPipelineClient(toCompositeCanonicalInput(fieldsA!));
    const cb = runM55CompositeStemPipelineClient(toCompositeCanonicalInput(fieldsB!));
    assert.ok(isV2FulfillmentProfileComplete(fieldsA!));
    const ia = composePaidIndividualizationFromEngineContext({
      engineVersion: ca.engineVersion,
      inputVersion: ca.inputVersion,
      correctionVersion: ca.correctionVersion,
      calculationMode: ca.calculationMode,
      stemLaneIndex: ca.stemLaneIndex,
      stemChar: ca.stemChar,
      normalizedBirthContext: ca.normalizedBirthContext,
      boundaryMetadata: ca.boundaryMetadata,
      staticFingerprint: ca.staticFingerprint,
      displayFingerprint: ca.displayFingerprint,
      paidIndividualizationVersion: 'v2',
      dobPersonalizationCatalogVersion: DOB_PERSONALIZATION_V21_CATALOG_VERSION,
    });
    const ib = composePaidIndividualizationFromEngineContext({
      engineVersion: cb.engineVersion,
      inputVersion: cb.inputVersion,
      correctionVersion: cb.correctionVersion,
      calculationMode: cb.calculationMode,
      stemLaneIndex: cb.stemLaneIndex,
      stemChar: cb.stemChar,
      normalizedBirthContext: cb.normalizedBirthContext,
      boundaryMetadata: cb.boundaryMetadata,
      staticFingerprint: cb.staticFingerprint,
      displayFingerprint: cb.displayFingerprint,
      paidIndividualizationVersion: 'v2',
      dobPersonalizationCatalogVersion: DOB_PERSONALIZATION_V21_CATALOG_VERSION,
    });
    assert.notEqual(ia.s1IdentityRhythmNote, ib.s1IdentityRhythmNote);
    const freeA = buildFreeDepthAnalysisV1({
      birthDate: '1983-02-28',
      freeAnswerSet: answersAt(0),
    });
    assert.equal(freeA.ok, true);
    if (!freeA.ok) return;
    assert.ok(ia.s1IdentityRhythmNote && !freeA.value.headlineJa.includes(ia.s1IdentityRhythmNote.slice(0, 18)));
  });
});
