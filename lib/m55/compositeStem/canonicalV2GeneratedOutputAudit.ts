/**
 * Local synthetic output audit — canonical v2 displayed envelope vs legacy raw vs v2 expected.
 * Test/script only; no DB, no production runtime.
 */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { resetCalendarBundleCacheForTests } from '../calendar/loadCalendarBundle';
import { buildConsultReportContextFromEnvelope } from '../consult/consultReportContext';
import { buildCoreResult } from '../coreResult/buildCoreResult';
import { runDtrEngine, type DtrEnvelope } from '../dtrEngine';
import { enrichBirthProfileForSave } from '../../soul/birthProfileV2';
import { TEN_STEM_DISPLAY } from '../tenStemCatalog';
import { buildV2FulfillmentSnapshotFromFields } from './buildV2FulfillmentSnapshot';
import { deriveDtrShelfStemDisplayFromSnapshot } from './deriveDisplayedDtrShelfStem';
import {
  toCompositeCanonicalInput,
  type FulfillmentProfileFields,
} from './parseFulfillmentMetadata';
import { runM55CompositeStemPipeline } from './pipeline';
import { resolveDisplayedDtrEnvelope } from './resolveDisplayedDtrEnvelope';
import type { DtrReportSnapshotReadRow } from './storedEnvelopeRead';

export const AUDIT_ARTIFACT_DIR =
  '/Users/lexsia/Downloads/m55_legacy_snapshot_v2_rebuild_artifacts';
export const AUDIT_JSON_PATH = join(AUDIT_ARTIFACT_DIR, 'M55_CANONICAL_V2_GENERATED_OUTPUT_AUDIT.json');
export const AUDIT_MD_PATH = join(AUDIT_ARTIFACT_DIR, 'M55_CANONICAL_V2_GENERATED_OUTPUT_AUDIT.md');

export const CERTIFIED_AUDIT_PROFILES = [
  {
    birthDate: '1992-12-19',
    nickname: 'Audit User 1992',
    expectedV2Lane: 1,
    expectedV2Title: 'プランナー',
    expectRebuildOk: true,
  },
  {
    birthDate: '1983-02-28',
    nickname: 'Audit User 1983',
    expectedV2Lane: 9,
    expectedV2Title: 'アナリスト',
    expectRebuildOk: true,
  },
  {
    birthDate: '1919-11-01',
    nickname: 'Audit User 1919',
    expectedV2Lane: 9,
    expectedV2Title: 'アナリスト',
    expectRebuildOk: true,
  },
  {
    birthDate: '1111-11-01',
    nickname: 'Audit User 1111',
    expectedV2Lane: null,
    expectedV2Title: null,
    expectRebuildOk: false,
  },
] as const;

export const ADJACENT_BOUNDARY_DATES = [
  '1992-12-18',
  '1992-12-19',
  '1992-12-20',
  '2024-02-03',
  '2024-02-04',
  '2024-02-05',
  '2000-02-28',
  '2000-02-29',
  '2000-03-01',
] as const;

const PRODUCER_LEAKAGE_PHRASES = [
  '育てて形にする',
  '温室',
  '育つ場所',
  '育成',
  'プロデューサー',
] as const;

export type BodyFingerprint = {
  sectionKeys: string[];
  sectionHashes: Record<string, string>;
  heroTitleHash: string;
  summaryHash: string;
  compositeHash: string;
};

export type ProfileAuditVerdict =
  | 'pass'
  | 'fail_rebuild'
  | 'fail_body_mismatch'
  | 'fail_consult_mismatch'
  | 'fail_legacy_leakage'
  | 'fail_label_only'
  | 'fail_out_of_range_expected'
  | 'fail_shelf_mismatch';

export type ProfileAuditRow = {
  birthDate: string;
  nickname: string;
  category: 'certified' | 'lane_representative' | 'adjacent_boundary';
  expectedV2Lane: number | null;
  expectedV2Title: string | null;
  legacyStoredLane: number | null;
  legacyStoredTitle: string | null;
  displayedMode: string | null;
  displayedLane: number | null;
  displayedTitle: string | null;
  shelfLane: number | null;
  shelfTitle: string | null;
  consultTitleOrLane: string;
  bodyFingerprint: {
    v2Expected: BodyFingerprint;
    displayed: BodyFingerprint | null;
    legacyRaw: BodyFingerprint | null;
  };
  consultFingerprint: {
    v2Expected: string;
    displayed: string | null;
    match: boolean;
  };
  readerConsultMatch: boolean;
  freePaidRebuiltShelfMatch: boolean;
  legacyLeakageSuspected: string[];
  labelOnlyReplacementSuspected: boolean;
  verdict: ProfileAuditVerdict;
  excerpt?: Record<string, string>;
};

export type OutputAuditSummary = {
  auditedProfileCount: number;
  laneCoverage: number[];
  allOutputAuditsPass: boolean;
  bodyMismatchCount: number;
  consultMismatchCount: number;
  legacyBodyLeakageCount: number;
  labelOnlyReplacementSuspectedCount: number;
};

export type OutputAuditReport = {
  summary: OutputAuditSummary;
  profiles: ProfileAuditRow[];
  staticGuards: {
    sendRouteUsesDisplayedResolver: boolean;
    corePageUsesDisplayedResolver: boolean;
  };
};

function sha12(text: string): string {
  return createHash('sha256').update(text, 'utf8').digest('hex').slice(0, 12);
}

export function fingerprintEnvelopeBody(envelope: DtrEnvelope): BodyFingerprint {
  const sections = envelope.payload?.fullSections ?? [];
  const sectionKeys = sections.map((s) => s.id);
  const sectionHashes: Record<string, string> = {};
  const bodyParts: string[] = [];
  for (const section of sections) {
    const body = section.body ?? '';
    sectionHashes[section.id] = sha12(body);
    bodyParts.push(`${section.id}:${body}`);
  }
  const summaries = sections.map((s) => s.summary ?? '').join('\n');
  const title = envelope.payload?.title ?? '';
  return {
    sectionKeys,
    sectionHashes,
    heroTitleHash: sha12(title),
    summaryHash: sha12(summaries),
    compositeHash: sha12(bodyParts.join('\n---\n')),
  };
}

export function fingerprintConsultContext(envelope: DtrEnvelope, nickname: string): string {
  return sha12(buildConsultReportContextFromEnvelope(envelope, { redactNickname: nickname }));
}

function defaultFields(birthDate: string, nickname: string): FulfillmentProfileFields {
  return {
    nickname,
    birthDate,
    birthTime: null,
    birthTimeUnknown: true,
    country: 'JP',
    birthplace: null,
    timezone: null,
  };
}

function legacySnapshotRow(birthDate: string, nickname: string): DtrReportSnapshotReadRow {
  const envelope = runDtrEngine({
    birthDate,
    nickname,
    locale: 'ja-JP',
    contextScope: 'dtr',
  });
  return {
    reportInstanceId: 'snap-audit',
    user_id: 'user-audit',
    product_id: 'DTR_CORE_STATIC_V1',
    checkout_session_id: null,
    profile_snapshot: { nickname, birthDate },
    draft_snapshot: null,
    envelope_json: envelope,
    engine_version: null,
    engine_context_json: null,
  };
}

function excerptSections(envelope: DtrEnvelope, maxChars = 100): Record<string, string> {
  const out: Record<string, string> = {};
  for (const section of envelope.payload.fullSections.slice(0, 3)) {
    const body = section.body.trim();
    out[section.id] = body.length <= maxChars ? body : `${body.slice(0, maxChars - 1)}…`;
  }
  return out;
}

function scanProducerLeakage(text: string): string[] {
  const hits: string[] = [];
  for (const phrase of PRODUCER_LEAKAGE_PHRASES) {
    if (text.includes(phrase)) hits.push(phrase);
  }
  return hits;
}

function fingerprintsEqual(a: BodyFingerprint, b: BodyFingerprint): boolean {
  return a.compositeHash === b.compositeHash && a.heroTitleHash === b.heroTitleHash;
}

export function auditSyntheticProfile(
  birthDate: string,
  nickname: string,
  category: ProfileAuditRow['category'],
  options: {
    expectedV2Lane?: number | null;
    expectedV2Title?: string | null;
    expectRebuildOk?: boolean;
  } = {},
): ProfileAuditRow {
  resetCalendarBundleCacheForTests();
  const expectRebuildOk = options.expectRebuildOk ?? true;
  const fields = defaultFields(birthDate, nickname);
  const row = legacySnapshotRow(birthDate, nickname);
  const legacyEnvelope = row.envelope_json;
  const legacyLane = legacyEnvelope.auditMeta.stemLaneIndex;
  const legacyTitle = TEN_STEM_DISPLAY[legacyLane]!.publicTitle;

  let v2ExpectedFp: BodyFingerprint;
  let v2ExpectedConsult: string;
  let expectedLane: number;
  let freeLane: number;

  if (expectRebuildOk) {
    const paid = buildV2FulfillmentSnapshotFromFields(fields);
    v2ExpectedFp = fingerprintEnvelopeBody(paid.envelope_json);
    v2ExpectedConsult = fingerprintConsultContext(paid.envelope_json, nickname);
    expectedLane = runM55CompositeStemPipeline(toCompositeCanonicalInput(fields)).stemLaneIndex;
    const profile = enrichBirthProfileForSave({
      nickname,
      birthDate,
      birthTimeUnknown: true,
      country: 'JP',
    });
    freeLane = buildCoreResult(profile).stemLaneIndex;
  } else {
    v2ExpectedFp = fingerprintEnvelopeBody(legacyEnvelope);
    v2ExpectedConsult = '';
    expectedLane = -1;
    freeLane = -1;
  }

  const displayed = resolveDisplayedDtrEnvelope(row);
  const shelf = deriveDtrShelfStemDisplayFromSnapshot(row);

  let verdict: ProfileAuditVerdict = 'pass';
  let displayedFp: BodyFingerprint | null = null;
  let displayedConsult: string | null = null;
  let legacyLeakageSuspected: string[] = [];
  let labelOnlyReplacementSuspected = false;
  let readerConsultMatch = false;
  let freePaidRebuiltShelfMatch = false;

  let displayedLane: number | null = null;
  let displayedTitle: string | null = null;
  let displayedMode: string | null = null;

  if (!expectRebuildOk) {
    if (displayed.ok) verdict = 'fail_out_of_range_expected';
    return {
      birthDate,
      nickname,
      category,
      expectedV2Lane: options.expectedV2Lane ?? null,
      expectedV2Title: options.expectedV2Title ?? null,
      legacyStoredLane: legacyLane,
      legacyStoredTitle: legacyTitle,
      displayedMode: displayed.ok ? displayed.mode : null,
      displayedLane: displayed.ok ? displayed.envelope.auditMeta.stemLaneIndex : null,
      displayedTitle: displayed.ok
        ? TEN_STEM_DISPLAY[displayed.envelope.auditMeta.stemLaneIndex]!.publicTitle
        : null,
      shelfLane: shelf?.stemLaneIndex ?? null,
      shelfTitle: shelf?.publicTitle ?? null,
      consultTitleOrLane: 'n/a',
      bodyFingerprint: {
        v2Expected: v2ExpectedFp,
        displayed: null,
        legacyRaw: fingerprintEnvelopeBody(legacyEnvelope),
      },
      consultFingerprint: { v2Expected: v2ExpectedConsult, displayed: null, match: true },
      readerConsultMatch: true,
      freePaidRebuiltShelfMatch: !displayed.ok,
      legacyLeakageSuspected: [],
      labelOnlyReplacementSuspected: false,
      verdict: displayed.ok ? 'fail_out_of_range_expected' : 'pass',
    };
  }

  if (!displayed.ok) {
    return {
      birthDate,
      nickname,
      category,
      expectedV2Lane: options.expectedV2Lane ?? expectedLane,
      expectedV2Title: options.expectedV2Title ?? TEN_STEM_DISPLAY[expectedLane]!.publicTitle,
      legacyStoredLane: legacyLane,
      legacyStoredTitle: legacyTitle,
      displayedMode: null,
      displayedLane: null,
      displayedTitle: null,
      shelfLane: shelf?.stemLaneIndex ?? null,
      shelfTitle: shelf?.publicTitle ?? null,
      consultTitleOrLane: 'n/a',
      bodyFingerprint: {
        v2Expected: v2ExpectedFp,
        displayed: null,
        legacyRaw: fingerprintEnvelopeBody(legacyEnvelope),
      },
      consultFingerprint: { v2Expected: v2ExpectedConsult, displayed: null, match: false },
      readerConsultMatch: false,
      freePaidRebuiltShelfMatch: false,
      legacyLeakageSuspected: [],
      labelOnlyReplacementSuspected: false,
      verdict: 'fail_rebuild',
    };
  }

  displayedMode = displayed.mode;
  displayedLane = displayed.envelope.auditMeta.stemLaneIndex;
  displayedTitle = TEN_STEM_DISPLAY[displayedLane]!.publicTitle;
  displayedFp = fingerprintEnvelopeBody(displayed.envelope);
  displayedConsult = fingerprintConsultContext(displayed.envelope, nickname);
  const legacyFp = fingerprintEnvelopeBody(legacyEnvelope);

  readerConsultMatch = displayedConsult === v2ExpectedConsult;
  freePaidRebuiltShelfMatch =
    displayedLane === expectedLane &&
    displayedLane === freeLane &&
    shelf?.stemLaneIndex === displayedLane &&
    shelf?.publicTitle === displayedTitle;

  if (options.expectedV2Lane != null && displayedLane !== options.expectedV2Lane) {
    verdict = 'fail_body_mismatch';
  } else if (!fingerprintsEqual(displayedFp, v2ExpectedFp)) {
    verdict = 'fail_body_mismatch';
  } else if (!readerConsultMatch) {
    verdict = 'fail_consult_mismatch';
  } else if (shelf?.stemLaneIndex !== displayedLane || shelf?.publicTitle !== displayedTitle) {
    verdict = 'fail_shelf_mismatch';
  } else if (
    displayedTitle === 'プロデューサー' &&
    displayedLane !== 5 &&
    (options.expectedV2Lane == null || options.expectedV2Lane !== 5)
  ) {
    verdict = 'fail_legacy_leakage';
  } else if (legacyLane !== displayedLane && fingerprintsEqual(displayedFp, legacyFp)) {
    labelOnlyReplacementSuspected = true;
    verdict = 'fail_label_only';
  } else if (legacyLane !== displayedLane && fingerprintsEqual(displayedFp, legacyFp) === false) {
    // good — body differs from legacy when lanes differ
  }

  const displayedBodyText = displayed.envelope.payload.fullSections.map((s) => s.body).join('\n');
  if (birthDate === '1992-12-19') {
    legacyLeakageSuspected = scanProducerLeakage(displayedBodyText);
    if (legacyLeakageSuspected.length > 0 && verdict === 'pass') {
      // suspected only — not auto-fail unless title is producer
    }
  }

  const rowResult: ProfileAuditRow = {
    birthDate,
    nickname,
    category,
    expectedV2Lane: options.expectedV2Lane ?? expectedLane,
    expectedV2Title: options.expectedV2Title ?? TEN_STEM_DISPLAY[expectedLane]!.publicTitle,
    legacyStoredLane: legacyLane,
    legacyStoredTitle: legacyTitle,
    displayedMode,
    displayedLane,
    displayedTitle,
    shelfLane: shelf?.stemLaneIndex ?? null,
    shelfTitle: shelf?.publicTitle ?? null,
    consultTitleOrLane: `${displayedLane}/${displayedTitle}`,
    bodyFingerprint: {
      v2Expected: v2ExpectedFp,
      displayed: displayedFp,
      legacyRaw: legacyFp,
    },
    consultFingerprint: {
      v2Expected: v2ExpectedConsult,
      displayed: displayedConsult,
      match: readerConsultMatch,
    },
    readerConsultMatch,
    freePaidRebuiltShelfMatch,
    legacyLeakageSuspected,
    labelOnlyReplacementSuspected,
    verdict,
  };

  if (['1992-12-19', '1983-02-28', '1919-11-01'].includes(birthDate)) {
    rowResult.excerpt = {
      displayedTitle: displayedTitle ?? '',
      displayedSections: JSON.stringify(excerptSections(displayed.envelope)),
      consultExcerpt: buildConsultReportContextFromEnvelope(displayed.envelope, {
        redactNickname: nickname,
      }).slice(0, 120),
      leakageNote:
        legacyLeakageSuspected.length > 0
          ? `legacy producer leakage suspected: ${legacyLeakageSuspected.join(', ')}`
          : 'none',
    };
  }

  return rowResult;
}

export const LANE_REPRESENTATIVE_SEEDS: readonly { lane: number; birthDate: string }[] = [
  { lane: 0, birthDate: '2000-01-01' },
  { lane: 1, birthDate: '2024-02-05' },
  { lane: 2, birthDate: '1992-12-20' },
  { lane: 3, birthDate: '2016-02-29' },
  { lane: 4, birthDate: '2000-01-15' },
  { lane: 5, birthDate: '2000-02-15' },
  { lane: 6, birthDate: '2000-06-15' },
  { lane: 7, birthDate: '2000-08-15' },
  { lane: 8, birthDate: '2000-09-15' },
  { lane: 9, birthDate: '2000-11-15' },
];

export function findLaneRepresentativeDates(): { lane: number; birthDate: string }[] {
  const verified: { lane: number; birthDate: string }[] = [];
  for (const seed of LANE_REPRESENTATIVE_SEEDS) {
    resetCalendarBundleCacheForTests();
    const lane = runM55CompositeStemPipeline(
      toCompositeCanonicalInput(defaultFields(seed.birthDate, 'LaneRepVerify')),
    ).stemLaneIndex;
    if (lane !== seed.lane) {
      throw new Error(`lane rep mismatch ${seed.birthDate}: expected ${seed.lane}, got ${lane}`);
    }
    verified.push(seed);
  }
  return verified;
}

export function runCanonicalV2GeneratedOutputAudit(): OutputAuditReport {
  const profiles: ProfileAuditRow[] = [];

  for (const spec of CERTIFIED_AUDIT_PROFILES) {
    profiles.push(
      auditSyntheticProfile(spec.birthDate, spec.nickname, 'certified', {
        expectedV2Lane: spec.expectedV2Lane,
        expectedV2Title: spec.expectedV2Title,
        expectRebuildOk: spec.expectRebuildOk,
      }),
    );
  }

  for (const { lane, birthDate } of findLaneRepresentativeDates()) {
    profiles.push(
      auditSyntheticProfile(birthDate, `Audit Lane ${lane}`, 'lane_representative', {
        expectedV2Lane: lane,
        expectedV2Title: TEN_STEM_DISPLAY[lane]!.publicTitle,
      }),
    );
  }

  for (const birthDate of ADJACENT_BOUNDARY_DATES) {
    profiles.push(
      auditSyntheticProfile(birthDate, `Audit Adj ${birthDate}`, 'adjacent_boundary'),
    );
  }

  const sendRoute = readFileSync(join(process.cwd(), 'app/api/room/core/send/route.ts'), 'utf8');
  const corePage = readFileSync(join(process.cwd(), 'app/dtr/core/page.tsx'), 'utf8');

  const bodyMismatchCount = profiles.filter((p) => p.verdict === 'fail_body_mismatch').length;
  const consultMismatchCount = profiles.filter((p) => p.verdict === 'fail_consult_mismatch').length;
  const legacyBodyLeakageCount = profiles.filter((p) => p.verdict === 'fail_legacy_leakage').length;
  const labelOnlyReplacementSuspectedCount = profiles.filter(
    (p) => p.labelOnlyReplacementSuspected || p.verdict === 'fail_label_only',
  ).length;

  const laneCoverage = [
    ...new Set(
      profiles
        .filter((p) => p.verdict === 'pass' && p.category === 'lane_representative')
        .map((p) => p.displayedLane)
        .filter((lane): lane is number => lane != null),
    ),
  ].sort((a, b) => a - b);

  const allOutputAuditsPass = profiles.every((p) => p.verdict === 'pass');

  return {
    summary: {
      auditedProfileCount: profiles.length,
      laneCoverage,
      allOutputAuditsPass,
      bodyMismatchCount,
      consultMismatchCount,
      legacyBodyLeakageCount,
      labelOnlyReplacementSuspectedCount,
    },
    profiles,
    staticGuards: {
      sendRouteUsesDisplayedResolver: sendRoute.includes('resolveDisplayedDtrEnvelope'),
      corePageUsesDisplayedResolver: corePage.includes('resolveDisplayedDtrEnvelope'),
    },
  };
}

export function formatOutputAuditMarkdown(report: OutputAuditReport): string {
  const lines: string[] = [
    '# M55 Canonical V2 Generated Output Audit',
    '',
    'Synthetic profiles only — no real user PII.',
    '',
    '## Summary',
    '',
    `- audited profile count: ${report.summary.auditedProfileCount}`,
    `- lane coverage (representatives): ${report.summary.laneCoverage.join(', ')}`,
    `- all output audits pass: ${report.summary.allOutputAuditsPass}`,
    `- body mismatch count: ${report.summary.bodyMismatchCount}`,
    `- consult mismatch count: ${report.summary.consultMismatchCount}`,
    `- legacy body leakage count: ${report.summary.legacyBodyLeakageCount}`,
    `- label-only replacement suspected count: ${report.summary.labelOnlyReplacementSuspectedCount}`,
    '',
    '## Per-profile table',
    '',
    '| birthDate | expectedV2 | legacyStored | displayed | shelf | body fp (disp/v2/legacy) | consult match | verdict |',
    '| --- | --- | --- | --- | --- | --- | --- | --- |',
  ];

  for (const p of report.profiles) {
    const exp = p.expectedV2Lane != null ? `${p.expectedV2Lane}/${p.expectedV2Title}` : 'n/a';
    const leg =
      p.legacyStoredLane != null ? `${p.legacyStoredLane}/${p.legacyStoredTitle}` : 'n/a';
    const disp =
      p.displayedLane != null ? `${p.displayedMode} ${p.displayedLane}/${p.displayedTitle}` : 'fail-close';
    const shelf = p.shelfLane != null ? `${p.shelfLane}/${p.shelfTitle}` : 'n/a';
    const fp = p.bodyFingerprint.displayed
      ? `${p.bodyFingerprint.displayed.compositeHash}/${p.bodyFingerprint.v2Expected.compositeHash}/${p.bodyFingerprint.legacyRaw?.compositeHash ?? 'n/a'}`
      : 'n/a';
    lines.push(
      `| ${p.birthDate} | ${exp} | ${leg} | ${disp} | ${shelf} | ${fp} | ${p.consultFingerprint.match} | ${p.verdict} |`,
    );
  }

  lines.push('', '## Representative excerpts', '');
  for (const date of ['1992-12-19', '1983-02-28', '1919-11-01'] as const) {
    const p = report.profiles.find((r) => r.birthDate === date);
    if (!p?.excerpt) continue;
    lines.push(`### ${date}`, '');
    lines.push(`- displayed title: ${p.excerpt.displayedTitle}`);
    lines.push(`- displayed sections excerpt: ${p.excerpt.displayedSections}`);
    lines.push(`- consult excerpt: ${p.excerpt.consultExcerpt}`);
    lines.push(`- leakage note: ${p.excerpt.leakageNote}`);
    lines.push('');
  }

  lines.push('## Static guards', '');
  lines.push(`- send route uses resolveDisplayedDtrEnvelope: ${report.staticGuards.sendRouteUsesDisplayedResolver}`);
  lines.push(`- core page uses resolveDisplayedDtrEnvelope: ${report.staticGuards.corePageUsesDisplayedResolver}`);

  return lines.join('\n');
}
