/**
 * Privacy-safe Pair Free share — invitation to /synastry only.
 * Must never include DOB, answers, stored result text, or pair identifiers.
 */

import {
  assertSharePayloadPrivacySafe,
  CANONICAL_PRODUCTION_ORIGIN,
  resolveShareAbsoluteUrl,
} from '../freeResult/privacySafeShareCardV1';

export const PAIR_SHARE_ENTRY_PATH = '/synastry' as const;

export const PAIR_SHARE_UI_COPY = {
  titleJa: 'M55の二人読み解きを共有する',
  motivationJa: 'あとで二人のことを一緒に見たり、話すきっかけにできます。',
  bodyJa: 'この二人の読み解き本文は含まれません。入口のページだけを渡せます。',
  nativeShareJa: '共有する',
  copyLinkJa: 'リンクをコピー',
  copiedJa: 'リンクをコピーしました',
  cancelledJa: '共有をキャンセルしました',
  unavailableJa: '共有できませんでした。下のリンクをコピーしてください。',
  imageSharePrimaryJa: '画像で共有する',
  imageSaveJa: '画像を保存',
  linkShareJa: 'リンクで共有する',
  linkCopyJa: 'リンクをコピー',
  xLinkPostJa: 'Xにリンクで投稿',
  imageShapeToggleJa: '画像の形を変える',
  imageShapeLabelJa: '共有画像の形',
  aspectSquareJa: '正方形',
  aspectPortraitJa: '縦長',
  aspectPortraitRecommendedJa: 'おすすめ',
  aspectStoryJa: 'ストーリー向け',
} as const;

export const PAIR_SHARE_PAYLOAD_TEXT_JA =
  'M55の二人読み解きを共有する' as const;

export type PrivacySafePairSharePayload = {
  title: 'M55';
  text: typeof PAIR_SHARE_PAYLOAD_TEXT_JA;
  url: string;
};

export function buildPrivacySafePairSharePayload(
  origin?: string,
): PrivacySafePairSharePayload {
  const url = resolveShareAbsoluteUrl(PAIR_SHARE_ENTRY_PATH, origin);
  const payload: PrivacySafePairSharePayload = {
    title: 'M55',
    text: PAIR_SHARE_PAYLOAD_TEXT_JA,
    url,
  };
  assertSharePayloadPrivacySafe(payload);
  if (!payload.url.endsWith(PAIR_SHARE_ENTRY_PATH)) {
    throw new Error('pair share URL must be the canonical /synastry entry');
  }
  if (/[?#]/.test(payload.url.replace(/^https?:\/\//, '').split('/')[0] ?? '')) {
    throw new Error('pair share URL must not carry a query or hash');
  }
  if (new URL(payload.url).search || new URL(payload.url).hash) {
    throw new Error('pair share URL must not carry a query or hash');
  }
  return payload;
}

export function pairShareAbsoluteUrl(origin?: string): string {
  return buildPrivacySafePairSharePayload(origin).url;
}

export { CANONICAL_PRODUCTION_ORIGIN };
