import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildPairFreeInsightSpecV2 } from './pairFreeInsightSpecV2';
import type { CompatibilityCurrentContextAnswersV2 } from './currentContextContract.v2';
import { projectCompatibilityFreeNarrativeV1 } from '../narrative/projectCompatibilityFreeNarrativeV1';

function establishedInsight(
  answers: CompatibilityCurrentContextAnswersV2,
  relationStatusId: 'R3' | 'R6' = 'R3',
) {
  return buildPairFreeInsightSpecV2({
    answersV2: answers,
    pairAxisId: 'A2',
    personABirthDate: '1990-01-15',
    personBBirthDate: '1992-08-20',
    personAUsesFirstPerspective: true,
    focusLabel: '会話の進め方',
    relationStatusId,
  });
}

function paceOwnedFields(spec: ReturnType<typeof establishedInsight>) {
  const narrative = projectCompatibilityFreeNarrativeV1({ spec });
  return {
    openingHit: narrative.openingHit.text,
    fusedDiscovery: narrative.fusedDiscovery?.text ?? '',
    currentExpression: spec.currentExpressionJa,
    mismatch: spec.mismatchEntry,
    sequence1: spec.relationshipSequenceJa[1]!,
    sequence2: spec.relationshipSequenceJa[2]!,
  };
}

const WORDS_VARY_PACE_ROWS = [
  { decisionPace: 'decide_now' as const, expressionPace: 'words_vary' as const },
  { decisionPace: 'decide_later' as const, expressionPace: 'words_vary' as const },
  { decisionPace: 'decide_varies' as const, expressionPace: 'words_vary' as const },
];

const PLACED_CONCLUSION = /結論は置(?:かれた|いた)まま/;
const FIXED_PLACED_CONCLUSION = /結論固定/;
const WORD_QUANTITY = /言葉の量/;
const SAME_TOPIC = /同じ話題/;
const PRIOR_TOPIC_RESUME = /前の話題.*再開/;
const SAME_TOPIC_RETURN = /同じ話題.*戻/;
const AUTO_TOPIC_CONTINUE = /話題.*自動.*続/;
const PRIVATE_STATE = /気にしすぎ|我慢|受け身の攻撃|本音/;

describe('pair input fidelity P0 semantic debts', () => {
  it('decide_later + words_vary preserves deferred closure', () => {
    const fields = paceOwnedFields(
      establishedInsight({
        decisionPace: 'decide_later',
        expressionPace: 'words_vary',
        disagreement: 'take_space',
        returnPattern: 'time_restores',
      }),
    );
    const blob = Object.values(fields).join('\n');
    assert.doesNotMatch(blob, PLACED_CONCLUSION);
    assert.doesNotMatch(blob, FIXED_PLACED_CONCLUSION);
    assert.doesNotMatch(blob, WORD_QUANTITY);
    assert.match(blob, /時間を置|決めるまで|後から決/u);
    assert.match(blob, /タイミング|出方|場面/u);
  });

  it('words_vary never becomes word quantity', () => {
    for (const row of WORDS_VARY_PACE_ROWS) {
      for (const relationStatusId of ['R3', 'R6'] as const) {
        const fields = paceOwnedFields(
          establishedInsight(
            {
              ...row,
              disagreement: 'talk_now',
              returnPattern: 'someone_reaches',
            },
            relationStatusId,
          ),
        );
        const paceBlob = [
          fields.openingHit,
          fields.currentExpression,
          fields.mismatch,
          fields.sequence1,
        ].join('\n');
        assert.doesNotMatch(paceBlob, WORD_QUANTITY, `${relationStatusId}:${row.decisionPace}:${row.expressionPace}`);
      }
    }
  });

  it('time_restores does not imply same-topic resumption', () => {
    const spec = establishedInsight({
      decisionPace: 'decide_now',
      expressionPace: 'words_soon',
      disagreement: 'take_space',
      returnPattern: 'time_restores',
    });
    const narrative = projectCompatibilityFreeNarrativeV1({ spec });
    const supportBlob = [
      narrative.fusedDiscovery?.text ?? '',
      spec.evidenceSupportJa,
      spec.relationshipSequenceJa[2]!,
    ].join('\n');
    assert.doesNotMatch(supportBlob, SAME_TOPIC);
    assert.doesNotMatch(supportBlob, PRIOR_TOPIC_RESUME);
    assert.doesNotMatch(supportBlob, SAME_TOPIC_RETURN);
    assert.doesNotMatch(supportBlob, AUTO_TOPIC_CONTINUE);
    assert.match(supportBlob, /時間|戻|距離|自然/u);
  });

  it('decide_varies + words_later does not infer private state', () => {
    const fields = paceOwnedFields(
      establishedInsight({
        decisionPace: 'decide_varies',
        expressionPace: 'words_later',
        disagreement: 'talk_now',
        returnPattern: 'someone_reaches',
      }),
    );
    assert.doesNotMatch(fields.mismatch, PRIVATE_STATE);
    assert.match(fields.mismatch, /場面|タイミング|遅れ|言葉/u);
  });
});
