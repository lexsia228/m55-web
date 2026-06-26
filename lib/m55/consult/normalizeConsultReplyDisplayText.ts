import {
  applyM55ConsultReplyQualityPasses,
  limitConsultReplyPhraseOccurrences,
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
  ['少し視点を変えて少し視点を変えてみる', '少し視点を変えてみる'],
];

/** Display-only naturalness repairs after sanitizer/grammar passes. */
const DISPLAY_NATURALNESS_REPAIRS: [string, string][] = [
  [
    '短くやりとりする機会を作る最初の手がかりになります',
    '短くやりとりする機会を作ると、整理しやすくなります',
  ],
  [
    '自分自身の感情に目を向ける最初の手がかりになります',
    'まずは、自分の気持ちに目を向けてみてください',
  ],
  [
    'その感覚に気づく最初の手がかりになります',
    'その感覚に気づくことが、最初の手がかりになります',
  ],
  [
    '確認する最初の手がかりになります',
    '確認してみると、今の進め方を整えやすくなります',
  ],
  ['少し視点を変えて少し視点を変えてみる', '少し視点を変えてみる'],
  ['言葉や行動で伝えることに得意なあなた', '言葉や行動で伝えることが得意なあなた'],
  ['自分を責めやすい状態の感情', '自分を責めやすい気持ち'],
  ['無理となっているようです', 'しんどさにつながっているようです'],
  ['コミュニケーションを意識的に増やし', '短いやりとりを少し増やし'],
  ['コミュニケーションを意識的に増やす', '短いやりとりを少し増やす'],
  ['休息の時間を設定して', '少し休む時間を作って'],
  ['休息の時間を設定', '少し休む時間を作る'],
  ['効果的に届く', '届きやすくなる'],
  ['高いエネルギー', '強く動く力'],
  ['疲労感', '疲れ'],
  ['試みてください', '試してみてください'],
  ['作るして', '作って'],
  ['周囲の反応を意識し、意識して、', '周囲の反応を見ながら、'],
  ['周囲の反応を意識し、意識して', '周囲の反応を見ながら、'],
  ['まずまずは', 'まずは'],
  ['少し休む時間を作るし', '少し休む時間を作り'],
  ['届きやすくなるようになります', '届きやすくなります'],
  ['より届きやすくなる', '届きやすくなる'],
];

const FIRST_HANDGRIP_PHRASE = '最初の手がかりになります';
const FIRST_HANDGRIP_MAX = 2;
const FIRST_HANDGRIP_OVERFLOW = '整理しやすくなります';

function applyReplacementList(text: string, rules: [string, string][]): string {
  let out = text;
  for (const [from, to] of rules) {
    if (!out.includes(from)) continue;
    out = out.split(from).join(to);
  }
  return out;
}

function applyDisplayPreRepair(raw: string): string {
  return applyReplacementList(raw, DISPLAY_PRE_REPAIR);
}

function repairConsultReplyDisplayNaturalness(text: string): string {
  let out = applyReplacementList(text, DISPLAY_NATURALNESS_REPAIRS);
  out = limitConsultReplyPhraseOccurrences(
    out,
    FIRST_HANDGRIP_PHRASE,
    FIRST_HANDGRIP_MAX,
    FIRST_HANDGRIP_OVERFLOW,
  );
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
  const grammar = repairConsultReplyGrammarArtifacts(passed.text);
  return repairConsultReplyDisplayNaturalness(grammar);
}
