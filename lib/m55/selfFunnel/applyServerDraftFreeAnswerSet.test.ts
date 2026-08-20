import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { FREE_AXIS_QUESTION_IDS } from '../individualization/answerIdMapsV1';
import { emptyPersistedFunnel } from './selfFunnelRuntimeState';
import {
  applyServerDraftFreeAnswerSet,
  readFreeAnswerSetFromExtraJson,
} from './applyServerDraftFreeAnswerSet';
import {
  draftProfileIdentitiesMatch,
  normalizeDraftProfileIdentity,
} from './draftProfileIdentity';
import { mergeDraftExtraJson } from './mergeDraftExtraJson';

const COMPLETE = {
  [FREE_AXIS_QUESTION_IDS.start]: 'free.start_style.map_first',
  [FREE_AXIS_QUESTION_IDS.decision]: 'free.decision_style.sort_first',
  [FREE_AXIS_QUESTION_IDS.recovery]: 'free.recovery_style.pause_short',
  [FREE_AXIS_QUESTION_IDS.distance]: 'free.distance_style.close_careful',
  [FREE_AXIS_QUESTION_IDS.change]: 'free.change_style.observe_first',
};

const PROFILE_A = { nickname: 'sora', birthDate: '1992-12-19' };
const PROFILE_B = { nickname: 'hana', birthDate: '1990-03-14' };
const PROFILE_A_SAME_DOB = { nickname: 'other', birthDate: '1992-12-19' };
const PROFILE_A_SAME_NICK = { nickname: 'sora', birthDate: '1988-01-01' };

function applyFor(
  basic: { nickname: string; birthDate: string } | null,
  serverDraft: { nickname: string; birthDate: string } | null,
  extraJson: unknown,
  persisted = emptyPersistedFunnel(),
) {
  return applyServerDraftFreeAnswerSet({
    extraJson,
    persisted,
    basic,
    serverDraft,
  });
}

describe('draftProfileIdentity', () => {
  it('normalizes trimmed nickname and YYYY-MM-DD birthDate', () => {
    assert.deepEqual(
      normalizeDraftProfileIdentity({ nickname: '  sora  ', birthDate: '1992-12-19T00:00:00' }),
      PROFILE_A,
    );
    assert.equal(normalizeDraftProfileIdentity({ nickname: '', birthDate: '1992-12-19' }), null);
  });

  it('matches only on exact normalized nickname and birthDate', () => {
    assert.equal(draftProfileIdentitiesMatch(PROFILE_A, PROFILE_A), true);
    assert.equal(draftProfileIdentitiesMatch(PROFILE_A, PROFILE_B), false);
    assert.equal(draftProfileIdentitiesMatch(PROFILE_A, PROFILE_A_SAME_DOB), false);
    assert.equal(draftProfileIdentitiesMatch(PROFILE_A, PROFILE_A_SAME_NICK), false);
  });
});

describe('G3-03 identity-bound free restore matrix', () => {
  it('TEST_01: server profile A + complete answers, local empty => profile A restored path => RESULT', () => {
    const result = applyFor(PROFILE_A, PROFILE_A, { freeAnswerSet: COMPLETE });
    assert.equal(result.applied, true);
    assert.equal(result.reason, 'applied');
    assert.ok(result.next.committedFreeAnswers);
    assert.match(result.next.freeResultFingerprint ?? '', /^ffp1\|sora\|1992-12-19\|/);
  });

  it('TEST_02: server profile A + complete answers, local profile A + empty funnel => RESULT', () => {
    const result = applyFor(PROFILE_A, PROFILE_A, { freeAnswerSet: COMPLETE });
    assert.equal(result.applied, true);
    assert.equal(result.reason, 'applied');
    assert.ok(result.next.committedFreeAnswers);
  });

  it('TEST_03: server profile A + complete answers, local profile B => answers NOT restored', () => {
    const result = applyFor(PROFILE_B, PROFILE_A, { freeAnswerSet: COMPLETE });
    assert.equal(result.applied, false);
    assert.equal(result.reason, 'identity_mismatch');
    assert.equal(result.next.committedFreeAnswers, null);
    assert.equal(result.next.freeResultFingerprint, null);
  });

  it('TEST_04: server DOB A + complete answers, local same nickname but DOB B => NOT restored', () => {
    const result = applyFor(PROFILE_A_SAME_NICK, PROFILE_A, { freeAnswerSet: COMPLETE });
    assert.equal(result.applied, false);
    assert.equal(result.reason, 'identity_mismatch');
  });

  it('TEST_05: server nickname A + complete answers, local nickname B but same DOB => NOT restored', () => {
    const result = applyFor(PROFILE_A_SAME_DOB, PROFILE_A, { freeAnswerSet: COMPLETE });
    assert.equal(result.applied, false);
    assert.equal(result.reason, 'identity_mismatch');
  });

  it('TEST_06: local complete RESULT already exists, server differs => local unchanged', () => {
    const local = applyFor(PROFILE_B, PROFILE_B, { freeAnswerSet: COMPLETE }).next;
    const result = applyFor(PROFILE_B, PROFILE_A, { freeAnswerSet: COMPLETE }, local);
    assert.equal(result.applied, false);
    assert.equal(result.reason, 'local_complete');
    assert.equal(
      result.next.committedFreeAnswers?.[FREE_AXIS_QUESTION_IDS.start],
      COMPLETE[FREE_AXIS_QUESTION_IDS.start],
    );
  });

  it('TEST_10: incomplete server answer set => never RESULT', () => {
    const result = applyFor(PROFILE_A, PROFILE_A, {
      freeAnswerSet: { [FREE_AXIS_QUESTION_IDS.start]: 'free.start_style.map_first' },
    });
    assert.equal(result.applied, false);
    assert.equal(result.reason, 'incomplete_set');
    assert.equal(result.next.committedFreeAnswers, null);
  });
});

describe('G3-03 extra_json identity-aware merge matrix', () => {
  it('TEST_07: same server identity + profile-only extra_json update preserves freeAnswerSet', () => {
    const merged = mergeDraftExtraJson(
      { birthTime: '07:00', freeAnswerSet: COMPLETE, country: 'JP' },
      { birthTimeUnknown: true },
      {
        existingIdentity: PROFILE_A,
        incomingIdentity: PROFILE_A,
      },
    );
    assert.equal(merged.birthTime, '07:00');
    assert.equal(merged.birthTimeUnknown, true);
    assert.deepEqual(merged.freeAnswerSet, COMPLETE);
    assert.equal(merged.country, 'JP');
  });

  it('TEST_08: changed server identity + no new freeAnswerSet removes stale freeAnswerSet', () => {
    const merged = mergeDraftExtraJson(
      { freeAnswerSet: COMPLETE, country: 'JP', birthTime: '07:00' },
      { birthTimeUnknown: true },
      {
        existingIdentity: PROFILE_A,
        incomingIdentity: PROFILE_B,
      },
    );
    assert.equal(merged.country, 'JP');
    assert.equal(merged.birthTime, '07:00');
    assert.equal(merged.birthTimeUnknown, true);
    assert.equal('freeAnswerSet' in merged, false);
  });

  it('TEST_09: changed identity + explicit new complete freeAnswerSet stores the new set', () => {
    const nextSet = {
      ...COMPLETE,
      [FREE_AXIS_QUESTION_IDS.change]: 'free.change_style.adjust_fast',
    };
    const merged = mergeDraftExtraJson(
      { freeAnswerSet: COMPLETE, country: 'JP' },
      { freeAnswerSet: nextSet },
      {
        existingIdentity: PROFILE_A,
        incomingIdentity: PROFILE_B,
      },
    );
    assert.deepEqual(merged.freeAnswerSet, nextSet);
    assert.equal(merged.country, 'JP');
  });
});

describe('G3-03 helpers', () => {
  it('reads only string answer ids from extraJson.freeAnswerSet', () => {
    assert.deepEqual(
      readFreeAnswerSetFromExtraJson({
        freeAnswerSet: { ...COMPLETE, junk: 1, empty: '' },
        birthTime: '12:00',
      }),
      COMPLETE,
    );
    assert.equal(readFreeAnswerSetFromExtraJson({ nickname: 'x' }), null);
  });

  it('requires valid basic info before restore', () => {
    const result = applyFor(null, PROFILE_A, { freeAnswerSet: COMPLETE });
    assert.equal(result.applied, false);
    assert.equal(result.reason, 'no_basic');
  });
});
