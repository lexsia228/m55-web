import { getStatusLabel } from './pairReadingCatalog.v1';
import type { RelationStatusId } from './pairReadingTypes';

export const PAIR_DISPLAY_IDENTITY_VERSION = 'pair_display_identity_v1' as const;
export const PAIR_PARTNER_LABEL_MAX_LENGTH = 24;

export type PairDisplayIdentityV1 = {
  version: typeof PAIR_DISPLAY_IDENTITY_VERSION;
  selfLabel: 'あなた';
  partnerLabel: string;
  relationLabel: string;
};

export function sanitizePairPartnerLabel(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value.replace(/[\u0000-\u001f\u007f]/g, '').replace(/\s+/g, ' ').trim().slice(0, PAIR_PARTNER_LABEL_MAX_LENGTH);
}

export function isSpecificPairPartnerLabel(value: unknown): boolean {
  const label = sanitizePairPartnerLabel(value);
  return Boolean(label && label !== '相手');
}

export function buildPairDisplayIdentity(
  partnerLabel: unknown,
  relationStatusId: RelationStatusId,
): PairDisplayIdentityV1 {
  return {
    version: PAIR_DISPLAY_IDENTITY_VERSION,
    selfLabel: 'あなた',
    partnerLabel: sanitizePairPartnerLabel(partnerLabel) || '相手',
    relationLabel: getStatusLabel(relationStatusId),
  };
}

export function parsePairDisplayIdentity(value: unknown): PairDisplayIdentityV1 | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const item = value as Record<string, unknown>;
  if (item.version !== PAIR_DISPLAY_IDENTITY_VERSION || item.selfLabel !== 'あなた') return null;
  if (typeof item.relationLabel !== 'string' || !item.relationLabel.trim()) return null;
  const partnerLabel = sanitizePairPartnerLabel(item.partnerLabel);
  if (!partnerLabel) return null;
  return { version: PAIR_DISPLAY_IDENTITY_VERSION, selfLabel: 'あなた', partnerLabel, relationLabel: item.relationLabel.trim().slice(0, 48) };
}

export function legacyPairDisplayIdentity(): PairDisplayIdentityV1 {
  return { version: PAIR_DISPLAY_IDENTITY_VERSION, selfLabel: 'あなた', partnerLabel: '相手', relationLabel: '二人の関係' };
}
