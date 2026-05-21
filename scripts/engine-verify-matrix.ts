/**
 * ENGINE-VERIFY-A execution — local deterministic GX matrix (no DB, no deploy).
 * Run: npx tsx scripts/engine-verify-matrix.ts
 */
import { writeFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { execSync } from 'node:child_process';
import { resetCalendarBundleCacheForTests } from '../lib/m55/calendar/loadCalendarBundle';
import { runM55CompositeStemPipeline } from '../lib/m55/compositeStem/pipeline';
import { M55CompositeStemError } from '../lib/m55/compositeStem/types';
import { ENGINE_VERSION_V2 } from '../lib/m55/compositeStem/constants';
import type { M55CompositeCanonicalInput } from '../lib/m55/compositeStem/types';
import { runDtrEngine } from '../lib/m55/dtrEngine';
import { essenceStemLaneIndex } from '../lib/m55/essenceEngine';
import { buildV2FulfillmentSnapshotFromFields } from '../lib/m55/compositeStem/buildV2FulfillmentSnapshot';
import {
  resolveStoredEnvelopeRead,
  type DtrReportSnapshotReadRow,
} from '../lib/m55/compositeStem/storedEnvelopeRead';
import { validateDtrCheckoutProfile } from '../lib/m55/compositeStem/checkoutProfileGate';
import { isCompositeV2FulfillmentWriteEnabled } from '../lib/m55/compositeStem/featureFlag';
import { enrichBirthProfileForSave } from '../lib/soul/birthProfileV2';

const DATE_TAG = '20260521';

type GxRow = {
  caseId: string;
  status: 'pass' | 'fail' | 'error_expected';
  stemLaneIndex?: number | null;
  stemChar?: string | null;
  publicTitle?: string | null;
  calculationMode?: string | null;
  errorCode?: string | null;
  notes?: string;
  boundaryKeys?: string[];
};

type StaticRow = {
  id: string;
  status: 'pass' | 'fail';
  detail: string;
};

function baseInput(overrides: Partial<M55CompositeCanonicalInput>): M55CompositeCanonicalInput {
  return {
    birthDate: '1983-02-28',
    birthTime: '12:00:00',
    birthTimeUnknown: false,
    country: 'JP',
    birthplace: '東京都',
    timezone: 'Asia/Tokyo',
    locale: 'ja-JP',
    nickname: 'verify',
    contextScope: 'dtr',
    calendarSystem: 'gregorian_civil',
    ...overrides,
  };
}

function runPipelineCase(
  caseId: string,
  input: M55CompositeCanonicalInput,
  expectError?: boolean,
): GxRow {
  try {
    const r = runM55CompositeStemPipeline(input);
    if (expectError) {
      return { caseId, status: 'fail', notes: 'expected error but pipeline succeeded' };
    }
    return {
      caseId,
      status: 'pass',
      stemLaneIndex: r.stemLaneIndex,
      stemChar: r.stemChar,
      publicTitle: r.paid.publicTitle,
      calculationMode: r.calculationMode,
      boundaryKeys: Object.keys(r.boundaryMetadata ?? {}),
      notes: r.boundaryMetadata.solarTermKey
        ? `solarTermKey=${r.boundaryMetadata.solarTermKey}`
        : undefined,
    };
  } catch (e) {
    if (expectError && e instanceof M55CompositeStemError) {
      return { caseId, status: 'error_expected', errorCode: e.code, notes: 'fail-closed ok' };
    }
    const code = e instanceof M55CompositeStemError ? e.code : String(e);
    return { caseId, status: 'fail', errorCode: code, notes: 'unexpected throw' };
  }
}

function main(): void {
  resetCalendarBundleCacheForTests();
  const gxCases: GxRow[] = [];
  const p0Failures: string[] = [];

  // GX-01
  const gx01 = runPipelineCase('GX-01', baseInput({ contextScope: 'essence', nickname: 'golden' }));
  gxCases.push(gx01);
  if (
    gx01.status !== 'pass' ||
    gx01.stemLaneIndex !== 9 ||
    gx01.stemChar !== '癸' ||
    gx01.publicTitle !== 'アナリスト'
  ) {
    p0Failures.push('GX-01');
  }
  const jdnLane = essenceStemLaneIndex('1983-02-28');
  if (gx01.stemLaneIndex === jdnLane) {
    p0Failures.push('GX-01_JDN_FALLBACK');
  }

  // GX-02
  for (const [id, date] of [
    ['GX-02a', '2024-02-03'],
    ['GX-02b', '2024-02-04'],
    ['GX-02c', '2024-02-05'],
  ] as const) {
    gxCases.push(runPipelineCase(id, baseInput({ birthDate: date, nickname: id })));
  }

  // GX-03
  gxCases.push(runPipelineCase('GX-03a', baseInput({ birthDate: '2024-01-11', nickname: 'GX-03a' })));
  gxCases.push(runPipelineCase('GX-03b', baseInput({ birthDate: '2024-02-10', nickname: 'GX-03b' })));

  // GX-04
  gxCases.push(
    runPipelineCase('GX-04a', baseInput({ birthTime: null, birthTimeUnknown: true, nickname: 'GX-04a' })),
  );
  gxCases.push(
    runPipelineCase('GX-04b', baseInput({ birthDate: '1990-06-15', birthTime: '03:30', nickname: 'GX-04b' })),
  );
  gxCases.push(
    runPipelineCase('GX-04c', baseInput({ birthTime: '23:30:00', nickname: 'GX-04c' })),
  );

  // GX-05 / GX-06
  gxCases.push(runPipelineCase('GX-05a', baseInput({ birthDate: '1990-06-15', country: 'JP', nickname: 'GX-05a' })));
  gxCases.push(
    runPipelineCase('GX-05b', baseInput({ birthDate: '1990-06-15', country: 'US', timezone: null, nickname: 'GX-05b' })),
  );
  gxCases.push(
    runPipelineCase('GX-06', baseInput({
      birthDate: '1990-06-15',
      birthTime: '23:30:00',
      country: 'US',
      birthplace: 'New York',
      timezone: 'America/New_York',
      nickname: 'GX-06',
    })),
  );

  // GX-07–09
  const gx07 = runPipelineCase('GX-07', baseInput({ birthDate: '1990-02-30', nickname: 'GX-07' }), true);
  gxCases.push(gx07);
  if (gx07.status !== 'error_expected' || gx07.errorCode !== 'M55_COMPOSITE_INVALID_BIRTHDATE') {
    p0Failures.push('GX-07');
  }
  const gx08 = runPipelineCase('GX-08', baseInput({ birthDate: '1899-12-31', nickname: 'GX-08' }), true);
  gxCases.push(gx08);
  if (gx08.status !== 'error_expected' || gx08.errorCode !== 'M55_COMPOSITE_DATE_OUT_OF_RANGE') {
    p0Failures.push('GX-08');
  }
  const gx09 = runPipelineCase('GX-09', baseInput({ birthDate: '2101-01-01', nickname: 'GX-09' }), true);
  gxCases.push(gx09);
  if (gx09.status !== 'error_expected' || gx09.errorCode !== 'M55_COMPOSITE_DATE_OUT_OF_RANGE') {
    p0Failures.push('GX-09');
  }

  // GX-10 legacy stored envelope
  const legacyEnvelope = runDtrEngine({
    birthDate: '1983-02-28',
    nickname: 'Legacy',
    locale: 'ja-JP',
    contextScope: 'dtr',
  });
  const legacyRow: DtrReportSnapshotReadRow = {
    reportInstanceId: 'verify-legacy',
    user_id: 'verify-user',
    product_id: 'DTR_CORE_STATIC_V1',
    checkout_session_id: null,
    profile_snapshot: { nickname: 'Legacy', birthDate: '1983-02-28' },
    draft_snapshot: null,
    envelope_json: legacyEnvelope,
    engine_version: null,
    engine_context_json: null,
  };
  const gx10Read = resolveStoredEnvelopeRead(legacyRow);
  const gx10: GxRow = {
    caseId: 'GX-10',
    status:
      gx10Read.ok &&
      gx10Read.mode === 'legacy' &&
      gx10Read.envelope === legacyEnvelope &&
      gx10Read.envelope.auditMeta.stemLaneIndex === 3 &&
      gx10Read.envelope.auditMeta.stemChar === '丁'
        ? 'pass'
        : 'fail',
    stemLaneIndex: legacyEnvelope.auditMeta.stemLaneIndex,
    stemChar: legacyEnvelope.auditMeta.stemChar,
    notes: gx10Read.ok ? 'stored envelope unchanged (reference equality)' : `read fail: ${!gx10Read.ok && gx10Read.code}`,
  };
  gxCases.push(gx10);
  if (gx10.status !== 'pass') p0Failures.push('GX-10');

  // GX-11 v2 fulfillment payload (local builder — not staging purchase)
  resetCalendarBundleCacheForTests();
  try {
    const built = buildV2FulfillmentSnapshotFromFields({
      nickname: 'golden',
      birthDate: '1983-02-28',
      birthTime: '12:00',
      birthTimeUnknown: false,
      country: 'JP',
      birthplace: '東京都',
      timezone: 'Asia/Tokyo',
    });
    const gx11Ok =
      built.engine_version === ENGINE_VERSION_V2 &&
      built.envelope_json.auditMeta.stemLaneIndex === 9 &&
      built.engine_context_json.stemLaneIndex === 9;
    gxCases.push({
      caseId: 'GX-11',
      status: gx11Ok ? 'pass' : 'fail',
      stemLaneIndex: built.engine_context_json.stemLaneIndex,
      stemChar: built.engine_context_json.stemChar,
      publicTitle: built.envelope_json.payload?.title ?? null,
      notes: 'v2 fulfillment snapshot builder (INSERT contract — no DB)',
    });
    if (!gx11Ok) p0Failures.push('GX-11');
  } catch (e) {
    gxCases.push({
      caseId: 'GX-11',
      status: 'fail',
      errorCode: e instanceof M55CompositeStemError ? e.code : String(e),
    });
    p0Failures.push('GX-11');
  }

  const staticChecks: StaticRow[] = [];
  const coreSrc = readFileSync(join(process.cwd(), 'app/dtr/core/page.tsx'), 'utf8');
  staticChecks.push({
    id: 'R1_no_ssr_runDtrEngine',
    status: coreSrc.includes('runDtrEngine') ? 'fail' : 'pass',
    detail: '/dtr/core must not import runDtrEngine',
  });
  staticChecks.push({
    id: 'R2_resolveStoredEnvelopeRead',
    status: coreSrc.includes('resolveStoredEnvelopeRead') ? 'pass' : 'fail',
    detail: 'stored envelope read path',
  });
  if (staticChecks.some((s) => s.status === 'fail')) {
    p0Failures.push('ROUTE_STATIC');
  }

  const draftSrc = readFileSync(join(process.cwd(), 'lib/m55/dtrDraftDb.ts'), 'utf8');
  const insertOnly =
    !/\.\s*update\s*\(/i.test(draftSrc) && !/\bDELETE\b/i.test(draftSrc) && draftSrc.includes('.insert(');
  staticChecks.push({
    id: 'F3_insert_only',
    status: insertOnly ? 'pass' : 'fail',
    detail: 'dtrDraftDb INSERT-only on snapshots',
  });
  if (!insertOnly) p0Failures.push('SNAPSHOT_MUTATION');

  const incomplete = { nickname: 'A', birthDate: '1990-01-01', country: 'JP' };
  const gate = validateDtrCheckoutProfile(incomplete);
  staticChecks.push({
    id: 'P5_checkout_block',
    status: !gate.ok && gate.code === 'composite_profile_incomplete' ? 'pass' : 'fail',
    detail: 'v2 incomplete profile blocks checkout',
  });
  if (gate.ok) p0Failures.push('CHECKOUT_BYPASS');

  const prevFlag = process.env.M55_COMPOSITE_ENGINE_V2_FULFILLMENT_WRITE_ENABLED;
  delete process.env.M55_COMPOSITE_ENGINE_V2_FULFILLMENT_WRITE_ENABLED;
  staticChecks.push({
    id: 'F1_flag_default_off',
    status: isCompositeV2FulfillmentWriteEnabled() ? 'fail' : 'pass',
    detail: 'fulfillment flag default off',
  });
  if (prevFlag !== undefined) process.env.M55_COMPOSITE_ENGINE_V2_FULFILLMENT_WRITE_ENABLED = prevFlag;

  const complete = enrichBirthProfileForSave({
    nickname: 'A',
    birthDate: '1983-02-28',
    birthTimeUnknown: true,
    country: 'JP',
  });
  const gateOk = validateDtrCheckoutProfile(complete);
  staticChecks.push({
    id: 'P5_complete_profile_ok',
    status: gateOk.ok ? 'pass' : 'fail',
    detail: 'v2 complete profile passes gate',
  });

  let calendarVerifyOk = false;
  let calendarVerifyDetail = '';
  try {
    calendarVerifyDetail = execSync('node scripts/calendar/verify-m55-calendar-bundle.mjs', {
      encoding: 'utf8',
      cwd: process.cwd(),
    }).trim();
    calendarVerifyOk = calendarVerifyDetail.includes('M55_CALENDAR_BUNDLE_VERIFY_OK');
  } catch (e) {
    calendarVerifyDetail = e instanceof Error ? e.message : String(e);
  }
  if (!calendarVerifyOk) p0Failures.push('CALENDAR_VERIFY');

  const verdict = p0Failures.length === 0 ? 'GREEN' : 'RED';

  const out = {
    schema: 'm55-engine-verify-matrix-v1',
    generatedAt: new Date().toISOString(),
    dateTag: DATE_TAG,
    phase: '5Z-I-V-ENGINE-VERIFY-A-EXEC',
    planningCommit: 'b93a776',
    verdict,
    p0Failures,
    calendarVerify: { ok: calendarVerifyOk, summary: calendarVerifyDetail.split('\n')[0] ?? '' },
    gxCases,
    staticChecks,
    commands: {
      calendar: 'node scripts/calendar/verify-m55-calendar-bundle.mjs',
      tests:
        'npx tsx --test lib/m55/compositeStem/pipeline.golden.test.ts lib/m55/compositeStem/fulfillmentWrite.test.ts lib/m55/compositeStem/profileCheckout.test.ts lib/m55/compositeStem/storedEnvelopeRead.test.ts',
      tsc: 'npx tsc --noEmit',
    },
  };

  const outPath = join(
    process.cwd(),
    'docs/audit',
    `ENGINE_VERIFY_MATRIX_RESULTS_${DATE_TAG}.json`,
  );
  writeFileSync(outPath, `${JSON.stringify(out, null, 2)}\n`, 'utf8');
  console.log(`ENGINE_VERIFY_MATRIX_${verdict}`);
  console.log(`wrote: ${outPath}`);
  console.log(`p0Failures: ${p0Failures.length ? p0Failures.join(', ') : 'none'}`);
  if (verdict === 'RED') process.exit(1);
}

main();
