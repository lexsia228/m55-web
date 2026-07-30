/**
 * Independently resolvable approval-record authority.
 *
 * Arbitrary nonempty strings never satisfy promotion. A record must be looked
 * up from a durable store by stable ID and bind exact commit / digest / hashes.
 * This module never creates Human approval records.
 */
import type { BaselineApprovalRecord, InvariantFailure } from './types';

/** Must match GENERATOR_AUTHORITY in approvalPack.ts — duplicated to break import cycle. */
const GENERATOR_AUTHORITY = 'machine:commercial-quality-approval-pack';

export const APPROVAL_AUTHORITY_TYPES = [
  'independent_codex_review',
  'human_commercial_approval',
] as const;
export type ApprovalAuthorityType = (typeof APPROVAL_AUTHORITY_TYPES)[number];

export type ApprovalDecision = 'approve' | 'reject' | 'defer';

export type ResolvedApprovalRecord = {
  approvalId: string;
  authorityType: ApprovalAuthorityType;
  sourceCommit: string;
  manifestDigest: string;
  candidateHashes: Readonly<Record<string, string>>;
  decision: ApprovalDecision;
  /** ISO-8601 timestamp from the durable record. */
  recordedAt: string;
  /** Provenance pointer (path / ticket / review URL). Never invented by the engine. */
  recordProvenance: string;
};

/**
 * Durable approval store. Production wiring supplies real records; tests inject
 * fixtures. The engine never auto-inserts Human or Codex approvals.
 */
export type ApprovalRecordStore = {
  resolve(approvalId: string): ResolvedApprovalRecord | null;
};

const FORBIDDEN_AUTHORITY_MARKERS = [
  'machine:self',
  'machine:commercial-quality-approval-pack',
  GENERATOR_AUTHORITY,
  'implementation',
  'self-approval',
] as const;

export function isForbiddenApprovalAuthority(value: string): boolean {
  const normalised = value.trim().toLowerCase();
  return FORBIDDEN_AUTHORITY_MARKERS.some(
    (marker) => normalised === marker.toLowerCase() || normalised.includes('machine:self'),
  );
}

function failure(
  code: InvariantFailure['code'],
  message: string,
  diagnostics: Record<string, unknown>,
): InvariantFailure {
  return { code, message, diagnostics, selector: null };
}

export type ApprovalResolutionRequest = {
  store: ApprovalRecordStore;
  independentReviewRef: string;
  humanApprovalRef: string;
  currentSourceCommit: string;
  currentManifestDigest: string;
  currentCandidateHashes: Readonly<Record<string, string>>;
};

export type ApprovalResolutionResult = {
  ok: boolean;
  independent: ResolvedApprovalRecord | null;
  human: ResolvedApprovalRecord | null;
  failures: readonly InvariantFailure[];
};

function bindRecord(
  label: 'independent' | 'human',
  record: ResolvedApprovalRecord | null,
  expectedType: ApprovalAuthorityType,
  request: ApprovalResolutionRequest,
): readonly InvariantFailure[] {
  const failures: InvariantFailure[] = [];
  if (!record) {
    failures.push(
      failure(
        label === 'independent'
          ? 'PROMOTION_MISSING_INDEPENDENT_REVIEW'
          : 'PROMOTION_MISSING_HUMAN_APPROVAL',
        `${label} approval record is not independently resolvable`,
        { ref: label === 'independent' ? request.independentReviewRef : request.humanApprovalRef },
      ),
    );
    return failures;
  }
  if (record.authorityType !== expectedType) {
    failures.push(
      failure('PROMOTION_UNKNOWN_APPROVAL_AUTHORITY', `${label} authority type mismatch`, {
        approvalId: record.approvalId,
        received: record.authorityType,
        expected: expectedType,
      }),
    );
  }
  if (isForbiddenApprovalAuthority(record.approvalId) || isForbiddenApprovalAuthority(record.recordProvenance)) {
    failures.push(
      failure('PROMOTION_SELF_APPROVAL', `${label} approval is implementation-generated`, {
        approvalId: record.approvalId,
      }),
    );
  }
  if (record.decision !== 'approve') {
    failures.push(
      failure(
        label === 'independent'
          ? 'PROMOTION_MISSING_INDEPENDENT_REVIEW'
          : 'PROMOTION_MISSING_HUMAN_APPROVAL',
        `${label} record decision is not approve`,
        { approvalId: record.approvalId, decision: record.decision },
      ),
    );
  }
  if (record.sourceCommit !== request.currentSourceCommit) {
    failures.push(
      failure('PROMOTION_STALE_SOURCE_COMMIT', `${label} approval bound to a different commit`, {
        approvalId: record.approvalId,
        approved: record.sourceCommit,
        current: request.currentSourceCommit,
      }),
    );
  }
  if (record.manifestDigest !== request.currentManifestDigest) {
    failures.push(
      failure('PROMOTION_STALE_MANIFEST_DIGEST', `${label} approval bound to a different digest`, {
        approvalId: record.approvalId,
        approved: record.manifestDigest,
        current: request.currentManifestDigest,
      }),
    );
  }
  const approvedKeys = Object.keys(record.candidateHashes).sort();
  const currentKeys = Object.keys(request.currentCandidateHashes).sort();
  if (approvedKeys.join('|') !== currentKeys.join('|')) {
    failures.push(
      failure('PROMOTION_ALTERED_CANDIDATE_HASH', `${label} candidate artifact set differs`, {
        approvalId: record.approvalId,
        approved: approvedKeys,
        current: currentKeys,
      }),
    );
  } else {
    for (const key of approvedKeys) {
      if (record.candidateHashes[key] !== request.currentCandidateHashes[key]) {
        failures.push(
          failure('PROMOTION_ALTERED_CANDIDATE_HASH', `${label} candidate hash differs: ${key}`, {
            approvalId: record.approvalId,
            artifact: key,
          }),
        );
      }
    }
  }
  if (!record.recordedAt || !record.recordProvenance.trim()) {
    failures.push(
      failure('PROMOTION_UNKNOWN_APPROVAL_AUTHORITY', `${label} record missing provenance`, {
        approvalId: record.approvalId,
      }),
    );
  }
  return failures;
}

/**
 * Resolve and bind independent Codex review + Human commercial approval.
 * Fabricated `human:commercial-review` strings with no store entry fail here.
 */
export function resolveApprovalRecords(
  request: ApprovalResolutionRequest,
): ApprovalResolutionResult {
  const failures: InvariantFailure[] = [];

  if (!request.independentReviewRef.trim() || !request.humanApprovalRef.trim()) {
    if (!request.independentReviewRef.trim()) {
      failures.push(
        failure('PROMOTION_MISSING_INDEPENDENT_REVIEW', 'independent review ref empty', {}),
      );
    }
    if (!request.humanApprovalRef.trim()) {
      failures.push(failure('PROMOTION_MISSING_HUMAN_APPROVAL', 'Human approval ref empty', {}));
    }
    return { ok: false, independent: null, human: null, failures };
  }

  if (request.independentReviewRef.trim() === request.humanApprovalRef.trim()) {
    failures.push(
      failure(
        'PROMOTION_MISSING_HUMAN_APPROVAL',
        'Human approval must be distinct from independent review',
        {},
      ),
    );
  }

  for (const ref of [request.independentReviewRef, request.humanApprovalRef]) {
    if (isForbiddenApprovalAuthority(ref)) {
      failures.push(
        failure('PROMOTION_SELF_APPROVAL', 'approval ref is a forbidden machine authority', { ref }),
      );
    }
  }

  const independent = request.store.resolve(request.independentReviewRef);
  const human = request.store.resolve(request.humanApprovalRef);
  failures.push(...bindRecord('independent', independent, 'independent_codex_review', request));
  failures.push(...bindRecord('human', human, 'human_commercial_approval', request));

  return {
    ok: failures.length === 0,
    independent,
    human,
    failures,
  };
}

/** Empty store used by production until durable records exist. */
export const EMPTY_APPROVAL_RECORD_STORE: ApprovalRecordStore = {
  resolve: () => null,
};

/** Test helper: build an in-memory store from records. */
export function approvalRecordStoreOf(
  records: readonly ResolvedApprovalRecord[],
): ApprovalRecordStore {
  const map = new Map(records.map((record) => [record.approvalId, record]));
  return {
    resolve: (approvalId) => map.get(approvalId) ?? null,
  };
}

/**
 * Convert a BaselineApprovalRecord into a resolution request against a store.
 * The string refs must resolve; the record itself is never trusted alone.
 */
export function promotionApprovalFromBaseline(
  approval: BaselineApprovalRecord,
  store: ApprovalRecordStore,
  current: {
    sourceCommit: string;
    manifestDigest: string;
    candidateHashes: Readonly<Record<string, string>>;
  },
): ApprovalResolutionResult {
  if (isForbiddenApprovalAuthority(approval.approvalAuthority)) {
    return {
      ok: false,
      independent: null,
      human: null,
      failures: [
        failure('PROMOTION_SELF_APPROVAL', 'approvalAuthority is forbidden', {
          approvalAuthority: approval.approvalAuthority,
        }),
      ],
    };
  }
  // Fabricated authority strings that are not the durable store identity fail.
  if (approval.approvalAuthority !== 'durable:approval-record-store') {
    return {
      ok: false,
      independent: null,
      human: null,
      failures: [
        failure('PROMOTION_UNKNOWN_APPROVAL_AUTHORITY', 'approvalAuthority is not the durable store', {
          approvalAuthority: approval.approvalAuthority,
          required: 'durable:approval-record-store',
        }),
      ],
    };
  }
  return resolveApprovalRecords({
    store,
    independentReviewRef: approval.independentReviewRef,
    humanApprovalRef: approval.humanApprovalRef,
    currentSourceCommit: current.sourceCommit,
    currentManifestDigest: current.manifestDigest,
    currentCandidateHashes: current.candidateHashes,
  });
}
