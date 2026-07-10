/**
 * Pair reading quality matrix fixtures.
 * Input DOBs allowed here; outputs must never echo them.
 */

import type {
  PaidTopicId,
  PairAxisId,
  PairReadingInput,
  RelationStatusId,
  TemperatureId,
} from './pairReadingTypes';
import {
  PRODUCT_INTERNAL_NAME,
  PRODUCT_PUBLIC_NAME,
  SAFETY_PROFILE,
} from './pairReadingCatalog.v1';

export type DobPairArchetype = {
  id: string;
  personA: string;
  personB: string;
  intent: string;
};

export const DOB_PAIR_ARCHETYPES: readonly DobPairArchetype[] = [
  { id: 'P01', personA: '1982-02-28', personB: '1983-02-28', intent: 'near' },
  { id: 'P02', personA: '1983-02-28', personB: '1982-02-28', intent: 'near_rev' },
  { id: 'P03', personA: '1990-01-10', personB: '1990-01-10', intent: 'same' },
  { id: 'P04', personA: '1990-01-10', personB: '1990-01-11', intent: 'day_boundary' },
  { id: 'P05', personA: '1990-01-11', personB: '1990-01-21', intent: 'mid_late' },
  { id: 'P06', personA: '1955-03-01', personB: '1997-06-15', intent: 'gen_gap' },
  { id: 'P07', personA: '2000-02-29', personB: '1999-07-15', intent: 'leap' },
  { id: 'P08', personA: '1968-08-15', personB: '2001-09-30', intent: 'far' },
] as const;

export type SampleLane = {
  id: string;
  laneId: string;
  relationStatusId: RelationStatusId;
  paidTopicId: PaidTopicId;
  temperatureId: TemperatureId;
  pairAxisId: PairAxisId;
  requiredTerms: readonly string[];
  forbiddenRisks: readonly string[];
};

export const SAMPLE_LANES: readonly SampleLane[] = [
  {
    id: 'S1',
    laneId: 'pair_v1__R1__T4__E2__A2',
    relationStatusId: 'R1',
    paidTopicId: 'T4',
    temperatureId: 'E2',
    pairAxisId: 'A2',
    requiredTerms: ['反応', '温度'],
    forbiddenRisks: ['本音', '復縁できます'],
  },
  {
    id: 'S2',
    laneId: 'pair_v1__R2__T3__E2__A1',
    relationStatusId: 'R2',
    paidTopicId: 'T3',
    temperatureId: 'E2',
    pairAxisId: 'A1',
    requiredTerms: ['ペース', '温度'],
    forbiddenRisks: ['いつ付き合える', '告白すべき'],
  },
  {
    id: 'S3',
    laneId: 'pair_v1__R5__T1__E4__A4',
    relationStatusId: 'R5',
    paidTopicId: 'T1',
    temperatureId: 'E4',
    pairAxisId: 'A4',
    requiredTerms: ['入口', '距離'],
    forbiddenRisks: ['復縁できます'],
  },
  {
    id: 'S4',
    laneId: 'pair_v1__R6__T2__E5__A3',
    relationStatusId: 'R6',
    paidTopicId: 'T2',
    temperatureId: 'E5',
    pairAxisId: 'A3',
    requiredTerms: ['すれ違い', '間合い'],
    forbiddenRisks: ['結婚できます', 'すべき'],
  },
  {
    id: 'S5',
    laneId: 'pair_v1__R4__T5__E3__A1',
    relationStatusId: 'R4',
    paidTopicId: 'T5',
    temperatureId: 'E3',
    pairAxisId: 'A1',
    requiredTerms: ['温度', '距離'],
    forbiddenRisks: ['告白すべき'],
  },
] as const;

export const INVALID_DOB_FIXTURES = ['2010-02-30', '1990-13-01', 'not-a-date'] as const;

export function buildPairReadingInput(args: {
  personA: string;
  personB: string;
  relationStatusId: RelationStatusId;
  paidTopicId: PaidTopicId;
  temperatureId?: TemperatureId;
  pairAxisOverride?: PairAxisId;
  nicknameA?: string;
  nicknameB?: string;
}): PairReadingInput {
  return {
    schemaVersion: 'pair_reading_input_v1',
    personA: {
      role: 'personA',
      birthDate: args.personA,
      nickname: args.nicknameA,
    },
    personB: {
      role: 'personB',
      birthDate: args.personB,
      nickname: args.nicknameB,
    },
    relationStatusId: args.relationStatusId,
    paidTopicId: args.paidTopicId,
    temperatureId: args.temperatureId ?? 'E0',
    pairAxisOverride: args.pairAxisOverride,
    productInternalName: PRODUCT_INTERNAL_NAME,
    productPublicName: PRODUCT_PUBLIC_NAME,
    safetyProfile: SAFETY_PROFILE,
  };
}

export function buildSampleCase(
  sample: SampleLane,
  dob: DobPairArchetype,
): PairReadingInput {
  return buildPairReadingInput({
    personA: dob.personA,
    personB: dob.personB,
    relationStatusId: sample.relationStatusId,
    paidTopicId: sample.paidTopicId,
    temperatureId: sample.temperatureId,
    pairAxisOverride: sample.pairAxisId,
  });
}
