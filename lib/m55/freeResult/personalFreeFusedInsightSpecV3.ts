/**
 * Personal Free fused InsightSpec v3 — BirthSignature × answer signals.
 * Reuses dal-v1 axes. Does not invent a second calendar.
 */

import { pickFreeAlignDivergeItemV1 } from '../individualization/alignDivergeV1';
import { FREE_AXIS_QUESTION_IDS } from '../individualization/answerIdMapsV1';
import {
  evidenceIdsForAxis,
  type BirthEvidenceId,
  type BirthSignatureV1,
} from '../individualization/birthSignatureV1';
import type {
  AlignDivergeItem,
  ChangeTendency,
  DecisionTendency,
  DistanceTendency,
  ExpressionAxes,
  ExpressionAxisId,
  RecoveryTendency,
  StartTendency,
} from '../individualization/types';
import { buildPersonalFreeInsightSpecV2 } from './personalFreeInsightSpecV2';
import {
  buildPersonalManifestationV4,
  premiumBridgeForManifestation,
  type PersonalManifestationModifiersV2,
  type PersonalManifestationV4,
} from './personalFreeManifestationV4';

export const PERSONAL_FREE_FUSED_INSIGHT_SPEC_VERSION =
  'personal_free_fused_insight_v3' as const;

export type PersonalFusionInteractionKind = 'diverge_overlay' | 'align_overlay';

export type PersonalFreeFusedInsightSpecV3 = {
  readonly id: string;
  readonly kind: 'personal_free_fused_v3';
  readonly birthEvidenceIds: readonly BirthEvidenceId[];
  readonly answerEvidenceQuestionIds: readonly string[];
  readonly birthSignals: ExpressionAxes;
  readonly answerSignals: ExpressionAxes;
  readonly interactionId: string;
  readonly interactionKind: PersonalFusionInteractionKind;
  readonly hingeAxisId: ExpressionAxisId;
  readonly confidence: 'high' | 'medium';
  readonly specificityReason: string;
  readonly birthBaseJa: string;
  readonly currentExpressionJa: string;
  readonly headline: string;
  readonly fusedStackJa: string;
  readonly body: string;
  readonly behavioralPrediction: string;
  readonly manifestation: PersonalManifestationV4;
  readonly premiumContinuation: string;
  readonly premiumOpenQuestion: string;
  readonly workScene: string;
  readonly relationScene: string;
  readonly changeScene: string;
  readonly strengthConditions: readonly [string, string, string];
  readonly loadConditions: readonly [string, string, string];
};

const BIRTH_BASE: Readonly<
  Record<StartTendency, Readonly<Record<DecisionTendency, string>>>
> = {
  try: {
    sort: '生年月日の土台では、小さく動かして様子を見てから、候補を内側で比べやすい基調です。',
    deadline: '生年月日の土台では、小さく試し始めつつ、区切りが見えた瞬間に結論へ寄せやすい基調です。',
    wait: '生年月日の土台では、動き出しは早い一方、最後の結論だけは置いてから出しやすい基調です。',
  },
  map: {
    sort: '生年月日の土台では、全体を揃えてから動き、揃ったあとも比較が残りやすい基調です。',
    deadline: '生年月日の土台では、見通しを立ててから動き、期限が来ると一気に締めやすい基調です。',
    wait: '生年月日の土台では、全体を見てから動くのに、最後の決断はさらに間を置きやすい基調です。',
  },
  ask: {
    sort: '生年月日の土台では、周囲の視点を取り込みながら合わせ、一人になってから候補を並べ直しやすい基調です。',
    deadline: '生年月日の土台では、人に聞いて材料を増やしつつ、区切りが来ると一気に決めやすい基調です。',
    wait: '生年月日の土台では、周囲の視点を集めながらも、結論は置いてから出しやすい基調です。',
  },
};

const START_FUSE: Readonly<
  Record<StartTendency, Readonly<Record<StartTendency, string>>>
> = {
  try: {
    try: '土台の始め方も今回の答えも、小さく動かして様子を見る側に重なっています。同じ方向に重なると、前に進んでいるように見えても、試しの点検が内側で続きやすい。',
    map: '土台では小さく動かして様子を見やすいのに、今回の答えでは全体を揃えてから動く側に寄っています。表では準備してから進む人に見えても、内側では先に一つ試したいが残る。',
    ask: '土台では小さく動かして様子を見やすいのに、今回の答えでは人に聞いてから動く側に寄っています。相談しているように見えても、自分の中ではもう試しを始めている時間が先行しやすい。',
  },
  map: {
    try: '土台では全体を揃えてから動きやすいのに、今回の答えでは小さく試して進む側に寄っています。動きが早い人に見られても、内側では「まだ全体が見えていない」が残りやすい。',
    map: '土台の始め方も今回の答えも、全体を揃えてから動く側に重なっています。同じ方向に重なると、慎重に見えるほど、準備が終わっても決めきれていない時間が出やすい。',
    ask: '土台では全体を揃えてから動きやすいのに、今回の答えでは周囲の視点を足してから動く側に寄っています。相談で進んだように見えても、本人の中ではまだ地図が完成していない。',
  },
  ask: {
    try: '土台では周囲の視点を集めてから動きやすいのに、今回の答えでは小さく試して進む側に寄っています。試している人に見られても、内側ではまだ誰かの見立てが欲しい時間が残る。',
    map: '土台では周囲の視点を集めてから動きやすいのに、今回の答えでは全体を揃えてから動く側に寄っています。一人で段取りしているように見えても、内側では材料を足したいが先に立つ。',
    ask: '土台の始め方も今回の答えも、周囲の視点を集めてから動く側に重なっています。同じ方向に重なると、合わせている人に見えても、決定は一人になってから残りやすい。',
  },
};

const DECISION_FUSE: Readonly<
  Record<DecisionTendency, Readonly<Record<DecisionTendency, string>>>
> = {
  sort: {
    sort: '土台の決め方も今回の答えも、候補を比べてから閉じる側に重なっています。同じ方向に重なると、進んだあとも「他も見るべきだった」が内側で続きやすい。',
    deadline: '土台では比べてから決めやすいのに、今回の答えでは区切りで閉じる側に寄っています。締めたように見えても、内側ではまだ候補の点検が残る。',
    wait: '土台では比べてから決めやすいのに、今回の答えでは間を置いてから閉じる側に寄っています。待っている人に見られても、頭の中では比較が止まっていない。',
  },
  deadline: {
    sort: '土台では区切りで閉じやすいのに、今回の答えでは候補を並べてから決める側に寄っています。比較している人に見られても、内側では「いつまでに決めるか」が先に立つ。',
    deadline: '土台の決め方も今回の答えも、区切りで閉じる側に重なっています。同じ方向に重なると、途中経過より締切側の自分が表に出やすい。',
    wait: '土台では区切りで閉じやすいのに、今回の答えでは間を置いてから決める側に寄っています。置いているように見えても、内側では期限の感覚が先に動きやすい。',
  },
  wait: {
    sort: '土台では間を置いてから決めやすいのに、今回の答えでは候補を比べてから閉じる側に寄っています。比較で進んだように見えても、内側ではまだ「置く時間」が欲しい。',
    deadline: '土台では間を置いてから決めやすいのに、今回の答えでは区切りで閉じる側に寄っています。締めた人に見られても、内側では決めたあとに「早かったのでは」が残りやすい。',
    wait: '土台の決め方も今回の答えも、間を置いてから閉じる側に重なっています。同じ方向に重なると、動いているように見えても決めたこととしてはまだ確定していない時間が長い。',
  },
};

const RECOVERY_FUSE: Readonly<
  Record<RecoveryTendency, Readonly<Record<RecoveryTendency, string>>>
> = {
  pause: {
    pause: '土台の戻り方も今回の答えも、短い区切りで立て直す側に重なっています。同じ方向に重なると、切れ目が取れないときだけ再点検が止まらなくなる。',
    shrink: '土台では短い区切りで戻りやすいのに、今回の答えでは範囲を狭くして戻る側に寄っています。仕事を減らしているように見えても、内側ではまず一回止めたい。',
    scene: '土台では短い区切りで戻りやすいのに、今回の答えでは場面の刺激を変えて戻る側に寄っています。場所を変えている人に見られても、内側では短い休みが先に欲しい。',
  },
  shrink: {
    pause: '土台では範囲を狭くして戻りやすいのに、今回の答えでは短い区切りで戻る側に寄っています。休んでいるように見えても、内側ではやることの幅を絞りたい。',
    shrink: '土台の戻り方も今回の答えも、範囲を狭くして負荷を下げる側に重なっています。同じ方向に重なると、広げたまま抱え続けると手が止まりやすい。',
    scene: '土台では範囲を狭くして戻りやすいのに、今回の答えでは場面を変えて戻る側に寄っています。刺激を変えている人に見られても、内側ではまず仕事の幅を落としたい。',
  },
  scene: {
    pause: '土台では場面の刺激を変えて戻りやすいのに、今回の答えでは短い区切りで戻る側に寄っています。止まっている人に見られても、内側では場所や刺激を変えたい。',
    shrink: '土台では場面の刺激を変えて戻りやすいのに、今回の答えでは範囲を狭くして戻る側に寄っています。仕事を減らしているように見えても、内側では場面そのものを変えたい。',
    scene: '土台の戻り方も今回の答えも、場面の刺激を変えて戻る側に重なっています。同じ方向に重なると、同じ場所に居続けると検討ループから抜けにくい。',
  },
};

const DISTANCE_FUSE: Readonly<
  Record<DistanceTendency, Readonly<Record<DistanceTendency, string>>>
> = {
  close: {
    close: '土台の距離の取り方も今回の答えも、関わりの中で間合いを言葉にして整えやすい側に重なっています。同じ方向に重なると、近い関係ほど再点検が「今さら」に見えやすい。',
    middle: '土台では関わりの中で距離を整えやすいのに、今回の答えでは一定の間隔を保つ側に寄っています。落ち着いて見えるほど、内側では近い関係での調整が先に立ちやすい。',
    solo: '土台では関わりの中で距離を整えやすいのに、今回の答えでは一人の時間で整える側に寄っています。離れて見える一方、内側では近い関係の言葉がまだ残っている。',
  },
  middle: {
    close: '土台では一定の間隔を保ちやすいのに、今回の答えでは関わりの中で距離を言葉にする側に寄っています。近い関係を丁寧に保っているように見えて、内側では間隔を一定にしたい感覚が残る。',
    middle: '土台の距離の取り方も今回の答えも、一定の間隔を保つ側に重なっています。同じ方向に重なると、安定して見えるほど内側の再点検が外に出にくい。',
    solo: '土台では一定の間隔を保ちやすいのに、今回の答えでは一人の時間で整える側に寄っています。一人で戻っているように見えても、内側では頻度を一定に保ちたい感覚が先に立つ。',
  },
  solo: {
    close: '土台では一人の時間で整えてから戻りやすいのに、今回の答えでは関わりの中で距離を言葉にする側に寄っています。近い関係を保っているように見えて、内側では一人で点検し直す時間が先に立ちやすい。',
    middle: '土台では一人の時間で整えてから戻りやすいのに、今回の答えでは一定の間隔を保つ側に寄っています。安定して見えるほど、内側では一人の時間が足りていない。',
    solo: '土台の距離の取り方も今回の答えも、一人の時間で整えてから戻る側に重なっています。同じ方向に重なると、人と会ったあとに一人で「今の決め方でよかったか」を見直しやすい。',
  },
};

const CHANGE_FUSE: Readonly<
  Record<ChangeTendency, Readonly<Record<ChangeTendency, string>>>
> = {
  observe: {
    observe: '土台の変化への向き合い方も今回の答えも、直後は様子を見る側に重なっています。同じ方向に重なると、表の静けさと内側の再点検が同時に出やすい。',
    adjust: '土台では変化の直後は様子を見やすいのに、今回の答えでは差分だけ合わせて進む側に寄っています。直している人に見られても、内側ではまだ見定めたい時間が残る。',
    rebuild: '土台では変化の直後は様子を見やすいのに、今回の答えでは前提から組み直す側に寄っています。大きく動かした人に見られても、内側ではまず一日置きたい感覚が残る。',
  },
  adjust: {
    observe: '土台では変わった点だけ合わせて進みやすいのに、今回の答えではまず様子を見る側に寄っています。止まっている人に見られても、内側では細部の修正を始めている。',
    adjust: '土台の変化への向き合い方も今回の答えも、差分だけ合わせて進む側に重なっています。同じ方向に重なると、方針は守っているのに細部の点検が長く残りやすい。',
    rebuild: '土台では小さな直しで進みやすいのに、今回の答えでは前提から組み直す側に寄っています。周囲には急な方向転換に見え、本人の中では細部を直していた延長で一貫している。',
  },
  rebuild: {
    observe: '土台では前提が変わると組み直しやすいのに、今回の答えではまず様子を見る側に寄っています。静かに見える一方、内側では「前提が変わったから組み直す」が待ちやすい。',
    adjust: '土台では前提から組み直しやすいのに、今回の答えでは差分だけ合わせて進む側に寄っています。小さく直している人に見られても、内側では一度やり直したい感覚が残る。',
    rebuild: '土台の変化への向き合い方も今回の答えも、前提から組み直す側に重なっています。同じ方向に重なると、周囲には急な方向転換に見えやすい。',
  },
};

function fuseLine(
  axisId: ExpressionAxisId,
  birth: ExpressionAxes,
  answers: ExpressionAxes,
): string {
  switch (axisId) {
    case 'start':
      return START_FUSE[birth.start][answers.start];
    case 'decision':
      return DECISION_FUSE[birth.decision][answers.decision];
    case 'recovery':
      return RECOVERY_FUSE[birth.recovery][answers.recovery];
    case 'distance':
      return DISTANCE_FUSE[birth.distance][answers.distance];
    case 'change':
      return CHANGE_FUSE[birth.change][answers.change];
  }
}

function secondaryHinge(
  primary: AlignDivergeItem,
  alignItems: readonly AlignDivergeItem[],
  divergeItems: readonly AlignDivergeItem[],
): AlignDivergeItem | null {
  const rest = [...divergeItems, ...alignItems].filter(
    (item) => item.axisId !== primary.axisId,
  );
  return rest[0] ?? null;
}

export function buildPersonalFreeFusedInsightSpecV3(input: {
  birth: BirthSignatureV1;
  answers: ExpressionAxes;
  alignItems: readonly AlignDivergeItem[];
  divergeItems: readonly AlignDivergeItem[];
  modifiers?: PersonalManifestationModifiersV2;
}): PersonalFreeFusedInsightSpecV3 {
  const hinge =
    pickFreeAlignDivergeItemV1({
      alignItems: [...input.alignItems],
      divergeItems: [...input.divergeItems],
    }) ?? {
      axisId: 'start' as const,
      dobTendency: input.birth.dimensions.start,
      freeTendency: input.answers.start,
      relation: input.birth.dimensions.start === input.answers.start ? 'align' : 'diverge',
      evidenceAnswerIds: [FREE_AXIS_QUESTION_IDS.start],
      uiSlot: 'freeOne' as const,
    };
  const second = secondaryHinge(hinge, input.alignItems, input.divergeItems);
  const interactionKind: PersonalFusionInteractionKind =
    hinge.relation === 'diverge' ? 'diverge_overlay' : 'align_overlay';
  const fusedCore = fuseLine(hinge.axisId, input.birth.dimensions, input.answers);
  const fusedSecond = second
    ? fuseLine(second.axisId, input.birth.dimensions, input.answers)
    : '';
  const startFuse = START_FUSE[input.birth.dimensions.start][input.answers.start];
  const decisionFuse =
    DECISION_FUSE[input.birth.dimensions.decision][input.answers.decision];
  const fusedStack =
    hinge.axisId === 'start' || hinge.axisId === 'decision'
      ? `${startFuse}${decisionFuse}`
      : `${startFuse}${decisionFuse}${fusedCore}`;
  const answerLayer = buildPersonalFreeInsightSpecV2(input.answers);
  const birthBaseJa = BIRTH_BASE[input.birth.dimensions.start][input.birth.dimensions.decision];
  const currentExpressionJa = answerLayer.headline;
  const manifestation = buildPersonalManifestationV4(
    input.birth.dimensions,
    input.answers,
    input.modifiers,
  );
  const headline = manifestation.manifestationJa;
  const body = fusedSecond
    ? `${fusedSecond}始め方と決め方、距離の取り方が同じレイヤーでは動かない。`
    : `${answerLayer.internalTension}始め方と決め方、距離の取り方が同じレイヤーでは動かない。`;
  const birthEvidence = [
    ...new Set([
      ...evidenceIdsForAxis(hinge.axisId),
      ...(second ? evidenceIdsForAxis(second.axisId) : []),
    ]),
  ] as BirthEvidenceId[];
  const answerEvidence = [
    ...new Set([
      FREE_AXIS_QUESTION_IDS[hinge.axisId],
      ...(second ? [FREE_AXIS_QUESTION_IDS[second.axisId]] : [FREE_AXIS_QUESTION_IDS.decision]),
    ]),
  ];
  const premiumContinuation = premiumBridgeForManifestation(
    manifestation.shortJa,
    manifestation.axisId,
  );
  return {
    id: `${PERSONAL_FREE_FUSED_INSIGHT_SPEC_VERSION}:${input.birth.birthSignatureId}:${input.modifiers?.stemLane ?? 'x'}:${input.modifiers?.lunarMonth ?? 'x'}:${hinge.axisId}:${hinge.relation}:${input.answers.start}-${input.answers.decision}-${input.answers.recovery}-${input.answers.distance}-${input.answers.change}`,
    kind: 'personal_free_fused_v3',
    birthEvidenceIds: birthEvidence.length > 0 ? birthEvidence : ['civil.dayBand'],
    answerEvidenceQuestionIds: answerEvidence,
    birthSignals: input.birth.dimensions,
    answerSignals: input.answers,
    interactionId: `${hinge.axisId}_${hinge.relation}_${hinge.dobTendency}_${hinge.freeTendency}`,
    interactionKind,
    hingeAxisId: hinge.axisId,
    confidence: hinge.relation === 'diverge' ? 'high' : 'medium',
    specificityReason: `${hinge.axisId}:${String(hinge.dobTendency)}x${String(hinge.freeTendency)}:${hinge.relation}`,
    birthBaseJa,
    currentExpressionJa,
    headline,
    fusedStackJa: fusedStack,
    body,
    behavioralPrediction: manifestation.sceneCandidateJa,
    manifestation,
    premiumContinuation,
    premiumOpenQuestion: answerLayer.premiumOpenQuestion,
    workScene: answerLayer.workScene,
    relationScene: answerLayer.relationScene,
    changeScene: answerLayer.changeScene,
    strengthConditions: answerLayer.strengthConditions,
    loadConditions: answerLayer.loadConditions,
  };
}
