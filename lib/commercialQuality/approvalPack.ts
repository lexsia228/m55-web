/**
 * Candidate approval pack + canonical baseline promotion state machine.
 *
 * The generator produces *candidate* review material only. It can never write a
 * canonical baseline, and it can never author its own approval: promotion
 * requires an independent review record and a Human commercial approval record
 * that this code does not create.
 */
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

import {
  EMPTY_APPROVAL_RECORD_STORE,
  promotionApprovalFromBaseline,
  type ApprovalRecordStore,
} from './approvalRecords';
import type {
  BaselineApprovalRecord,
  CanonicalBaselineState,
  GateSummary,
  InvariantFailure,
  NormalizedCaseResult,
  SurfaceManifestEntry,
} from './types';

/** Untracked candidate output root, relative to the repository root. */
export const APPROVAL_PACK_DIR = join('test-results', 'commercial-quality-approval-pack');

/** Machine identity of this generator. Never a legal approval authority. */
export const GENERATOR_AUTHORITY = 'machine:commercial-quality-approval-pack';

/**
 * The only legal approvalAuthority string on a BaselineApprovalRecord.
 * Individual Codex / Human records must resolve from the durable store by ID.
 */
export const ALLOWED_APPROVAL_AUTHORITIES = ['durable:approval-record-store'] as const;
export type AllowedApprovalAuthority = (typeof ALLOWED_APPROVAL_AUTHORITIES)[number];

export type CandidateArtifact = {
  /** Path relative to APPROVAL_PACK_DIR. */
  relativePath: string;
  kind: 'png' | 'pdf' | 'html' | 'json';
  sha256: string;
  byteLength: number;
};

export type CandidateProvenance = {
  status: 'candidate';
  generator: typeof GENERATOR_AUTHORITY;
  generatedAt: string;
  sourceCommit: string;
  manifestDigest: string;
  surfaceIds: readonly string[];
  changedSurfaces: readonly string[];
  gates: GateSummary;
  artifacts: readonly CandidateArtifact[];
  ctaRouteMap: Readonly<Record<string, { route: string; ctaSelector: string | null }>>;
  productTruthReferenceMap: Readonly<Record<string, readonly string[]>>;
  humanDecisions: readonly string[];
  /** Explicitly false: a generated pack is never an approval. */
  humanApprovalRecorded: false;
};

export type ApprovalPackInput = {
  sourceCommit: string;
  manifestDigest: string;
  entries: readonly SurfaceManifestEntry[];
  results: readonly NormalizedCaseResult[];
  gates: GateSummary;
  changedSurfaces: readonly string[];
  /** Pre-rendered candidate binaries: PNG / PDF / shared image buffers. */
  captures: readonly { relativePath: string; kind: 'png' | 'pdf'; data: Uint8Array }[];
  now?: () => Date;
};

export type ApprovalPackGateFailure = { code: 'APPROVAL_PACK_GATE_NOT_GREEN'; message: string };

export function approvalPackBlockers(
  gates: GateSummary,
  manifestFailures: readonly InvariantFailure[],
): readonly ApprovalPackGateFailure[] {
  const blockers: ApprovalPackGateFailure[] = [];
  if (manifestFailures.length > 0) {
    blockers.push({
      code: 'APPROVAL_PACK_GATE_NOT_GREEN',
      message: `manifest validation must PASS (${manifestFailures.length} failures)`,
    });
  }
  if (!gates.geometryGreen) {
    blockers.push({ code: 'APPROVAL_PACK_GATE_NOT_GREEN', message: 'geometry gate is not GREEN' });
  }
  if (!gates.semanticGreen) {
    blockers.push({ code: 'APPROVAL_PACK_GATE_NOT_GREEN', message: 'semantic gate is not GREEN' });
  }
  if (!gates.accessibilityGreen) {
    blockers.push({
      code: 'APPROVAL_PACK_GATE_NOT_GREEN',
      message: 'accessibility gate is not GREEN',
    });
  }
  return blockers;
}

function sha256(data: Uint8Array | string): string {
  return createHash('sha256').update(data).digest('hex');
}

function contactSheetHtml(input: ApprovalPackInput): string {
  const rows = input.captures
    .filter((c) => c.kind === 'png')
    .map(
      (c) =>
        `<figure><img src="./${c.relativePath}" alt="" loading="lazy" /><figcaption>${c.relativePath}</figcaption></figure>`,
    )
    .join('\n');
  return [
    '<!doctype html>',
    '<html lang="ja"><head><meta charset="utf-8" />',
    '<title>commercial quality — CANDIDATE review pack</title>',
    '<style>body{font-family:system-ui,sans-serif;margin:24px}figure{display:inline-block;margin:8px;width:320px}img{width:100%;border:1px solid #ccc}figcaption{font-size:12px;color:#555}</style>',
    '</head><body>',
    '<h1>CANDIDATE — not a canonical baseline, not an approval</h1>',
    `<p>source commit: <code>${input.sourceCommit}</code></p>`,
    `<p>manifest digest: <code>${input.manifestDigest}</code></p>`,
    rows,
    '</body></html>',
  ].join('\n');
}

export type GeneratedApprovalPack = {
  directory: string;
  provenance: CandidateProvenance;
};

/**
 * Write the candidate pack. Cleans the directory first so a stale artifact can
 * never be presented as current evidence.
 */
export function generateApprovalPack(
  repositoryRoot: string,
  input: ApprovalPackInput,
  manifestFailures: readonly InvariantFailure[] = [],
): GeneratedApprovalPack {
  const blockers = approvalPackBlockers(input.gates, manifestFailures);
  if (blockers.length > 0) {
    throw new Error(
      `approval pack refused: ${blockers.map((b) => b.message).join('; ')} (candidate generation requires manifest, geometry, semantic and accessibility PASS)`,
    );
  }

  const directory = join(repositoryRoot, APPROVAL_PACK_DIR);
  rmSync(directory, { recursive: true, force: true });
  mkdirSync(directory, { recursive: true });

  const artifacts: CandidateArtifact[] = [];
  for (const capture of input.captures) {
    const target = join(directory, capture.relativePath);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, capture.data);
    artifacts.push({
      relativePath: capture.relativePath,
      kind: capture.kind,
      sha256: sha256(capture.data),
      byteLength: capture.data.byteLength,
    });
  }

  const contactSheet = contactSheetHtml(input);
  writeFileSync(join(directory, 'contact-sheet.html'), contactSheet, 'utf8');
  artifacts.push({
    relativePath: 'contact-sheet.html',
    kind: 'html',
    sha256: sha256(contactSheet),
    byteLength: Buffer.byteLength(contactSheet),
  });

  const summary = {
    status: 'candidate' as const,
    caseCount: input.results.length,
    failedCount: input.results.filter((r) => !r.passed).length,
    surfaces: [...new Set(input.results.map((r) => r.surfaceId))].sort(),
  };
  const summaryJson = `${JSON.stringify(summary, null, 2)}\n`;
  writeFileSync(join(directory, 'result-summary.json'), summaryJson, 'utf8');
  artifacts.push({
    relativePath: 'result-summary.json',
    kind: 'json',
    sha256: sha256(summaryJson),
    byteLength: Buffer.byteLength(summaryJson),
  });

  const ctaRouteMap: Record<string, { route: string; ctaSelector: string | null }> = {};
  const productTruthReferenceMap: Record<string, readonly string[]> = {};
  for (const entry of input.entries) {
    ctaRouteMap[entry.surfaceId] = {
      route: entry.route,
      ctaSelector: entry.criticalCta?.selector ?? null,
    };
    productTruthReferenceMap[entry.surfaceId] = entry.authorityReferences
      .filter((ref) => ref.kind === 'product_truth')
      .map((ref) => ref.key);
  }

  const provenance: CandidateProvenance = {
    status: 'candidate',
    generator: GENERATOR_AUTHORITY,
    generatedAt: (input.now ?? (() => new Date()))().toISOString(),
    sourceCommit: input.sourceCommit,
    manifestDigest: input.manifestDigest,
    surfaceIds: [...new Set(input.entries.map((e) => e.surfaceId))].sort(),
    changedSurfaces: [...input.changedSurfaces].sort(),
    gates: input.gates,
    artifacts,
    ctaRouteMap,
    productTruthReferenceMap,
    humanDecisions: [
      'commercial comprehension and conversion clarity',
      'responsive visual quality at reviewed widths',
      'canonical baseline promotion decision',
    ],
    humanApprovalRecorded: false,
  };
  writeFileSync(
    join(directory, 'provenance.json'),
    `${JSON.stringify(provenance, null, 2)}\n`,
    'utf8',
  );

  return { directory, provenance };
}

export function readApprovalPackProvenance(repositoryRoot: string): CandidateProvenance {
  const path = join(repositoryRoot, APPROVAL_PACK_DIR, 'provenance.json');
  return JSON.parse(readFileSync(path, 'utf8')) as CandidateProvenance;
}

/* ── Baseline promotion state machine ──────────────────────────────── */

export type PromotionRequest = {
  surfaceId: string;
  fromState: CanonicalBaselineState;
  toState: CanonicalBaselineState;
  gates: GateSummary;
  approval: BaselineApprovalRecord | null;
  /** Truth at promotion time. */
  currentSourceCommit: string;
  currentManifestDigest: string;
  currentCandidateHashes: Readonly<Record<string, string>>;
  /**
   * Durable store used to resolve independent Codex + Human approval IDs.
   * Defaults to an empty store — fabricated string refs fail closed.
   */
  approvalStore?: ApprovalRecordStore;
};

export type PromotionDecision = {
  allowed: boolean;
  failures: readonly InvariantFailure[];
};

function promotionFailure(
  code: InvariantFailure['code'],
  message: string,
  diagnostics: Record<string, unknown>,
): InvariantFailure {
  return { code, message, diagnostics, selector: null };
}

/**
 * Canonical promotion requires geometry + semantic + accessibility GREEN, an
 * independent review record, a Human commercial approval record, and exact
 * source-commit / manifest-digest / candidate-hash identity.
 */
export function evaluatePromotion(request: PromotionRequest): PromotionDecision {
  const failures: InvariantFailure[] = [];
  const at = { surfaceId: request.surfaceId, from: request.fromState, to: request.toState };

  if (request.toState === 'human-approved' && request.fromState !== 'candidate') {
    failures.push(
      promotionFailure(
        'PROMOTION_DIRECT_CANDIDATE_ASSIGNMENT',
        'canonical promotion must transition from candidate',
        at,
      ),
    );
  }

  if (request.toState !== 'human-approved') {
    return { allowed: failures.length === 0, failures };
  }

  if (!request.gates.geometryGreen) {
    failures.push(promotionFailure('PROMOTION_GEOMETRY_NOT_GREEN', 'geometry gate not GREEN', at));
  }
  if (!request.gates.semanticGreen) {
    failures.push(promotionFailure('PROMOTION_SEMANTIC_NOT_GREEN', 'semantic gate not GREEN', at));
  }
  if (!request.gates.accessibilityGreen) {
    failures.push(
      promotionFailure('PROMOTION_ACCESSIBILITY_NOT_GREEN', 'accessibility gate not GREEN', at),
    );
  }

  const approval = request.approval;
  if (!approval) {
    failures.push(
      promotionFailure('PROMOTION_MISSING_HUMAN_APPROVAL', 'no approval record supplied', at),
    );
    return { allowed: false, failures };
  }

  if (approval.approvalAuthority === GENERATOR_AUTHORITY || approval.approvalAuthority === 'machine:self') {
    failures.push(
      promotionFailure('PROMOTION_SELF_APPROVAL', 'implementation cannot approve itself', {
        ...at,
        approvalAuthority: approval.approvalAuthority,
      }),
    );
    return { allowed: false, failures };
  }

  const resolved = promotionApprovalFromBaseline(
    approval,
    request.approvalStore ?? EMPTY_APPROVAL_RECORD_STORE,
    {
      sourceCommit: request.currentSourceCommit,
      manifestDigest: request.currentManifestDigest,
      candidateHashes: request.currentCandidateHashes,
    },
  );
  failures.push(...resolved.failures);

  return { allowed: failures.length === 0, failures };
}
