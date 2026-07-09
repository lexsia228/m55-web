/**
 * free-v1 / paid-v1 answer_id → tendency / theme maps (fp-v1 freeze).
 * Pure constants — IDs are immutable; copy polish is out of scope.
 */

import type {
  ChangeTendency,
  DecisionTendency,
  DistanceTendency,
  ExpressionAxisId,
  RecoveryTendency,
  ReplyThemeId,
  StartTendency,
} from './types';

export const FREE_QUESTION_IDS = [
  'free.start_style',
  'free.decision_style',
  'free.recovery_style',
  'free.distance_style',
  'free.change_style',
  'free.primary_theme',
] as const;

export const FREE_AXIS_QUESTION_IDS: Record<ExpressionAxisId, string> = {
  start: 'free.start_style',
  decision: 'free.decision_style',
  recovery: 'free.recovery_style',
  distance: 'free.distance_style',
  change: 'free.change_style',
};

export const FREE_START_ANSWER_TO_TENDENCY: Readonly<Record<string, StartTendency>> = {
  'free.start_style.map_first': 'map',
  'free.start_style.try_first': 'try',
  'free.start_style.ask_first': 'ask',
};

export const FREE_DECISION_ANSWER_TO_TENDENCY: Readonly<
  Record<string, DecisionTendency>
> = {
  'free.decision_style.sort_first': 'sort',
  'free.decision_style.deadline_first': 'deadline',
  'free.decision_style.wait_first': 'wait',
};

export const FREE_RECOVERY_ANSWER_TO_TENDENCY: Readonly<
  Record<string, RecoveryTendency>
> = {
  'free.recovery_style.pause_short': 'pause',
  'free.recovery_style.shrink_task': 'shrink',
  'free.recovery_style.change_scene': 'scene',
};

export const FREE_DISTANCE_ANSWER_TO_TENDENCY: Readonly<
  Record<string, DistanceTendency>
> = {
  'free.distance_style.close_careful': 'close',
  'free.distance_style.middle_steady': 'middle',
  'free.distance_style.solo_reset': 'solo',
};

export const FREE_CHANGE_ANSWER_TO_TENDENCY: Readonly<
  Record<string, ChangeTendency>
> = {
  'free.change_style.observe_first': 'observe',
  'free.change_style.adjust_fast': 'adjust',
  'free.change_style.rebuild_slow': 'rebuild',
};

export const FREE_PRIMARY_THEME_ANSWER_IDS = [
  'free.primary_theme.work',
  'free.primary_theme.relation',
  'free.primary_theme.fatigue',
  'free.primary_theme.tendency',
  'free.primary_theme.report_preview',
] as const;

export const FREE_PRIMARY_THEME_TO_REPLY: Readonly<
  Record<(typeof FREE_PRIMARY_THEME_ANSWER_IDS)[number], ReplyThemeId>
> = {
  'free.primary_theme.work': 'work',
  'free.primary_theme.relation': 'relation',
  'free.primary_theme.fatigue': 'fatigue',
  'free.primary_theme.tendency': 'tendency',
  'free.primary_theme.report_preview': 'report',
};

export const PRIMARY_TO_SECONDARY_REPLY: Readonly<Record<ReplyThemeId, ReplyThemeId>> = {
  work: 'tendency',
  relation: 'fatigue',
  fatigue: 'relation',
  tendency: 'report',
  report: 'tendency',
};

export const PAID_QUESTION_IDS = [
  'paid.work_focus',
  'paid.decision_friction',
  'paid.relation_focus',
  'paid.fatigue_signal',
  'paid.report_usage',
  'paid.reading_style',
] as const;

export const PAID_WORK_FOCUS_IDS = [
  'paid.work_focus.priority',
  'paid.work_focus.pace',
  'paid.work_focus.boundary',
] as const;

export const PAID_DECISION_FRICTION_IDS = [
  'paid.decision_friction.too_many',
  'paid.decision_friction.unclear_end',
  'paid.decision_friction.fear_mistake',
] as const;

export const PAID_RELATION_FOCUS_IDS = [
  'paid.relation_focus.words',
  'paid.relation_focus.timing',
  'paid.relation_focus.recovery',
] as const;

export const PAID_FATIGUE_SIGNAL_IDS = [
  'paid.fatigue_signal.after_push',
  'paid.fatigue_signal.before_start',
  'paid.fatigue_signal.long_stretch',
] as const;

export const PAID_REPORT_USAGE_IDS = [
  'paid.report_usage.reread_scene',
  'paid.report_usage.chapter_pick',
  'paid.report_usage.note_take',
] as const;

export const PAID_READING_STYLE_IDS = [
  'paid.reading_style.headline',
  'paid.reading_style.story',
  'paid.reading_style.compare',
] as const;

export const AXIS_PRIORITY: readonly ExpressionAxisId[] = [
  'distance',
  'recovery',
  'decision',
  'start',
  'change',
] as const;

export function isFreePrimaryThemeAnswerId(
  id: string,
): id is (typeof FREE_PRIMARY_THEME_ANSWER_IDS)[number] {
  return (FREE_PRIMARY_THEME_ANSWER_IDS as readonly string[]).includes(id);
}
