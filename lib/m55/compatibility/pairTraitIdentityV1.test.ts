import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { resolvePairTraitIdentityV1 } from './pairTraitIdentityV1';

describe('pairTraitIdentityV1', () => {
  it('derives canonical trait identities without retaining DOB', () => {
    const model = resolvePairTraitIdentityV1('1983-02-28', '1992-12-19');
    assert.equal(model.personA.traitName, 'アナリスト');
    assert.equal(model.personB.traitName, 'プランナー');
    assert.equal(model.pairLabel, 'アナリスト × プランナー');
    assert.equal(model.personA.stemLaneIndex, 9);
    assert.equal(model.personB.stemLaneIndex, 1);
    assert.match(model.personA.imagePath, /^\/ten-views\//);
    assert.match(model.personB.imagePath, /^\/ten-views\//);
    assert.ok(model.personA.identityLine.length > 0);
    assert.ok(model.personB.identityLine.length > 0);
    assert.doesNotMatch(JSON.stringify(model), /1983|1992|birthDate|nickname/);
  });

  it('stays deterministic for the same birth dates', () => {
    const a = resolvePairTraitIdentityV1('1983-02-28', '1992-12-19');
    const b = resolvePairTraitIdentityV1('1983-02-28', '1992-12-19');
    assert.deepEqual(a, b);
  });
});
