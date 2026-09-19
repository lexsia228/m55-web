/**
 * Pre-purchase answer-review provenance only.
 * Frozen display map: answer ID → chapter/topic. Not a selector.
 * Must not carry paid emphasis body, handling, or next-step substance.
 */

export type PaidReportTraceChapterRomanV1 = 'II' | 'III' | 'IV';

export type PaidQuestionReportTraceDisplayV1 = {
  answerId: string;
  chapterRoman: PaidReportTraceChapterRomanV1;
  topicLabelJa: string;
  lineJa: string;
};

function traceLineJa(
  chapterRoman: PaidReportTraceChapterRomanV1,
  topicLabelJa: string,
): string {
  return `反映先　第${chapterRoman}章・${topicLabelJa}`;
}

function entry(
  answerId: string,
  chapterRoman: PaidReportTraceChapterRomanV1,
  topicLabelJa: string,
): PaidQuestionReportTraceDisplayV1 {
  return {
    answerId,
    chapterRoman,
    topicLabelJa,
    lineJa: traceLineJa(chapterRoman, topicLabelJa),
  };
}

const TOPIC_WORK_JA = '進め方' as const;
const TOPIC_DECISION_JA = '決め方' as const;
const TOPIC_RELATION_JA = '人とのやりとり' as const;
const TOPIC_FATIGUE_JA = '疲れのサイン' as const;
const TOPIC_RECOVERY_JA = '戻り方' as const;
const TOPIC_RESTART_JA = '再開の条件' as const;

export const PAID_QUESTION_REPORT_TRACE_DISPLAY_V1: Readonly<
  Record<string, PaidQuestionReportTraceDisplayV1>
> = {
  'paid.work_focus.priority': entry('paid.work_focus.priority', 'II', TOPIC_WORK_JA),
  'paid.work_focus.pace': entry('paid.work_focus.pace', 'II', TOPIC_WORK_JA),
  'paid.work_focus.boundary': entry('paid.work_focus.boundary', 'II', TOPIC_WORK_JA),
  'paid.decision_friction.too_many': entry(
    'paid.decision_friction.too_many',
    'II',
    TOPIC_DECISION_JA,
  ),
  'paid.decision_friction.unclear_end': entry(
    'paid.decision_friction.unclear_end',
    'II',
    TOPIC_DECISION_JA,
  ),
  'paid.decision_friction.fear_mistake': entry(
    'paid.decision_friction.fear_mistake',
    'II',
    TOPIC_DECISION_JA,
  ),
  'paid.relation_focus.words': entry('paid.relation_focus.words', 'III', TOPIC_RELATION_JA),
  'paid.relation_focus.timing': entry('paid.relation_focus.timing', 'III', TOPIC_RELATION_JA),
  'paid.relation_focus.recovery': entry('paid.relation_focus.recovery', 'III', TOPIC_RELATION_JA),
  'paid.fatigue_signal.after_push': entry(
    'paid.fatigue_signal.after_push',
    'IV',
    TOPIC_FATIGUE_JA,
  ),
  'paid.fatigue_signal.before_start': entry(
    'paid.fatigue_signal.before_start',
    'IV',
    TOPIC_FATIGUE_JA,
  ),
  'paid.fatigue_signal.long_stretch': entry(
    'paid.fatigue_signal.long_stretch',
    'IV',
    TOPIC_FATIGUE_JA,
  ),
  'paid.recovery_sequence.pause_first': entry(
    'paid.recovery_sequence.pause_first',
    'IV',
    TOPIC_RECOVERY_JA,
  ),
  'paid.recovery_sequence.small_start': entry(
    'paid.recovery_sequence.small_start',
    'IV',
    TOPIC_RECOVERY_JA,
  ),
  'paid.recovery_sequence.sort_materials': entry(
    'paid.recovery_sequence.sort_materials',
    'IV',
    TOPIC_RECOVERY_JA,
  ),
  'paid.restart_condition.overview_first': entry(
    'paid.restart_condition.overview_first',
    'IV',
    TOPIC_RESTART_JA,
  ),
  'paid.restart_condition.shrink_scope': entry(
    'paid.restart_condition.shrink_scope',
    'IV',
    TOPIC_RESTART_JA,
  ),
  'paid.restart_condition.trusted_support': entry(
    'paid.restart_condition.trusted_support',
    'IV',
    TOPIC_RESTART_JA,
  ),
};

export function paidQuestionReportTraceLineJa(answerId: string): string | null {
  return PAID_QUESTION_REPORT_TRACE_DISPLAY_V1[answerId]?.lineJa ?? null;
}
