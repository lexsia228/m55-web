/**
 * reply-v1 wizard display labels — UI-only; catalog IDs and server compose unchanged.
 */

import type { ReplyThemeId } from './consultQuestionCatalog.v1';

export type WizardEntryCardDisplay = {
  label: string;
  description: string;
};

/** User-facing entry cards keyed by reply_theme_id (IDs unchanged). */
export const WIZARD_ENTRY_CARD_DISPLAY: Record<ReplyThemeId, WizardEntryCardDisplay> = {
  work: {
    label: '仕事が詰まっている',
    description: '何から始めるか、どこで無理が出るかを見る',
  },
  relation: {
    label: '人との距離で疲れる',
    description: '近づき方・言葉選び・戻り方を見る',
  },
  fatigue: {
    label: '疲れを戻したい',
    description: '崩れやすい流れと、短い戻し方を見る',
  },
  tendency: {
    label: '自分の傾向を読みたい',
    description: '今出ている癖や、見直すポイントを見る',
  },
  report: {
    label: 'プレミアムレポートを使いこなしたい',
    description: 'どこを読み返すとよいか整理する',
  },
};

/**
 * Optional wizard question chip labels keyed by reply_question_id.
 * Falls back to catalog labelJa when absent.
 */
export const WIZARD_QUESTION_LABEL_DISPLAY: Partial<Record<string, string>> = {
  'work.priority': 'いま優先順位を決めたい',
  'work.pace': '進め方のペースを整えたい',
  'work.start': '最初の一手を決めたい',
  'work.boundary': '区切り方を見直したい',
  'relation.distance': '距離の取り方を見直したい',
  'relation.words': '言葉の選び方を整えたい',
  'relation.timing': '伝えるタイミングを見直したい',
  'relation.recovery': 'やりとりのあとの戻し方を見たい',
  'fatigue.signal': '疲れの出方を読み返したい',
  'fatigue.reset': '短く戻す一手を置きたい',
  'fatigue.rhythm': '生活のリズムを整えたい',
  'fatigue.boundary': '無理が出る前に区切りを置きたい',
  'tendency.read_pattern': '傾向の読み方を整理したい',
  'tendency.focus': 'いま注目したい傾向に絞りたい',
  'tendency.reread': 'どこを読み返すか見たい',
  'tendency.lens': '別の見方で、少しほどいて読みたい',
  'report.how_to_use': 'プレミアムレポートの使い方を整理したい',
  'report.chapter_pick': 'いま開きやすい章を選びたい',
  'report.review_timing': '読み返すタイミングを見直したい',
  'report.next_step': '読んだあとの次の一手を一つ置きたい',
};

export function wizardQuestionLabelJa(questionId: string, catalogLabelJa: string): string {
  return WIZARD_QUESTION_LABEL_DISPLAY[questionId] ?? catalogLabelJa;
}
