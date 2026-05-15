/**
 * M55_CANONICAL_IO_CONTRACT — contextScope = today
 * Deterministic for same birthDate + nowDate + nickname + locale.
 * No fortune-site filler; calm observation copy (PAGE_OUTPUT_MAPPING + LAYER3 tone).
 */
import { TEN_STEM_DISPLAY } from './tenStemCatalog';
import {
  gregorianToJdn,
  essenceStemLaneIndex,
  jdnDayStemIndex,
} from './essenceEngine';

export type TodayCanonicalInput = {
  birthDate: string;
  nickname: string;
  locale: string;
  nowDate: string;
  contextScope: 'today';
};

export type TodayPayload = {
  heading: string;
  summaryShort: string;
  focus: string;
  step: string;
  bridgeToTomorrow: string;
  rawSignals: string[];
  freeVisible: boolean;
  dtrExpandable: boolean;
};

export type TodayAuditMeta = {
  birthJdn: number;
  nowJdn: number;
  stemLaneIndex: number;
};

export type TodayEnvelope = {
  contractVersion: string;
  engineVersion: string;
  contextScope: 'today';
  generatedAt: string;
  seedFingerprint: string;
  freeVisible: boolean;
  dtrExpandable: boolean;
  payload: TodayPayload;
  auditMeta: TodayAuditMeta;
};

function assertIso(iso: string): void {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) throw new Error('M55_TODAY_INVALID_DATE');
}

function parseYmd(iso: string): [number, number, number] {
  assertIso(iso);
  const [ys, ms, ds] = iso.split('-').map(Number);
  const t = Date.UTC(ys, ms - 1, ds);
  const u = new Date(t);
  if (u.getUTCFullYear() !== ys || u.getUTCMonth() !== ms - 1 || u.getUTCDate() !== ds) {
    throw new Error('M55_TODAY_INVALID_DATE');
  }
  return [ys, ms, ds];
}

function clamp(s: string, max: number): string {
  const t = s.trim();
  if (t.length <= max) return t;
  return t.slice(0, max - 1) + '…';
}

function djb2(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  return h.toString(16).padStart(8, '0');
}

/** Deterministic pick from a small calm pool (not divination). */
function lanePick(stemLane: number, nowJdn: number, pool: string[], maxLen: number): string {
  const i = (stemLane * 17 + nowJdn) % pool.length;
  return clamp(pool[i]!, maxLen);
}

const FOCUS_POOL = [
  'いま目の前の一点に意識を置きやすい日です。',
  '優先順位を短く並べ直すのに向いています。',
  '細部の質を整えるのに適した日です。',
  '関係の距離感を静かに見直しやすい日です。',
  'ペースを落として確認するのに向いています。',
];

const STEP_POOL = [
  'まず一つだけ、小さく完了させる。',
  '今日の目的を一文で書き出す。',
  '通知を一度止めて、最初の一手だけ決める。',
  '誰に相談するか、一人だけ決める。',
  '10分だけ、準備だけ整える。',
];

const BRIDGE_POOL = [
  '明日も、短い一行で見直せます。',
  '明日は流れを軽く確認できます。',
  '明日に備えて、今日は余白を残しておく。',
  '明日の見方は、また少しだけ変わります。',
];

export function runTodayEngine(input: TodayCanonicalInput): TodayEnvelope {
  if (input.contextScope !== 'today') throw new Error('M55_TODAY_SCOPE');

  const [by, bm, bd] = parseYmd(input.birthDate);
  const [ny, nm, nd] = parseYmd(input.nowDate);
  const birthJdn = gregorianToJdn(by, bm, bd);
  const nowJdn = gregorianToJdn(ny, nm, nd);
  const stemLane = essenceStemLaneIndex(input.birthDate);
  const stem = TEN_STEM_DISPLAY[stemLane]!;

  const nick = input.nickname.trim() || 'ゲスト';

  const heading = clamp(`今日の見方｜${stem.symbol}`, 40);

  const summaryShort = clamp(
    `${nick}さん向けの今日の整理です。${stem.displayOneLine}の延長線で、いまは観測を短く整えやすい日です。`,
    180
  );

  const focus = lanePick(stemLane, nowJdn, FOCUS_POOL, 80);
  const step = lanePick(stemLane, nowJdn + 1, STEP_POOL, 80);
  const bridgeToTomorrow = lanePick(stemLane, nowJdn + 2, BRIDGE_POOL, 60);

  const rawSignals = [
    `today_lane_${stemLane}_now_${nowJdn % 1000}`,
    `today_signal_${jdnDayStemIndex(nowJdn)}`,
    'today_v1',
  ];

  const canonical = JSON.stringify({
    birthDate: input.birthDate,
    nickname: input.nickname,
    locale: input.locale,
    nowDate: input.nowDate,
    contextScope: input.contextScope,
  });

  const payload: TodayPayload = {
    heading,
    summaryShort,
    focus,
    step,
    bridgeToTomorrow,
    rawSignals,
    freeVisible: true,
    dtrExpandable: true,
  };

  return {
    contractVersion: 'v1',
    engineVersion: 'logic-v1-today-stem-nowdate-provisional',
    contextScope: 'today',
    generatedAt: new Date().toISOString(),
    seedFingerprint: `today:${stemLane}:${nowJdn}:djb2:${djb2(canonical)}`,
    freeVisible: true,
    dtrExpandable: true,
    payload,
    auditMeta: {
      birthJdn,
      nowJdn,
      stemLaneIndex: stemLane,
    },
  };
}
