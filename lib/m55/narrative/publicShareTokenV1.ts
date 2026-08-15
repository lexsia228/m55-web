/**
 * Public-safe share token n1 — catalog keys only. No DOB, answers, or private text.
 * Existing s1-{0-9} tokens remain valid via privacySafeShareCardV1.
 *
 * Personal: n1{p|r}{variant}{stem}{answer5}{birth5}{hinge}
 * Pair:     n1c{variant}{interactionCode}
 * Generic:  n1g{variant}{stem?}
 */

import type {
  ChangeTendency,
  DecisionTendency,
  DistanceTendency,
  ExpressionAxisId,
  ExpressionAxes,
  RecoveryTendency,
  StartTendency,
} from '../individualization/types';
import type { PairFreeInteractionId } from '../compatibility/pairFreeInsightSpecV2';
import type { M55NarrativeSurface, ShareCandidateVariant } from './m55NarrativeSpecV1';

export const PUBLIC_SHARE_TOKEN_VERSION = 'n1' as const;

const START_CODE: Readonly<Record<StartTendency, string>> = { map: 'm', try: 't', ask: 'a' };
const START_FROM: Readonly<Record<string, StartTendency>> = { m: 'map', t: 'try', a: 'ask' };
const DECISION_CODE: Readonly<Record<DecisionTendency, string>> = {
  sort: 's',
  deadline: 'd',
  wait: 'w',
};
const DECISION_FROM: Readonly<Record<string, DecisionTendency>> = {
  s: 'sort',
  d: 'deadline',
  w: 'wait',
};
const RECOVERY_CODE: Readonly<Record<RecoveryTendency, string>> = {
  pause: 'p',
  shrink: 'k',
  scene: 'c',
};
const RECOVERY_FROM: Readonly<Record<string, RecoveryTendency>> = {
  p: 'pause',
  k: 'shrink',
  c: 'scene',
};
const DISTANCE_CODE: Readonly<Record<DistanceTendency, string>> = {
  close: 'n',
  middle: 'i',
  solo: 'o',
};
const DISTANCE_FROM: Readonly<Record<string, DistanceTendency>> = {
  n: 'close',
  i: 'middle',
  o: 'solo',
};
const CHANGE_CODE: Readonly<Record<ChangeTendency, string>> = {
  observe: 'v',
  adjust: 'j',
  rebuild: 'b',
};
const CHANGE_FROM: Readonly<Record<string, ChangeTendency>> = {
  v: 'observe',
  j: 'adjust',
  b: 'rebuild',
};
const HINGE_CODE: Readonly<Record<ExpressionAxisId, string>> = {
  start: 's',
  decision: 'd',
  recovery: 'r',
  distance: 't',
  change: 'c',
};
const HINGE_FROM: Readonly<Record<string, ExpressionAxisId>> = {
  s: 'start',
  d: 'decision',
  r: 'recovery',
  t: 'distance',
  c: 'change',
};
const VARIANT_CODE: Readonly<Record<ShareCandidateVariant, string>> = {
  manual: 'a',
  seen_vs_actual: 'b',
  hidden_spec: 'c',
  premium_takeaway: 't',
  pair_manual: 'm',
  pair_generic: 'g',
};
const VARIANT_FROM: Readonly<Record<string, ShareCandidateVariant>> = {
  a: 'manual',
  b: 'seen_vs_actual',
  c: 'hidden_spec',
  t: 'premium_takeaway',
  m: 'pair_manual',
  g: 'pair_generic',
};
const PAIR_INTERACTION_CODE: Readonly<Record<PairFreeInteractionId, string>> = {
  tempo_mismatch: 'tm',
  space_misread: 'sm',
  one_carries_quiet: 'oc',
  talk_now_go_quiet: 'tq',
  later_decide_words_soon: 'ld',
  hard_return_hard_space: 'hr',
  default_relationship_loop: 'df',
};
const PAIR_INTERACTION_FROM: Readonly<Record<string, PairFreeInteractionId>> = {
  tm: 'tempo_mismatch',
  sm: 'space_misread',
  oc: 'one_carries_quiet',
  tq: 'talk_now_go_quiet',
  ld: 'later_decide_words_soon',
  hr: 'hard_return_hard_space',
  df: 'default_relationship_loop',
};

const AXES_RE = '([mta])([sdw])([pkc])([nio])([vjb])';

function encodeAxes(axes: ExpressionAxes): string {
  return [
    START_CODE[axes.start],
    DECISION_CODE[axes.decision],
    RECOVERY_CODE[axes.recovery],
    DISTANCE_CODE[axes.distance],
    CHANGE_CODE[axes.change],
  ].join('');
}

function decodeAxes(chunk: string): ExpressionAxes | null {
  if (chunk.length !== 5) return null;
  const start = START_FROM[chunk[0]!];
  const decision = DECISION_FROM[chunk[1]!];
  const recovery = RECOVERY_FROM[chunk[2]!];
  const distance = DISTANCE_FROM[chunk[3]!];
  const change = CHANGE_FROM[chunk[4]!];
  if (!start || !decision || !recovery || !distance || !change) return null;
  return { start, decision, recovery, distance, change };
}

export type PersonalPublicShareKeyV1 = {
  readonly kind: 'personal';
  readonly surface: 'personal_free' | 'personal_premium';
  readonly variant: ShareCandidateVariant;
  readonly stemLaneIndex: number;
  readonly answerAxes: ExpressionAxes;
  readonly birthAxes: ExpressionAxes;
  readonly hingeAxisId: ExpressionAxisId;
};

export type PairPublicShareKeyV1 = {
  readonly kind: 'pair';
  readonly surface: 'compatibility_free' | 'compatibility_paid';
  readonly variant: ShareCandidateVariant;
  readonly interactionId: PairFreeInteractionId;
  readonly visibleStart?: StartTendency;
  readonly inwardStart?: StartTendency;
};

export type GenericPublicShareKeyV1 = {
  readonly kind: 'generic';
  readonly surface: M55NarrativeSurface;
  readonly variant: 'pair_generic' | 'premium_takeaway';
  readonly stemLaneIndex?: number;
};

export type PublicShareKeyV1 =
  | PersonalPublicShareKeyV1
  | PairPublicShareKeyV1
  | GenericPublicShareKeyV1;

export function encodePublicShareToken(key: PublicShareKeyV1): string {
  if (key.kind === 'generic') {
    const stem = typeof key.stemLaneIndex === 'number' ? String(key.stemLaneIndex) : '';
    return `${PUBLIC_SHARE_TOKEN_VERSION}g${VARIANT_CODE[key.variant]}${stem}`;
  }
  if (key.kind === 'pair') {
    const starts =
      key.visibleStart && key.inwardStart
        ? `${START_CODE[key.visibleStart]}${START_CODE[key.inwardStart]}`
        : '';
    return `${PUBLIC_SHARE_TOKEN_VERSION}c${VARIANT_CODE[key.variant]}${PAIR_INTERACTION_CODE[key.interactionId]}${starts}`;
  }
  return [
    PUBLIC_SHARE_TOKEN_VERSION,
    key.surface === 'personal_premium' ? 'r' : 'p',
    VARIANT_CODE[key.variant],
    String(key.stemLaneIndex),
    encodeAxes(key.answerAxes),
    encodeAxes(key.birthAxes),
    HINGE_CODE[key.hingeAxisId],
  ].join('');
}

export function decodePublicShareToken(raw: string | null | undefined): PublicShareKeyV1 | null {
  if (typeof raw !== 'string') return null;
  const token = raw.trim();
  if (!token.startsWith(PUBLIC_SHARE_TOKEN_VERSION)) return null;

  const generic = new RegExp(`^${PUBLIC_SHARE_TOKEN_VERSION}g([tg])([0-9]?)$`).exec(token);
  if (generic) {
    const variant = VARIANT_FROM[generic[1]!];
    if (variant !== 'pair_generic' && variant !== 'premium_takeaway') return null;
    const stem = generic[2] === '' ? undefined : Number(generic[2]);
    return {
      kind: 'generic',
      surface: variant === 'pair_generic' ? 'compatibility_paid' : 'personal_premium',
      variant,
      stemLaneIndex: stem,
    };
  }

  const pair = new RegExp(
    `^${PUBLIC_SHARE_TOKEN_VERSION}c([mg])(tm|sm|oc|tq|ld|hr|df)([mta][mta])?$`,
  ).exec(token);
  if (pair) {
    const variant = VARIANT_FROM[pair[1]!];
    const interactionId = PAIR_INTERACTION_FROM[pair[2]!];
    if (!variant || !interactionId) return null;
    const starts = pair[3];
    return {
      kind: 'pair',
      surface: 'compatibility_free',
      variant,
      interactionId,
      visibleStart: starts ? START_FROM[starts[0]!] : undefined,
      inwardStart: starts ? START_FROM[starts[1]!] : undefined,
    };
  }

  const personal = new RegExp(
    `^${PUBLIC_SHARE_TOKEN_VERSION}([pr])([abct])([0-9])${AXES_RE}${AXES_RE}([sdrtc])$`,
  ).exec(token);
  if (!personal) return null;
  const answerAxes = decodeAxes(personal.slice(4, 9).join(''));
  const birthAxes = decodeAxes(personal.slice(9, 14).join(''));
  const variant = VARIANT_FROM[personal[2]!];
  const hingeAxisId = HINGE_FROM[personal[14]!];
  if (!answerAxes || !birthAxes || !variant || !hingeAxisId) return null;
  return {
    kind: 'personal',
    surface: personal[1] === 'r' ? 'personal_premium' : 'personal_free',
    variant,
    stemLaneIndex: Number(personal[3]),
    answerAxes,
    birthAxes,
    hingeAxisId,
  };
}
