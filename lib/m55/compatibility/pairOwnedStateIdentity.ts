import {
  isCompleteCompatibilityCurrentContextV2,
  type CompatibilityCurrentContextAnswersV2,
} from './currentContextContract.v2';
import {
  isCompleteCompatibilityGuestInput,
  isValidCompatibilityRelationStatusId,
  type CompatibilityGuestJourneyV3,
} from './pairReadingGuestContract';
import type { RelationStatusId } from './pairReadingTypes';

export const PAIR_OWNED_STATE_IDENTITY_VERSION = 'pair_owned_state_identity_v1' as const;

export const PAIR_OWNED_STATE_SESSION_COMPANION_KEY =
  'm55_compatibility_pair_owned_state_identity_v1' as const;

const UUID_V4_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type PairOwnedStateIdentityV1 = {
  version: typeof PAIR_OWNED_STATE_IDENTITY_VERSION;
  pairIdentityId: string;
  paidContextId: string;
};

export type OwnedCompatibilityReportIdentitySummary = {
  id: string;
  pairIdentityId: string | null;
  paidContextId: string | null;
};

export type PairOwnedStateClassification =
  | { kind: 'exact_owned'; reportId: string }
  | { kind: 'same_pair_new_context'; previousReportId?: string }
  | { kind: 'new_pair' }
  | { kind: 'unknown' };

export type PairPaidRelevantJourneyDelta =
  | 'no_prior_identity'
  | 'dob_changed'
  | 'relation_changed'
  | 'context_changed'
  | 'display_only'
  | 'identical';

export type RandomUuidFactory = () => string;

function defaultRandomUuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  throw new Error('crypto.randomUUID unavailable');
}

export function isStrictUuidV4(value: unknown): value is string {
  return typeof value === 'string' && UUID_V4_RE.test(value);
}

export function parsePairOwnedStateIdentityV1(
  value: unknown,
): PairOwnedStateIdentityV1 | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  if (record.version !== PAIR_OWNED_STATE_IDENTITY_VERSION) return null;
  if (!isStrictUuidV4(record.pairIdentityId)) return null;
  if (!isStrictUuidV4(record.paidContextId)) return null;
  return {
    version: PAIR_OWNED_STATE_IDENTITY_VERSION,
    pairIdentityId: record.pairIdentityId,
    paidContextId: record.paidContextId,
  };
}

export function createRandomPairOwnedStateIdentity(
  randomUuid: RandomUuidFactory = defaultRandomUuid,
): PairOwnedStateIdentityV1 {
  return {
    version: PAIR_OWNED_STATE_IDENTITY_VERSION,
    pairIdentityId: randomUuid(),
    paidContextId: randomUuid(),
  };
}

function isCompleteOwnedStateJourney(journey: CompatibilityGuestJourneyV3): boolean {
  return (
    journey.version === 'journey_v3' &&
    isCompleteCompatibilityGuestInput(journey.input) &&
    isValidCompatibilityRelationStatusId(journey.relationStatusId) &&
    isCompleteCompatibilityCurrentContextV2(journey.answers, journey.relationStatusId)
  );
}

function stableSerializeAnswers(
  answers: CompatibilityCurrentContextAnswersV2,
): string {
  const keys = Object.keys(answers).sort();
  return JSON.stringify(keys.map((key) => [key, answers[key as keyof typeof answers]]));
}

export function classifyPairPaidRelevantJourneyDelta(
  previous: CompatibilityGuestJourneyV3 | null,
  next: CompatibilityGuestJourneyV3,
): PairPaidRelevantJourneyDelta {
  if (!previous || !isCompleteOwnedStateJourney(previous)) {
    return 'no_prior_identity';
  }
  if (!isCompleteOwnedStateJourney(next)) {
    return 'no_prior_identity';
  }
  if (
    previous.input.personA !== next.input.personA ||
    previous.input.personB !== next.input.personB
  ) {
    return 'dob_changed';
  }
  if (previous.relationStatusId !== next.relationStatusId) {
    return 'relation_changed';
  }
  if (
    stableSerializeAnswers(previous.answers) !== stableSerializeAnswers(next.answers)
  ) {
    return 'context_changed';
  }
  const prevDisplay = JSON.stringify(previous.displayIdentity ?? null);
  const nextDisplay = JSON.stringify(next.displayIdentity ?? null);
  if (prevDisplay !== nextDisplay) {
    return 'display_only';
  }
  return 'identical';
}

export function resolveNextPairOwnedStateIdentity(args: {
  previousIdentity: PairOwnedStateIdentityV1 | null;
  previousJourney: CompatibilityGuestJourneyV3 | null;
  nextJourney: CompatibilityGuestJourneyV3;
  explicitContinuityReset?: boolean;
  randomUuid?: RandomUuidFactory;
}): PairOwnedStateIdentityV1 | null {
  if (!isCompleteOwnedStateJourney(args.nextJourney)) return null;
  const randomUuid = args.randomUuid ?? defaultRandomUuid;

  if (args.explicitContinuityReset) {
    return createRandomPairOwnedStateIdentity(randomUuid);
  }

  const delta = classifyPairPaidRelevantJourneyDelta(
    args.previousJourney,
    args.nextJourney,
  );

  if (delta === 'no_prior_identity' || !args.previousIdentity) {
    return createRandomPairOwnedStateIdentity(randomUuid);
  }

  if (!parsePairOwnedStateIdentityV1(args.previousIdentity)) {
    return createRandomPairOwnedStateIdentity(randomUuid);
  }

  const previous = args.previousIdentity;

  if (delta === 'dob_changed') {
    return createRandomPairOwnedStateIdentity(randomUuid);
  }

  if (delta === 'relation_changed' || delta === 'context_changed') {
    return {
      version: PAIR_OWNED_STATE_IDENTITY_VERSION,
      pairIdentityId: previous.pairIdentityId,
      paidContextId: randomUuid(),
    };
  }

  return {
    version: PAIR_OWNED_STATE_IDENTITY_VERSION,
    pairIdentityId: previous.pairIdentityId,
    paidContextId: previous.paidContextId,
  };
}

function parseIdentityField(value: unknown): string | null | 'malformed' {
  if (value === null) return null;
  if (isStrictUuidV4(value)) return value;
  return 'malformed';
}

export function parseOwnedReportIdentitySummariesFromReportsApi(
  data: unknown,
): { available: true; reports: OwnedCompatibilityReportIdentitySummary[] } | { available: false } | null {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return null;
  const record = data as Record<string, unknown>;
  if (record.available !== true) {
    if (record.available === false) return { available: false };
    return null;
  }
  if (!Array.isArray(record.reports)) return null;

  const reports: OwnedCompatibilityReportIdentitySummary[] = [];
  const seenIds = new Set<string>();

  for (const item of record.reports) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return null;
    const row = item as Record<string, unknown>;
    if (!isStrictUuidV4(row.id)) return null;
    if (seenIds.has(row.id)) return null;
    seenIds.add(row.id);

    let pairIdentityId = parseIdentityField(row.pairIdentityId);
    if (pairIdentityId === 'malformed') return null;
    let paidContextId = parseIdentityField(row.paidContextId);
    if (paidContextId === 'malformed') return null;

    if (
      (pairIdentityId === null && paidContextId !== null) ||
      (pairIdentityId !== null && paidContextId === null)
    ) {
      pairIdentityId = null;
      paidContextId = null;
    }

    reports.push({
      id: row.id,
      pairIdentityId,
      paidContextId,
    });
  }

  return { available: true, reports };
}

export function classifyPairOwnedState(args: {
  currentIdentity: PairOwnedStateIdentityV1 | null;
  reportsPayload: unknown;
}): PairOwnedStateClassification {
  if (
    !args.currentIdentity ||
    !parsePairOwnedStateIdentityV1(args.currentIdentity)
  ) {
    return { kind: 'unknown' };
  }

  const parsed = parseOwnedReportIdentitySummariesFromReportsApi(args.reportsPayload);
  if (!parsed) return { kind: 'unknown' };
  if (!parsed.available) return { kind: 'unknown' };

  const { pairIdentityId, paidContextId } = args.currentIdentity;
  const exactMatches = parsed.reports.filter(
    (report) =>
      report.pairIdentityId === pairIdentityId &&
      report.paidContextId === paidContextId,
  );
  if (exactMatches.length > 1) return { kind: 'unknown' };
  if (exactMatches.length === 1) {
    return { kind: 'exact_owned', reportId: exactMatches[0].id };
  }

  const samePairReports = parsed.reports.filter(
    (report) => report.pairIdentityId === pairIdentityId && report.pairIdentityId !== null,
  );
  if (samePairReports.length > 0) {
    const previous = samePairReports.find(
      (report) =>
        report.paidContextId !== null &&
        report.paidContextId !== paidContextId,
    );
    return {
      kind: 'same_pair_new_context',
      previousReportId: previous?.id,
    };
  }

  const hasLegacyOnly = parsed.reports.every(
    (report) => report.pairIdentityId === null && report.paidContextId === null,
  );
  if (hasLegacyOnly && parsed.reports.length > 0) {
    return { kind: 'new_pair' };
  }

  return { kind: 'new_pair' };
}

export type CompatibilityCheckoutResponseKind =
  | { kind: 'checkout'; url: string }
  | { kind: 'already_owned'; reportId: string }
  | { kind: 'checkout_in_progress' }
  | { kind: 'checkout_unknown' };

export function parseCompatibilityCheckoutResponse(
  data: unknown,
): CompatibilityCheckoutResponseKind | null {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return null;
  const record = data as Record<string, unknown>;
  if (record.kind === 'already_owned') {
    if (!isStrictUuidV4(record.reportId)) return null;
    return { kind: 'already_owned', reportId: record.reportId };
  }
  if (record.kind === 'checkout_in_progress') {
    return { kind: 'checkout_in_progress' };
  }
  if (record.kind === 'checkout_unknown') {
    return { kind: 'checkout_unknown' };
  }
  if (record.kind === 'checkout') {
    if (typeof record.url !== 'string' || record.url.length === 0) return null;
    return { kind: 'checkout', url: record.url };
  }
  if (typeof record.url === 'string' && record.url.length > 0) {
    return { kind: 'checkout', url: record.url };
  }
  return null;
}
