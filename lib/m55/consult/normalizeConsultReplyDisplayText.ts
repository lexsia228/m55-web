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
  // Repair sanitizer_grammar_splice artifact: stored reply から ことが必要です → 整理しやすくなります 置換後の splice
  ['工夫する整理しやすくなります', '工夫することで、整理しやすくなります'],
  // Repair kamo_shirenai_overflow_fusion artifact: なる + なりやすいです 融合
  ['なるなりやすいです', 'なることが多いです'],
  ['なるなりやすい', 'なることが多い'],
  // 自己評価が低下し forms not covered by existing sanitizer rules (形容詞連用形など)
  ['自己評価が低下しやすく', '自分を責める方向に寄りやすく'],
  ['自己評価が低下して', '自分を責める気持ちが強くなり'],
  ['自己評価が低下し、', '自分を責める気持ちが強くなり、'],
  // Exact-form 考慮 display repairs: 動詞語尾を含めてマッチすることで 見るすると 融合を防ぐ
  ['相手の状況や心情を考慮することも', '相手が返しやすい状態かを見ることも'],
  ['相手の状況や心情を考慮する', '相手が返しやすい状態かを見る'],
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
  ['場面です、特に', '場面です。特に'],
  ['この流れが重なるといる', 'この流れが重なると'],
  ['です、この流れ', 'です。この流れ'],
  ['これらの背景が影響して', 'この流れが重なると'],
  ['これらの背景が影響していることが多いです', 'この流れが重なることが多いです'],
  ['この流れが重なるとことが', 'この流れが重なることが'],
  ['見方の補助線', '見直すときの目印'],
  [
    'いましんどさが出やすいのは、たとえばこんな場面です。特に「燃焼後の急な落差」や「受け取ってもらえないときの疲れがたまる」が挙げられます。',
    'いましんどさが出やすいのは、たとえば「燃焼後の急な落差」や「受け取ってもらえないときの疲れがたまる」が重なる場面です。',
  ],
  ['より良い反応', '返しやすい反応'],
  ['相手との関係性を再確認する', '相手との距離感を見直す'],
  // 今日の一手 awkward phrase: お勧めします sanitizer artifact が ことを+まずはここから に splice された形
  ['ことをまずはここからで十分です', 'ことです。まずはここからで十分です'],
  // Stored reply human-reported residual phrases
  ['距離感を見直し、相手との距離感を見直すことで', '今の距離感を少し見直すことで'],
  ['返しやすい反応を引き出すことが選び直しやすくなる', '相手が返しやすい形に整えやすくなる'],
];

/** Display-only repairs scoped to 今日の一手 body (stored legacy replies). */
const TODAY_STEP_DISPLAY_REPAIRS: [string, string][] = [
  [
    '相手が10秒で返せる確認を1つ送ることをまずはここからで十分です。',
    '今日の一手は、相手が10秒で返せる確認を1つ送ることです。まずはここからで十分です。',
  ],
  [
    '今日の一手としては、まず周囲との短いやりとりを少し増やすことを試してみてください。具体的には、短いフィードバックを求める形で話し合いを持ち、自分の発信がどのように受け取られているかを確認してみると、今の進め方を整えやすくなります。また、疲れを感じた際には、少し休む時間を作り、今日は一段小さく休むことも試してみてください。最後に、保存版の内容を再度読み返し、どのように自分の進め方を整えるかを考えてみてください。',
    '今日の一手としては、相手が短く返せる確認を1つ送ってみることです。たとえば「ここまで進めています。方向だけ、OKか修正ありで教えてください」と聞いてみてください。疲れを感じたら、今日は一段小さく休むことも十分な一歩です。',
  ],
  ['最後に、保存版の内容を再度読み返し、どのように自分の進め方を整えるかを考えてみてください。', ''],
  ['最後に、保存版の内容を再度読み返し、', ''],
  ['保存版の内容を再度読み返し、どのように自分の進め方を整えるかを考えてみてください。', ''],
  ['保存版の内容を再度読み返し、', ''],
  ['どのように自分の進め方を整えるかを考えてみてください。', ''],
  ['保存版の章を読み返し、どのように自分の進め方を整えるかを考えてみてください。', ''],
  ['保存版の章を読み返す問いを1文入れる', ''],
];

const TODAY_STEP_STRIP_PATTERNS: RegExp[] = [
  /最後に、保存版(?:の内容|の章)?を(?:再度)?読み返し[^。]*。/g,
  /保存版(?:の内容|の章)?を(?:再度)?読み返し[^。]*。/g,
  /どのように自分の進め方を整えるかを考えてみてください。/g,
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

function stripTodayStepSavedReportReread(text: string): string {
  let out = text;
  for (const pattern of TODAY_STEP_STRIP_PATTERNS) {
    out = out.replace(pattern, '');
  }
  return out
    .replace(/。また、+/g, '。')
    .replace(/。{2,}/g, '。')
    .replace(/^\s*[。、]\s*/g, '')
    .trim();
}

/**
 * Display-only cleanup for 今日の一手 body in stored consult replies.
 * Removes saved-report reread instructions; UI CTA handles reread separately.
 */
export function normalizeConsultReplyTodayStepDisplayText(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return trimmed;
  let out = applyReplacementList(trimmed, TODAY_STEP_DISPLAY_REPAIRS);
  out = stripTodayStepSavedReportReread(out);
  return out.trim();
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
