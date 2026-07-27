/**
 * Privacy-safe shareable free-result identity.
 * Token carries only public stem lane (0–9). No DOB, nickname, answers, or private text.
 */

import {
  clampStemLaneIndex,
  resolvePublicStemDisplay,
  type PublicStemDisplay,
} from '../publicStemDisplay';
import { resolveTraitIdentity } from '../commercialUx/traitIdentityCatalog';
import { M55_COMMERCIAL_TERMINOLOGY as T } from '../commercialUx/terminology';

export const SHARE_TOKEN_VERSION = 's1' as const;
export const SHARE_ENTRY_PATH_PREFIX = '/r' as const;
export const CANONICAL_PRODUCTION_ORIGIN = 'https://m-55.jp' as const;

export type PrivacySafeShareCardV1 = {
  stemLaneIndex: number;
  traitNameJa: string;
  traitPhraseJa: string;
  safeStatementJa: string;
  inviteJa: string;
  imagePath: string;
  sharePath: string;
  shareTextJa: string;
  token: string;
};

export const SHARE_UI_COPY_V1 = {
  titleJa: T.shareAction,
  bodyJa: '生年月日や回答は含まれません。資質名と短い一文だけを共有できます。',
  previewLabelJa: '共有される内容',
  nativeShareJa: '共有する',
  copyLinkJa: 'リンクをコピー',
  copiedJa: 'リンクをコピーしました',
  cancelledJa: '共有をキャンセルしました',
  unavailableJa: '共有できませんでした。下のテキストを選択してコピーしてください。',
  fallbackHintJa: 'リンクをコピーできない場合は、下のテキストを選択して共有してください。',
  inviteJa: 'M55で無料結果を見る',
} as const;

export const SHARED_ENTRY_COPY_V1 = {
  overlineJa: '共有された資質',
  ctaJa: '自分も無料で見る',
  fallbackTitleJa: '自分の動き方を、無料で見る',
  fallbackBodyJa:
    'ニックネームと生年月日のあと、5つの問いに答えると、あなた向けの無料結果を開けます。',
  privacyNoteJa: '共有リンクには、相手の生年月日や回答は含まれていません。',
} as const;

/** Encode public stem lane only. */
export function encodeShareToken(stemLaneIndex: number): string {
  const idx = clampStemLaneIndex(stemLaneIndex);
  return `${SHARE_TOKEN_VERSION}-${idx}`;
}

/** Fail-closed decode — invalid → null. */
export function decodeShareToken(raw: string | null | undefined): number | null {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  const m = new RegExp(`^${SHARE_TOKEN_VERSION}-([0-9])$`).exec(trimmed);
  if (!m) return null;
  const idx = Number(m[1]);
  if (!Number.isInteger(idx) || idx < 0 || idx > 9) return null;
  return idx;
}

export function buildSharePath(stemLaneIndex: number): string {
  return `${SHARE_ENTRY_PATH_PREFIX}/${encodeShareToken(stemLaneIndex)}`;
}

export function buildShareTextJa(traitNameJa: string): string {
  return `私の今の資質は『${traitNameJa}』でした。\nM55で、いつもの動き方を無料で見てみた。`;
}

export function buildPrivacySafeShareCardV1(input: {
  stemLaneIndex: number;
}): PrivacySafeShareCardV1 | null {
  const display = resolvePublicStemDisplay(input.stemLaneIndex);
  if (!display) return null;
  return buildShareCardFromDisplay(display);
}

function buildShareCardFromDisplay(display: PublicStemDisplay): PrivacySafeShareCardV1 {
  const identity = resolveTraitIdentity(display.stemLaneIndex);
  const token = encodeShareToken(display.stemLaneIndex);
  const traitPhraseJa = identity?.canonicalTagline ?? display.displayOneLine;
  const safeStatementJa = identity?.shareStatement ?? `${display.displayOneLine}。`;
  return {
    stemLaneIndex: display.stemLaneIndex,
    traitNameJa: identity?.traitName ?? display.publicTitle,
    traitPhraseJa,
    safeStatementJa,
    inviteJa: SHARE_UI_COPY_V1.inviteJa,
    imagePath: identity?.imagePath ?? display.imagePath,
    sharePath: buildSharePath(display.stemLaneIndex),
    shareTextJa: buildShareTextJa(identity?.traitName ?? display.publicTitle),
    token,
  };
}

export function resolveSharedEntryFromToken(
  token: string | null | undefined,
): PrivacySafeShareCardV1 | null {
  const idx = decodeShareToken(token);
  if (idx === null) return null;
  return buildPrivacySafeShareCardV1({ stemLaneIndex: idx });
}

/** Absolute share URL — Production uses canonical host; local uses current origin. */
export function resolveShareAbsoluteUrl(sharePath: string, origin?: string): string {
  const base =
    origin && origin.length > 0
      ? origin.replace(/\/$/, '')
      : CANONICAL_PRODUCTION_ORIGIN;
  return `${base}${sharePath.startsWith('/') ? sharePath : `/${sharePath}`}`;
}

const SENSITIVE_SHARE_PATTERN =
  /\b\d{4}-\d{2}-\d{2}\b|生年月日|ニックネーム|free\.|paid\.|answer|clerk|user_|@|メール|email|fingerprint|m55_profile|m55_self_funnel/i;

export function assertSharePayloadPrivacySafe(payload: {
  text: string;
  url: string;
  title?: string;
}): void {
  const blob = `${payload.title ?? ''}\n${payload.text}\n${payload.url}`;
  if (SENSITIVE_SHARE_PATTERN.test(blob)) {
    throw new Error('share payload contains sensitive pattern');
  }
  if (/[?&](dob|birth|nickname|answer|userId)=/i.test(payload.url)) {
    throw new Error('share URL contains sensitive query');
  }
}

export function sharePayloadContainsSensitive(blob: string): boolean {
  return SENSITIVE_SHARE_PATTERN.test(blob);
}
