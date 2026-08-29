/**
 * Pair reading catalog v1 — locked enums and product names.
 * Test/support. No runtime side effects.
 */

import type {
  ChapterId,
  PaidTopicId,
  PairAxisId,
  RelationStatusId,
  TemperatureId,
} from './pairReadingTypes';

export const PAIR_READING_CATALOG_VERSION = 'pair_catalog_v1' as const;

export const PRODUCT_PUBLIC_NAME = '2人の距離の読み解き' as const;
export const PRODUCT_INTERNAL_NAME = 'pair_reading' as const;
export const SAFETY_PROFILE = 'm55_pair_non_advisory_v1' as const;
/** Names the paid product exactly as the commerce authority and My Page do. */
export const PAIR_READING_CTA = '続きは、二人の相性レポート' as const;
export const SAFETY_SHORT_TEXT = '関係や気持ちを断定するものではありません。' as const;

export const DISPLAY_NAME_A_DEFAULT = 'あなた' as const;
export const DISPLAY_NAME_B_DEFAULT = 'お相手' as const;

export type CatalogEntry<T extends string> = {
  id: T;
  key: string;
  labelJa: string;
};

/** Observable current relationship context — one selector axis (「今の二人に近いもの」). */
export const RELATION_STATUS_CATALOG: readonly CatalogEntry<RelationStatusId>[] = [
  { id: 'R1', key: 'crush', labelJa: '片思いで、まだ付き合っていない' },
  { id: 'R2', key: 'in_contact', labelJa: '連絡はあるが、まだ付き合っていない' },
  { id: 'R3', key: 'dating', labelJa: '付き合っている' },
  { id: 'R4', key: 'distanced', labelJa: '付き合っているが、いま距離ができている' },
  { id: 'R5', key: 'want_to_reapproach', labelJa: '以前は近かったが、いまは離れている' },
  { id: 'R6', key: 'considering_long_term', labelJa: '長い付き合い・結婚などで一緒にいる' },
] as const;

export const PAID_TOPIC_CATALOG: readonly CatalogEntry<PaidTopicId>[] = [
  { id: 'T1', key: 'closeness_entry', labelJa: '2人の距離が縮まりやすい入口' },
  { id: 'T2', key: 'mismatch_scenes', labelJa: 'すれ違いやすい場面' },
  { id: 'T3', key: 'pace_gap', labelJa: '連絡や会話のペース差' },
  { id: 'T4', key: 'response_triggers', labelJa: '相手が反応しやすい場面' },
  { id: 'T5', key: 'pre_share_temperature', labelJa: '気持ちを伝える前に見る距離の温度差' },
] as const;

export const TEMPERATURE_CATALOG: readonly CatalogEntry<TemperatureId>[] = [
  { id: 'E0', key: 'unspecified', labelJa: '未指定' },
  { id: 'E1', key: 'mild_curiosity', labelJa: '少し気になっている' },
  { id: 'E2', key: 'response_sensitive', labelJa: '連絡や反応が気になる' },
  { id: 'E3', key: 'distance_uncertain', labelJa: '距離の取り方に迷っている' },
  { id: 'E4', key: 'already_distanced', labelJa: '一度距離ができている' },
  { id: 'E5', key: 'serious_forward', labelJa: 'これからを真剣に考えている' },
] as const;

export const PAIR_AXIS_CATALOG: readonly CatalogEntry<PairAxisId>[] = [
  { id: 'A1', key: 'closeness_pace', labelJa: '近づくペースの差' },
  { id: 'A2', key: 'response_style', labelJa: '反応の出方の差' },
  { id: 'A3', key: 'friction_zone', labelJa: 'すれ違いやすい面' },
  { id: 'A4', key: 'contact_entry', labelJa: '接点・入口の差' },
] as const;

export const CHAPTER_CATALOG: readonly {
  id: ChapterId;
  titleJa: string;
}[] = [
  { id: 'ch_you_pace', titleJa: 'あなた側に出やすい反応とペース' },
  { id: 'ch_other_pace', titleJa: 'お相手側に出やすい反応とペース' },
  { id: 'ch_pair_gap', titleJa: '2人の距離に出やすいズレ' },
  { id: 'ch_topic_deep', titleJa: '' }, // dynamic from topic
  { id: 'ch_today_clue', titleJa: '今日見る一つの手がかり' },
  { id: 'ch_about', titleJa: 'この読み解きについて' },
] as const;

export const RELATION_STATUS_IDS = RELATION_STATUS_CATALOG.map((e) => e.id);
export const PAID_TOPIC_IDS = PAID_TOPIC_CATALOG.map((e) => e.id);
export const TEMPERATURE_IDS = TEMPERATURE_CATALOG.map((e) => e.id);
export const PAIR_AXIS_IDS = PAIR_AXIS_CATALOG.map((e) => e.id);
export const CHAPTER_IDS = CHAPTER_CATALOG.map((e) => e.id);

export function getTopicLabel(id: PaidTopicId): string {
  const hit = PAID_TOPIC_CATALOG.find((e) => e.id === id);
  if (!hit) throw new Error(`unknown topic: ${id}`);
  return hit.labelJa;
}

export function getStatusLabel(id: RelationStatusId): string {
  const hit = RELATION_STATUS_CATALOG.find((e) => e.id === id);
  if (!hit) throw new Error(`unknown status: ${id}`);
  return hit.labelJa;
}

export function getAxisLabel(id: PairAxisId): string {
  const hit = PAIR_AXIS_CATALOG.find((e) => e.id === id);
  if (!hit) throw new Error(`unknown axis: ${id}`);
  return hit.labelJa;
}

export function getChapterTitle(id: ChapterId, topicId?: PaidTopicId): string {
  if (id === 'ch_topic_deep') {
    if (!topicId) throw new Error('topic required for ch_topic_deep');
    return getTopicLabel(topicId);
  }
  const hit = CHAPTER_CATALOG.find((e) => e.id === id);
  if (!hit) throw new Error(`unknown chapter: ${id}`);
  return hit.titleJa;
}

export const CH_ABOUT_DISCLAIMER = [
  'この読み解きは、関係や相手の気持ちを断定・保証するものではありません。',
  '2人の距離や反応の違いを整理するためのデジタルレポートです。',
  '占い・鑑定・診断・相談・カウンセリングではありません。',
  '医療・法律・投資等の助言ではありません。',
  '出会い・マッチングサービスではありません。',
  '商品名：2人の距離の読み解き（2人の関係整理レポート）。',
].join('\n');
