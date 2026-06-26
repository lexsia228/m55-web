import {
  applyM55ConsultReplyQualityPasses,
  repairConsultReplyGrammarArtifacts,
} from '../ai/m55ConsultReplyQualitySanitizer';

/** Pre-pass: repair already-broken legacy display artifacts before quality passes. */
const DISPLAY_PRE_REPAIR: [string, string][] = [
  ['和らげるする手助け', '和らげる手がかり'],
  ['手がかり手助け', '手がかり'],
  ['短い短い往復', '短いやりとり'],
  ['短い往復', '短いやりとり'],
  ['組み直しする', '少し組み直す'],
  ['和らげるする', '和らげる'],
  ['短い休息する', '少し休む'],
  ['ことがここに意識を向けると見えやすくなります', '最初の手がかりになります'],
  ['ことがここを手がかりに見ると整理しやすいです', '最初の手がかりになります'],
  ['ことがを', 'ことを'],
];

function applyDisplayPreRepair(raw: string): string {
  let out = raw;
  for (const [from, to] of DISPLAY_PRE_REPAIR) {
    if (!out.includes(from)) continue;
    out = out.split(from).join(to);
  }
  return out;
}

/**
 * Display-only cleanup for stored consult replies (legacy pre-patch generations).
 * Does not mutate DB or regenerate content.
 */
export function normalizeConsultReplyDisplayText(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return trimmed;
  const pre = applyDisplayPreRepair(trimmed);
  const passed = applyM55ConsultReplyQualityPasses(pre);
  return repairConsultReplyGrammarArtifacts(passed.text);
}
