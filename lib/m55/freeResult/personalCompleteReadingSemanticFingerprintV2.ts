/**
 * Stable complete-reading semantic identity — meaning, not wording.
 * Used for collision audits and provenance; never shown to customers.
 */

import type { PersonalManifestationModifiersV2 } from './personalFreeManifestationV4';
import type { ExpressionAxes, ExpressionAxisId } from '../individualization/types';
import type { PersonalFreeFusedInsightSpecV3 } from './personalFreeFusedInsightSpecV3';

export type PersonalCompleteReadingSemanticFingerprintV2 = {
  readonly primaryMechanismId: string;
  readonly supportingInteractionId: string;
  readonly birthModifierId: string;
  readonly answerModifierId: string;
  readonly manifestationId: string;
  readonly sceneId: string;
  readonly socialMirrorId: string;
  readonly contextId: string;
  readonly stableKey: string;
};

function stemSocialMirrorId(stemLane: number): string {
  return `stem_mirror_${((stemLane % 10) + 10) % 10}`;
}

function lunarSceneId(lunarMonth: number): string {
  return `lunar_scene_${lunarMonth}`;
}

function tensionModifierId(tensionIds: readonly ExpressionAxisId[] | undefined): string {
  if (!tensionIds?.length) return 'tension_none';
  return `tension_${[...tensionIds].sort().join('_')}`;
}

export function personalCompleteReadingSemanticFingerprintV2(input: {
  insight: PersonalFreeFusedInsightSpecV3;
  modifiers?: PersonalManifestationModifiersV2;
  birthAxes: ExpressionAxes;
  answerAxes: ExpressionAxes;
}): PersonalCompleteReadingSemanticFingerprintV2 {
  const m = input.insight.manifestation;
  const [primaryAxis, birthT, answerT] = m.patternId.split('+');
  const supportingInteractionId = input.insight.interactionId;
  const birthModifierId = input.modifiers
    ? [
        `stem${input.modifiers.stemLane}`,
        `lunar${input.modifiers.lunarMonth}`,
        `season${input.modifiers.season3}`,
        `band${input.modifiers.dayBand}`,
        tensionModifierId(input.modifiers.tensionIds),
      ].join('|')
    : 'birth_none';
  const answerModifierId = [
    input.answerAxes.start,
    input.answerAxes.decision,
    input.answerAxes.recovery,
    input.answerAxes.distance,
    input.answerAxes.change,
  ].join('|');
  const socialMirrorId = input.modifiers
    ? stemSocialMirrorId(input.modifiers.stemLane)
    : 'mirror_none';
  const sceneId = input.modifiers
    ? `scene_${input.modifiers.lunarMonth}_${input.modifiers.season3}_${input.modifiers.dayBand}`
    : 'scene_none';
  const contextId = `${input.birthAxes.start}x${input.birthAxes.decision}|${input.insight.hingeAxisId}_${input.insight.interactionKind}`;
  const primaryMechanismId = `${primaryAxis ?? m.axisId}_${birthT ?? m.birthTendency}_${answerT ?? m.answerTendency}`;
  const manifestationId = m.patternId;
  const stableKey = [
    primaryMechanismId,
    supportingInteractionId,
    birthModifierId,
    answerModifierId,
    manifestationId,
    sceneId,
    socialMirrorId,
    contextId,
  ].join('::');
  return {
    primaryMechanismId,
    supportingInteractionId,
    birthModifierId,
    answerModifierId,
    manifestationId,
    sceneId,
    socialMirrorId,
    contextId,
    stableKey,
  };
}
