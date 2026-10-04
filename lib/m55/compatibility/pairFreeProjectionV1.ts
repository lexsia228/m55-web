/**
 * Pair Free central projection v1 — customer-facing copy derived from PairCentralInferenceV1 only.
 * P4: prose projection layer; no raw answers, axis, focus, DOB derivation, or resolver calls.
 * Patch-3: full-state semantic closure and gap projection gated by the central variant.
 * Patch-4: full-observation Japanese only. Gap projection keeps the Patch-3 strings.
 * Patch-5: full-observation field roles. Gap strings stay frozen.
 * Patch-6: words_vary stays timing, and full fields keep RepeatRisk provenance.
 * Patch-7: full copy stays topic-neutral, frequency-free, and does not order pace against reentry.
 * Patch-8: full fields keep one job each. Gap strings stay frozen.
 * Patch-9: full support shows Reentry and Confirmation; mesh and depth stay distinct.
 * Patch-10: time support stays a tendency, and freeDepth is a separate scene.
 */

import type {
  ConfirmationAnchorV1,
  ConflictOnsetMotionId,
  ExpressionPaceStateId,
  LoopContextId,
  PaceAlignmentStateId,
  PaceStateV1,
  PairCentralInferenceV1,
  PrimarySplitLocusId,
  ReentryMotionId,
  RepeatRiskStateV1,
} from './pairCentralInferenceV1';

export type PairFreeProjectedFieldsV1 = {
  readonly relationshipTriggerJa: string;
  readonly evidenceSupportJa: string;
  readonly currentExpressionJa: string;
  readonly mismatchEntry: string;
  readonly misreadLoop: string;
  readonly relationshipSequenceJa: readonly [string, string, string];
  readonly betweenThem: string;
  readonly freeDepthAngleJa: string;
  readonly meshMoment: string;
};

export type ProjectPairFreeFieldsV1Input = {
  readonly central: PairCentralInferenceV1;
  readonly relationStatusId: 'R3' | 'R6';
  /** Presentation-only DOB suffix for opening/trigger (computed upstream). */
  readonly birthOpeningSuffix?: string;
  /** Presentation-only DOB suffix for conclusion/betweenThem (computed upstream). */
  readonly birthConclusionSuffix?: string;
};

const PAIR_CENTRAL_PROJECTION_INVARIANT_FAILED = 'pair_central_projection_invariant_failed' as const;

const NO_OBS_MISMATCH_ENTRY =
  'まだ二人で何かを決める場面がないため、決める速さの違いは今回の読み取りから除外します。';
const NO_OBS_MISREAD_LOOP =
  'まだ意見が違う場面がないため、対立時の動きは今回の読み取りから除外します。';
const NO_OBS_BETWEEN_ALL =
  '二人の間では、まだ十分な相互作用の履歴がないため、決める速さ・対立時の動き・戻り方は読み取りません。言葉の出方など、いま観察できる範囲だけを入口にします。';
const NO_OBS_BETWEEN_PARTIAL =
  '二人の間では、まだ起きていない出来事からは読み取らず、いま観察できる範囲だけを入口にします。';
const REPEAT_NOT_OBSERVED = '繰り返し方までは、まだ観測できない。';

type PaceSemantics = {
  heroObservation: string;
  currentNow: string;
  onset: string;
  mid: string;
  priorScene: string;
  misreadPace: string;
  depthPace: string;
};

const PACE_SEMANTICS: Record<PaceAlignmentStateId, PaceSemantics> = {
  decide_now__words_soon: {
    heroObservation: '区切りと言葉が同じ場面で出る',
    currentNow: '区切りと言葉が同じ場面で同時に出ている',
    onset: 'そこでは区切りと説明が同じ場面に出る',
    mid: '区切りと説明は、この場面で同時に出ている',
    priorScene: 'その前の場面では、区切りと説明が同じ場面に出ていた',
    misreadPace: '同時に出た区切りと説明',
    depthPace: '同時に出た区切りと説明も、一つの合図にはまとめない',
  },
  decide_now__words_later: {
    heroObservation: '区切りはその場で置かれる一方、その区切りを言葉にするのはあとからになる',
    currentNow: '区切りはその場で置かれており、その区切りを言葉にするのはあとからになっている',
    onset: 'そこでは区切りがその場で置かれ、区切りの説明はあとから言葉になる',
    mid: '区切りの説明は、まだあとに控えている',
    priorScene: 'その前の場面では、区切りは置かれ、説明はあとから言葉になっていた',
    misreadPace: 'あとから来る区切りの説明',
    depthPace: '置いた区切りと、あとから来る説明も、一つの説明にはまとめない',
  },
  decide_now__words_vary: {
    heroObservation: '区切りはその場で置かれる一方、言葉になるタイミングは場面で変わる',
    currentNow: '区切りはその場で置かれ、言葉になるタイミングが場面で変わっている',
    onset: 'そこでは区切りがその場で置かれ、言葉になるタイミングだけがその場面で変わる',
    mid: '説明の出る時点だけが、この場面では動いている',
    priorScene: 'その前の場面では、区切りは置かれ、説明の出る時点だけが場面で動いていた',
    misreadPace: 'その場に置いた区切りの説明時点',
    depthPace: '置いた区切りと、場面で動く説明の時点も、一つの型にはまとめない',
  },
  decide_later__words_soon: {
    heroObservation: '言葉は先に出る一方、区切りはまだ置かれない',
    currentNow: '言葉は先に出ており、区切りはまだ置かれていない',
    onset: 'そこでは言葉が先に出て、区切りはまだ置かれない',
    mid: '区切りの時点はまだ来ていない',
    priorScene: 'その前の場面では、言葉が先に出て、区切りはまだ置かれていなかった',
    misreadPace: 'まだ置いていない区切り',
    depthPace: '先に出た説明と、まだ来ていない区切りの時点も、一つの結論にはまとめない',
  },
  decide_later__words_later: {
    heroObservation: '区切りを置くにも、言葉にするにも、時間がかかる',
    currentNow: '区切りも、それを言葉にすることも、どちらも時間をかけて進んでいる',
    onset: 'そこでは、区切りを置く時間も言葉にする時間も、どちらもかかる',
    mid: '区切りまでの時間と説明までの時間は、どちらもかかっている',
    priorScene: 'その前の場面では、区切りも説明も、どちらも時間をかけて進んでいた',
    misreadPace: '区切りと言葉のそれぞれの時間',
    depthPace: '区切りまでの時間と説明までの時間も、先後としては置かない',
  },
  decide_later__words_vary: {
    heroObservation: '決めるまで時間を置きやすく、言葉になるタイミングは場面で変わる',
    currentNow: '決めるまで時間を置く一方、言葉になるタイミングがその場面で変わっている',
    onset: 'そこでは決めるまで時間を置き、言葉になるタイミングは場面で変わる',
    mid: '説明の出る時点はこの場面で違う',
    priorScene: 'その前の場面では、決めるまで時間を置き、説明の出る時点は場面で違っていた',
    misreadPace: '時間を置いて決めるときの説明時点',
    depthPace: '結論まで間を取る時間と、場面で動く説明の時点も、一つの進み方にはまとめない',
  },
  decide_varies__words_soon: {
    heroObservation: '言葉はすぐ出るが、いつ結論を置くかはその場面で変わる',
    currentNow: '言葉はすぐ出ているが、いつ結論を置くかはその場面で変わっている',
    onset: 'そこでは言葉はすぐ出て、決めるタイミングはその場面で変わる',
    mid: '説明は早く出て、結論の時点はこの場面で動く',
    priorScene: 'その前の場面では、説明は早く出て、結論の時点はその場面で動いていた',
    misreadPace: '場面で動く決める時点',
    depthPace: '説明が早く出ることと、結論の時点が場面で動くことを、同じ事実としては見ない',
  },
  decide_varies__words_later: {
    heroObservation: '言葉は遅れて出る一方、決めるタイミングはその場面で変わる',
    currentNow: '言葉は遅れて出ており、決めるタイミングがその場面で変わっている',
    onset: 'そこでは言葉はあとから出て、決めるタイミングはその場面で変わる',
    mid: '説明は遅れて届き、結論の時点はこの場面で動く',
    priorScene: 'その前の場面では、説明は遅れて届き、結論の時点はその場面で動いていた',
    misreadPace: '遅れて出る言葉',
    depthPace: '説明が遅れて届くことと、結論の時点が場面で動くことを、同じ事実としては見ない',
  },
  decide_varies__words_vary: {
    heroObservation: '決めるタイミングも言葉になるタイミングも、その場面ごとに変わる',
    currentNow: '決めるタイミングと言葉になるタイミングが、その場面ごとに異なっている',
    onset: 'そこでは決めるタイミングも言葉になるタイミングも、その場面ごとに変わる',
    mid: '結論の時点も説明の時点も、この場面ごとに動いている',
    priorScene: 'その前の場面では、結論の時点も説明の時点も、その場面ごとに動いていた',
    misreadPace: '場面ごとに動く二つの時点',
    depthPace: '結論の時点が場面で動くことと、説明の時点が場面で動くことを、同じ変動としては見ない',
  },
};

/** Timing-faithful mismatch. decide_varies is scene timing, never an existence toggle. */
const MISMATCH_BY_LOCUS: Record<PrimarySplitLocusId, string> = {
  PSL_BOUNDARY_AND_WORDS_COEMERGE:
    '区切りと言葉が同時に見えるとき、どこで一区切りとみなすかが二人の間でずれやすい。',
  PSL_BOUNDARY_BEFORE_WORDS:
    '区切りだけが先に見えるとき、まだ届いていない説明をどこまで話の中身に含めるかがずれる。',
  PSL_IN_SESSION_BOUNDARY_WITH_SCENE_EXPRESSION_TIMING:
    '結論はその場で置かれる一方、言葉になるタイミングが場面で変わるとき、その出方を内容の違いと読むか場面の違いと読むかがずれる。',
  PSL_WORDS_AHEAD_OF_DEFERRED_BOUNDARY:
    '言葉だけが先に並んでいるとき、それを説明の途中と読むか結論の予告と読むかがずれる。',
  PSL_DEFERRED_BOUNDARY_AND_DELAYED_WORDS:
    '区切りも言葉もすぐには出ないとき、その時間を考える時間と読むか会話の終わりと読むかがずれる。',
  PSL_DEFERRED_BOUNDARY_WITH_SCENE_EXPRESSION_TIMING:
    '決めるまで時間を置く一方、言葉になるタイミングが場面で変わるとき、その出方を様子の違いと読むか場面の違いと読むかがずれる。',
  PSL_SCENE_BOUNDARY_TOGGLE_WITH_QUICK_WORDS:
    '決めるタイミングが場面で変わる一方、言葉はすぐ出るとき、その出方を場面の変化と読むか進み方の違いと読むかがずれる。',
  PSL_SCENE_BOUNDARY_TOGGLE_WITH_DELAYED_WORDS:
    '決めるタイミングが場面で変わる一方、言葉の遅れがあるとき、その出方を進み方の違いと読むか場面の違いと読むかがずれる。',
  PSL_DUAL_SCENE_DEPENDENCY_BOUNDARY_AND_EXPRESSION:
    '決めるタイミングと言葉になるタイミングが場面で変わるとき、今日の進み方そのものを二人の違いと読むか日の違いと読むかがずれる。',
};

const CONFLICT_OBSERVATION: Record<ConflictOnsetMotionId, string> = {
  CO_TALK_IN_SESSION: '違いが出ると、その場で言葉を交わす',
  CO_PAUSE_SPACE: '違いが出ると、会話がいったん止まって間が空く',
  CO_TOPIC_CARRY: '違いが出ると、話題を引き取って先へ進む',
};

const CONFLICT_ONSET: Record<ConflictOnsetMotionId, string> = {
  CO_TALK_IN_SESSION: 'その場で言葉を交わして始まる',
  CO_PAUSE_SPACE: '会話がいったん止まって間が空く',
  CO_TOPIC_CARRY: '話題を引き取って会話が先へ進む',
};

const CONCLUSION_BODY: Record<ConflictOnsetMotionId, string> = {
  CO_TALK_IN_SESSION:
    'すれ違いの中心は話題そのものではなく、どこで会話を一区切りとみなすかの違いにある。',
  CO_PAUSE_SPACE:
    'すれ違いの中心は沈黙そのものではなく、その沈黙をまだ会話の途中と読むかここで終わったと読むかの違いにある。',
  CO_TOPIC_CARRY:
    'すれ違いの中心は話題の中身そのものではなく、話題を引き取って流れを先へ進めるときの違いにある。',
};

const RETURN_BEAT: Record<ReentryMotionId, string> = {
  RE_EXPLICIT_REACH: '声をかけ直したあと、会話へ戻る入口がもう一度見える',
  RE_TIME_NATURAL_RESTORE: '時間を置いたあと、二人の距離が自然に戻りやすい',
  RE_HEAVY_THRESHOLD: '戻るまでに間が空きやすく、会話へ戻る入口が重い',
};

function conflictFromLoopContextId(loopContextId: LoopContextId): ConflictOnsetMotionId {
  if (loopContextId === 'LC_TALK_REACH' || loopContextId === 'LC_TALK_TIME' || loopContextId === 'LC_TALK_HEAVY') {
    return 'CO_TALK_IN_SESSION';
  }
  if (loopContextId === 'LC_PAUSE_REACH' || loopContextId === 'LC_PAUSE_TIME' || loopContextId === 'LC_PAUSE_HEAVY') {
    return 'CO_PAUSE_SPACE';
  }
  if (loopContextId === 'LC_CARRY_REACH' || loopContextId === 'LC_CARRY_TIME' || loopContextId === 'LC_CARRY_HEAVY') {
    return 'CO_TOPIC_CARRY';
  }
  throw new Error(PAIR_CENTRAL_PROJECTION_INVARIANT_FAILED);
}

function reentryFromLoopContextId(loopContextId: LoopContextId): ReentryMotionId {
  if (loopContextId === 'LC_TALK_REACH' || loopContextId === 'LC_PAUSE_REACH' || loopContextId === 'LC_CARRY_REACH') {
    return 'RE_EXPLICIT_REACH';
  }
  if (loopContextId === 'LC_TALK_TIME' || loopContextId === 'LC_PAUSE_TIME' || loopContextId === 'LC_CARRY_TIME') {
    return 'RE_TIME_NATURAL_RESTORE';
  }
  if (loopContextId === 'LC_TALK_HEAVY' || loopContextId === 'LC_PAUSE_HEAVY' || loopContextId === 'LC_CARRY_HEAVY') {
    return 'RE_HEAVY_THRESHOLD';
  }
  throw new Error(PAIR_CENTRAL_PROJECTION_INVARIANT_FAILED);
}

function conflictFromConfirmationAnchorId(anchorId: ConfirmationAnchorV1['anchor_id']): ConflictOnsetMotionId {
  if (anchorId === 'CONF_TALK_REACH' || anchorId === 'CONF_TALK_TIME' || anchorId === 'CONF_TALK_HEAVY') {
    return 'CO_TALK_IN_SESSION';
  }
  if (anchorId === 'CONF_PAUSE_REACH' || anchorId === 'CONF_PAUSE_TIME' || anchorId === 'CONF_PAUSE_HEAVY') {
    return 'CO_PAUSE_SPACE';
  }
  if (anchorId === 'CONF_CARRY_REACH' || anchorId === 'CONF_CARRY_TIME' || anchorId === 'CONF_CARRY_HEAVY') {
    return 'CO_TOPIC_CARRY';
  }
  throw new Error(PAIR_CENTRAL_PROJECTION_INVARIANT_FAILED);
}

function reentryFromConfirmationAnchorId(anchorId: ConfirmationAnchorV1['anchor_id']): ReentryMotionId {
  if (anchorId === 'CONF_TALK_REACH' || anchorId === 'CONF_PAUSE_REACH' || anchorId === 'CONF_CARRY_REACH') {
    return 'RE_EXPLICIT_REACH';
  }
  if (anchorId === 'CONF_TALK_TIME' || anchorId === 'CONF_PAUSE_TIME' || anchorId === 'CONF_CARRY_TIME') {
    return 'RE_TIME_NATURAL_RESTORE';
  }
  if (anchorId === 'CONF_TALK_HEAVY' || anchorId === 'CONF_PAUSE_HEAVY' || anchorId === 'CONF_CARRY_HEAVY') {
    return 'RE_HEAVY_THRESHOLD';
  }
  throw new Error(PAIR_CENTRAL_PROJECTION_INVARIANT_FAILED);
}

function assertIntegratedPaceCoherence(paceState: PaceStateV1, repeatState: RepeatRiskStateV1): void {
  if (
    repeatState.pace_alignment_state_id !== paceState.pace_alignment_state_id ||
    repeatState.primary_split_mechanic_id !== paceState.primary_split.mechanic_id
  ) {
    throw new Error(PAIR_CENTRAL_PROJECTION_INVARIANT_FAILED);
  }
}

function supportFromReentry(reentryMotionId: ReentryMotionId): string {
  if (reentryMotionId === 'RE_EXPLICIT_REACH') {
    return '戻るときは短い声が先に入る。その短い声が、会話を再びつなぐ合図になっている。';
  }
  if (reentryMotionId === 'RE_TIME_NATURAL_RESTORE') {
    return '時間がたつと、二人の距離は自然に戻りやすい。その経過そのものが、会話をつなぎ直す手がかりになっている。';
  }
  return '戻る入口が重く、空白が続きやすい。その空白そのものが、戻りにくさの手がかりになっている。';
}

function supportFromReentryAndConfirmation(
  reentryMotionId: ReentryMotionId,
  conflictOnsetId: ConflictOnsetMotionId,
  confirmation: ConfirmationAnchorV1,
): string {
  if (reentryFromConfirmationAnchorId(confirmation.anchor_id) !== reentryMotionId) {
    throw new Error(PAIR_CENTRAL_PROJECTION_INVARIANT_FAILED);
  }
  if (conflictFromConfirmationAnchorId(confirmation.anchor_id) !== conflictOnsetId) {
    throw new Error(PAIR_CENTRAL_PROJECTION_INVARIANT_FAILED);
  }
  switch (confirmation.anchor_id) {
    case 'CONF_TALK_REACH':
      return '交わしたあとにかけ直した声で、また話をつなぐ。';
    case 'CONF_TALK_TIME':
      return '交わしたあと時間を置くと、また話せる距離に戻りやすい。';
    case 'CONF_TALK_HEAVY':
      return '交わしたあと、次の一言まで戻りにくさが出やすい。';
    case 'CONF_PAUSE_REACH':
      return '黙ったあとにかけ直した声で、また話をつなぐ。';
    case 'CONF_PAUSE_TIME':
      return '黙ったあと時間を置くと、また話せる距離に戻りやすい。';
    case 'CONF_PAUSE_HEAVY':
      return '黙ったあと、次の一言まで戻りにくさが出やすい。';
    case 'CONF_CARRY_REACH':
      return '話題を進めたあとにかけ直した声で、また話をつなぐ。';
    case 'CONF_CARRY_TIME':
      return '話題を進めたあと時間を置くと、また話せる距離に戻りやすい。';
    case 'CONF_CARRY_HEAVY':
      return '話題を進めたあと、次の一言まで戻りにくさが出やすい。';
  }
}

function meshFromConfirmation(confirmation: ConfirmationAnchorV1): string {
  switch (confirmation.anchor_id) {
    case 'CONF_TALK_REACH':
      return '短い確認が一言返ると、話そのものは続きやすい。';
    case 'CONF_TALK_TIME':
      return '時間をおいて会話が戻れたとき、説明を足さなくても会話は再開しやすい。';
    case 'CONF_TALK_HEAVY':
      return '今の話の範囲に留まれると、会話は続きやすい。';
    case 'CONF_PAUSE_REACH':
    case 'CONF_PAUSE_TIME':
    case 'CONF_PAUSE_HEAVY':
      return '間が空く前に、また話す時点が見えていると、沈黙が空白になりにくい。';
    case 'CONF_CARRY_REACH':
    case 'CONF_CARRY_TIME':
    case 'CONF_CARRY_HEAVY':
      return '話題を引き取ったあと、その流れが一言で先へ続くのが見える。';
  }
}

function expressionObservable(state: ExpressionPaceStateId): string {
  if (state === 'words_soon') return '言葉はすぐ出る';
  if (state === 'words_later') return '言葉が出るまで時間がかかる';
  return '言葉になるタイミングは場面で変わる';
}

function meshMomentFromExpressionState(
  expressionPaceState: ExpressionPaceStateId,
  options?: { decisionPaceNoObs?: boolean },
): string {
  if (options?.decisionPaceNoObs) {
    if (expressionPaceState === 'words_soon') {
      return '言葉がすぐ出る日は、言葉の出方の違いが先に立つことがあります。';
    }
    if (expressionPaceState === 'words_later') {
      return '言葉が出るまで時間がかかる日は、整うまでの時間が先に立つことがあります。';
    }
    return '言葉になるタイミングが場面で変わる日は、そのタイミングの違いが先に立つことがあります。';
  }
  if (expressionPaceState === 'words_soon') {
    return '言葉がすぐ出る日は、決める速さとの差が先に立つことがあります。';
  }
  if (expressionPaceState === 'words_later') {
    return '言葉が出るまで時間がかかる日は、結論の置き方との差が先に立つことがあります。';
  }
  return '言葉になるタイミングが場面で変わる日は、同じ場面でも進み方がずれて見えることがあります。';
}

/** Onset stays the conflict. The second clause is the repeat shape, not the return event. */
const SEQUENCE0_REPEAT: Record<LoopContextId, string> = {
  LC_TALK_REACH: 'この流れでは、その場の切れ目が次の受け取りまで残る',
  LC_TALK_TIME: 'この流れでは、やりとりの温度が時間とともに変わる',
  LC_TALK_HEAVY: 'この流れでは、交わしたあとの静けさが先に立つ',
  LC_PAUSE_REACH: '同じ流れになると、空いた間の読みが先に残る',
  LC_PAUSE_TIME: '同じ流れになると、空いた時間の長さが先に残る',
  LC_PAUSE_HEAVY: '同じ流れになると、次の一言までの静けさが先に立つ',
  LC_CARRY_REACH: 'このパターンでは、先へ進めた話題と二人の温度がずれて残る',
  LC_CARRY_TIME: 'このパターンでは、進めた話題と、時間をおいたあとの温度がずれる',
  LC_CARRY_HEAVY: 'このパターンでは、話題が進んでも次の一言までの静けさが残る',
};

/** Reentry motion for full sequence2. Gap copy keeps RETURN_BEAT. */
const FULL_RETURN: Record<ReentryMotionId, string> = {
  RE_EXPLICIT_REACH: '声をかけ直したあと、またやりとりが始まる',
  RE_TIME_NATURAL_RESTORE: '時間を置いたあと、また話せる距離に戻る',
  RE_HEAVY_THRESHOLD: '会話に戻るまでに間が空きやすい',
};

const FULL_MID: Record<PaceAlignmentStateId, string> = {
  decide_now__words_soon: '区切りと説明は、この場面で同時に出ている',
  decide_now__words_later: '区切りの説明は、まだあとに控えている',
  decide_now__words_vary: 'その場で区切りは置かれ、言葉になるタイミングは場面によって変わる',
  decide_later__words_soon: '言葉はすでに出ており、区切りを置くのはまだあとになっている',
  decide_later__words_later: '区切りまでの時間と説明までの時間は、どちらもかかっている',
  decide_later__words_vary: '決めるまで時間を置き、言葉になるタイミングは場面によって変わる',
  decide_varies__words_soon: '言葉はすぐ出て、いつ区切りを置くかは場面によって変わる',
  decide_varies__words_later: '説明は遅れて届き、あとから言葉になり、いつ区切りを置くかは場面によって変わる',
  decide_varies__words_vary: '話の途中では、決めるタイミングも言葉になるタイミングも、場面ごとに変わる',
};

/** The mistake is the main clause. The return event is not restated here. */
const FULL_MISREAD: Record<LoopContextId, string> = {
  LC_TALK_REACH: 'あとから届いた一言を、話の終わりそのものと受け取りやすい',
  LC_TALK_TIME: '時間をおいたあとの落ち着きを、すれ違いの終わりと受け取りやすい',
  LC_TALK_HEAVY: '次の一言までの間を、話の打ち切りと受け取りやすい',
  LC_PAUSE_REACH: '間のあとの一言を、沈黙が終わった印と受け取りやすい',
  LC_PAUSE_TIME: '空いた時間のあとを、話が消えたことと受け取りやすい',
  LC_PAUSE_HEAVY: '戻り始めるまでの間を、もう話さない時間と受け取りやすい',
  LC_CARRY_REACH: '先へ進めた流れを、二人の間も近づいたことと受け取りやすい',
  LC_CARRY_TIME: '時間がたったことを、すれ違いも消えたことと受け取りやすい',
  LC_CARRY_HEAVY: '話題が進んだことを、会話も戻ったことと受け取りやすい',
};

const FULL_BETWEEN_LOCUS: Record<PrimarySplitLocusId, string> = {
  PSL_BOUNDARY_AND_WORDS_COEMERGE: '話しているあいだに、区切りと説明が一緒に出る。',
  PSL_BOUNDARY_BEFORE_WORDS: 'あとから届く説明は、その場の区切りとは別の一言だ。',
  PSL_IN_SESSION_BOUNDARY_WITH_SCENE_EXPRESSION_TIMING: '言葉になる早さは日によって変わり、区切りはその場で置かれている。',
  PSL_WORDS_AHEAD_OF_DEFERRED_BOUNDARY: '言葉が出ていても、区切りはその場ではまだない。',
  PSL_DEFERRED_BOUNDARY_AND_DELAYED_WORDS: '区切りも説明も、出てくるまでに時間がかかる。',
  PSL_DEFERRED_BOUNDARY_WITH_SCENE_EXPRESSION_TIMING: '決めるまでは間があり、言葉になる早さは日によって変わる。',
  PSL_SCENE_BOUNDARY_TOGGLE_WITH_QUICK_WORDS: '区切りの置き方は日によって違い、言葉のほうは早く出る。',
  PSL_SCENE_BOUNDARY_TOGGLE_WITH_DELAYED_WORDS: '区切りの置き方は日によって違い、説明は遅れて届く。',
  PSL_DUAL_SCENE_DEPENDENCY_BOUNDARY_AND_EXPRESSION: '決める早さも言葉の出る早さも、日によって違う。',
};

const BETWEEN_REPEAT: Record<LoopContextId, string> = {
  LC_TALK_REACH: 'この流れでは、区切りを置いた場所で二人の見方が割れる。',
  LC_TALK_TIME: 'この流れでは、話したあとの時間をめぐって二人の見方が割れる。',
  LC_TALK_HEAVY: 'この流れでは、次の一言までの静けさで二人の見方が割れる。',
  LC_PAUSE_REACH: '同じ流れでは、空いた間の置き方で二人の見方が割れる。',
  LC_PAUSE_TIME: '同じ流れでは、空いた時間の長さで二人の見方が割れる。',
  LC_PAUSE_HEAVY: '同じ流れでは、次に話し始めるまでの静けさで二人の見方が割れる。',
  LC_CARRY_REACH: 'このパターンでは、話題の進み方で二人の見方が割れる。',
  LC_CARRY_TIME: 'このパターンでは、進めたあとに置いた時間で二人の見方が割れる。',
  LC_CARRY_HEAVY: 'このパターンでは、次に話し始めるまでの間で二人の見方が割れる。',
};

const FULL_LOOP_CROSS: Record<LoopContextId, string> = {
  LC_TALK_REACH: 'その場の区切りを、そこで話が閉じたとまとめやすい',
  LC_TALK_TIME: '話したあとの時間を、すれ違いが薄れた時間とまとめやすい',
  LC_TALK_HEAVY: '次の一言までの間を、話が止まった時間とまとめやすい',
  LC_PAUSE_REACH: '空いた間を、会話が終わった沈黙とまとめやすい',
  LC_PAUSE_TIME: '空いた時間の長さを、話が消えた長さとまとめやすい',
  LC_PAUSE_HEAVY: '戻り始めるまでの間を、会話が止まった長さとまとめやすい',
  LC_CARRY_REACH: '先へ進めた話題を、二人の距離も同じように進んだとまとめやすい',
  LC_CARRY_TIME: '話題が進んだあとの時間を、距離も戻った時間とまとめやすい',
  LC_CARRY_HEAVY: '話題が進んだことを、会話に戻る早さまで含めてまとめやすい',
};

const FULL_LOOP_DEPTH: Record<LoopContextId, string> = {
  LC_TALK_REACH: '前の一言は、もう一度話しかける声として届く',
  LC_TALK_TIME: '話したあとに置く時間は、また話し始めるまでの余白になりやすい',
  LC_TALK_HEAVY: '話したあと、次に口を開くまでが長くなりやすい',
  LC_PAUSE_REACH: '黙っているあいだに、もう一度話しかける声がかかる',
  LC_PAUSE_TIME: '黙ったあとの時間は、また口を開くまでの余白になりやすい',
  LC_PAUSE_HEAVY: '黙ったあと、次に口を開くまでが長くなりやすい',
  LC_CARRY_REACH: '話題を先へ進めたあと、一声が返ってくる',
  LC_CARRY_TIME: '話題を進めたあと時間を置くと、また口を開きやすい',
  LC_CARRY_HEAVY: '話題は先へ進んでも、次に口を開くまでが長くなりやすい',
};

const SEQUENCE2_REPEAT: Record<LoopContextId, string> = {
  LC_TALK_REACH: 'さっきの区切りとは、別の拍で言葉が交わる',
  LC_TALK_TIME: '戻るのは距離のほうで、話の結論が入れ替わったわけではない',
  LC_TALK_HEAVY: '次の一言までは、そのままでは進みにくい',
  LC_PAUSE_REACH: '空いていた間のあとで、また言葉が交わる',
  LC_PAUSE_TIME: '空いた時間のあとで、会話が再開する',
  LC_PAUSE_HEAVY: '空いた間が、そのまま戻りにくさになる',
  LC_CARRY_REACH: '話題が先へ進んだあとにも、再び声がかかる',
  LC_CARRY_TIME: '話題が進んだ時間と、距離が戻る時間は別にある',
  LC_CARRY_HEAVY: '話題が先へ進んでも、会話へ戻る速さは別だ',
};

function meshFromConfirmationFull(confirmation: ConfirmationAnchorV1): string {
  switch (confirmation.anchor_id) {
    case 'CONF_TALK_REACH':
      return 'あとから返ってくるのは、一言だ。';
    case 'CONF_TALK_TIME':
      return '話したあと、また話し始めている。';
    case 'CONF_TALK_HEAVY':
      return 'まだ今の話から動いていない。';
    case 'CONF_PAUSE_REACH':
      return '間のあと、一言が返ってくる。';
    case 'CONF_PAUSE_TIME':
      return '黙ったあと、また話し始めている。';
    case 'CONF_PAUSE_HEAVY':
      return '黙ったあとでも、まだ今の話から動いていない。';
    case 'CONF_CARRY_REACH':
      return '話題を進めたあと、一言が返ってくる。';
    case 'CONF_CARRY_TIME':
      return '話題を進めたあとでも、また話し始めている。';
    case 'CONF_CARRY_HEAVY':
      return '話題が進んだあとでも、まだ今の話から動いていない。';
  }
}

function projectFullObservation(input: ProjectPairFreeFieldsV1Input): PairFreeProjectedFieldsV1 {
  const paceState = input.central.pace_state!;
  const primarySplit = paceState.primary_split;
  const conflictOnsetId = input.central.conflict_onset_id!;
  const reentryMotionId = input.central.reentry_motion_id!;
  const repeatState = input.central.repeat_state!;
  const confirmation = input.central.confirmation!;
  assertIntegratedPaceCoherence(paceState, repeatState);

  const loopId = repeatState.loop_context_id;
  const loopConflict = conflictFromLoopContextId(loopId);
  if (loopConflict !== conflictOnsetId) {
    throw new Error(PAIR_CENTRAL_PROJECTION_INVARIANT_FAILED);
  }
  const loopReentry = reentryFromLoopContextId(loopId);
  if (loopReentry !== reentryMotionId) {
    throw new Error(PAIR_CENTRAL_PROJECTION_INVARIANT_FAILED);
  }

  const paceId = paceState.pace_alignment_state_id;
  const pace = PACE_SEMANTICS[paceId];
  const disagree = CONFLICT_OBSERVATION[conflictOnsetId];
  const sceneOpener = input.relationStatusId === 'R6' ? '日常の用事が一段落したあと、' : '';
  const heroBirthSuffix = input.birthOpeningSuffix ? ` ${input.birthOpeningSuffix}` : '';
  const birthSentence = input.birthConclusionSuffix ? `${input.birthConclusionSuffix}。` : '';
  const stagePrefix =
    input.relationStatusId === 'R6'
      ? '二人の間では、'
      : '二人の間では、関係が続いている場面でも、';

  const evidenceSupportJa = supportFromReentryAndConfirmation(reentryMotionId, conflictOnsetId, confirmation);
  const sequence0 = `違いが出た直後、${CONFLICT_ONSET[conflictOnsetId]}。${SEQUENCE0_REPEAT[loopId]}。`;
  const sequence1 = `${FULL_MID[paceId]}。${FULL_LOOP_CROSS[loopId]}。`;
  const sequence2 = `${FULL_RETURN[reentryMotionId]}。${SEQUENCE2_REPEAT[loopId]}。`;
  const misreadLoop = `同じ型が続くと、${FULL_MISREAD[loopId]}。`;
  const betweenThem = `${stagePrefix}${CONCLUSION_BODY[conflictOnsetId]}${FULL_BETWEEN_LOCUS[primarySplit.locus_id]}${BETWEEN_REPEAT[loopId]}${birthSentence}`;
  const freeDepthAngleJa = `${FULL_LOOP_DEPTH[loopId]}。`;

  return {
    relationshipTriggerJa: `${sceneOpener}${pace.heroObservation}。二人のあいだでは、${disagree}。${heroBirthSuffix}`,
    evidenceSupportJa,
    currentExpressionJa: `いまの会話では、${pace.currentNow}。`,
    mismatchEntry: MISMATCH_BY_LOCUS[primarySplit.locus_id],
    misreadLoop,
    relationshipSequenceJa: [sequence0, sequence1, sequence2],
    betweenThem,
    freeDepthAngleJa,
    meshMoment: meshFromConfirmationFull(confirmation),
  };
}

function expressionOnlyProjection(
  input: ProjectPairFreeFieldsV1Input,
): PairFreeProjectedFieldsV1 {
  const state = input.central.expression_pace_state;
  const observable = expressionObservable(state);
  const trigger =
    state === 'words_later'
      ? 'まだ決めごとや対立の履歴がないまま、言葉が出るまで時間がかかることだけが見えている。'
      : state === 'words_soon'
        ? 'まだ決めごとや対立の履歴がないまま、言葉がすぐ出ることだけが見えている。'
        : 'まだ決めごとや対立の履歴がないまま、言葉になるタイミングが場面で変わることだけが見えている。';
  const current =
    state === 'words_later'
      ? 'いま見えているのは、言葉が出るまで時間がかかることだけです。'
      : state === 'words_soon'
        ? 'いま見えているのは、言葉がすぐ出ることだけです。'
        : 'いま見えているのは、言葉になるタイミングが場面で変わることだけです。';
  return {
    relationshipTriggerJa: trigger,
    evidenceSupportJa: '観察できるのは言葉の出方までで、まだ起きていない決め方や戻り方は読みに入れない。',
    currentExpressionJa: current,
    betweenThem: NO_OBS_BETWEEN_ALL,
    mismatchEntry: NO_OBS_MISMATCH_ENTRY,
    misreadLoop: NO_OBS_MISREAD_LOOP,
    meshMoment: meshMomentFromExpressionState(state, { decisionPaceNoObs: true }),
    relationshipSequenceJa: [
      '二人のあいだで、まだ決めごとや対立の履歴は置かない。',
      `見えているのは、${observable}ことだけです。`,
      'その範囲を、決めたことや離れたこととしては読まない。',
    ],
    freeDepthAngleJa: `${REPEAT_NOT_OBSERVED}言葉の出方を、関心の有無や関係の結論としてはまだ読めない。`,
  };
}

function projectGapObservation(input: ProjectPairFreeFieldsV1Input): PairFreeProjectedFieldsV1 {
  const { central } = input;
  const expression = expressionObservable(central.expression_pace_state);

  switch (central.gap_signature_id) {
    case 'GAP_NONE':
      return projectFullObservation(input);
    case 'GAP_DECISION_DISAGREEMENT_RETURN':
      return expressionOnlyProjection(input);
    case 'GAP_DECISION': {
      const conflict = CONFLICT_OBSERVATION[central.conflict_onset_id];
      const reentry = supportFromReentry(central.reentry_motion_id);
      return {
        relationshipTriggerJa: `まだ二人で何かを決める場面がないため、決め方の速さは読み取らない。${conflict}。`,
        evidenceSupportJa: reentry,
        currentExpressionJa: `いまの会話では、${expression}。決める場面の有無は、ここには入っていない。`,
        mismatchEntry: NO_OBS_MISMATCH_ENTRY,
        misreadLoop: `${REPEAT_NOT_OBSERVED}${conflict}ところを、結論がすでに置かれた動きとしては見ない。`,
        relationshipSequenceJa: [
          `決める場面はまだない。${conflict}。`,
          `${RETURN_BEAT[central.reentry_motion_id]}。`,
          `見えている言葉は、${expression}ことまでだ。`,
        ],
        betweenThem: NO_OBS_BETWEEN_PARTIAL,
        freeDepthAngleJa: `${REPEAT_NOT_OBSERVED}見えているのは、${conflict}ことと、戻り方の手がかりまでだ。`,
        meshMoment: meshFromConfirmation(central.confirmation),
      };
    }
    case 'GAP_DISAGREEMENT': {
      const pace = PACE_SEMANTICS[central.pace_state.pace_alignment_state_id];
      return {
        relationshipTriggerJa: `まだ意見が違う場面がないため、対立のときの進み方からは読み取らない。${pace.heroObservation}。`,
        evidenceSupportJa: supportFromReentry(central.reentry_motion_id),
        currentExpressionJa: `いまの会話では、${pace.currentNow}。`,
        mismatchEntry: MISMATCH_BY_LOCUS[central.pace_state.primary_split.locus_id],
        misreadLoop: `意見が違う場面はまだない。${REPEAT_NOT_OBSERVED}${pace.heroObservation}ことを、対立の進み方としては見ない。`,
        relationshipSequenceJa: [
          `${pace.onset}。意見が違う場面はまだない。`,
          `${pace.mid}。`,
          `${RETURN_BEAT[central.reentry_motion_id]}。${pace.priorScene}。`,
        ],
        betweenThem: NO_OBS_BETWEEN_PARTIAL,
        freeDepthAngleJa: `${REPEAT_NOT_OBSERVED}${pace.depthPace}。`,
        meshMoment: meshMomentFromExpressionState(central.expression_pace_state),
      };
    }
    case 'GAP_RETURN': {
      const pace = PACE_SEMANTICS[central.pace_state.pace_alignment_state_id];
      const conflict = CONFLICT_OBSERVATION[central.conflict_onset_id];
      return {
        relationshipTriggerJa: `まだすれ違ったあとに戻る場面がないため、戻り方からは読み取らない。${pace.heroObservation}。${conflict}。`,
        evidenceSupportJa: `観察できるのは、${conflict}ことと、${expression}ことまでだ。戻り方はまだ入れない。`,
        currentExpressionJa: `いまの会話では、${pace.currentNow}。`,
        mismatchEntry: MISMATCH_BY_LOCUS[central.pace_state.primary_split.locus_id],
        misreadLoop: `${REPEAT_NOT_OBSERVED}${conflict}ところを、戻ったあとの型としては見ない。`,
        relationshipSequenceJa: [
          `違いが出た直後、${CONFLICT_ONSET[central.conflict_onset_id]}。${pace.onset}。`,
          `${pace.mid}。`,
          '戻る場面はまだないので、戻り方はここには入れない。',
        ],
        betweenThem: NO_OBS_BETWEEN_PARTIAL,
        freeDepthAngleJa: `${REPEAT_NOT_OBSERVED}${pace.depthPace}。`,
        meshMoment: meshMomentFromExpressionState(central.expression_pace_state),
      };
    }
    case 'GAP_DECISION_DISAGREEMENT':
      return {
        relationshipTriggerJa: `決める場面も、意見が違う場面も、まだない。${expression}。`,
        evidenceSupportJa: supportFromReentry(central.reentry_motion_id),
        currentExpressionJa: `いまの会話では、${expression}。決める場面も、意見が違う場面も、まだ入っていない。`,
        mismatchEntry: NO_OBS_MISMATCH_ENTRY,
        misreadLoop: NO_OBS_MISREAD_LOOP,
        relationshipSequenceJa: [
          '決める場面はまだない。',
          `意見が違う場面はまだない。${expression}。`,
          `${RETURN_BEAT[central.reentry_motion_id]}。`,
        ],
        betweenThem: NO_OBS_BETWEEN_PARTIAL,
        freeDepthAngleJa: `${REPEAT_NOT_OBSERVED}見えているのは、${expression}ことと、戻り方の手がかりまでだ。`,
        meshMoment: meshMomentFromExpressionState(central.expression_pace_state, { decisionPaceNoObs: true }),
      };
    case 'GAP_DECISION_RETURN': {
      const conflict = CONFLICT_OBSERVATION[central.conflict_onset_id];
      return {
        relationshipTriggerJa: `決める場面も、戻る場面も、まだない。${conflict}。`,
        evidenceSupportJa: `観察できるのは、${conflict}ことと、${expression}ことまでだ。戻り方も決め方も、まだ入れない。`,
        currentExpressionJa: `いまの会話では、${expression}。決める場面も戻る場面も、まだ入っていない。`,
        mismatchEntry: NO_OBS_MISMATCH_ENTRY,
        misreadLoop: `${REPEAT_NOT_OBSERVED}${conflict}ところを、戻ったあとの型としては見ない。`,
        relationshipSequenceJa: [
          '決める場面はまだない。',
          `${conflict}。`,
          `戻る場面はまだない。${expression}。`,
        ],
        betweenThem: NO_OBS_BETWEEN_PARTIAL,
        freeDepthAngleJa: `${REPEAT_NOT_OBSERVED}見えているのは、${conflict}ことと、${expression}ことまでだ。`,
        meshMoment: meshMomentFromExpressionState(central.expression_pace_state, { decisionPaceNoObs: true }),
      };
    }
    case 'GAP_DISAGREEMENT_RETURN': {
      const pace = PACE_SEMANTICS[central.pace_state.pace_alignment_state_id];
      return {
        relationshipTriggerJa: `意見が違う場面も、戻る場面も、まだない。${pace.heroObservation}。`,
        evidenceSupportJa: `観察できるのは、${pace.heroObservation}ことと、${expression}ことまでだ。`,
        currentExpressionJa: `いまの会話では、${pace.currentNow}。`,
        mismatchEntry: MISMATCH_BY_LOCUS[central.pace_state.primary_split.locus_id],
        misreadLoop: `意見が違う場面はまだない。${REPEAT_NOT_OBSERVED}${pace.heroObservation}ことを、対立の進み方としては見ない。`,
        relationshipSequenceJa: [
          '意見が違う場面はまだない。',
          `${pace.mid}。${expression}。`,
          '戻る場面はまだない。',
        ],
        betweenThem: NO_OBS_BETWEEN_PARTIAL,
        freeDepthAngleJa: `${REPEAT_NOT_OBSERVED}${pace.depthPace}。`,
        meshMoment: meshMomentFromExpressionState(central.expression_pace_state),
      };
    }
    default: {
      const _exhaustive: never = central;
      throw new Error(PAIR_CENTRAL_PROJECTION_INVARIANT_FAILED + String(_exhaustive));
    }
  }
}

/**
 * Project customer-facing Pair Free recognition fields from resolved central inference.
 */
export function projectPairFreeFieldsV1(input: ProjectPairFreeFieldsV1Input): PairFreeProjectedFieldsV1 {
  if (input.central.gap_signature_id === 'GAP_NONE') {
    return projectFullObservation(input);
  }
  return projectGapObservation(input);
}
