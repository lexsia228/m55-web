import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { FREE_AXIS_QUESTION_IDS } from '../individualization/answerIdMapsV1';
import { emptyPersistedFunnel } from './selfFunnelRuntimeState';
import {
  applyServerDraftFreeAnswerSet,
  readFreeAnswerSetFromExtraJson,
} from './applyServerDraftFreeAnswerSet';
import { mergeDraftExtraJson } from './mergeDraftExtraJson';

const COMPLETE = {
  [FREE_AXIS_QUESTION_IDS.start]: 'free.start_style.map_first',
  [FREE_AXIS_QUESTION_IDS.decision]: 'free.decision_style.sort_first',
  [FREE_AXIS_QUESTION_IDS.recovery]: 'free.recovery_style.pause_short',
  [FREE_AXIS_QUESTION_IDS.distance]: 'free.distance_style.close_careful',
  [FREE_AXIS_QUESTION_IDS.change]: 'free.change_style.observe_first',
};

const BASIC = { nickname: 'sora', birthDate: '1992-12-19' };

describe('G3-03 server draft freeAnswerSet restore', () => {
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

  it('applies a complete server set onto an empty local funnel as RESULT-ready', () => {
    const result = applyServerDraftFreeAnswerSet({
      extraJson: { freeAnswerSet: COMPLETE },
      persisted: emptyPersistedFunnel(),
      basic: BASIC,
    });
    assert.equal(result.applied, true);
    assert.equal(result.reason, 'applied');
    assert.ok(result.next.committedFreeAnswers);
    assert.equal(result.next.committedFreeAnswers?.[FREE_AXIS_QUESTION_IDS.start], COMPLETE[FREE_AXIS_QUESTION_IDS.start]);
    assert.match(result.next.freeResultFingerprint ?? '', /^ffp1\|sora\|1992-12-19\|/);
    assert.equal(result.next.generationCount, 0);
  });

  it('does not enter RESULT when the server set is incomplete', () => {
    const result = applyServerDraftFreeAnswerSet({
      extraJson: {
        freeAnswerSet: {
          [FREE_AXIS_QUESTION_IDS.start]: 'free.start_style.map_first',
        },
      },
      persisted: emptyPersistedFunnel(),
      basic: BASIC,
    });
    assert.equal(result.applied, false);
    assert.equal(result.reason, 'incomplete_set');
    assert.equal(result.next.committedFreeAnswers, null);
  });

  it('does not overwrite an already-complete local result', () => {
    const local = applyServerDraftFreeAnswerSet({
      extraJson: { freeAnswerSet: COMPLETE },
      persisted: emptyPersistedFunnel(),
      basic: BASIC,
    }).next;
    const other = {
      ...COMPLETE,
      [FREE_AXIS_QUESTION_IDS.start]: 'free.start_style.try_first',
    };
    const result = applyServerDraftFreeAnswerSet({
      extraJson: { freeAnswerSet: other },
      persisted: local,
      basic: BASIC,
    });
    assert.equal(result.applied, false);
    assert.equal(result.reason, 'local_complete');
    assert.equal(
      result.next.committedFreeAnswers?.[FREE_AXIS_QUESTION_IDS.start],
      COMPLETE[FREE_AXIS_QUESTION_IDS.start],
    );
  });

  it('requires valid basic info before restore', () => {
    const result = applyServerDraftFreeAnswerSet({
      extraJson: { freeAnswerSet: COMPLETE },
      persisted: emptyPersistedFunnel(),
      basic: null,
    });
    assert.equal(result.applied, false);
    assert.equal(result.reason, 'no_basic');
  });

  it('merges profile extras with freeAnswerSet instead of replacing the bag', () => {
    const merged = mergeDraftExtraJson(
      { birthTime: '07:00', freeAnswerSet: COMPLETE },
      { birthTimeUnknown: true, country: 'JP' },
    );
    assert.equal(merged.birthTime, '07:00');
    assert.equal(merged.birthTimeUnknown, true);
    assert.deepEqual(merged.freeAnswerSet, COMPLETE);
  });

  it('lets a later complete freeAnswerSet replace the previous set', () => {
    const nextSet = {
      ...COMPLETE,
      [FREE_AXIS_QUESTION_IDS.change]: 'free.change_style.adjust_fast',
    };
    const merged = mergeDraftExtraJson(
      { freeAnswerSet: COMPLETE, country: 'JP' },
      { freeAnswerSet: nextSet },
    );
    assert.deepEqual(merged.freeAnswerSet, nextSet);
    assert.equal(merged.country, 'JP');
  });
});

describe('G3-03 claim/hydrate wiring', () => {
  it('DraftClaimOnLogin always reads /api/dtr/draft/me extraJson for restore', async () => {
    const { readFileSync } = await import('node:fs');
    const src = readFileSync(new URL('../../../components/dtr/DraftClaimOnLogin.tsx', import.meta.url), 'utf8');
    assert.match(src, /applyServerDraftFreeAnswerSet/);
    assert.match(src, /\/api\/dtr\/draft\/me/);
    assert.match(src, /writePersistedFunnel\(outcome\.next\)/);
    assert.doesNotMatch(
      src,
      /if \(hasCompleteCanonicalProfile\(userId\)\) \{\s*window\.dispatchEvent[\s\S]*?return;/,
    );
  });

  it('draft POST merges extra_json instead of replacing the bag', async () => {
    const { readFileSync } = await import('node:fs');
    const src = readFileSync(new URL('../../../app/api/dtr/draft/route.ts', import.meta.url), 'utf8');
    assert.match(src, /mergeDraftExtraJson\(existingExtra, body\.extraJson \?\? \{\}\)/);
    assert.doesNotMatch(src, /extra_json: body\.extraJson \?\? \{\},/);
  });
});
