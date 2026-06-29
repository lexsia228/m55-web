import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { CORE_ENGINE_VERSION } from './coreEngineVersion';
import { coreEnvelopeRequiresReseal } from './store';
import type { CoreResult, SealedCoreEnvelopeV3 } from './types';

function stubEnvelope(engineVersion: string): SealedCoreEnvelopeV3 {
  const coreResult = {
    stemLaneIndex: 3,
    coreType: 'TYPE_04',
    coreLabel: '静観分析型',
    coreSummary: '',
    coreAxisScores: {
      socialEnergy: 0,
      stability: 0,
      openness: 0,
      cooperation: 0,
      structure: 0,
    },
    axisDetails: [],
    composition: { dominantAxes: [], secondaryAxes: [] },
    affinities: [],
    strengths: [],
    cautions: [],
    workStyle: { summary: '', strengths: [], cautions: [] },
    relationships: { summary: '', strengths: [], cautions: [] },
    love: { summary: '', strengths: [], cautions: [] },
    engineVersion,
    lockedAt: '1983-02-28T00:00:00.000Z',
  } as CoreResult;

  return {
    schemaVersion: 3,
    sealedInputs: { birthDate: '1983-02-28', nickname: 't' },
    coreResult,
  };
}

describe('core localStorage reseal — engineVersion parity', () => {
  it('legacy m55-core-canonical-v1 envelope requires reseal', () => {
    assert.equal(coreEnvelopeRequiresReseal(stubEnvelope('m55-core-canonical-v1')), true);
  });

  it('current CORE_ENGINE_VERSION does not require reseal', () => {
    assert.equal(coreEnvelopeRequiresReseal(stubEnvelope(CORE_ENGINE_VERSION)), false);
  });

  it('null envelope requires reseal', () => {
    assert.equal(coreEnvelopeRequiresReseal(null), true);
  });
});
