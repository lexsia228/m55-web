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
import { pickManifestationAxes } from './personalFreeManifestationV4';
import { resolveFreeAxes } from './buildFreeFiveViewCompositionV1';
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
    const rows: {
      key: string;
      opening: string;
      displayKey: string;
    }[] = [];
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
      const free = resolveFreeAxes(freeAnswerSet);
      if (!free.ok) continue;
      const dim = profile.value.birthSignature.dimensions;
      const modifiers = {
        stemLane: profile.value.stemLane,
        lunarMonth: profile.value.lunarMonth,
        season3: profile.value.season3,
        dayBand: profile.value.dayBand,
        tensionIds: profile.value.tensionIds,
      };
      const [primary, second] = pickManifestationAxes(dim, free.value.axes, modifiers);
      rows.push({
        key: `${profile.value.stableFingerprint}|${i % 243}`,
        opening: built.value.headlineJa,
        displayKey: [
          primary,
          dim[primary],
          free.value.axes[primary],
          dim.start,
          free.value.axes.start,
          second ?? '',
          second ? dim[second] : '',
          second ? free.value.axes[second] : '',
          profile.value.stemLane,
          profile.value.lunarMonth,
        ].join('|'),
      });
    }
    assert.ok(rows.length >= 900, `resolved ${rows.length}`);
    const byOpening = new Map<string, typeof rows>();
    for (const row of rows) {
      const list = byOpening.get(row.opening) ?? [];
      list.push(row);
      byOpening.set(row.opening, list);
    }
    const distinctKeys = new Set(rows.map((r) => r.key)).size;
    let defectColliding = 0;
    let largestDefect = 0;
    let defectClusters = 0;
    for (const list of byOpening.values()) {
      const keys = new Set(list.map((r) => r.key));
      if (keys.size <= 1) continue;
      const displayKeys = new Set(list.map((r) => r.displayKey));
      if (displayKeys.size <= 1) continue;
      defectClusters += 1;
      defectColliding += keys.size;
      if (keys.size > largestDefect) largestDefect = keys.size;
    }
    const defectShare = defectColliding / distinctKeys;
    assert.equal(defectClusters, 0, `INFORMATION_LOSS_DEFECT clusters ${defectClusters}`);
    assert.ok(defectShare <= 0.02, `defective colliding share ${defectShare} largest ${largestDefect}`);
    assert.ok(largestDefect <= 2, `largest defective cluster ${largestDefect}`);

    let dobHits = 0;
    let dobN = 0;
    let ansHits = 0;
    let ansN = 0;
    let detHits = 0;
    const rng2 = mulberry32(0x4d3535);
    for (let i = 0; i < 200; i += 1) {
      const y = 1950 + Math.floor(rng2() * 70);
      const m = 1 + Math.floor(rng2() * 12);
      const d = 1 + Math.floor(rng2() * 28);
      const birthDate = iso(y, m, d);
      const shifted = iso(y === 1990 ? 1983 : 1990, (m % 12) + 1, Math.min(d, 28));
      const a = buildFreeDepthAnalysisV1({ birthDate, freeAnswerSet: answersAt(i) });
      const b = buildFreeDepthAnalysisV1({ birthDate: shifted, freeAnswerSet: answersAt(i) });
      const c = buildFreeDepthAnalysisV1({ birthDate, freeAnswerSet: answersAt(i + 17) });
      const dAgain = buildFreeDepthAnalysisV1({ birthDate, freeAnswerSet: answersAt(i) });
      if (a.ok && b.ok) {
        dobN += 1;
        if (a.value.headlineJa !== b.value.headlineJa) dobHits += 1;
      }
      if (a.ok && c.ok) {
        ansN += 1;
        if (a.value.headlineJa !== c.value.headlineJa) ansHits += 1;
      }
      if (a.ok && dAgain.ok && a.value.headlineJa === dAgain.value.headlineJa) detHits += 1;
    }
    assert.ok(dobHits / dobN >= 0.95, `dob materiality ${dobHits / dobN}`);
    assert.ok(ansHits / ansN >= 0.95, `answer materiality ${ansHits / ansN}`);
    assert.equal(detHits, 200);
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
