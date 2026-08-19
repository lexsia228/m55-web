/**
 * Public-safe semantic identity for share cards.
 * Catalog keys only — no DOB, answers, wording hashes, or private reading.
 */

import type {
  ChangeTendency,
  DecisionTendency,
  DistanceTendency,
  ExpressionAxes,
  RecoveryTendency,
  StartTendency,
} from '../individualization/types';

export const PUBLIC_IDENTITY_FP_VERSION = 'public_identity_fp_v1' as const;

export type PublicManualSlotKindV1 =
  | 'primary_start'
  | 'primary_decision'
  | 'fused_misread'
  | 'fused_actual'
  | 'social_distance'
  | 'recover'
  | 'change'
  | 'talk_hint';

export type PublicManualSlotPlanV1 = {
  readonly kind: PublicManualSlotKindV1;
  readonly labelJa: string;
  readonly semanticId: string;
};

export type PublicIdentityFingerprintV1 = {
  readonly version: typeof PUBLIC_IDENTITY_FP_VERSION;
  readonly manualIdentity: string;
  readonly socialMirrorIdentity: string;
  readonly hiddenSpecIdentity: string;
  readonly safeBirthRelationModifier: string;
  readonly safeFusedBehaviorModifier: string;
};

export type PublicCardSpecificityV1 = {
  readonly manual: number;
  readonly seen: number;
  readonly hidden: number;
};

const STARTS: readonly StartTendency[] = ['map', 'try', 'ask'];
const DECISIONS: readonly DecisionTendency[] = ['sort', 'deadline', 'wait'];
const RECOVERIES: readonly RecoveryTendency[] = ['pause', 'shrink', 'scene'];
const DISTANCES: readonly DistanceTendency[] = ['close', 'middle', 'solo'];
const CHANGES: readonly ChangeTendency[] = ['observe', 'adjust', 'rebuild'];

export function fusedBehaviorKey(birth: ExpressionAxes, answer: ExpressionAxes): string {
  return `${birth.start}x${answer.decision}`;
}

export function hasPublicSafeFusedDistinction(
  birth: ExpressionAxes,
  answer: ExpressionAxes,
): boolean {
  return birth.start !== answer.start || birth.decision !== answer.decision;
}

export function hasPublicSafeSocialContrast(
  birth: ExpressionAxes,
  answer: ExpressionAxes,
): boolean {
  return (
    birth.start !== answer.start ||
    birth.decision !== answer.decision ||
    birth.distance !== answer.distance
  );
}

function addSlot(
  slots: PublicManualSlotPlanV1[],
  used: Set<string>,
  slot: PublicManualSlotPlanV1,
  max = 6,
): void {
  if (slots.length >= max) return;
  if (used.has(slot.labelJa)) return;
  slots.push(slot);
  used.add(slot.labelJa);
}

export function selectPublicManualSlotPlan(input: {
  answerAxes: ExpressionAxes;
  birthAxes: ExpressionAxes;
}): readonly PublicManualSlotPlanV1[] {
  const answer = input.answerAxes;
  const birth = input.birthAxes;
  const slots: PublicManualSlotPlanV1[] = [];
  const used = new Set<string>();
  const fusedKey = fusedBehaviorKey(birth, answer);

  if (birth.start !== answer.start) {
    addSlot(slots, used, {
      kind: 'primary_start',
      labelJa: '始め方',
      semanticId: `start:${answer.start}`,
    });
  } else if (birth.decision !== answer.decision) {
    addSlot(slots, used, {
      kind: 'primary_decision',
      labelJa: '決め方',
      semanticId: `decision:${answer.decision}`,
    });
  } else {
    addSlot(slots, used, {
      kind: 'primary_start',
      labelJa: '始め方',
      semanticId: `start:${answer.start}`,
    });
  }

  if (hasPublicSafeFusedDistinction(birth, answer)) {
    addSlot(slots, used, {
      kind: 'fused_misread',
      labelJa: '誤解されやすいところ',
      semanticId: `misread:${fusedKey}`,
    });
    addSlot(slots, used, {
      kind: 'fused_actual',
      labelJa: '自分の中では',
      semanticId: `actual:${fusedKey}`,
    });
  }

  addSlot(slots, used, {
    kind: 'social_distance',
    labelJa: '距離の取り方',
    semanticId: `distance:${answer.distance}`,
  });

  if (birth.change !== answer.change) {
    addSlot(slots, used, {
      kind: 'change',
      labelJa: '変化したとき',
      semanticId: `change:${answer.change}`,
    });
  } else {
    addSlot(slots, used, {
      kind: 'recover',
      labelJa: '回復方法',
      semanticId: `recovery:${answer.recovery}`,
    });
  }

  if (answer.distance === 'close' || answer.distance === 'solo') {
    addSlot(slots, used, {
      kind: 'talk_hint',
      labelJa: '私と話すときのヒント',
      semanticId: `hint:${answer.distance}`,
    });
  }

  const fillers: readonly PublicManualSlotPlanV1[] = [
    { kind: 'primary_decision', labelJa: '決め方', semanticId: `decision:${answer.decision}` },
    { kind: 'primary_start', labelJa: '始め方', semanticId: `start:${answer.start}` },
    { kind: 'recover', labelJa: '回復方法', semanticId: `recovery:${answer.recovery}` },
    { kind: 'change', labelJa: '変化したとき', semanticId: `change:${answer.change}` },
  ];
  for (const filler of fillers) {
    if (slots.length >= 4) break;
    addSlot(slots, used, filler);
  }

  return slots.slice(0, 6);
}

export function socialMirrorSemanticId(birth: ExpressionAxes, answer: ExpressionAxes): string {
  if (!hasPublicSafeSocialContrast(birth, answer)) return 'mirror:none';
  return `mirror:${birth.start}x${birth.distance}|actual:${answer.decision}x${answer.distance}`;
}

export function hiddenSpecSemanticId(birth: ExpressionAxes, answer: ExpressionAxes): string {
  const modifier =
    birth.distance !== answer.distance
      ? `distance:${answer.distance}`
      : birth.change !== answer.change
        ? `change:${answer.change}`
        : birth.recovery !== answer.recovery
          ? `recovery:${answer.recovery}`
          : 'none';
  return `hidden:${fusedBehaviorKey(birth, answer)}|mod:${modifier}`;
}

export function birthRelationModifier(birth: ExpressionAxes, answer: ExpressionAxes): string {
  const flag = (a: string, b: string, answerValue: string) =>
    `${a === b ? 'align' : 'diverge'}:${answerValue}`;
  return [
    `start:${flag(birth.start, answer.start, answer.start)}`,
    `decision:${flag(birth.decision, answer.decision, answer.decision)}`,
    `distance:${flag(birth.distance, answer.distance, answer.distance)}`,
    `change:${flag(birth.change, answer.change, answer.change)}`,
    `recovery:${flag(birth.recovery, answer.recovery, answer.recovery)}`,
  ].join('|');
}

export function buildPublicIdentityFingerprintV1(input: {
  answerAxes: ExpressionAxes;
  birthAxes: ExpressionAxes;
}): PublicIdentityFingerprintV1 {
  const plan = selectPublicManualSlotPlan(input);
  return {
    version: PUBLIC_IDENTITY_FP_VERSION,
    manualIdentity: plan.map((slot) => slot.semanticId).join('|'),
    socialMirrorIdentity: socialMirrorSemanticId(input.birthAxes, input.answerAxes),
    hiddenSpecIdentity: hiddenSpecSemanticId(input.birthAxes, input.answerAxes),
    safeBirthRelationModifier: birthRelationModifier(input.birthAxes, input.answerAxes),
    safeFusedBehaviorModifier: fusedBehaviorKey(input.birthAxes, input.answerAxes),
  };
}

export function publicCardSpecificity(input: {
  answerAxes: ExpressionAxes;
  birthAxes: ExpressionAxes;
}): PublicCardSpecificityV1 {
  const birth = input.birthAxes;
  const answer = input.answerAxes;
  const startDiv = birth.start !== answer.start ? 1 : 0;
  const decisionDiv = birth.decision !== answer.decision ? 1 : 0;
  const distanceDiv = birth.distance !== answer.distance ? 1 : 0;
  const changeDiv = birth.change !== answer.change ? 1 : 0;
  const recoveryDiv = birth.recovery !== answer.recovery ? 1 : 0;
  const fused = hasPublicSafeFusedDistinction(birth, answer) ? 1 : 0;
  return {
    manual: 1 + fused + distanceDiv + changeDiv + (answer.distance === 'middle' ? 0 : 1),
    seen: hasPublicSafeSocialContrast(birth, answer)
      ? 2 + startDiv + decisionDiv + distanceDiv
      : 0,
    hidden: 2 + startDiv * 2 + decisionDiv + distanceDiv + changeDiv + recoveryDiv,
  };
}

function decodeAxisBundle(index: number): ExpressionAxes {
  const start = STARTS[index % 3]!;
  const decision = DECISIONS[Math.floor(index / 3) % 3]!;
  const recovery = RECOVERIES[Math.floor(index / 9) % 3]!;
  const distance = DISTANCES[Math.floor(index / 27) % 3]!;
  const change = CHANGES[Math.floor(index / 81) % 3]!;
  return { start, decision, recovery, distance, change };
}

export function syntheticPublicAxisProfiles(count = 500): readonly {
  readonly index: number;
  readonly answerAxes: ExpressionAxes;
  readonly birthAxes: ExpressionAxes;
}[] {
  const out: { index: number; answerAxes: ExpressionAxes; birthAxes: ExpressionAxes }[] = [];
  for (let i = 0; i < count; i += 1) {
    out.push({
      index: i,
      answerAxes: decodeAxisBundle(i % 243),
      birthAxes: decodeAxisBundle((i * 17 + 31) % 243),
    });
  }
  return out;
}
