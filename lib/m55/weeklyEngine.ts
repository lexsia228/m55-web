/**
 * M55_CANONICAL_IO_CONTRACT — contextScope = weekly
 * Deterministic for same birthDate + nowDate + nickname + locale.
 * Public copy: calm weekly rhythm; no fortune filler (PAGE_OUTPUT_MAPPING).
 */
import { TEN_STEM_DISPLAY } from './tenStemCatalog';
import { essenceStemLaneIndex, gregorianToJdn } from './essenceEngine';

export type WeeklyCanonicalInput = {
  birthDate: string;
  nickname: string;
  locale: string;
  nowDate: string;
  contextScope: 'weekly';
};

export type WeeklyPayload = {
  heading: string;
  weeklyKey: string;
  lines: string[];
  focusAreas: string[];
  nextBridge: string;
  rawSignals: string[];
  freeVisible: boolean;
  dtrExpandable: boolean;
};

export type WeeklyAuditMeta = {
  nowJdn: number;
  stemLaneIndex: number;
};

export type WeeklyEnvelope = {
  contractVersion: string;
  engineVersion: string;
  contextScope: 'weekly';
  generatedAt: string;
  seedFingerprint: string;
  freeVisible: boolean;
  dtrExpandable: boolean;
  payload: WeeklyPayload;
  auditMeta: WeeklyAuditMeta;
};

function parseYmd(iso: string): [number, number, number] {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) throw new Error('M55_WEEKLY_INVALID_DATE');
  const [ys, ms, ds] = iso.split('-').map(Number);
  const t = Date.UTC(ys, ms - 1, ds);
  const u = new Date(t);
  if (u.getUTCFullYear() !== ys || u.getUTCMonth() !== ms - 1 || u.getUTCDate() !== ds) {
    throw new Error('M55_WEEKLY_INVALID_DATE');
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

function pickConsecutive3(pool: string[], stemLane: number, nowJdn: number, maxLen: number): string[] {
  const n = pool.length;
  const start = (stemLane * 11 + nowJdn) % n;
  return [0, 1, 2].map((i) => clamp(pool[(start + i) % n]!, maxLen));
}

const LINE_POOL = [
  '優先テーマを三つ以内に並べ直す。',
  '関係の距離感を一度だけ見直す。',
  '睡眠と食事のリズムを整える。',
  '通知と会議の境界を短く決める。',
  '小さな完了を週に三つ積む。',
  '読みかけを一つだけ終える。',
];

const FOCUS_POOL = ['整理', '接続', '持続', '余白', '優先', '完了', '振り返り'];

const KEY_POOL = [
  '今週は整えて進む週です。',
  '今週は距離感を調整しやすい週です。',
  '今週は優先順位を短く保ちやすい週です。',
  '今週は質を上げるより、抜けを減らす週です。',
  '今週は小さな完了を積み上げやすい週です。',
];

const BRIDGE_POOL = [
  '長い流れは保存版で静かに整理できます。',
  '続きの見取りは4章の保存版で補えます。',
  '週の外の流れは保存版に任せて、今週は手元だけ整えます。',
];

export function runWeeklyEngine(input: WeeklyCanonicalInput): WeeklyEnvelope {
  if (input.contextScope !== 'weekly') throw new Error('M55_WEEKLY_SCOPE');

  const [ny, nm, nd] = parseYmd(input.nowDate);
  const nowJdn = gregorianToJdn(ny, nm, nd);
  const stemLane = essenceStemLaneIndex(input.birthDate);
  const stem = TEN_STEM_DISPLAY[stemLane]!;

  const heading = clamp(`今週の焦点｜${stem.symbol}`, 40);

  const keyIdx = (stemLane * 19 + nowJdn) % KEY_POOL.length;
  const weeklyKey = clamp(KEY_POOL[keyIdx]!, 100);

  const lines = pickConsecutive3(LINE_POOL, stemLane, nowJdn, 120);

  const fs = (stemLane * 17 + nowJdn + 3) % FOCUS_POOL.length;
  const focusAreas = [0, 1, 2].map((i) => clamp(FOCUS_POOL[(fs + i) % FOCUS_POOL.length]!, 40));

  const brIdx = (stemLane * 23 + nowJdn) % BRIDGE_POOL.length;
  const nextBridge = clamp(BRIDGE_POOL[brIdx]!, 60);

  const rawSignals = [`weekly_lane_${stemLane}_jdn_${nowJdn % 10000}`, 'weekly_v1'];

  const canonical = JSON.stringify({
    birthDate: input.birthDate,
    nickname: input.nickname,
    locale: input.locale,
    nowDate: input.nowDate,
    contextScope: input.contextScope,
  });

  const payload: WeeklyPayload = {
    heading,
    weeklyKey,
    lines,
    focusAreas,
    nextBridge,
    rawSignals,
    freeVisible: true,
    dtrExpandable: true,
  };

  return {
    contractVersion: 'v1',
    engineVersion: 'logic-v1-weekly-stem-nowdate-provisional',
    contextScope: 'weekly',
    generatedAt: new Date().toISOString(),
    seedFingerprint: `weekly:${stemLane}:${nowJdn}:djb2:${djb2(canonical)}`,
    freeVisible: true,
    dtrExpandable: true,
    payload,
    auditMeta: {
      nowJdn,
      stemLaneIndex: stemLane,
    },
  };
}
