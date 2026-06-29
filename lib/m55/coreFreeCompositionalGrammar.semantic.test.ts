import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildCoreResultClient } from './coreResult/buildCoreResult.client';
import {
  coreTraitDisplayFromCoreType,
  freeCoreAxisRowsForResult,
  freeCoreLifestyleTriptych,
  freeCoreObservationBullets,
  freeCorePersonalizationFingerprint,
} from './coreFreePublicDisplay';

const SEMANTIC_DOBS = [
  { birthDate: '1983-02-01', trait: '納得して組み立てる' },
  { birthDate: '1983-02-28', trait: '全体をつなげて整える' },
  { birthDate: '1983-12-24', trait: '距離と言葉を読む' },
  { birthDate: '1999-05-11', trait: '先に全体像をつかむ' },
  { birthDate: '1989-09-08', trait: '落ち着いて確かめる' },
] as const;

const FORBIDDEN_SEMANTIC = [
  '追いつきすぎる',
  '曖昧なまま進む日では、日常の判断が安定しやすい',
  '曖昧なまま進む日では、',
  '読み返しやすい',
  '構造探求',
  '構造探求型',
  'Blueprint of',
  'First Record',
  'パーソナルアルゴリズム',
  '診断結果',
  '判定します',
] as const;

function buildFor(birthDate: string) {
  return buildCoreResultClient({ nickname: 't', birthDate });
}

function renderedBlob(birthDate: string): string {
  const result = buildFor(birthDate);
  return [
    coreTraitDisplayFromCoreType(result.coreType),
    ...freeCoreAxisRowsForResult(result).flatMap((row) => [row.tendency, row.life, row.load]),
    ...freeCoreLifestyleTriptych(result).map((s) => s.body),
    ...freeCoreObservationBullets(result),
    freeCorePersonalizationFingerprint(result),
  ].join('\n');
}

describe('/core compositional copy — semantic polish guards', () => {
  it('5 DOB anchors resolve to expected living-language trait display', () => {
    for (const { birthDate, trait } of SEMANTIC_DOBS) {
      assert.equal(coreTraitDisplayFromCoreType(buildFor(birthDate).coreType), trait, birthDate);
    }
  });

  it('5 DOB fingerprints remain distinct', () => {
    const fps = SEMANTIC_DOBS.map(({ birthDate }) => freeCorePersonalizationFingerprint(buildFor(birthDate)));
    for (let i = 0; i < fps.length; i++) {
      for (let j = i + 1; j < fps.length; j++) {
        assert.notEqual(fps[i], fps[j], `${SEMANTIC_DOBS[i]!.birthDate} vs ${SEMANTIC_DOBS[j]!.birthDate}`);
      }
    }
  });

  for (const { birthDate } of SEMANTIC_DOBS) {
    it(`${birthDate} avoids semantic inversion and relationship 読み返し misuse`, () => {
      const blob = renderedBlob(birthDate);
      for (const term of FORBIDDEN_SEMANTIC) {
        assert.equal(blob.includes(term), false, `${birthDate}: forbidden semantic term ${term}`);
      }
    });

    it(`${birthDate} life/load lines end with natural predicates`, () => {
      const rows = freeCoreAxisRowsForResult(buildFor(birthDate));
      for (const row of rows) {
        assert.doesNotMatch(row.life, /。と。$/);
        assert.doesNotMatch(row.life, /。ながら。$/);
        assert.doesNotMatch(row.load, /読み返し/);
      }
    });
  }

  it('preserves saved-report 読み返す boundary in summary bullets', () => {
    const blob = renderedBlob('1983-02-28');
    assert.match(blob, /読み返す土台|読み直す入口/);
  });

  it('conditional cooperation scene includes resolution action when selected', () => {
    const rows = freeCoreAxisRowsForResult(buildFor('1983-02-01'));
    const coop = rows.find((r) => r.formal === '協調性');
    if (coop?.life.includes('期待が曖昧になりやすい場')) {
      assert.match(coop.life, /先に線引きを短く言葉にすると/);
    }
  });
});
