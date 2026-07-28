/**
 * intensity / hesitation / reactive_context builders (fp-v1).
 */

import type {
  ChapterBias,
  Hesitation,
  Intensity,
  PaidDepth,
  ReactiveContext,
} from './types';

export function buildIntensityV1(input: {
  paidDepth: PaidDepth | null;
}): Intensity {
  if (!input.paidDepth) {
    return { level: 'low', drivers: [] };
  }
  const bias = input.paidDepth.chapterBias;
  const entries = Object.entries(bias) as [keyof ChapterBias, number][];
  const max = Math.max(...entries.map(([, n]) => n));
  const drivers = entries.filter(([, n]) => n === max && n > 0).map(([k]) => k);

  let level: Intensity['level'] = 'low';
  if (max >= 3) level = 'high';
  else if (max === 2) level = 'mid';

  return { level, drivers };
}

export function buildHesitationV1(input: {
  freeAnswerSet: Record<string, string>;
  paidAnswerSet: Record<string, string> | null;
}): Hesitation {
  const drivers: string[] = [];
  let chapterHint: Hesitation['chapterHint'] = null;

  const paid = input.paidAnswerSet;
  if (paid) {
    const friction = paid['paid.decision_friction'];
    if (typeof friction === 'string' && friction.length > 0) {
      drivers.push(friction);
      if (friction === 'paid.decision_friction.unclear_end') chapterHint = 'III';
      else if (friction === 'paid.decision_friction.fear_mistake') chapterHint = 'I';
      else if (friction === 'paid.decision_friction.too_many') chapterHint = 'II';
    }
  }

  const freeDecision = input.freeAnswerSet['free.decision_style'];
  if (freeDecision === 'free.decision_style.wait_first') {
    drivers.push(freeDecision);
    if (!chapterHint) chapterHint = 'II';
  }

  const freeStart = input.freeAnswerSet['free.start_style'];
  const freeDistance = input.freeAnswerSet['free.distance_style'];
  if (
    freeStart === 'free.start_style.ask_first' &&
    freeDistance === 'free.distance_style.close_careful'
  ) {
    drivers.push(freeStart, freeDistance);
    if (!chapterHint) chapterHint = 'II';
  }

  return {
    present: drivers.length > 0,
    drivers,
    chapterHint: drivers.length > 0 ? chapterHint : null,
  };
}

const SCENE_BY_ANSWER: Readonly<Record<string, string>> = {
  'free.recovery_style.pause_short': 'short_pause',
  'free.recovery_style.shrink_task': 'shrink_task',
  'free.recovery_style.change_scene': 'change_scene',
  'free.distance_style.close_careful': 'close_careful',
  'free.distance_style.middle_steady': 'middle_steady',
  'free.distance_style.solo_reset': 'solo_reset',
  'free.change_style.observe_first': 'observe_first',
  'free.change_style.adjust_fast': 'adjust_fast',
  'free.change_style.rebuild_slow': 'rebuild_slow',
  'paid.fatigue_signal.after_push': 'after_push',
  'paid.fatigue_signal.before_start': 'before_start',
  'paid.fatigue_signal.long_stretch': 'long_stretch',
  'paid.recovery_sequence.pause_first': 'pause_first',
  'paid.recovery_sequence.small_start': 'small_start',
  'paid.recovery_sequence.sort_materials': 'sort_materials',
};

export function buildReactiveContextV1(input: {
  freeAnswerSet: Record<string, string>;
  paidAnswerSet: Record<string, string> | null;
}): ReactiveContext {
  const drivers: string[] = [];
  const scenes: string[] = [];

  const consider = (aid: string | undefined) => {
    if (!aid) return;
    const scene = SCENE_BY_ANSWER[aid];
    if (!scene) return;
    if (!drivers.includes(aid)) drivers.push(aid);
    if (!scenes.includes(scene) && scenes.length < 3) scenes.push(scene);
  };

  consider(input.freeAnswerSet['free.recovery_style']);
  consider(input.freeAnswerSet['free.distance_style']);
  consider(input.freeAnswerSet['free.change_style']);
  if (input.paidAnswerSet) {
    consider(input.paidAnswerSet['paid.fatigue_signal']);
    consider(input.paidAnswerSet['paid.recovery_sequence']);
  }

  return { scenes, drivers };
}
