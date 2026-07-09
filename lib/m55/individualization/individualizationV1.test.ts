import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  buildAlignDivergeItemsV1,
  pickFreeAlignDivergeItemV1,
} from './alignDivergeV1';
import {
  buildIndividualizationDraftSnapshotV1,
  buildIndividualizationFingerprintV1,
} from './buildIndividualizationV1';
import { buildDobAxisLookupV1, dayBandFromDay } from './dobAxisLookupV1';
import { buildFreeExpressionV1 } from './freeExpressionV1';
import { buildIndividualizationOutputHashV1 } from './outputHashV1';
import { mapPrimaryThemeToReplyThemeV1 } from './primaryThemeReplyMapV1';
import { buildReplyAffinityV1 } from './replyAffinityV1';
import { buildIntensityV1, buildHesitationV1 } from './signalsV1';
import { buildPaidDepthV1 } from './paidDepthV1';

function freeSet(overrides: Partial<Record<string, string>> = {}): Record<string, string> {
  return {
    'free.start_style': 'free.start_style.map_first',
    'free.decision_style': 'free.decision_style.sort_first',
    'free.recovery_style': 'free.recovery_style.pause_short',
    'free.distance_style': 'free.distance_style.close_careful',
    'free.change_style': 'free.change_style.observe_first',
    'free.primary_theme': 'free.primary_theme.work',
    ...overrides,
  };
}

function paidSet(overrides: Partial<Record<string, string>> = {}): Record<string, string> {
  return {
    'paid.work_focus': 'paid.work_focus.priority',
    'paid.decision_friction': 'paid.decision_friction.too_many',
    'paid.relation_focus': 'paid.relation_focus.words',
    'paid.fatigue_signal': 'paid.fatigue_signal.after_push',
    'paid.report_usage': 'paid.report_usage.reread_scene',
    'paid.reading_style': 'paid.reading_style.headline',
    ...overrides,
  };
}

describe('dal-v1 dobAxisLookup', () => {
  it('dayBand thresholds', () => {
    assert.equal(dayBandFromDay(1), 'early');
    assert.equal(dayBandFromDay(10), 'early');
    assert.equal(dayBandFromDay(11), 'mid');
    assert.equal(dayBandFromDay(20), 'mid');
    assert.equal(dayBandFromDay(21), 'late');
  });

  it('2/29 → late', () => {
    const r = buildDobAxisLookupV1({ birthDate: '2000-02-29', stemLaneIndex: 0 });
    assert.equal(r.ok, true);
    if (!r.ok) return;
    assert.equal(r.value.internalSelectors.dayBand, 'late');
    assert.equal(r.value.dobBase.axes.start, 'ask');
  });

  it('invalid DOB fail-closed', () => {
    assert.equal(buildDobAxisLookupV1({ birthDate: '2000-13-01', stemLaneIndex: 0 }).ok, false);
    assert.equal(buildDobAxisLookupV1({ birthDate: 'not-a-date', stemLaneIndex: 0 }).ok, false);
    assert.equal(buildDobAxisLookupV1({ birthDate: '2001-02-29', stemLaneIndex: 0 }).ok, false);
  });

  it('missing stem fail-closed', () => {
    assert.equal(
      buildDobAxisLookupV1({ birthDate: '1990-04-15', stemLaneIndex: Number.NaN }).ok,
      false,
    );
    assert.equal(buildDobAxisLookupV1({ birthDate: '1990-04-15', stemLaneIndex: 10 }).ok, false);
  });

  it('same DOB → same axes', () => {
    const a = buildDobAxisLookupV1({ birthDate: '1992-12-19', stemLaneIndex: 3 });
    const b = buildDobAxisLookupV1({ birthDate: '1992-12-19', stemLaneIndex: 3 });
    assert.equal(a.ok && b.ok, true);
    if (!a.ok || !b.ok) return;
    assert.deepEqual(a.value.dobBase.axes, b.value.dobBase.axes);
    assert.equal(a.value.dobBase.dobFp, b.value.dobBase.dobFp);
  });

  it('start lookup by dayBand', () => {
    const early = buildDobAxisLookupV1({ birthDate: '1990-01-05', stemLaneIndex: 0 });
    const mid = buildDobAxisLookupV1({ birthDate: '1990-01-15', stemLaneIndex: 0 });
    const late = buildDobAxisLookupV1({ birthDate: '1990-01-25', stemLaneIndex: 0 });
    assert.equal(early.ok && mid.ok && late.ok, true);
    if (!early.ok || !mid.ok || !late.ok) return;
    assert.equal(early.value.dobBase.axes.start, 'try');
    assert.equal(mid.value.dobBase.axes.start, 'map');
    assert.equal(late.value.dobBase.axes.start, 'ask');
  });

  it('decision table 9 cells', () => {
    // season3 = (month-1)%3; pick dayBands via day 5/15/25; months 1,2,3 → season 0,1,2
    const cases: Array<{
      birthDate: string;
      expected: 'sort' | 'deadline' | 'wait';
    }> = [
      { birthDate: '1990-01-05', expected: 'sort' }, // early, season0
      { birthDate: '1990-02-05', expected: 'deadline' }, // early, season1
      { birthDate: '1990-03-05', expected: 'wait' }, // early, season2
      { birthDate: '1990-01-15', expected: 'deadline' }, // mid, season0
      { birthDate: '1990-02-15', expected: 'wait' }, // mid, season1
      { birthDate: '1990-03-15', expected: 'sort' }, // mid, season2
      { birthDate: '1990-01-25', expected: 'wait' }, // late, season0
      { birthDate: '1990-02-25', expected: 'sort' }, // late, season1
      { birthDate: '1990-03-25', expected: 'deadline' }, // late, season2
    ];
    for (const c of cases) {
      const r = buildDobAxisLookupV1({ birthDate: c.birthDate, stemLaneIndex: 0 });
      assert.equal(r.ok, true, c.birthDate);
      if (!r.ok) continue;
      assert.equal(r.value.dobBase.axes.decision, c.expected, c.birthDate);
    }
  });

  it('recovery / distance / change tables', () => {
    const r = buildDobAxisLookupV1({ birthDate: '1990-01-15', stemLaneIndex: 4 });
    assert.equal(r.ok, true);
    if (!r.ok) return;
    // Jan → monthBand 0 → season3 0 → pause
    assert.equal(r.value.dobBase.axes.recovery, 'pause');
    // 4 % 3 = 1 → middle
    assert.equal(r.value.dobBase.axes.distance, 'middle');
    // dayBand mid=1; (4+1)%3=2 → rebuild
    assert.equal(r.value.dobBase.axes.change, 'rebuild');
  });
});

describe('ptrm-v1', () => {
  it('maps five primary themes', () => {
    const pairs: Array<[string, string, string]> = [
      ['free.primary_theme.work', 'work', 'tendency'],
      ['free.primary_theme.relation', 'relation', 'fatigue'],
      ['free.primary_theme.fatigue', 'fatigue', 'relation'],
      ['free.primary_theme.tendency', 'tendency', 'report'],
      ['free.primary_theme.report_preview', 'report', 'tendency'],
    ];
    for (const [aid, primary, secondary] of pairs) {
      const r = mapPrimaryThemeToReplyThemeV1(aid);
      assert.equal(r.ok, true);
      if (!r.ok) continue;
      assert.equal(r.value.primaryReplyTheme, primary);
      assert.equal(r.value.secondaryReplyTheme, secondary);
    }
  });
});

describe('align/diverge + free pick', () => {
  it('same DOB different free changes align/diverge', () => {
    const dob = buildDobAxisLookupV1({ birthDate: '1990-01-15', stemLaneIndex: 0 });
    assert.equal(dob.ok, true);
    if (!dob.ok) return;
    const a = freeSet({
      'free.start_style': 'free.start_style.map_first', // mid expects map → align start
    });
    const b = freeSet({
      'free.start_style': 'free.start_style.try_first', // diverge start
    });
    const fa = buildFreeExpressionV1({ freeAnswerSet: a });
    const fb = buildFreeExpressionV1({ freeAnswerSet: b });
    assert.equal(fa.ok && fb.ok, true);
    if (!fa.ok || !fb.ok) return;
    const ia = buildAlignDivergeItemsV1({
      dobAxes: dob.value.dobBase.axes,
      freeAxes: fa.value.axes,
      freeAnswerSet: a,
    });
    const ib = buildAlignDivergeItemsV1({
      dobAxes: dob.value.dobBase.axes,
      freeAxes: fb.value.axes,
      freeAnswerSet: b,
    });
    assert.equal(ia.ok && ib.ok, true);
    if (!ia.ok || !ib.ok) return;
    assert.notDeepEqual(ia.value, ib.value);
  });

  it('evidenceAnswerIds >= 1 and diverge priority pick', () => {
    const dob = buildDobAxisLookupV1({ birthDate: '1990-01-15', stemLaneIndex: 0 });
    assert.equal(dob.ok, true);
    if (!dob.ok) return;
    // mid+stem0: start=map, distance=close; force diverge on distance and recovery
    const set = freeSet({
      'free.start_style': 'free.start_style.map_first',
      'free.distance_style': 'free.distance_style.solo_reset',
      'free.recovery_style': 'free.recovery_style.shrink_task',
    });
    const free = buildFreeExpressionV1({ freeAnswerSet: set });
    assert.equal(free.ok, true);
    if (!free.ok) return;
    const items = buildAlignDivergeItemsV1({
      dobAxes: dob.value.dobBase.axes,
      freeAxes: free.value.axes,
      freeAnswerSet: set,
    });
    assert.equal(items.ok, true);
    if (!items.ok) return;
    for (const it of [...items.value.alignItems, ...items.value.divergeItems]) {
      assert.ok(it.evidenceAnswerIds.length >= 1);
    }
    const pick = pickFreeAlignDivergeItemV1(items.value);
    assert.ok(pick);
    assert.equal(pick!.relation, 'diverge');
    assert.equal(pick!.axisId, 'distance');
  });
});

describe('paid / signals / affinity', () => {
  it('intensity from chapterBias concentration', () => {
    const paid = buildPaidDepthV1({ paidAnswerSet: paidSet() });
    assert.equal(paid.ok, true);
    if (!paid.ok || !paid.value) return;
    const intensity = buildIntensityV1({ paidDepth: paid.value });
    assert.ok(['low', 'mid', 'high'].includes(intensity.level));
  });

  it('hesitation drivers from decision friction', () => {
    const h = buildHesitationV1({
      freeAnswerSet: freeSet(),
      paidAnswerSet: paidSet({
        'paid.decision_friction': 'paid.decision_friction.unclear_end',
      }),
    });
    assert.equal(h.present, true);
    assert.equal(h.chapterHint, 'III');
  });

  it('replyAffinity has no score key; primary map +3 path', () => {
    const fp = buildIndividualizationFingerprintV1({
      birthDate: '1990-01-15',
      stemLaneIndex: 0,
      freeAnswerSet: freeSet({ 'free.primary_theme': 'free.primary_theme.work' }),
      paidAnswerSet: paidSet(),
    });
    assert.equal(fp.ok, true);
    if (!fp.ok) return;
    const json = JSON.stringify(fp.value.fingerprint.replyAffinity);
    assert.equal(json.includes('"score"'), false);
    assert.ok(fp.value.fingerprint.replyAffinity.ranked.length >= 1);
    assert.equal(fp.value.fingerprint.replyAffinity.ranked[0]!.replyThemeId, 'work');
    for (const row of fp.value.fingerprint.replyAffinity.ranked) {
      assert.ok(row.evidenceAnswerIds.length >= 1);
      assert.ok(row.reasonCodes.length >= 1);
    }
  });

  it('buildReplyAffinityV1 does not expose score', () => {
    const free = buildFreeExpressionV1({ freeAnswerSet: freeSet() });
    assert.equal(free.ok, true);
    if (!free.ok) return;
    const aff = buildReplyAffinityV1({
      freeExpression: free.value,
      paidDepth: null,
      paidAnswerSet: null,
      divergeItems: [],
      hesitation: { present: false, drivers: [], chapterHint: null },
    });
    assert.equal(Object.prototype.hasOwnProperty.call(aff, 'score'), false);
    assert.equal(Object.prototype.hasOwnProperty.call(aff.ranked[0] ?? {}, 'score'), false);
  });
});

describe('gmfn draft + outputHash + anti-template', () => {
  it('camelCase exact keys and denylist absent; no birthDate in output', () => {
    const draft = buildIndividualizationDraftSnapshotV1({
      birthDate: '1990-01-15',
      stemLaneIndex: 1,
      freeAnswerSet: freeSet(),
      paidAnswerSet: paidSet(),
      engineVersion: 'engine-test',
      catalogVersion: 'catalog-test',
      reportLogicVersion: 'report-test',
      generatedAt: '2026-07-09T00:00:00.000Z',
      templateBlockIds: ['b2', 'b1'],
      includeInternalSelectors: true,
    });
    assert.equal(draft.ok, true);
    if (!draft.ok) return;
    const o = draft.value;
    assert.equal(o.fingerprint.fingerprintSpecVersion, 'fp-v1');
    assert.equal(o.fingerprint.dobAxisLookupVersion, 'dal-v1');
    assert.equal(o.fingerprint.primaryThemeReplyMapVersion, 'ptrm-v1');
    assert.ok(o.fingerprint.dobBase.dobFp);
    assert.ok(o.questionnaire.freeAnswerHash);
    assert.ok(o.questionnaire.paidAnswerHash);
    assert.equal(o.audit.sourceVersions.fieldNamingVersion, 'gmfn-v1');

    const raw = JSON.stringify(o);
    for (const bad of [
      'diagnosis',
      'consultation',
      'advice',
      'fortune',
      'horoscope',
      'rawPrompt',
      'rawResponse',
      'systemPrompt',
      'stripeSecret',
      'clerkSecret',
      'serviceRole',
      'userId',
      'email',
      '"birthDate"',
      '相談返書',
      '相談サービス',
    ]) {
      assert.equal(raw.includes(bad), false, bad);
    }
    assert.equal(raw.includes('"score"'), false);
  });

  it('outputHash includes required versions and hashes', () => {
    const a = buildIndividualizationDraftSnapshotV1({
      birthDate: '1990-01-15',
      stemLaneIndex: 1,
      freeAnswerSet: freeSet(),
      paidAnswerSet: paidSet(),
      engineVersion: 'e1',
      catalogVersion: 'c1',
      reportLogicVersion: 'r1',
      generatedAt: '2026-07-09T00:00:00.000Z',
      templateBlockIds: ['x'],
    });
    assert.equal(a.ok, true);
    if (!a.ok) return;
    const h = buildIndividualizationOutputHashV1({
      dobFp: a.value.fingerprint.dobBase.dobFp,
      freeAnswerHash: a.value.questionnaire.freeAnswerHash,
      paidAnswerHash: a.value.questionnaire.paidAnswerHash ?? '',
      templateBlockIds: a.value.audit.templateBlockIds,
      engineVersion: 'e1',
      catalogVersion: 'c1',
      reportLogicVersion: 'r1',
    });
    assert.equal(h, a.value.audit.outputHash);
    assert.equal(h.length, 64);
  });

  it('same DOB same free different paid changes fingerprint paidDepth', () => {
    const base = {
      birthDate: '1990-01-15',
      stemLaneIndex: 2,
      freeAnswerSet: freeSet(),
      engineVersion: 'e',
      catalogVersion: 'c',
      reportLogicVersion: 'r',
      generatedAt: '2026-07-09T00:00:00.000Z',
    };
    const d1 = buildIndividualizationDraftSnapshotV1({
      ...base,
      paidAnswerSet: paidSet({ 'paid.work_focus': 'paid.work_focus.priority' }),
    });
    const d2 = buildIndividualizationDraftSnapshotV1({
      ...base,
      paidAnswerSet: paidSet({
        'paid.work_focus': 'paid.work_focus.pace',
        'paid.decision_friction': 'paid.decision_friction.fear_mistake',
        'paid.relation_focus': 'paid.relation_focus.timing',
        'paid.fatigue_signal': 'paid.fatigue_signal.long_stretch',
      }),
    });
    assert.equal(d1.ok && d2.ok, true);
    if (!d1.ok || !d2.ok) return;
    assert.notDeepEqual(d1.value.fingerprint.paidDepth, d2.value.fingerprint.paidDepth);
    assert.notEqual(d1.value.audit.outputHash, d2.value.audit.outputHash);
  });

  it('does not mutate input objects', () => {
    const freeAnswerSet = freeSet();
    const paidAnswerSet = paidSet();
    const freeSnap = JSON.stringify(freeAnswerSet);
    const paidSnap = JSON.stringify(paidAnswerSet);
    const r = buildIndividualizationFingerprintV1({
      birthDate: '1990-06-10',
      stemLaneIndex: 5,
      freeAnswerSet,
      paidAnswerSet,
    });
    assert.equal(r.ok, true);
    assert.equal(JSON.stringify(freeAnswerSet), freeSnap);
    assert.equal(JSON.stringify(paidAnswerSet), paidSnap);
  });

  it('free-only draft keeps paidDepth null and empty paid hash in outputHash path', () => {
    const d = buildIndividualizationDraftSnapshotV1({
      birthDate: '1990-01-15',
      stemLaneIndex: 0,
      freeAnswerSet: freeSet(),
      paidAnswerSet: null,
      engineVersion: 'e',
      catalogVersion: 'c',
      reportLogicVersion: 'r',
      generatedAt: '2026-07-09T00:00:00.000Z',
    });
    assert.equal(d.ok, true);
    if (!d.ok) return;
    assert.equal(d.value.fingerprint.paidDepth, null);
    assert.equal(d.value.questionnaire.paidVersion, null);
  });
});
