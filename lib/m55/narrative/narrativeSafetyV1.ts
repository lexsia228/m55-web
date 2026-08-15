/**
 * Narrative / public-share safety — presentation layer only.
 * Extends existing share privacy; does not weaken it.
 */

import {
  PUBLIC_DOB_PROVENANCE_CUE_JA,
  sharePayloadContainsSensitive,
} from '../freeResult/privacySafeShareCardV1';

export { PUBLIC_DOB_PROVENANCE_CUE_JA };

export const NARRATIVE_SAFETY_FLAGS = {
  NO_PRIVATE_DATA: true,
  NO_RAW_DOB: true,
  NO_ANSWER_LEAK: true,
  NO_FAKE_ENDORSEMENT: true,
  NO_FAKE_RANK: true,
  NO_FAKE_RARITY: true,
  NO_FAKE_PRECISION: true,
  NO_FATE: true,
  NO_DIAGNOSIS: true,
  NO_PARTNER_MIND_READING: true,
  PUBLIC_COPY_PROVENANCE: true,
  PAID_CONTENT_LEAK: false,
} as const;

const FATE_PATTERN =
  /運命|宿命|霊|神託|妊娠|将来必ず|必ず当た|診断|治療|うつ|発達障害|星のメッセージ|未来の自分からの|相手からのメッセージ/;

const RANK_PATTERN =
  /レア度|★|☆|偏差値|相性点|ランキング|上位\d|%\s*的中|当たりすぎ|震えた|怖いくらい当た/;

const PRIVATE_PATTERN =
  /\b\d{4}-\d{2}-\d{2}\b|生年月日|ニックネーム|free\.|paid\.|answer|clerk|user_|ownerId|report_id|entitlement|fingerprint|dal-v1|m55_profile|メール|email/i;

const FAKE_ENDORSEMENT =
  /当たりすぎ|震えた|怖いくらい当たった|神がかり|絶対当たる/;

const PAID_LEAK_PATTERN =
  /六つの場面|使える一言|今週、一度だけ試す|あとで振り返る一問|追加読み解き/;

export function firstSentenceJa(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return '';
  const idx = trimmed.indexOf('。');
  if (idx >= 0 && idx < 160) return trimmed.slice(0, idx + 1);
  if (trimmed.length <= 80) return trimmed.endsWith('。') ? trimmed : `${trimmed}。`;
  return `${trimmed.slice(0, 72)}…`;
}

export function compactSentencesJa(text: string, maxSentences: number): string {
  const parts = text
    .split('。')
    .map((part) => part.trim())
    .filter((part) => part.length > 0)
    .slice(0, maxSentences);
  if (parts.length === 0) return '';
  return `${parts.join('。')}。`;
}

export function publicPairVoiceJa(text: string): string {
  return text
    .replaceAll('あなた側は', '片方は')
    .replaceAll('相手側は', 'もう片方は')
    .replaceAll('あなたは', '片方は')
    .replaceAll('相手は', 'もう片方は')
    .replaceAll('あなた', '片方')
    .replaceAll('相手', 'もう片方');
}

export function narrativeSafetyHits(blob: string): string[] {
  const hits: string[] = [];
  const masked = blob.split(PUBLIC_DOB_PROVENANCE_CUE_JA).join('');
  if (FATE_PATTERN.test(masked)) hits.push('NO_FATE');
  if (RANK_PATTERN.test(masked)) hits.push('NO_FAKE_RANK');
  if (FAKE_ENDORSEMENT.test(masked)) hits.push('NO_FAKE_ENDORSEMENT');
  if (PRIVATE_PATTERN.test(masked)) hits.push('NO_PRIVATE_DATA');
  if (sharePayloadContainsSensitive(blob)) hits.push('NO_PRIVATE_DATA');
  return hits;
}

export function assertNarrativeCopySafe(blob: string): void {
  const hits = narrativeSafetyHits(blob);
  if (hits.length > 0) {
    throw new Error(`narrative copy failed safety: ${hits.join(',')}`);
  }
}

export function paidContentWouldLeak(blob: string): boolean {
  return PAID_LEAK_PATTERN.test(blob);
}

export function stripNicknameJa(text: string, nickname?: string): string {
  if (!nickname || nickname.trim().length === 0) return text;
  return text.split(nickname).join('あなた');
}
