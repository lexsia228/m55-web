/**
 * ENGINE-AUDIT-C — local deterministic matrix (no DB, no deploy).
 * Run: npx tsx scripts/engine-audit-c-matrix.ts
 */
/* Suppress buildCoreResult diagnostic logs on stdout */
console.info = () => {};

import { essenceStemLaneIndex } from '../lib/m55/essenceEngine';
import { buildCoreResult } from '../lib/m55/coreResult/buildCoreResult';
import {
  normalizeBirthContext,
  resolveBoundaryContext,
  runCanonicalCorePipeline,
} from '../lib/m55/coreResult/canonicalBoundary';
import { resolveCorePublicStemDisplay } from '../lib/m55/publicStemDisplay';
import { runDtrEngine } from '../lib/m55/dtrEngine';
import { TEN_STEM_DISPLAY } from '../lib/m55/tenStemCatalog';
import { CORE_TYPE_EN_TAG } from '../components/core/corePublicCopy';

const STEM_CHARS = '甲乙丙丁戊己庚辛壬癸' as const;

/** Mirrors CoreHeroSection HERO_VISUAL_PRESET englishLabel + japaneseTitle (observation trait name). */
const HERO_BY_CORE_TYPE: Record<string, { en: string; traitJa: string }> = {
  TYPE_01: { en: 'PLANNER', traitJa: '堅実構築' },
  TYPE_02: { en: 'MANAGER', traitJa: '協調支援' },
  TYPE_03: { en: 'CREATOR', traitJa: '発想跳躍' },
  TYPE_04: { en: 'ANALYST', traitJa: '静観分析' },
  TYPE_05: { en: 'DESIGNER', traitJa: '調整均衡' },
  TYPE_06: { en: 'PRESIDENT', traitJa: '直観展開' },
  TYPE_07: { en: 'EXECUTOR', traitJa: '精密遂行' },
  TYPE_08: { en: 'INFLUENCER', traitJa: '熱量先導' },
  TYPE_09: { en: 'GLOBAL_LEADER', traitJa: '越境接続' },
  TYPE_10: { en: 'PRODUCER', traitJa: '安定育成' },
};

type CaseInput = {
  id: string;
  birthDate: string;
  birthTime?: string | null;
  country?: string | null;
  birthplace?: string | null;
  note: string;
  expectError?: boolean;
};

const MATRIX: CaseInput[] = [
  { id: 'VC-01', birthDate: '1983-02-28', note: 'golden anchor' },
  { id: 'VC-02a', birthDate: '2024-02-03', note: '節入り境界・前日（civil）' },
  { id: 'VC-02b', birthDate: '2024-02-04', note: '節入り境界・当日（civil）' },
  { id: 'VC-02c', birthDate: '2024-02-05', note: '節入り境界・翌日（civil）' },
  { id: 'VC-03a', birthDate: '2024-01-11', note: '旧暦想定代表①（civil only）' },
  { id: 'VC-03b', birthDate: '2024-02-10', note: '旧暦想定代表②（civil only）' },
  { id: 'VC-04a', birthDate: '1990-06-15', birthTime: null, note: 'birthTime なし（noon fallback）' },
  { id: 'VC-04b', birthDate: '1990-06-15', birthTime: '03:30', note: 'birthTime あり・子初前' },
  { id: 'VC-04c', birthDate: '1990-06-15', birthTime: '12:00', note: 'birthTime あり・正午' },
  { id: 'VC-05a', birthDate: '1990-06-15', country: 'JP', note: 'timezone JP' },
  { id: 'VC-05b', birthDate: '1990-06-15', country: 'US', note: 'timezone UTC' },
  { id: 'VC-06', birthDate: '1990-06-15', country: 'US', birthplace: 'New York', note: '海外出生地' },
  { id: 'VC-07a', birthDate: '2016-02-29', note: 'leap day valid' },
  { id: 'VC-07b', birthDate: '1990-02-30', note: 'invalid date', expectError: true },
  { id: 'VC-08', birthDate: '1992-12-19', note: 'regression seed 1992' },
  { id: 'VC-09', birthDate: '2000-01-01', note: 'spotcheck Y2K' },
];

type Row = {
  id: string;
  note: string;
  birthDate: string;
  inputsUsed: string[];
  inputsIgnored: string[];
  stemLaneIndex: number | null;
  stemChar: string | null;
  boundary: {
    fallbackMode: string | null;
    timezoneUsed: string | null;
    solarTermBoundary: string | null;
    lunarBoundary: string | null;
  } | null;
  core: {
    coreType: string;
    coreLabel: string;
    heroEn: string;
    heroTraitJa: string;
    coreTypeEnTag: string;
  } | null;
  dtr: {
    publicTitle: string;
    stemChar: string;
    engineVersion: string;
    auditDerivation: string;
  } | null;
  fulfillmentSameAsDtr: boolean | null;
  labelMismatch: string;
  error: string | null;
};

function classifyMismatch(lane: number, corePublicTitle: string, paidTitle: string): string {
  if (corePublicTitle !== paidTitle) return 'core_public_title_vs_paid_diverge';
  return 'none';
}

function runCase(c: CaseInput): Row {
  const inputsUsed = ['birthDate'];
  const inputsIgnored = ['nickname', 'locale', 'contextScope', 'nowDate'];
  if (c.birthTime != null) inputsUsed.push('birthTime');
  else inputsIgnored.push('birthTime');
  if (c.country != null) inputsUsed.push('country');
  else inputsIgnored.push('country');
  if (c.birthplace != null) inputsUsed.push('birthplace');
  else inputsIgnored.push('birthplace');
  inputsIgnored.push('節入り', '旧暦', 'lunar_calendar', 'solar_term_table');

  try {
    const lane = essenceStemLaneIndex(c.birthDate);
    const stemChar = STEM_CHARS[lane] ?? '?';

    const pipeline = runCanonicalCorePipeline({
      birthDate: c.birthDate,
      birthTime: c.birthTime ?? undefined,
      country: c.country ?? undefined,
      birthplace: c.birthplace ?? undefined,
    });

    const core = buildCoreResult({
      nickname: 'Matrix',
      birthDate: c.birthDate,
    });

    const corePublicTitle = resolveCorePublicStemDisplay(core).publicTitle;

    const hero = HERO_BY_CORE_TYPE[core.coreType] ?? {
      en: CORE_TYPE_EN_TAG[core.coreType] ?? core.coreType,
      traitJa: core.coreLabel,
    };

    const dtr = runDtrEngine({
      birthDate: c.birthDate,
      nickname: 'Matrix',
      locale: 'ja-JP',
      contextScope: 'dtr',
    });

    const paidTitle = TEN_STEM_DISPLAY[lane]!.publicTitle;
    const mismatch = classifyMismatch(lane, corePublicTitle, paidTitle);

    const normalized = normalizeBirthContext({
      birthDate: c.birthDate,
      birthTime: c.birthTime ?? undefined,
      country: c.country ?? undefined,
      birthplace: c.birthplace ?? undefined,
    });
    const boundary = resolveBoundaryContext(normalized);

    const fulfillmentSame =
      dtr.auditMeta.stemLaneIndex === lane &&
      dtr.auditMeta.stemChar === stemChar &&
      dtr.engineVersion === 'dtr-v1-jdn-day-stem-provisional';

    return {
      id: c.id,
      note: c.note,
      birthDate: c.birthDate,
      inputsUsed,
      inputsIgnored,
      stemLaneIndex: lane,
      stemChar,
      boundary: {
        fallbackMode: boundary.fallbackMode,
        timezoneUsed: boundary.timezoneUsed,
        solarTermBoundary: boundary.solarTermBoundary,
        lunarBoundary: boundary.lunarBoundary,
      },
      core: {
        coreType: core.coreType,
        coreLabel: core.coreLabel,
        heroEn: hero.en,
        heroTraitJa: hero.traitJa,
        coreTypeEnTag: CORE_TYPE_EN_TAG[core.coreType] ?? '',
      },
      dtr: {
        publicTitle: paidTitle,
        stemChar: dtr.auditMeta.stemChar,
        engineVersion: dtr.engineVersion,
        auditDerivation: dtr.auditMeta.derivation,
      },
      fulfillmentSameAsDtr: fulfillmentSame,
      labelMismatch: mismatch,
      error: null,
    };
  } catch (e) {
    if (c.expectError) {
      return {
        id: c.id,
        note: c.note,
        birthDate: c.birthDate,
        inputsUsed,
        inputsIgnored,
        stemLaneIndex: null,
        stemChar: null,
        boundary: null,
        core: null,
        dtr: null,
        fulfillmentSameAsDtr: null,
        labelMismatch: 'invalid_input_rejected',
        error: e instanceof Error ? e.message : String(e),
      };
    }
    return {
      id: c.id,
      note: c.note,
      birthDate: c.birthDate,
      inputsUsed,
      inputsIgnored,
      stemLaneIndex: null,
      stemChar: null,
      boundary: null,
      core: null,
      dtr: null,
      fulfillmentSameAsDtr: null,
      labelMismatch: 'engine_error',
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

const rows = MATRIX.map(runCase);

/** Pairs where only birthTime/country differ — stem must match. */
function stemStableAcrossVariants(baseDate: string, variants: string[]): boolean {
  const base = rows.find((r) => r.birthDate === baseDate && r.stemLaneIndex != null);
  if (!base) return false;
  return variants.every((id) => {
    const r = rows.find((x) => x.id === id);
    return r?.stemLaneIndex === base.stemLaneIndex;
  });
}

const stemStable1990 =
  stemStableAcrossVariants('1990-06-15', ['VC-04a', 'VC-04b', 'VC-04c', 'VC-05a', 'VC-05b', 'VC-06']);

const boundaryDiffers =
  rows.find((r) => r.id === 'VC-05a')?.boundary?.timezoneUsed === 'Asia/Tokyo' &&
  rows.find((r) => r.id === 'VC-05b')?.boundary?.timezoneUsed === 'UTC';

const solarDiffers =
  rows.find((r) => r.id === 'VC-04a')?.boundary?.fallbackMode !==
  rows.find((r) => r.id === 'VC-04b')?.boundary?.fallbackMode;

const summary = {
  matrixVersion: 'ENGINE-AUDIT-C-2026-05-21',
  caseCount: rows.length,
  vc01: rows.find((r) => r.id === 'VC-01'),
  stemStable1990,
  boundaryTimezoneDiffers: boundaryDiffers,
  boundaryFallbackDiffers: solarDiffers,
  allFulfillmentSameAsDtr: rows.every((r) => r.fulfillmentSameAsDtr !== false),
  labelMismatchCount: rows.filter((r) => r.labelMismatch !== 'none').length,
};

// eslint-disable-next-line no-console -- audit script output
console.error('[engine-audit-c] matrix complete');
process.stdout.write(`${JSON.stringify({ summary, rows }, null, 2)}\n`);
