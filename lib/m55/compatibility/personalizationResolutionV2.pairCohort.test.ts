import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildPairFreeInsightSpecV2 } from './pairFreeInsightSpecV2';
import { buildPaidCompatibilityReportV1 } from './buildPaidCompatibilityReportV1';
import { resolvePairCanonicalProfileV2 } from './pairCanonicalProfileV2';
import type { CompatibilityCurrentContextAnswers } from './currentContextContract.v1';

const PACE = ['decide_now', 'decide_later', 'decide_varies'] as const;
const DIS = ['talk_now', 'take_space', 'one_carries'] as const;
const DIST = ['explain_space', 'go_quiet', 'space_is_hard'] as const;
const EXPR = ['words_soon', 'words_later', 'words_vary'] as const;
const RET = ['someone_reaches', 'time_restores', 'return_is_hard'] as const;

function mulberry32(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function answersAt(i: number): CompatibilityCurrentContextAnswers {
  return {
    decisionPace: PACE[i % 3]!,
    disagreement: DIS[Math.floor(i / 3) % 3]!,
    distance: DIST[Math.floor(i / 9) % 3]!,
    expressionPace: EXPR[Math.floor(i / 27) % 3]!,
    returnPattern: RET[Math.floor(i / 81) % 3]!,
    focus: 'conversation_focus',
  };
}

function iso(y: number, m: number, d: number): string {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

describe('personalization resolution v2 pair cohort', () => {
  it('A/B swap stays correct and paid scenes get distinct interaction ids when profiles support them', () => {
    const pair = resolvePairCanonicalProfileV2({
      personABirthDate: '1983-02-28',
      personBBirthDate: '1990-05-14',
    });
    assert.ok(pair);
    const answers = answersAt(4);
    const a = buildPairFreeInsightSpecV2({
      answers,
      pairAxisId: 'A2',
      personABirthDate: '1983-02-28',
      personBBirthDate: '1990-05-14',
      personAUsesFirstPerspective: true,
      focusLabel: '会話の進め方',
    });
    const b = buildPairFreeInsightSpecV2({
      answers,
      pairAxisId: 'A2',
      personABirthDate: '1983-02-28',
      personBBirthDate: '1990-05-14',
      personAUsesFirstPerspective: false,
      focusLabel: '会話の進め方',
    });
    assert.notEqual(a.misreadLoop, b.misreadLoop);
    assert.match(a.betweenThem, /二人の間では/);
    const paid = buildPaidCompatibilityReportV1({
      pairAxisId: 'A2',
      paidTopicId: 'T2',
      relationStatusId: 'R3',
      temperatureId: 'E0',
      personAUsesFirstPerspective: true,
      currentContext: answers,
      personABirthDate: '1983-02-28',
      personBBirthDate: '1990-05-14',
    });
    const ids = new Set(paid.chapters.map((ch) => ch.sceneInteractionId));
    assert.ok(ids.size >= 4, `scene ids ${ids.size}`);
  });

  it('1000 synthetic pairs: Free loop collision among distinct pair profiles is reduced', () => {
    const rng = mulberry32(0x50414952);
    const rows: { key: string; loop: string }[] = [];
    for (let i = 0; i < 1000; i += 1) {
      const a = iso(1955 + Math.floor(rng() * 50), 1 + Math.floor(rng() * 12), 1 + Math.floor(rng() * 28));
      const b = iso(1955 + Math.floor(rng() * 50), 1 + Math.floor(rng() * 12), 1 + Math.floor(rng() * 28));
      const answers = answersAt(i);
      const spec = buildPairFreeInsightSpecV2({
        answers,
        pairAxisId: 'A2',
        personABirthDate: a,
        personBBirthDate: b,
        personAUsesFirstPerspective: true,
        focusLabel: '会話の進め方',
      });
      const pair = resolvePairCanonicalProfileV2({ personABirthDate: a, personBBirthDate: b });
      rows.push({
        key: `${pair?.stableFingerprint ?? a}|${i % 243}`,
        loop: spec.manifestationPatternId,
      });
    }
    const byLoop = new Map<string, Set<string>>();
    for (const row of rows) {
      const set = byLoop.get(row.loop) ?? new Set();
      set.add(row.key);
      byLoop.set(row.loop, set);
    }
    let colliding = 0;
    let largest = 0;
    for (const set of byLoop.values()) {
      if (set.size > 1) colliding += set.size;
      if (set.size > largest) largest = set.size;
    }
    const share = colliding / rows.length;
    assert.ok(byLoop.size >= 200, `unique loops ${byLoop.size}`);
    assert.ok(largest <= 10, `largest cluster ${largest}`);
    assert.ok(share <= 0.05, `colliding share ${share}`);
  });

  it('R1–R10 keep one relationship mechanism without modifier dumps', () => {
    const cases = [
      { id: 'R1', a: '1983-02-28', b: '1990-05-14', ans: 4, swap: false },
      { id: 'R2', a: '1990-05-14', b: '1990-05-15', ans: 10, swap: false },
      { id: 'R3', a: '1955-01-01', b: '2000-12-28', ans: 50, swap: false },
      { id: 'R4', a: '1983-02-28', b: '1990-05-14', ans: 4, swap: true },
      { id: 'R5', a: '1992-08-20', b: '1992-08-21', ans: 0, swap: false },
      { id: 'R6', a: '1977-11-22', b: '2001-09-30', ans: 200, swap: false },
      { id: 'R7', a: '2010-01-05', b: '1948-06-18', ans: 240, swap: false },
      { id: 'R8', a: '1990-05-14', b: '1983-02-28', ans: 4, swap: false },
      { id: 'R9', a: '1968-08-15', b: '1968-08-15', ans: 17, swap: false },
      { id: 'R10', a: '2001-09-30', b: '1977-11-22', ans: 88, swap: false },
    ] as const;
    for (const c of cases) {
      const spec = buildPairFreeInsightSpecV2({
        answers: answersAt(c.ans),
        pairAxisId: 'A2',
        personABirthDate: c.a,
        personBBirthDate: c.b,
        personAUsesFirstPerspective: !c.swap,
        focusLabel: '会話の進め方',
      });
      const between = spec.betweenThem;
      const sentences = between.split('。').filter((part) => part.trim().length > 0);
      const sameMove = (between.match(/同じ動き/g) ?? []).length;
      assert.ok(sentences.length <= 8, `${c.id} sentences ${sentences.length}`);
      assert.ok(sameMove <= 1, `${c.id} same-move dump ${sameMove}`);
      assert.doesNotMatch(between, /周りには、/);
      assert.match(between, /^二人の間では/);
      assert.ok(spec.misreadLoop.length > 8);
      assert.ok(spec.reset.length > 8);
    }
    const a = buildPairFreeInsightSpecV2({
      answers: answersAt(4),
      pairAxisId: 'A2',
      personABirthDate: '1983-02-28',
      personBBirthDate: '1990-05-14',
      personAUsesFirstPerspective: true,
      focusLabel: '会話の進め方',
    });
    const b = buildPairFreeInsightSpecV2({
      answers: answersAt(4),
      pairAxisId: 'A2',
      personABirthDate: '1983-02-28',
      personBBirthDate: '1990-05-14',
      personAUsesFirstPerspective: false,
      focusLabel: '会話の進め方',
    });
    assert.notEqual(a.misreadLoop, b.misreadLoop);
    assert.notEqual(a.id, b.id);
  });
});
