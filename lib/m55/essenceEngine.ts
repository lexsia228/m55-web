/**
 * Layer2-shaped essence output (M55_CANONICAL_IO_CONTRACT_SSOT_v1).
 * Deterministic: same canonical input -> same payload fields (except generatedAt on envelope).
 *
 * Day heavenly stem (天干 index 0=甲..9=癸):
 * — Provisional implementation: Gregorian civil date -> JDN -> (jdn + OFFSET) mod 10.
 * — OFFSET=9 is a logic candidate aligned with common perpetual-calendar spot checks; it is
 *   not asserted as immutable M55 primary law. Freeze requires re-audit against golden + calendar SSOT.
 *
 * birthTime/timezone are not in canonical input; one civil YYYY-MM-DD maps to one JDN.
 *
 * /core public stem title and image use `resolveCoreStemAuthority` (m55-composite-stem-v2).
 * Do not use `essenceStemLaneIndex` for Core hero display or locked-shelf parity.
 */
import { TEN_STEM_DISPLAY, type TenStemDisplay } from './tenStemCatalog';

/** Provisional stem derivation id (audit / migration). */
export const STEM_DERIVATION_PROVISIONAL_ID = 'jdn_offset_provisional_v1' as const;

/** Offset mod 10 applied to JDN for day-stem lane (provisional). */
export const STEM_JDN_OFFSET_MOD10 = 9;

export type EssenceCanonicalInput = {
  birthDate: string;
  nickname: string;
  locale: string;
  nowDate: string;
  contextScope: 'essence';
};

export type EssencePayload = {
  summaryShort: string;
  keywords: string[];
  focusAreas: string[];
  rawTraits: string[];
  freeVisible: boolean;
  dtrExpandable: boolean;
};

/** Internal audit only — not for public UI; omit from display mappers. */
export type EssenceAuditMeta = {
  jdn: number;
  stemLaneIndex: number;
  stemDerivation: typeof STEM_DERIVATION_PROVISIONAL_ID;
  offsetMod10: typeof STEM_JDN_OFFSET_MOD10;
};

export type EssenceEnvelope = {
  contractVersion: string;
  engineVersion: string;
  contextScope: 'essence';
  generatedAt: string;
  seedFingerprint: string;
  freeVisible: boolean;
  dtrExpandable: boolean;
  payload: EssencePayload;
  auditMeta: EssenceAuditMeta;
};

function assertIsoDate(iso: string): void {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    throw new Error('M55_ESSENCE_INVALID_BIRTHDATE');
  }
}

/** Gregorian calendar civil date -> Julian Day Number (integer). */
export function gregorianToJdn(year: number, month: number, day: number): number {
  const a = Math.floor((14 - month) / 12);
  const y = year + 4800 - a;
  const m = month + 12 * a - 3;
  return (
    day +
    Math.floor((153 * m + 2) / 5) +
    365 * y +
    Math.floor(y / 4) -
    Math.floor(y / 100) +
    Math.floor(y / 400) -
    32045
  );
}

function parseAndValidateIso(iso: string): [number, number, number] {
  assertIsoDate(iso);
  const [ys, ms, ds] = iso.split('-');
  const y = Number(ys);
  const m = Number(ms);
  const d = Number(ds);
  const t = Date.UTC(y, m - 1, d);
  const ud = new Date(t);
  if (ud.getUTCFullYear() !== y || ud.getUTCMonth() !== m - 1 || ud.getUTCDate() !== d) {
    throw new Error('M55_ESSENCE_INVALID_BIRTHDATE');
  }
  return [y, m, d];
}

/**
 * Heavenly stem index 0..9 (甲=0 … 癸=9).
 * Provisional: JDN + offset mod 10 — Layer3 maps index to professional titles (TEN_STEM SSOT).
 */
export function jdnDayStemIndex(jdn: number): number {
  return ((jdn + STEM_JDN_OFFSET_MOD10) % 10 + 10) % 10;
}

export function essenceStemLaneIndex(iso: string): number {
  const [y, m, d] = parseAndValidateIso(iso);
  const jdn = gregorianToJdn(y, m, d);
  return jdnDayStemIndex(jdn);
}

function djb2Fingerprint(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  }
  return `djb2:${h.toString(16).padStart(8, '0')}`;
}

/** Fingerprint: input identity + stem lane (no JDN in string — JDN lives in auditMeta only). */
function fingerprintInput(input: EssenceCanonicalInput, stemIdx: number): string {
  const canonical = JSON.stringify({
    birthDate: input.birthDate,
    nickname: input.nickname,
    locale: input.locale,
    nowDate: input.nowDate,
    contextScope: input.contextScope,
  });
  return `stemlane:${stemIdx}:${djb2Fingerprint(canonical)}`;
}

function clampSummary(s: string, max: number): string {
  const t = s.trim();
  if (t.length <= max) return t;
  return t.slice(0, max - 1) + '…';
}

function buildSummaryShort(nickname: string, stem: TenStemDisplay): string {
  const name = nickname.trim() || 'ゲスト';
  const base = `${name}さんの観測では、「${stem.publicTitle}（${stem.symbol}）」に近い立ち位置として、${stem.displayOneLine}`;
  return clampSummary(base, 160);
}

/** Strip non-deterministic envelope fields for equality checks. */
function stablePayloadJson(p: EssencePayload): string {
  return JSON.stringify(p);
}

/**
 * Same input -> same raw payload (determinism check). Ignores generatedAt.
 */
export function assertEssencePayloadDeterminism(input: EssenceCanonicalInput): boolean {
  const a = runEssenceEngine(input);
  const b = runEssenceEngine(input);
  return stablePayloadJson(a.payload) === stablePayloadJson(b.payload) && a.auditMeta.jdn === b.auditMeta.jdn;
}

export type SpotcheckRow = {
  birthDate: string;
  nickname: string;
  stemLaneIndex: number;
  stemChar: string;
  jdn: number;
  determinismPass: boolean;
};

/**
 * Golden + additional spot-checks (engine self-test). Safe to call from CI.
 */
export function runEssenceSpotcheck(): { ok: boolean; rows: SpotcheckRow[] } {
  const stems = '甲乙丙丁戊己庚辛壬癸';
  const cases: EssenceCanonicalInput[] = [
    {
      birthDate: '1983-02-28',
      nickname: 'T',
      locale: 'ja-JP',
      nowDate: '2026-01-01',
      contextScope: 'essence',
    },
    {
      birthDate: '2000-01-01',
      nickname: 'Spot',
      locale: 'ja-JP',
      nowDate: '2026-01-01',
      contextScope: 'essence',
    },
    {
      birthDate: '2016-02-29',
      nickname: 'Leap',
      locale: 'ja-JP',
      nowDate: '2026-01-01',
      contextScope: 'essence',
    },
    {
      birthDate: '2026-03-25',
      nickname: 'X',
      locale: 'ja-JP',
      nowDate: '2026-03-25',
      contextScope: 'essence',
    },
  ];

  const rows: SpotcheckRow[] = [];
  for (const input of cases) {
    const det = assertEssencePayloadDeterminism(input);
    const env = runEssenceEngine(input);
    const idx = env.auditMeta.stemLaneIndex;
    rows.push({
      birthDate: input.birthDate,
      nickname: input.nickname,
      stemLaneIndex: idx,
      stemChar: stems[idx]!,
      jdn: env.auditMeta.jdn,
      determinismPass: det,
    });
  }

  const ok = rows.every((r) => r.determinismPass);
  return { ok, rows };
}

export function runEssenceEngine(input: EssenceCanonicalInput): EssenceEnvelope {
  const [y, m, d] = parseAndValidateIso(input.birthDate);
  const jdn = gregorianToJdn(y, m, d);
  const idx = jdnDayStemIndex(jdn);
  const stem = TEN_STEM_DISPLAY[idx]!;

  const keywords = [...stem.keywordPool].slice(0, 4);
  const focusAreas = [...stem.focusPool].slice(0, 4);

  const payload: EssencePayload = {
    summaryShort: buildSummaryShort(input.nickname, stem),
    keywords,
    focusAreas,
    rawTraits: [`stem_${stem.stemChar}`, `stem_lane_${idx}`, 'essence_v1'],
    freeVisible: true,
    dtrExpandable: true,
  };

  const auditMeta: EssenceAuditMeta = {
    jdn,
    stemLaneIndex: idx,
    stemDerivation: STEM_DERIVATION_PROVISIONAL_ID,
    offsetMod10: STEM_JDN_OFFSET_MOD10,
  };

  return {
    contractVersion: 'v1',
    engineVersion: 'logic-v1-jdn-day-stem-provisional',
    contextScope: 'essence',
    generatedAt: new Date().toISOString(),
    seedFingerprint: fingerprintInput(input, idx),
    freeVisible: true,
    dtrExpandable: true,
    payload,
    auditMeta,
  };
}
