import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildCoreResultClient } from './coreResult/buildCoreResult.client';
import {
  collectFreeCoreDynamicCopy,
  coreTraitDisplayFromCoreType,
  freeCoreAlignSteps,
  freeCoreLifestyleTriptych,
  freeCorePaidHook,
  freeCorePersonalizationFingerprint,
} from './coreFreePublicDisplay';
import { sceneOpeningPair } from './coreFreeCompositionalGrammar';

const ANCHOR_DOBS = [
  '1983-02-01',
  '1983-02-28',
  '1983-12-24',
  '1999-05-11',
  '1989-09-08',
  '1997-04-08',
  '2002-06-19',
  '1994-12-02',
  '1988-01-01',
  '1988-12-03',
] as const;

const FORBIDDEN = [
  '構造探求',
  '構造探求型',
  'Blueprint of',
  'First Record',
  'パーソナルアルゴリズム',
  'このタイプ',
  '診断結果',
  '判定します',
  '追いつきすぎる',
  '読み返しやすい',
  '1000通り',
] as const;

const SEMANTIC_BAD = [
  /疲れが残りすぎると疲れが残りやすい/,
  /整えながら整/i,
  /曖昧なまま進む日では、日常の判断が安定しやすい/,
  /曖昧なまま進むと安定しやすい/,
] as const;

const TAIL_WORDS = ['整いやすい', '安定しやすい', '合いやすい', '動き出しがスムーズ'] as const;

function buildFor(birthDate: string) {
  return buildCoreResultClient({ nickname: 't', birthDate });
}

function monthBandDobs(): string[] {
  const dobs: string[] = [];
  for (let month = 1; month <= 12; month++) {
    for (const day of [3, 15, 27]) {
      dobs.push(`1990-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`);
    }
  }
  return dobs;
}

function countTailHits(text: string, tail: string): number {
  let count = 0;
  let idx = 0;
  while ((idx = text.indexOf(tail, idx)) !== -1) {
    count++;
    idx += tail.length;
  }
  return count;
}

describe('/core free compositional coverage — CATEGORY-2-M55-CORE-FREE-COMPOSITIONAL-COPY-COVERAGE-DESIGN-REV1', () => {
  it('10 anchor DOB fingerprints are distinct', () => {
    const fps = ANCHOR_DOBS.map((d) => freeCorePersonalizationFingerprint(buildFor(d)));
    for (let i = 0; i < fps.length; i++) {
      for (let j = i + 1; j < fps.length; j++) {
        assert.notEqual(fps[i], fps[j], `${ANCHOR_DOBS[i]} vs ${ANCHOR_DOBS[j]}`);
      }
    }
  });

  for (const birthDate of ANCHOR_DOBS) {
    it(`${birthDate} has no duplicate dynamic sentences on one page`, () => {
      const lines = collectFreeCoreDynamicCopy(buildFor(birthDate));
      const seen = new Set<string>();
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        assert.equal(seen.has(trimmed), false, `duplicate dynamic sentence: ${trimmed}`);
        seen.add(trimmed);
      }
    });

    it(`${birthDate} avoids forbidden and semantic-bad patterns`, () => {
      const blob = collectFreeCoreDynamicCopy(buildFor(birthDate)).join('\n');
      for (const term of FORBIDDEN) {
        assert.equal(blob.includes(term), false, term);
      }
      for (const re of SEMANTIC_BAD) {
        assert.doesNotMatch(blob, re);
      }
    });

    it(`${birthDate} limits easy-tail repetition within dynamic copy`, () => {
      const blob = collectFreeCoreDynamicCopy(buildFor(birthDate)).join('\n');
      for (const tail of TAIL_WORDS) {
        assert.ok(countTailHits(blob, tail) < 3, `${birthDate}: tail "${tail}" repeated too often`);
      }
    });
  }

  it('36 month-band DOBs produce at least 30 distinct fingerprints', () => {
    const dobs = monthBandDobs();
    const fps = new Set(dobs.map((d) => freeCorePersonalizationFingerprint(buildFor(d))));
    assert.ok(fps.size >= 30, `expected >=30 unique fingerprints, got ${fps.size}`);
  });

  it('same coreType near-DOB pair differs on recovery steps or scene opening', () => {
    const a = buildFor('1983-02-01');
    const b = buildFor('1983-06-01');
    assert.equal(a.coreType, b.coreType);
    const stepsA = freeCoreAlignSteps(a).map((s) => s.body).join('|');
    const stepsB = freeCoreAlignSteps(b).map((s) => s.body).join('|');
    const sceneA = freeCoreLifestyleTriptych(a).map((c) => sceneOpeningPair(c.body)).join('|');
    const sceneB = freeCoreLifestyleTriptych(b).map((c) => sceneOpeningPair(c.body)).join('|');
    assert.ok(stepsA !== stepsB || sceneA !== sceneB, 'near DOB same coreType should vary recovery or scene');
  });

  it('different coreType anchors differ on hero, paid hook, or recovery', () => {
    const a = buildFor('1983-02-01');
    const b = buildFor('1992-12-19');
    assert.notEqual(a.coreType, b.coreType);
    const fpA = freeCorePersonalizationFingerprint(a);
    const fpB = freeCorePersonalizationFingerprint(b);
    assert.notEqual(fpA, fpB);
    assert.notEqual(freeCorePaidHook(a), freeCorePaidHook(b));
  });

  it('scene opening pairs are not all identical across 10 anchors', () => {
    const openings = ANCHOR_DOBS.map((d) => {
      const cards = freeCoreLifestyleTriptych(buildFor(d));
      return cards.map((c) => sceneOpeningPair(c.body)).join('\n');
    });
    const unique = new Set(openings);
    assert.ok(unique.size >= 8, `expected >=8 unique scene bundles, got ${unique.size}`);
  });

  it('recovery 3-step bundles are not all identical across 10 anchors', () => {
    const bundles = ANCHOR_DOBS.map((d) =>
      freeCoreAlignSteps(buildFor(d))
        .map((s) => s.body)
        .join('|'),
    );
    const unique = new Set(bundles);
    assert.ok(unique.size >= 7, `expected >=7 unique recovery bundles, got ${unique.size}`);
  });

  it('paid hook varies by dominant axis without paid deep-read leakage', () => {
    const hooks = new Set(ANCHOR_DOBS.map((d) => freeCorePaidHook(buildFor(d))));
    assert.ok(hooks.size >= 2, 'expected axis-based paid hook variation');
    for (const hook of hooks) {
      assert.match(hook, /いま見えた輪郭は、保存版では/);
      assert.match(hook, /の中で読み返せます。$/);
      assert.doesNotMatch(hook, /chapter|s3_essence|s7_work/);
    }
  });

  it('does not embed per-DOB fixed copy in grammar module', () => {
    const src = readFileSync(join(process.cwd(), 'lib/m55/coreFreeCompositionalGrammar.ts'), 'utf8');
    for (const dob of ANCHOR_DOBS) {
      assert.doesNotMatch(src, new RegExp(dob));
    }
  });

  it('10 anchors resolve to living-language traits', () => {
    assert.equal(coreTraitDisplayFromCoreType(buildFor('1983-02-01').coreType), '納得して組み立てる');
    assert.equal(coreTraitDisplayFromCoreType(buildFor('1983-02-28').coreType), '全体をつなげて整える');
  });
});
