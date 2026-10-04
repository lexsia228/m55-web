import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  LOOP_CONTEXT_IDS,
  PACE_ALIGNMENT_STATE_IDS,
  resolvePairCentralInferenceV1,
  type PairCentralInferenceV1,
  type DecisionAnswerEvidenceId,
  type DisagreementAnswerEvidenceId,
  type ExpressionPaceEvidenceId,
  type PairCentralInferenceEvidenceInputV1,
  type ReturnPatternAnswerEvidenceId,
} from './pairCentralInferenceV1';
import { projectPairFreeFieldsV1 } from './pairFreeProjectionV1';
import { buildPairFreeInsightSpecV2 } from './pairFreeInsightSpecV2';
import { buildCompatibilityPublicResult } from './pairReadingGuestResult';
import { buildPaidCompatibilityReportV1 } from './buildPaidCompatibilityReportV1';
import type { CompatibilityCurrentContextAnswersV2 } from './currentContextContract.v2';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const read = (relative: string) => readFileSync(join(repoRoot, relative), 'utf8');

const DECISIONS: readonly DecisionAnswerEvidenceId[] = [
  'answer:decisionPace:decide_now',
  'answer:decisionPace:decide_later',
  'answer:decisionPace:decide_varies',
];
const EXPRESSIONS: readonly ExpressionPaceEvidenceId[] = [
  'answer:expressionPace:words_soon',
  'answer:expressionPace:words_later',
  'answer:expressionPace:words_vary',
];
const DISAGREEMENTS: readonly DisagreementAnswerEvidenceId[] = [
  'answer:disagreement:talk_now',
  'answer:disagreement:take_space',
  'answer:disagreement:one_carries',
];
const RETURNS: readonly ReturnPatternAnswerEvidenceId[] = [
  'answer:returnPattern:someone_reaches',
  'answer:returnPattern:time_restores',
  'answer:returnPattern:return_is_hard',
];

const DECISION_V2 = ['decide_now', 'decide_later', 'decide_varies', 'no_shared_decision_yet'] as const;
const EXPRESSION_V2 = ['words_soon', 'words_later', 'words_vary'] as const;
const DISAGREEMENT_V2 = ['talk_now', 'take_space', 'one_carries', 'no_disagreement_yet'] as const;
const RETURN_V2 = ['someone_reaches', 'time_restores', 'return_is_hard', 'no_misalignment_return_yet'] as const;
const STAGES = ['R3', 'R6'] as const;

const PAIR = { personA: '1990-01-15', personB: '1992-08-20' };

const WORD_QUANTITY = /言葉の量/;
const PLACED_CONCLUSION = /結論は置(?:かれた|いた)まま/;
const PRIVATE_STATE = /心の中では|本当は|相手は.+と思っている|気にしすぎる|我慢している/;
const VERBAL_OVERLAP = /言葉が重なる|かぶせ合う/;
const WITHDRAW_OVERCLAIM = /心理的撤退|拒絶|回避型/;
const SAME_TOPIC_RESTORE = /同じ話題.*再開|前の話題.*必ず戻る/;
const PAID_PROCEDURE = /次にこうしてください|手順|プロトコル/;
const CO_TALK_INTENT_OVERREACH = /話を揃えよう|分かり合おう|解決しよう/;
const REACH_SAME_TOPIC_OVERREACH =
  /途中だった話が再び続き始める|同じ話題|前の話題.*必ず|必ず.*続/;
const DECIDE_VARIES_EXISTENCE_TOGGLE =
  /結論を置くかどうか|結論を置く日と置かない日|区切りを置くかどうか|区切る日と置く日/;
const OLD_MISMATCH_PHRASE = /どちらが会話の一区切りを決めたのかが先にずれる/;
const DECIDE_VARIES_TIMING_EVIDENCE = /タイミング|場面/;
const CO_TALK_CAUSAL_ESCALATION = /言葉を交わすほど|話すほど/;
const CO_EMERGENCE_PRECEDENCE = /先に出た区切り|区切りが先に置か|先に置かれた|区切りが先に置かれた/;
const HEAVY_UNFINISHED_TOPIC = /終わっていない|未解決の話|前の話のどこが終わっ/;
const CARRY_PRIVATE_FEELING = /触れなかった感覚|言えなかった気持ち|本音|抑えた気持ち/;
const DECIDE_VARIES_REVERSAL = /入れ替わる|入れ替わって|入れ替わり/;
const DECIDE_LATER_WORDS_VARY_DEFERRED = /決めるまで時間を置|時間を置く/;
const DECIDE_LATER_WORDS_VARY_EXPRESSION = /言葉になるタイミング.*場面|言葉のタイミング.*場面/;
const BROKEN_NATURALNESS_PHRASES =
  /次の一言の位置が早く見える|場面で変わる場面では|決めるタイミングの入れ替わりが、戻り方の見え方も変わる|どちらが会話の一区切りを決めたのかが先にずれる/;
const HEAVY_REENTRY_DIFFICULTY = /戻るまでに間|戻る入口が重|戻り始めるまで時間/;
const CO_EMERGENCE_SAME_SCENE = /同じ場面|同時に出/;

function fullCentralStates(): ReturnType<typeof resolvePairCentralInferenceV1>[] {
  const states = [];
  for (const decision of DECISIONS) {
    for (const expression of EXPRESSIONS) {
      for (const disagreement of DISAGREEMENTS) {
        for (const returnPattern of RETURNS) {
          const evidence: PairCentralInferenceEvidenceInputV1 = [
            decision,
            expression,
            disagreement,
            returnPattern,
          ];
          states.push(resolvePairCentralInferenceV1(evidence));
        }
      }
    }
  }
  return states;
}

function projectFull(central: ReturnType<typeof resolvePairCentralInferenceV1>) {
  return projectPairFreeFieldsV1({
    central,
    relationStatusId: 'R3',
    birthConclusionSuffix: '生まれの基調は近くても、違いは返す速さに出やすい',
  });
}

function projectedFullBlob(projected: ReturnType<typeof projectFull>): string {
  return [
    projected.relationshipTriggerJa,
    projected.evidenceSupportJa,
    projected.currentExpressionJa,
    projected.mismatchEntry,
    projected.misreadLoop,
    ...projected.relationshipSequenceJa,
    projected.betweenThem,
    projected.freeDepthAngleJa,
    projected.meshMoment,
  ].join('\n');
}

function distinctCount(values: string[]): number {
  return new Set(values).size;
}

function establishedMatrixCases(): Array<{
  stage: 'R3' | 'R6';
  answers: CompatibilityCurrentContextAnswersV2;
  isGap: boolean;
}> {
  const cases = [];
  for (const stage of STAGES) {
    for (const decisionPace of DECISION_V2) {
      for (const expressionPace of EXPRESSION_V2) {
        for (const disagreement of DISAGREEMENT_V2) {
          for (const returnPattern of RETURN_V2) {
            const isGap =
              decisionPace.startsWith('no_') ||
              disagreement.startsWith('no_') ||
              returnPattern.startsWith('no_');
            cases.push({
              stage,
              answers: { decisionPace, expressionPace, disagreement, returnPattern },
              isGap,
            });
          }
        }
      }
    }
  }
  return cases;
}

describe('pair sequence single source P4', () => {
  it('projects 81/81 full central surfaces without invariant failure', () => {
    const states = fullCentralStates();
    assert.equal(states.length, 81);
    for (const central of states) {
      const projected = projectFull(central);
      assert.ok(projected.relationshipTriggerJa.length > 0);
      assert.equal(projected.relationshipSequenceJa.length, 3);
    }
  });

  it('integrated fields show pace and loop materiality', () => {
    const states = fullCentralStates();
    const readField = (central: PairCentralInferenceV1, field: string): string => {
      const p = projectFull(central);
      if (field === 'seq0') return p.relationshipSequenceJa[0]!;
      if (field === 'seq1') return p.relationshipSequenceJa[1]!;
      if (field === 'seq2') return p.relationshipSequenceJa[2]!;
      if (field === 'misreadLoop') return p.misreadLoop;
      if (field === 'betweenThem') return p.betweenThem;
      return p.freeDepthAngleJa;
    };
    for (const fixedLoop of LOOP_CONTEXT_IDS) {
      const loopStates = states.filter((s) => s.repeat_state!.loop_context_id === fixedLoop);
      for (const field of ['seq1', 'betweenThem'] as const) {
        assert.ok(distinctCount(loopStates.map((central) => readField(central, field))) > 1, `fixed loop ${fixedLoop} field ${field}`);
      }
      for (const field of ['seq0', 'seq2', 'misreadLoop', 'freeDepthAngleJa'] as const) {
        assert.equal(
          distinctCount(loopStates.map((central) => readField(central, field))),
          1,
          `pace clock stays out of ${field} at ${fixedLoop}`,
        );
      }
    }
    for (const fixedPace of PACE_ALIGNMENT_STATE_IDS) {
      const paceStates = states.filter((s) => s.pace_state!.pace_alignment_state_id === fixedPace);
      const fields = ['misreadLoop', 'seq0', 'seq1', 'seq2', 'betweenThem', 'freeDepthAngleJa'] as const;
      for (const field of fields) {
        const values = paceStates.map((central) => {
          const p = projectFull(central);
          if (field === 'seq0') return p.relationshipSequenceJa[0]!;
          if (field === 'seq1') return p.relationshipSequenceJa[1]!;
          if (field === 'seq2') return p.relationshipSequenceJa[2]!;
          return p[field];
        });
        assert.ok(distinctCount(values) > 1, `fixed pace ${fixedPace} field ${field}`);
      }
    }
  });

  it('false-materiality invariance holds for pace-only and confirmation-only fields', () => {
    const states = fullCentralStates();
    for (const fixedPace of PACE_ALIGNMENT_STATE_IDS) {
      const paceStates = states.filter((s) => s.pace_state!.pace_alignment_state_id === fixedPace);
      const mismatchValues = paceStates.map((s) => projectFull(s).mismatchEntry);
      const currentValues = paceStates.map((s) => projectFull(s).currentExpressionJa);
      assert.equal(distinctCount(mismatchValues), 1, `mismatch loop variance at pace ${fixedPace}`);
      assert.equal(distinctCount(currentValues), 1, `current loop variance at pace ${fixedPace}`);
    }
    for (const fixedConfirmation of [
      'CONF_TALK_REACH',
      'CONF_PAUSE_TIME',
      'CONF_CARRY_HEAVY',
    ] as const) {
      const confStates = states.filter((s) => s.confirmation!.anchor_id === fixedConfirmation);
      const meshValues = confStates.map((s) => projectFull(s).meshMoment);
      const supportValues = confStates.map((s) => projectFull(s).evidenceSupportJa);
      assert.equal(distinctCount(meshValues), 1, `mesh pace variance at ${fixedConfirmation}`);
      assert.equal(distinctCount(supportValues), 1, `support pace variance at ${fixedConfirmation}`);
    }
  });

  it('CO_TALK full states avoid intention and verbal-overlap overreach', () => {
    const talkStates = fullCentralStates().filter((s) => s.conflict_onset_id === 'CO_TALK_IN_SESSION');
    assert.ok(talkStates.length > 0);
    for (const central of talkStates) {
      const blob = projectedFullBlob(projectFull(central));
      assert.doesNotMatch(blob, CO_TALK_INTENT_OVERREACH, central.repeat_state!.loop_context_id);
      assert.doesNotMatch(blob, VERBAL_OVERLAP, central.repeat_state!.loop_context_id);
    }
  });

  it('RE_EXPLICIT_REACH full states avoid same-topic continuation certainty', () => {
    const reachStates = fullCentralStates().filter((s) => s.reentry_motion_id === 'RE_EXPLICIT_REACH');
    assert.ok(reachStates.length > 0);
    for (const central of reachStates) {
      const blob = projectedFullBlob(projectFull(central));
      assert.doesNotMatch(blob, REACH_SAME_TOPIC_OVERREACH, central.repeat_state!.loop_context_id);
    }
  });

  it('decide_varies pace rows keep timing variability without existence toggles', () => {
    const variesStates = fullCentralStates().filter((s) =>
      s.pace_state!.pace_alignment_state_id.startsWith('decide_varies__'),
    );
    assert.equal(variesStates.length, 27);
    for (const central of variesStates) {
      const projected = projectFull(central);
      const paceBlob = [
        projected.relationshipTriggerJa,
        projected.currentExpressionJa,
        projected.mismatchEntry,
        projected.misreadLoop,
        ...projected.relationshipSequenceJa,
        projected.betweenThem,
        projected.freeDepthAngleJa,
      ].join('\n');
      assert.doesNotMatch(
        paceBlob,
        DECIDE_VARIES_EXISTENCE_TOGGLE,
        central.pace_state!.pace_alignment_state_id,
      );
      assert.match(
        paceBlob,
        DECIDE_VARIES_TIMING_EVIDENCE,
        central.pace_state!.pace_alignment_state_id,
      );
    }
  });

  it('does not retain the known unnatural mismatch phrase', () => {
    const blob = fullCentralStates()
      .map((central) => projectedFullBlob(projectFull(central)))
      .join('\n');
    assert.doesNotMatch(blob, OLD_MISMATCH_PHRASE);
    assert.equal((blob.match(OLD_MISMATCH_PHRASE) ?? []).length, 0);
  });

  it('CO_TALK full states avoid unsupported causal escalation', () => {
    const talkStates = fullCentralStates().filter((s) => s.conflict_onset_id === 'CO_TALK_IN_SESSION');
    for (const central of talkStates) {
      const blob = projectedFullBlob(projectFull(central));
      assert.doesNotMatch(blob, CO_TALK_CAUSAL_ESCALATION, central.repeat_state!.loop_context_id);
    }
  });

  it('decide_now__words_soon co-emergence avoids invented precedence', () => {
    const coStates = fullCentralStates().filter(
      (s) => s.pace_state!.pace_alignment_state_id === 'decide_now__words_soon',
    );
    assert.equal(coStates.length, 9);
    for (const central of coStates) {
      const blob = projectedFullBlob(projectFull(central));
      assert.doesNotMatch(blob, CO_EMERGENCE_PRECEDENCE, central.repeat_state!.loop_context_id);
      assert.match(blob, CO_EMERGENCE_SAME_SCENE, central.repeat_state!.loop_context_id);
    }
  });

  it('decide_later__words_vary keeps deferred decision and variable expression timing across loops', () => {
    const states = fullCentralStates().filter(
      (s) => s.pace_state!.pace_alignment_state_id === 'decide_later__words_vary',
    );
    assert.equal(states.length, 9);
    for (const central of states) {
      const blob = projectedFullBlob(projectFull(central));
      assert.doesNotMatch(blob, /決めるタイミングが場面で変わる/u, central.repeat_state!.loop_context_id);
      assert.match(blob, DECIDE_LATER_WORDS_VARY_DEFERRED, central.repeat_state!.loop_context_id);
      assert.match(blob, DECIDE_LATER_WORDS_VARY_EXPRESSION, central.repeat_state!.loop_context_id);
    }
  });

  it('RE_HEAVY_THRESHOLD full states avoid unfinished-topic inference', () => {
    const heavyStates = fullCentralStates().filter((s) => s.reentry_motion_id === 'RE_HEAVY_THRESHOLD');
    assert.equal(heavyStates.length, 27);
    for (const central of heavyStates) {
      const blob = projectedFullBlob(projectFull(central));
      assert.doesNotMatch(blob, HEAVY_UNFINISHED_TOPIC, central.repeat_state!.loop_context_id);
      assert.match(blob, HEAVY_REENTRY_DIFFICULTY, central.repeat_state!.loop_context_id);
    }
  });

  it('CO_TOPIC_CARRY full states avoid private unexpressed feeling claims', () => {
    const carryStates = fullCentralStates().filter((s) => s.conflict_onset_id === 'CO_TOPIC_CARRY');
    assert.equal(carryStates.length, 27);
    for (const central of carryStates) {
      const blob = projectedFullBlob(projectFull(central));
      assert.doesNotMatch(blob, CARRY_PRIVATE_FEELING, central.repeat_state!.loop_context_id);
      assert.match(blob, /話題|引き取|流れ/u, central.repeat_state!.loop_context_id);
    }
  });

  it('decide_varies__words_vary avoids reversal/swap overclaim', () => {
    const states = fullCentralStates().filter(
      (s) => s.pace_state!.pace_alignment_state_id === 'decide_varies__words_vary',
    );
    assert.equal(states.length, 9);
    for (const central of states) {
      const blob = projectedFullBlob(projectFull(central));
      assert.doesNotMatch(blob, DECIDE_VARIES_REVERSAL, central.repeat_state!.loop_context_id);
      assert.match(blob, /決めるタイミング/u, central.repeat_state!.loop_context_id);
      assert.match(blob, /言葉になるタイミング/u, central.repeat_state!.loop_context_id);
    }
  });

  it('forbids known broken naturalness phrases across 81 full projections', () => {
    const blob = fullCentralStates()
      .map((central) => projectedFullBlob(projectFull(central)))
      .join('\n');
    assert.doesNotMatch(blob, BROKEN_NATURALNESS_PHRASES);
  });

  it('P0 safety counters stay zero across 81 full projections', () => {
    const blob = fullCentralStates()
      .map((central) => {
        const p = projectFull(central);
        return [
          p.relationshipTriggerJa,
          p.evidenceSupportJa,
          p.currentExpressionJa,
          p.mismatchEntry,
          p.misreadLoop,
          ...p.relationshipSequenceJa,
          p.betweenThem,
          p.freeDepthAngleJa,
          p.meshMoment,
        ].join('\n');
      })
      .join('\n');
    assert.doesNotMatch(blob, WORD_QUANTITY);
    assert.doesNotMatch(blob, PLACED_CONCLUSION);
    assert.doesNotMatch(blob, PRIVATE_STATE);
    assert.doesNotMatch(blob, VERBAL_OVERLAP);
    assert.doesNotMatch(blob, WITHDRAW_OVERCLAIM);
    assert.doesNotMatch(blob, SAME_TOPIC_RESTORE);
    assert.doesNotMatch(blob, PAID_PROCEDURE);
  });

  it('384/384 route B sequence parity between insight and public currentContext', () => {
    let okCount = 0;
    let missingContext = 0;
    for (const { stage, answers } of establishedMatrixCases()) {
      const result = buildCompatibilityPublicResult(PAIR, stage, answers);
      assert.equal(result.ok, true, `${stage}:${JSON.stringify(answers)}`);
      if (!result.ok) continue;
      okCount += 1;
      const context = result.value.currentContext;
      if (!context) missingContext += 1;
      assert.ok(context, `${stage}:${JSON.stringify(answers)}`);
      const insight = buildPairFreeInsightSpecV2({
        answersV2: answers,
        pairAxisId: 'A2',
        personABirthDate: PAIR.personA,
        personBBirthDate: PAIR.personB,
        personAUsesFirstPerspective: true,
        focusLabel: '会話の進め方',
        relationStatusId: stage,
      });
      assert.deepStrictEqual(
        context.relationshipLoopSteps,
        insight.relationshipSequenceJa,
        `${stage}:${JSON.stringify(answers)}`,
      );
    }
    assert.equal(okCount, 384);
    assert.equal(missingContext, 0);
  });

  it('public overlay replaces pre-overlay display-builder relationshipLoopSteps', () => {
    const answers: CompatibilityCurrentContextAnswersV2 = {
      decisionPace: 'decide_now',
      expressionPace: 'words_soon',
      disagreement: 'talk_now',
      returnPattern: 'someone_reaches',
    };
    const paidSnapshot = buildPaidCompatibilityReportV1({
      pairAxisId: 'A2',
      paidTopicId: 'T3',
      relationStatusId: 'R3',
      temperatureId: 'E0',
      personAUsesFirstPerspective: true,
      currentContextV2: answers,
      personABirthDate: PAIR.personA,
      personBBirthDate: PAIR.personB,
    });
    const preOverlaySteps = paidSnapshot.currentContext?.relationshipLoopSteps;
    assert.ok(preOverlaySteps);
    const publicResult = buildCompatibilityPublicResult(PAIR, 'R3', answers);
    assert.equal(publicResult.ok, true);
    if (!publicResult.ok) return;
    const insight = buildPairFreeInsightSpecV2({
      answersV2: answers,
      pairAxisId: 'A2',
      personABirthDate: PAIR.personA,
      personBBirthDate: PAIR.personB,
      personAUsesFirstPerspective: true,
      focusLabel: '会話の進め方',
      relationStatusId: 'R3',
    });
    assert.deepEqual(publicResult.value.currentContext!.relationshipLoopSteps, insight.relationshipSequenceJa);
    assert.notDeepEqual(publicResult.value.currentContext!.relationshipLoopSteps, preOverlaySteps);
  });

  it('fail-closed static contract exists in pairReadingGuestResult', () => {
    const source = read('lib/m55/compatibility/pairReadingGuestResult.ts');
    assert.match(source, /establishedV2Route/);
    assert.match(source, /establishedV2Route && !baseContext/);
    assert.match(source, /if \(establishedV2Route\) \{[\s\S]*try \{[\s\S]*overlayPairFreeInsight/);
    assert.doesNotMatch(source, /establishedV2Route[\s\S]*baseContext\s*:\s*baseContext/);
  });

  it('no secondary overwrite of relationshipLoopSteps after overlay in guest result source', () => {
    const source = read('lib/m55/compatibility/pairReadingGuestResult.ts');
    const overlayIdx = source.indexOf('relationshipLoopSteps = insight.relationshipSequenceJa');
    assert.ok(overlayIdx > 0);
    const afterOverlay = source.slice(overlayIdx);
    const reassign = afterOverlay.match(/relationshipLoopSteps\s*=/g) ?? [];
    assert.equal(reassign.length, 1);
  });

  it('dual-delay states do not infer relative order across all 9 loops', () => {
    const states = fullCentralStates().filter(
      (s) => s.pace_state!.pace_alignment_state_id === 'decide_later__words_later',
    );
    assert.equal(states.length, 9);
    const relativeOrder =
      /区切りを置く前に言葉|言葉が出る前に区切り|言葉のあとに区切り|区切りのあとに言葉|先に言葉が出てから区切り/;
    for (const central of states) {
      const blob = projectedFullBlob(projectFull(central));
      assert.doesNotMatch(blob, relativeOrder, central.repeat_state!.loop_context_id);
      assert.match(blob, /区切り/);
      assert.match(blob, /言葉/);
      assert.match(blob, /時間/);
    }
  });

  it('heavy reentry with co-emergence does not claim a quick next utterance', () => {
    const states = fullCentralStates().filter(
      (s) =>
        s.pace_state!.pace_alignment_state_id === 'decide_now__words_soon' &&
        s.reentry_motion_id === 'RE_HEAVY_THRESHOLD',
    );
    assert.equal(states.length, 3);
    for (const central of states) {
      const projected = projectFull(central);
      const sequence2 = projected.relationshipSequenceJa[2]!;
      assert.match(sequence2, HEAVY_REENTRY_DIFFICULTY);
      assert.doesNotMatch(sequence2, /次の一言が早く|早く出やすい|次の一言が早く出/);
      assert.doesNotMatch(sequence2, /その前の場面へは/u);
    }
  });

  it('TALK_REACH does not invent aligned boundary or remembered agreement', () => {
    const states = fullCentralStates().filter((s) => s.repeat_state!.loop_context_id === 'LC_TALK_REACH');
    assert.equal(states.length, 9);
    const forbidden = /区切りの見え方が先に揃|揃った記憶|記憶だけが残|合意|一致した区切り/;
    for (const central of states) {
      const blob = projectedFullBlob(projectFull(central));
      assert.doesNotMatch(blob, forbidden, central.pace_state!.pace_alignment_state_id);
      assert.match(blob, /短い声|連絡|かけ直/);
    }
  });

  it('TALK_HEAVY does not infer that heavy reentry makes the boundary ambiguous', () => {
    const states = fullCentralStates().filter((s) => s.repeat_state!.loop_context_id === 'LC_TALK_HEAVY');
    assert.equal(states.length, 9);
    const causal = /戻る入口が重いと、区切り|区切りの位置が先に曖昧|重いと、区切り/;
    for (const central of states) {
      const blob = projectedFullBlob(projectFull(central));
      assert.doesNotMatch(blob, causal, central.pace_state!.pace_alignment_state_id);
      assert.match(blob, /戻るまでに間|戻りにくさ/);
    }
  });

  it('CARRY states do not narrate unfinished or neglected residue', () => {
    const states = fullCentralStates().filter((s) => s.conflict_onset_id === 'CO_TOPIC_CARRY');
    assert.equal(states.length, 27);
    const residue = /置き去り|残った一点|未完|終わっていない|残ったまま/;
    for (const central of states) {
      const blob = projectedFullBlob(projectFull(central));
      assert.doesNotMatch(blob, residue, central.repeat_state!.loop_context_id);
      assert.match(blob, /話題を引き取る|話題が先へ|流れが先|会話が先へ|先へ進/);
    }
  });

  it('misread and freeDepth do not fade and persist the same referent across 81 states', () => {
    const fade = /薄れ|消え/;
    const persist = /残りやす|記憶だけが残|意味が残/;
    for (const central of fullCentralStates()) {
      const projected = projectFull(central);
      const misreadFades = fade.test(projected.misreadLoop);
      const depthPersists = persist.test(projected.freeDepthAngleJa);
      const misreadPersists = persist.test(projected.misreadLoop);
      const depthFades = fade.test(projected.freeDepthAngleJa);
      assert.equal(
        misreadFades && depthPersists,
        false,
        central.pace_state!.pace_alignment_state_id + central.repeat_state!.loop_context_id,
      );
      assert.equal(
        misreadPersists && depthFades,
        false,
        central.pace_state!.pace_alignment_state_id + central.repeat_state!.loop_context_id,
      );
    }
  });

  it('co-emergence does not claim that the next topic becomes hard to read', () => {
    const states = fullCentralStates().filter(
      (s) => s.pace_state!.pace_alignment_state_id === 'decide_now__words_soon',
    );
    assert.equal(states.length, 9);
    for (const central of states) {
      const projected = projectFull(central);
      const blob = projectedFullBlob(projected);
      assert.doesNotMatch(blob, /次の話題への移り方が読み分けにくい/);
      assert.notEqual(projected.relationshipSequenceJa[0], projected.relationshipSequenceJa[1]);
      assert.match(projected.relationshipSequenceJa[0]!, /違いが出た直後/);
      assert.doesNotMatch(projected.relationshipSequenceJa[1]!, /戻るときは、/u);
      assert.match(projected.relationshipSequenceJa[2]!, /声をかけ直した|時間を置いた|戻るまでに間/);
    }
  });

  it('delayed expression is not total silence, including dual delay', () => {
    const silence = /言葉はまだ出ていない|言葉が出ていない|まだ言葉はない|無言のまま|沈黙だけ/;
    const later = fullCentralStates().filter((s) => s.pace_state!.pace_alignment_state_id.endsWith('words_later'));
    assert.equal(later.length, 27);
    for (const central of later) {
      const blob = projectedFullBlob(projectFull(central));
      assert.doesNotMatch(blob, silence, central.pace_state!.pace_alignment_state_id);
    }
    const talkLater = later.filter((s) => s.conflict_onset_id === 'CO_TALK_IN_SESSION');
    for (const central of talkLater) {
      const blob = projectedFullBlob(projectFull(central));
      assert.match(blob, /その場で言葉を交わす/);
      assert.match(blob, /あとから|時間がかかる|時間をかけて/);
    }
  });

  it('decide_varies__words_later betweenThem states scene-varying decision and later expression', () => {
    const states = fullCentralStates().filter(
      (s) => s.pace_state!.pace_alignment_state_id === 'decide_varies__words_later',
    );
    assert.equal(states.length, 9);
    for (const central of states) {
      const between = projectFull(central).betweenThem;
      assert.match(between, /区切りの置き方は日によって違/);
      assert.match(between, /説明は遅れて届く/);
      assert.doesNotMatch(between, /順番の違いが、あとから残り/);
      assert.doesNotMatch(between, /時点が動/);
    }
  });

  it('decide_later__words_vary does not use procrastination wording', () => {
    const states = fullCentralStates().filter(
      (s) => s.pace_state!.pace_alignment_state_id === 'decide_later__words_vary',
    );
    for (const central of states) {
      const blob = projectedFullBlob(projectFull(central));
      assert.doesNotMatch(blob, /決め方を先延ばし/);
      assert.match(blob, /決めるまで時間を置/);
    }
  });

  it('forbids known mechanical Japanese across 81 full projections', () => {
    const blob = fullCentralStates()
      .map((central) => projectedFullBlob(projectFull(central)))
      .join('\n');
    assert.doesNotMatch(blob, /表面は進んだあと|戻る合図の重さ|話題の残り方が次の場面まで残りやすい|戻り方の読み方にも残る/);
  });

  it('222 gap outputs make no unavailable-dimension, repeat, disagreement, return, or decision claims', () => {
    const decisionEvidence = {
      decide_now: 'answer:decisionPace:decide_now',
      decide_later: 'answer:decisionPace:decide_later',
      decide_varies: 'answer:decisionPace:decide_varies',
      no_shared_decision_yet: 'gap:decisionPace',
    } as const;
    const expressionEvidence = {
      words_soon: 'answer:expressionPace:words_soon',
      words_later: 'answer:expressionPace:words_later',
      words_vary: 'answer:expressionPace:words_vary',
    } as const;
    const disagreementEvidence = {
      talk_now: 'answer:disagreement:talk_now',
      take_space: 'answer:disagreement:take_space',
      one_carries: 'answer:disagreement:one_carries',
      no_disagreement_yet: 'gap:disagreement',
    } as const;
    const returnEvidence = {
      someone_reaches: 'answer:returnPattern:someone_reaches',
      time_restores: 'answer:returnPattern:time_restores',
      return_is_hard: 'answer:returnPattern:return_is_hard',
      no_misalignment_return_yet: 'gap:returnPattern',
    } as const;
    const repeatConsequence = /同じ型が続く|沈黙が続くたび|型が続くと|続くたびに|この繰り返しでは/;
    const disagreementEvent = /意見が分かれた|意見が割れた|違いが出ると|違いが出た/;
    const returnEvent = /声をかけ直|戻る入口|戻るまでに間|距離が自然に戻|距離は自然に戻|短い声で連絡|短い声が先に/;
    const decisionEvent =
      /区切りはその場で置|区切りは置か|結論をその場|決めるまで時間を置|決めるタイミング|いつ結論を置く|結論の時点/;
    const existenceToggle = /結論を置く日と置かない日|区切る日と置く日|入れ替わる|結論を置くかどうか|区切りを置くかどうか/;
    let unavailable = 0;
    let repeatWithout = 0;
    let disagreementClaims = 0;
    let returnClaims = 0;
    let decisionClaims = 0;
    let existence = 0;
    let quantity = 0;
    let count = 0;
    for (const { answers, isGap } of establishedMatrixCases()) {
      if (!isGap) continue;
      count += 1;
      const decisionPace = answers.decisionPace ?? 'no_shared_decision_yet';
      const expressionPace = answers.expressionPace ?? 'words_soon';
      const disagreement = answers.disagreement ?? 'no_disagreement_yet';
      const returnPattern = answers.returnPattern ?? 'no_misalignment_return_yet';
      const central = resolvePairCentralInferenceV1([
        decisionEvidence[decisionPace],
        expressionEvidence[expressionPace],
        disagreementEvidence[disagreement],
        returnEvidence[returnPattern],
      ]);
      const projected = projectPairFreeFieldsV1({ central, relationStatusId: 'R3' });
      const blob = projectedFullBlob(projected);
      if (WORD_QUANTITY.test(blob)) quantity += 1;
      if (existenceToggle.test(blob)) existence += 1;
      const hasRepeat = 'repeat_state' in central && central.repeat_state != null;
      if (!hasRepeat && repeatConsequence.test(blob)) repeatWithout += 1;
      const hasConflict = 'conflict_onset_id' in central && central.conflict_onset_id != null;
      if (!hasConflict && disagreementEvent.test(blob)) disagreementClaims += 1;
      const hasReentry = 'reentry_motion_id' in central && central.reentry_motion_id != null;
      if (!hasReentry && returnEvent.test(blob)) returnClaims += 1;
      const hasPace = 'pace_state' in central && central.pace_state != null;
      if (!hasPace && decisionEvent.test(blob)) decisionClaims += 1;
      if (
        (!hasRepeat && repeatConsequence.test(blob)) ||
        (!hasConflict && disagreementEvent.test(blob)) ||
        (!hasReentry && returnEvent.test(blob)) ||
        (!hasPace && decisionEvent.test(blob))
      ) {
        unavailable += 1;
      }
    }
    assert.equal(count, 222);
    assert.equal(unavailable, 0);
    assert.equal(repeatWithout, 0);
    assert.equal(disagreementClaims, 0);
    assert.equal(returnClaims, 0);
    assert.equal(decisionClaims, 0);
    assert.equal(existence, 0);
    assert.equal(quantity, 0);
  });

  it('full freeDepth is observational and not an instruction', () => {
    const imperative = /別々に見る|まとめない|分けて考える|してください|するとよい|同じ事実としては見ない|先後としては置かない/u;
    for (const central of fullCentralStates()) {
      const depth = projectFull(central).freeDepthAngleJa;
      assert.doesNotMatch(depth, imperative, central.repeat_state!.loop_context_id);
      assert.equal((depth.match(/。/gu) ?? []).length, 1);
      assert.doesNotMatch(depth, /まとめやすい|見えやすい/u);
    }
  });

  it('full misread is a plausible mistake and not model glue', () => {
    const glue = /から区別しにくい|時点が動く|順番としては置かない|そのものではない/u;
    for (const central of fullCentralStates()) {
      const misread = projectFull(central).misreadLoop;
      assert.match(misread, /同じ型が続くと/u);
      assert.match(misread, /受け取りやすい/u);
      assert.doesNotMatch(misread, glue, central.pace_state!.pace_alignment_state_id);
    }
  });

  it('full sequence steps are distinct and progressive', () => {
    for (const central of fullCentralStates()) {
      const [sequence0, sequence1, sequence2] = projectFull(central).relationshipSequenceJa;
      assert.match(sequence0!, /違いが出た直後/u);
      assert.doesNotMatch(sequence1!, /戻るときは、/u);
      assert.match(sequence2!, /声をかけ直した|時間を置いた|戻るまでに間/u);
      assert.doesNotMatch(sequence2!, /その前の場面のあと/u);
      assert.notEqual(sequence0, sequence1);
      assert.notEqual(sequence1, sequence2);
      assert.notEqual(sequence0, sequence2);
      assert.equal(sequence1!.includes(sequence0!), false);
      assert.equal(sequence2!.includes(sequence1!), false);
      assert.equal(sequence0!.includes(sequence2!), false);
    }
  });

  it('full mesh and support stay inside observable confirmation', () => {
    const meshBenefit = /続きやすい|再開しやすい|足さなくても|留まれると|空白になりにくい|してください|するとよい/u;
    const supportAdvice = /してください|するとよい|必ず戻|解決する/u;
    for (const central of fullCentralStates()) {
      const projected = projectFull(central);
      assert.doesNotMatch(projected.meshMoment, meshBenefit, central.confirmation!.anchor_id);
      assert.doesNotMatch(projected.evidenceSupportJa, supportAdvice);
      assert.match(projected.evidenceSupportJa, /戻る|距離|入口|手がかり|合図|つなぐ|戻りやすい|戻りにくさ/u);
    }
  });

  it('known mechanical phrases stay absent from 81 full projections', () => {
    const mechanical =
      /時点が動く|順番としては置かない|そのものではない|残り方が|別々に見る|まとめない|見え方があとから残る|意味が薄れる|意味が残る/u;
    for (const central of fullCentralStates()) {
      assert.doesNotMatch(projectedFullBlob(projectFull(central)), mechanical, central.pace_state!.pace_alignment_state_id);
    }
  });

  it('222 gap outputs stay on the Patch-3 canonical digest', () => {
    const rows: string[] = [];
    for (const stage of ['R3', 'R6'] as const) {
      for (const decisionPace of DECISION_V2) {
        for (const expressionPace of EXPRESSION_V2) {
          for (const disagreement of DISAGREEMENT_V2) {
            for (const returnPattern of RETURN_V2) {
              const isGap =
                decisionPace.startsWith('no_') ||
                disagreement.startsWith('no_') ||
                returnPattern.startsWith('no_');
              if (!isGap) continue;
              const answers = { decisionPace, expressionPace, disagreement, returnPattern };
              const spec = buildPairFreeInsightSpecV2({
                answersV2: answers,
                pairAxisId: 'A2',
                personABirthDate: '1990-01-15',
                personBBirthDate: '1992-08-20',
                personAUsesFirstPerspective: true,
                focusLabel: '会話',
                relationStatusId: stage,
              });
              rows.push(
                JSON.stringify({
                  stage,
                  d: answers.decisionPace,
                  e: answers.expressionPace,
                  dis: answers.disagreement,
                  r: answers.returnPattern,
                  trigger: spec.relationshipTriggerJa,
                  support: spec.evidenceSupportJa,
                  current: spec.currentExpressionJa,
                  mismatch: spec.mismatchEntry,
                  misread: spec.misreadLoop,
                  seq: spec.relationshipSequenceJa,
                  between: spec.betweenThem,
                  depth: spec.freeDepthAngleJa,
                  mesh: spec.meshMoment,
                }),
              );
            }
          }
        }
      }
    }
    assert.equal(rows.length, 222);
    const digest = createHash('sha256').update(rows.join('\n')).digest('hex');
    assert.equal(digest, '2549e044ee55e75d65303347ce34a6bffcfca06711ef61329fb0413c6b0f42e8');
  });

  it('full copy does not force orthogonal dimensions into one comparison', () => {
    const forced =
      /同じ落ち着き|同じ途切れ|同じ止まり方|同じ早さ|同じ遅れ|一つの変化|その前の場面のあと|区切りがもう一度来た/u;
    for (const central of fullCentralStates()) {
      assert.doesNotMatch(
        projectedFullBlob(projectFull(central)),
        forced,
        central.pace_state!.pace_alignment_state_id + central.repeat_state!.loop_context_id,
      );
    }
  });

  it('sequence steps and between/freeDepth do not share a full sentence', () => {
    const sentences = (text: string) =>
      text
        .split('。')
        .map((part) => part.trim())
        .filter((part) => part.length > 0);
    for (const central of fullCentralStates()) {
      const projected = projectFull(central);
      const [sequence0, sequence1, sequence2] = projected.relationshipSequenceJa;
      const s0 = sentences(sequence0!);
      const s1 = sentences(sequence1!);
      const s2 = sentences(sequence2!);
      for (const sentence of s0) {
        assert.equal(s1.includes(sentence), false, sentence);
        assert.equal(s2.includes(sentence), false, sentence);
      }
      for (const sentence of s1) assert.equal(s2.includes(sentence), false, sentence);
      const between = new Set(sentences(projected.betweenThem));
      for (const sentence of sentences(projected.freeDepthAngleJa)) {
        assert.equal(between.has(sentence), false, sentence);
      }
    }
  });

  it('decide_now__words_soon talk-reach sequence steps have different roles', () => {
    const central = fullCentralStates().find(
      (state) =>
        state.pace_state!.pace_alignment_state_id === 'decide_now__words_soon' &&
        state.repeat_state!.loop_context_id === 'LC_TALK_REACH',
    )!;
    const [sequence0, sequence1, sequence2] = projectFull(central).relationshipSequenceJa;
    assert.match(sequence0!, /違いが出た直後/u);
    assert.doesNotMatch(sequence0!, /この場面で同時に出ている/u);
    assert.match(sequence1!, /この場面で同時に出ている/u);
    assert.match(sequence1!, /話が閉じたとまとめやすい/u);
    assert.doesNotMatch(sequence1!, /戻るときは、/u);
    assert.match(sequence2!, /声をかけ直した/u);
    assert.doesNotMatch(sequence2!, /この場面で同時に出ている/u);
  });

  it('named states avoid forced comparisons and abstract recurrence', () => {
    const targets = [
      ['decide_now__words_soon', 'LC_TALK_TIME'],
      ['decide_now__words_soon', 'LC_PAUSE_TIME'],
      ['decide_now__words_soon', 'LC_CARRY_HEAVY'],
      ['decide_varies__words_soon', 'LC_TALK_REACH'],
      ['decide_varies__words_later', 'LC_TALK_REACH'],
      ['decide_varies__words_vary', 'LC_TALK_REACH'],
    ] as const;
    const forced =
      /同じ落ち着き|同じ途切れ|同じ止まり方|同じ早さ|同じ遅れ|一つの変化|その前の場面のあと|区切りがもう一度来た/u;
    for (const [pace, loop] of targets) {
      const central = fullCentralStates().find(
        (state) => state.pace_state!.pace_alignment_state_id === pace && state.repeat_state!.loop_context_id === loop,
      )!;
      const projected = projectFull(central);
      const blob = projectedFullBlob(projected);
      assert.doesNotMatch(blob, forced, `${pace}:${loop}`);
      assert.match(projected.misreadLoop, /同じ型が続くと/u);
      assert.equal((projected.freeDepthAngleJa.match(/。/gu) ?? []).length, 1);
      assert.doesNotMatch(projected.freeDepthAngleJa, /別々に見る|まとめない|してください|まとめやすい|見えやすい/u);
    }
  });

  it('words_vary full states keep timing and reject occurrence toggles', () => {
    const toggle =
      /出る日と出ない日|入る日と入らない日|言う日と言わない日|ある日とない日|言葉にする日としない日|説明が出る日と出ない日|説明が入る日と入らない日|言葉が出る日と出ない日/u;
    const timing = /言葉になるタイミング|言葉になる早さ|言葉の早さ|場面で変わる|場面によって変わる|その場面で変わる|場面ごとに変わる/u;
    const states = fullCentralStates().filter((state) => state.pace_state!.pace_alignment_state_id.endsWith('words_vary'));
    assert.equal(states.length, 27);
    for (const central of states) {
      const blob = projectedFullBlob(projectFull(central));
      assert.doesNotMatch(blob, toggle, central.repeat_state!.loop_context_id);
      assert.match(blob, timing, central.pace_state!.pace_alignment_state_id);
    }
  });

  it('integrated fields stay sensitive to RepeatRisk, pace, and reentry', () => {
    const pace = 'decide_now__words_soon';
    const states = fullCentralStates().filter((state) => state.pace_state!.pace_alignment_state_id === pace);
    assert.equal(states.length, 9);
    const projected = states.map((state) => projectFull(state));
    assert.equal(distinctCount(projected.map((item) => item.betweenThem)), 9);
    assert.equal(distinctCount(projected.map((item) => item.relationshipSequenceJa[0]!)), 9);
    assert.equal(distinctCount(projected.map((item) => item.relationshipSequenceJa[1]!)), 9);
    assert.equal(distinctCount(projected.map((item) => item.relationshipSequenceJa[2]!)), 9);
    assert.equal(distinctCount(projected.map((item) => item.freeDepthAngleJa)), 9);
    assert.equal(distinctCount(projected.map((item) => item.misreadLoop)), 9);
    const reach = states.filter((state) => state.reentry_motion_id === 'RE_EXPLICIT_REACH');
    assert.equal(distinctCount(reach.map((state) => projectFull(state).relationshipSequenceJa[0]!)), 3);
    assert.equal(distinctCount(reach.map((state) => projectFull(state).betweenThem)), 3);
  });

  it('sequence1 does not use one mechanical return template', () => {
    const seconds = fullCentralStates().map((state) => projectFull(state).relationshipSequenceJa[1]!.split('。')[1]!.trim());
    const counts = new Map<string, number>();
    for (const sentence of seconds) {
      assert.doesNotMatch(sentence, /戻るときは、/u);
      counts.set(sentence, (counts.get(sentence) ?? 0) + 1);
    }
    assert.equal(counts.size, 9);
    for (const count of counts.values()) assert.equal(count, 9);
  });

  it('known model-Japanese phrases stay absent from full copy', () => {
    const model =
      /最初の反応が、一つにまとまる|区切りと説明は、同じやりとりの中に入る|その前の場面へは、声がまだ戻っていない|最初の反応の止まる位置|止まる位置が日によって違う|その前の場面のあと/u;
    for (const central of fullCentralStates()) {
      assert.doesNotMatch(projectedFullBlob(projectFull(central)), model, central.repeat_state!.loop_context_id);
    }
  });

  it('carry-reach reentry does not claim a topic identity', () => {
    const differentTopic = /別の用件|別の話題|違う用件|別の話/u;
    const sameTopic = /同じ話|同じ話題|続きの話|前の話の続き|話の続き|途中だった話が続く/u;
    const states = fullCentralStates().filter((state) => state.repeat_state!.loop_context_id === 'LC_CARRY_REACH');
    assert.equal(states.length, 9);
    for (const central of states) {
      const blob = projectedFullBlob(projectFull(central));
      assert.doesNotMatch(blob, differentTopic, central.pace_state!.pace_alignment_state_id);
      assert.doesNotMatch(blob, sameTopic, central.pace_state!.pace_alignment_state_id);
    }
  });

  it('full copy does not state repeat risk as an observed count', () => {
    const frequency = /何度も|毎回|たびに|繰り返し戻る|いつも戻/u;
    for (const central of fullCentralStates()) {
      assert.doesNotMatch(
        projectedFullBlob(projectFull(central)),
        frequency,
        central.pace_state!.pace_alignment_state_id + central.repeat_state!.loop_context_id,
      );
    }
  });

  it('pace timing is not ordered against reentry', () => {
    const ordered =
      /戻ってきたときも|戻ってきたあとで言葉|短い連絡のあとに説明が来る|戻ったあとに説明が来る|連絡のあとで言葉になる|再接触より前|再接触より後|戻ってきたときもまだ/u;
    for (const central of fullCentralStates()) {
      assert.doesNotMatch(
        projectedFullBlob(projectFull(central)),
        ordered,
        central.pace_state!.pace_alignment_state_id + central.repeat_state!.loop_context_id,
      );
    }
    const reachLater = fullCentralStates().filter(
      (state) =>
        state.reentry_motion_id === 'RE_EXPLICIT_REACH' &&
        state.pace_state!.pace_alignment_state_id.endsWith('words_later'),
    );
    assert.equal(reachLater.length, 9);
    for (const central of reachLater) {
      const sequence2 = projectFull(central).relationshipSequenceJa[2]!;
      assert.doesNotMatch(sequence2, /説明|言葉になる|あとから来る/u);
    }
    const reachSoon = fullCentralStates().filter(
      (state) =>
        state.reentry_motion_id === 'RE_EXPLICIT_REACH' &&
        state.pace_state!.pace_alignment_state_id.endsWith('words_soon'),
    );
    assert.equal(reachSoon.length, 9);
    for (const central of reachSoon) {
      const sequence2 = projectFull(central).relationshipSequenceJa[2]!;
      assert.doesNotMatch(sequence2, /説明の前|言葉は先|区切りの前/u);
    }
  });

  it('sequence2 stays on reentry and repeat without a pace clock', () => {
    for (const pace of PACE_ALIGNMENT_STATE_IDS) {
      const states = fullCentralStates().filter((state) => state.pace_state!.pace_alignment_state_id === pace);
      const sequence2 = states.map((state) => projectFull(state).relationshipSequenceJa[2]!);
      assert.equal(distinctCount(sequence2), 9, pace);
      for (const text of sequence2) {
        assert.match(text, /声をかけ直した|時間を置いた|戻るまでに間/u);
        assert.match(text, /別の拍|距離のほう|進みにくい|また言葉が交わる|会話が再開|戻りにくさ|再び声がかかる|別にある|戻る速さは別|早さまで含めて/u);
      }
    }
  });

  it('forbidden model-Japanese phrases stay absent from full copy', () => {
    const forbidden = /戻って見える|声を戻す|戻る入口|入口が重い|入口の重さ|間が残る|止まる位置|最初の反応/u;
    for (const central of fullCentralStates()) {
      assert.doesNotMatch(
        projectedFullBlob(projectFull(central)),
        forbidden,
        central.pace_state!.pace_alignment_state_id + central.repeat_state!.loop_context_id,
      );
    }
  });

  it('talk-reach does not make short re-contact the main claim of every field', () => {
    const central = fullCentralStates().find(
      (state) =>
        state.pace_state!.pace_alignment_state_id === 'decide_now__words_soon' &&
        state.repeat_state!.loop_context_id === 'LC_TALK_REACH',
    )!;
    const projected = projectFull(central);
    const echo = /短い連絡/u;
    for (const text of [
      projected.misreadLoop,
      projected.relationshipSequenceJa[0]!,
      projected.relationshipSequenceJa[1]!,
      projected.betweenThem,
      projected.freeDepthAngleJa,
    ]) {
      assert.doesNotMatch(text, echo);
    }
    assert.match(projected.relationshipSequenceJa[2]!, /声をかけ直した/u);
    assert.match(projected.evidenceSupportJa, /つなぐ/u);
    assert.match(projected.meshMoment, /一言/u);
    assert.doesNotMatch(projected.meshMoment, /確認は、.*に立つ|ところに立つ/u);
  });

  it('support and mesh keep different roles', () => {
    const meshes = new Map<string, string>();
    for (const central of fullCentralStates()) {
      const projected = projectFull(central);
      assert.notEqual(projected.evidenceSupportJa, projected.meshMoment);
      assert.doesNotMatch(projected.meshMoment, /会話を再びつなぐ|手がかりになっている/u);
      assert.doesNotMatch(projected.meshMoment, /確認は、.*に立つ|ところに立つ/u);
      meshes.set(central.confirmation!.anchor_id, projected.meshMoment);
    }
    assert.equal(meshes.size, 9);
    assert.equal(new Set(meshes.values()).size, 9);
  });

  it('betweenThem and freeDepth keep different roles', () => {
    for (const central of fullCentralStates()) {
      const projected = projectFull(central);
      assert.notEqual(projected.betweenThem, projected.freeDepthAngleJa);
      assert.match(projected.betweenThem, /二人の間では/u);
      assert.equal((projected.freeDepthAngleJa.match(/。/gu) ?? []).length, 1);
      assert.doesNotMatch(projected.freeDepthAngleJa, /まとめやすい|読みが二人で分かれる|見えやすい/u);
      assert.equal(projected.betweenThem.includes(projected.freeDepthAngleJa.replace(/。$/u, '')), false);
    }
  });

  it('betweenThem stays on the split and the repeat shape without a count', () => {
    for (const pace of PACE_ALIGNMENT_STATE_IDS) {
      const states = fullCentralStates().filter((state) => state.pace_state!.pace_alignment_state_id === pace);
      const between = states.map((state) => projectFull(state).betweenThem);
      assert.equal(distinctCount(between), 9, pace);
      for (const text of between) {
        assert.match(text, /二人の間では/u);
        assert.match(text, /見方が割れる/u);
        assert.doesNotMatch(text, /何度も|毎回|たびに|繰り返し/u);
      }
    }
  });

  it('visible support changes with confirmation inside one reentry', () => {
    const byReentry = new Map<string, Map<string, string>>();
    for (const central of fullCentralStates()) {
      const reentry = central.reentry_motion_id!;
      const anchor = central.confirmation!.anchor_id;
      const support = projectFull(central).evidenceSupportJa;
      const anchors = byReentry.get(reentry) ?? new Map<string, string>();
      const prior = anchors.get(anchor);
      if (prior === undefined) anchors.set(anchor, support);
      else assert.equal(prior, support, anchor);
      byReentry.set(reentry, anchors);
    }
    assert.equal(byReentry.size, 3);
    for (const [reentry, anchors] of byReentry) {
      assert.equal(anchors.size, 3, reentry);
      assert.equal(new Set(anchors.values()).size, 3, reentry);
    }
    const reach = byReentry.get('RE_EXPLICIT_REACH')!;
    assert.match(reach.get('CONF_TALK_REACH')!, /交わしたあと/u);
    assert.match(reach.get('CONF_PAUSE_REACH')!, /黙ったあと/u);
    assert.match(reach.get('CONF_CARRY_REACH')!, /話題を進めたあと/u);
    const time = byReentry.get('RE_TIME_NATURAL_RESTORE')!;
    assert.match(time.get('CONF_TALK_TIME')!, /交わしたあと/u);
    assert.match(time.get('CONF_PAUSE_TIME')!, /黙ったあと/u);
    assert.match(time.get('CONF_CARRY_TIME')!, /話題を進めたあと/u);
    const heavy = byReentry.get('RE_HEAVY_THRESHOLD')!;
    assert.match(heavy.get('CONF_TALK_HEAVY')!, /交わしたあと/u);
    assert.match(heavy.get('CONF_PAUSE_HEAVY')!, /黙ったあと/u);
    assert.match(heavy.get('CONF_CARRY_HEAVY')!, /話題を進めたあと/u);
  });

  it('mismatched confirmation fails closed before support copy', () => {
    const central = fullCentralStates().find((state) => state.confirmation!.anchor_id === 'CONF_TALK_REACH')!;
    assert.throws(
      () =>
        projectFull({
          ...central,
          confirmation: { anchor_id: 'CONF_PAUSE_REACH' as const },
        } as ReturnType<typeof resolvePairCentralInferenceV1>),
      /pair_central_projection_invariant_failed/u,
    );
  });

  it('named echo families keep distinct customer claims', () => {
    const at = (loop: string) =>
      projectFull(
        fullCentralStates().find(
          (state) =>
            state.pace_state!.pace_alignment_state_id === 'decide_now__words_soon' &&
            state.repeat_state!.loop_context_id === loop,
        )!,
      );
    const pauseReach = at('LC_PAUSE_REACH');
    assert.match(pauseReach.relationshipSequenceJa[1]!, /会話が終わった沈黙とまとめやすい/u);
    assert.match(pauseReach.freeDepthAngleJa, /話しかける声/u);
    assert.doesNotMatch(pauseReach.freeDepthAngleJa, /終わった沈黙|別のこと|同じではない/u);

    const pauseTime = at('LC_PAUSE_TIME');
    assert.match(pauseTime.relationshipSequenceJa[1]!, /話が消えた長さとまとめやすい/u);
    assert.match(pauseTime.freeDepthAngleJa, /余白/u);
    assert.doesNotMatch(pauseTime.freeDepthAngleJa, /話が消えた|別のこと|同じではない/u);

    const pauseHeavy = at('LC_PAUSE_HEAVY');
    assert.match(pauseHeavy.relationshipSequenceJa[1]!, /会話が止まった長さとまとめやすい/u);
    assert.match(pauseHeavy.freeDepthAngleJa, /口を開く/u);
    assert.doesNotMatch(pauseHeavy.freeDepthAngleJa, /止まった長さ|同じではない|別のこと/u);

    const carryReach = at('LC_CARRY_REACH');
    assert.match(carryReach.relationshipSequenceJa[1]!, /二人の距離も同じように進んだ/u);
    assert.match(carryReach.freeDepthAngleJa, /一声が返ってくる/u);
    assert.doesNotMatch(carryReach.freeDepthAngleJa, /距離|別の変化|別のこと/u);
    assert.doesNotMatch(carryReach.betweenThem, /距離/u);

    const carryTime = at('LC_CARRY_TIME');
    const elapsedEqualsDistance = /時間.{0,16}距離も戻|距離も戻った時間|時間がたったことを、距離/u;
    assert.match(carryTime.relationshipSequenceJa[1]!, elapsedEqualsDistance);
    assert.doesNotMatch(carryTime.betweenThem, elapsedEqualsDistance);
    assert.doesNotMatch(carryTime.freeDepthAngleJa, elapsedEqualsDistance);
    assert.notEqual(carryTime.relationshipSequenceJa[1], carryTime.betweenThem);
    assert.notEqual(carryTime.betweenThem, carryTime.freeDepthAngleJa);
  });

  it('time support stays a tendency inside each confirmation scene', () => {
    const states = fullCentralStates().filter((state) => state.reentry_motion_id === 'RE_TIME_NATURAL_RESTORE');
    const byAnchor = new Map<string, string>();
    const certain = /必ず戻|自然に戻っていく|元に戻る|距離は自然に戻|戻っていく/u;
    for (const central of states) {
      const support = projectFull(central).evidenceSupportJa;
      const anchor = central.confirmation!.anchor_id;
      const prior = byAnchor.get(anchor);
      if (prior === undefined) byAnchor.set(anchor, support);
      else assert.equal(prior, support, anchor);
      assert.match(support, /戻りやすい/u);
      assert.doesNotMatch(support, certain, anchor);
    }
    assert.equal(byAnchor.size, 3);
    assert.equal(new Set(byAnchor.values()).size, 3);
  });

  it('corrected model phrases stay out of full copy', () => {
    const removed = /短い声|置いていた距離|戻りにくさの手がかり|同じ知らせ/u;
    for (const central of fullCentralStates()) {
      assert.doesNotMatch(
        projectedFullBlob(projectFull(central)),
        removed,
        central.pace_state!.pace_alignment_state_id + central.repeat_state!.loop_context_id,
      );
    }
  });
});
