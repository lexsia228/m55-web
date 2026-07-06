/**
 * reply-v1 question catalog — 5 themes × 4 questions = 20 focus switches.
 * Labels and grounding metadata only; no assistant reply body templates.
 */

export const REPLY_THEME_IDS = ['work', 'relation', 'fatigue', 'tendency', 'report'] as const;

export type ReplyThemeId = (typeof REPLY_THEME_IDS)[number];

export type ConsultQuestionCatalogEntry = {
  reply_theme_id: ReplyThemeId;
  reply_question_id: string;
  labelJa: string;
  themeLabelJa: string;
  output_intent: string;
  grounding_target: string;
  promptFocusAnchor: string;
  forbidden_scope: string;
  primaryChapterRoman: 'Ⅰ' | 'Ⅱ' | 'Ⅲ' | 'Ⅳ';
  secondaryChapterRoman?: 'Ⅰ' | 'Ⅱ' | 'Ⅲ' | 'Ⅳ';
};

export const REPLY_THEME_LABEL_JA: Record<ReplyThemeId, string> = {
  work: '仕事・これからの進め方',
  relation: '人との距離感',
  fatigue: '疲れたときの戻り方',
  tendency: '自分の傾向の読み方',
  report: '保存版の使い方',
};

/** Legacy stored theme labels → reply_theme_id (history / alias resolve). */
export const LEGACY_THEME_LABEL_TO_REPLY_THEME_ID: Record<string, ReplyThemeId> = {
  '仕事・これからの進め方': 'work',
  'これからの動き方': 'work',
  '恋人・近い人との向き合い方': 'relation',
  '人との距離感': 'relation',
  '疲れたときの戻り方': 'fatigue',
  'お金・生活・疲れの整え方': 'fatigue',
  '自分の傾向の読み方': 'tendency',
  '保存版の使い方': 'report',
};

const CATALOG_ENTRIES: ConsultQuestionCatalogEntry[] = [
  {
    reply_theme_id: 'work',
    reply_question_id: 'work.priority',
    labelJa: 'いま優先に焦点を置きたい',
    themeLabelJa: REPLY_THEME_LABEL_JA.work,
    output_intent: '優先焦点の追加読み解き',
    grounding_target: 'Ⅱ構造 + s3/s4抜粋',
    promptFocusAnchor: 'いま優先に置きたい場面を、保存版の構造章から1つ具体化する',
    forbidden_scope: '転職判断',
    primaryChapterRoman: 'Ⅱ',
    secondaryChapterRoman: 'Ⅲ',
  },
  {
    reply_theme_id: 'work',
    reply_question_id: 'work.pace',
    labelJa: '進め方のペースを整えたい',
    themeLabelJa: REPLY_THEME_LABEL_JA.work,
    output_intent: 'ペース整理の追加読み解き',
    grounding_target: 'Ⅱ構造 + 傾向語',
    promptFocusAnchor: '進め方のペースが乱れやすい場面を、保存版の傾向語と接続する',
    forbidden_scope: '成功保証',
    primaryChapterRoman: 'Ⅱ',
  },
  {
    reply_theme_id: 'work',
    reply_question_id: 'work.start',
    labelJa: 'どこから手を付けるか整理したい',
    themeLabelJa: REPLY_THEME_LABEL_JA.work,
    output_intent: '着手点の追加読み解き',
    grounding_target: 'Ⅱ構造 + 次の一手',
    promptFocusAnchor: 'どこから手を付けるかを、保存版の構造から1つに絞る',
    forbidden_scope: '正解の始め方',
    primaryChapterRoman: 'Ⅱ',
  },
  {
    reply_theme_id: 'work',
    reply_question_id: 'work.boundary',
    labelJa: '区切りの置き方を見直したい',
    themeLabelJa: REPLY_THEME_LABEL_JA.work,
    output_intent: '区切り動作の追加読み解き',
    grounding_target: 'Ⅱ + Ⅲ無理',
    promptFocusAnchor: '区切りが置きにくい場面を、無理の出方と接続する',
    forbidden_scope: '辞め時断定',
    primaryChapterRoman: 'Ⅱ',
    secondaryChapterRoman: 'Ⅲ',
  },
  {
    reply_theme_id: 'relation',
    reply_question_id: 'relation.distance',
    labelJa: '距離の取り方を読み返したい',
    themeLabelJa: REPLY_THEME_LABEL_JA.relation,
    output_intent: '距離整理の追加読み解き',
    grounding_target: 'Ⅲ無理 + 対話章',
    promptFocusAnchor: '距離の取り方を、保存版の無理の章から読み返す',
    forbidden_scope: '相手の気持ち',
    primaryChapterRoman: 'Ⅲ',
  },
  {
    reply_theme_id: 'relation',
    reply_question_id: 'relation.words',
    labelJa: '言葉の選び方を整えたい',
    themeLabelJa: REPLY_THEME_LABEL_JA.relation,
    output_intent: '伝え方整理の追加読み解き',
    grounding_target: 'Ⅲ無理 + 傾向語',
    promptFocusAnchor: '言葉の選び方が重くなる場面を、保存版の傾向語と接続する',
    forbidden_scope: '恋愛成就',
    primaryChapterRoman: 'Ⅲ',
  },
  {
    reply_theme_id: 'relation',
    reply_question_id: 'relation.timing',
    labelJa: '伝えるタイミングを見直したい',
    themeLabelJa: REPLY_THEME_LABEL_JA.relation,
    output_intent: 'タイミング整理の追加読み解き',
    grounding_target: 'Ⅲ + 見直し目印',
    promptFocusAnchor: '伝えるタイミングの見直し目印を、保存版から1つ置く',
    forbidden_scope: '相手予測',
    primaryChapterRoman: 'Ⅲ',
  },
  {
    reply_theme_id: 'relation',
    reply_question_id: 'relation.recovery',
    labelJa: 'やりとりのあとの戻し方を整理したい',
    themeLabelJa: REPLY_THEME_LABEL_JA.relation,
    output_intent: '回復整理の追加読み解き',
    grounding_target: 'Ⅳ + Ⅲ',
    promptFocusAnchor: 'やりとりのあとの戻し方を、保存版の戻し方章から整理する',
    forbidden_scope: '関係修復断定',
    primaryChapterRoman: 'Ⅳ',
    secondaryChapterRoman: 'Ⅲ',
  },
  {
    reply_theme_id: 'fatigue',
    reply_question_id: 'fatigue.signal',
    labelJa: '疲れの出方を読み返したい',
    themeLabelJa: REPLY_THEME_LABEL_JA.fatigue,
    output_intent: '疲労パターン整理の追加読み解き',
    grounding_target: 'Ⅳ + s5_friction',
    promptFocusAnchor: '疲れの出方を、保存版の無理の章から読み返す',
    forbidden_scope: '体調診断',
    primaryChapterRoman: 'Ⅳ',
    secondaryChapterRoman: 'Ⅲ',
  },
  {
    reply_theme_id: 'fatigue',
    reply_question_id: 'fatigue.reset',
    labelJa: '短く戻す一手を置きたい',
    themeLabelJa: REPLY_THEME_LABEL_JA.fatigue,
    output_intent: '短区切りの追加読み解き',
    grounding_target: 'Ⅳ + 次の一手',
    promptFocusAnchor: '短く戻す一手を、保存版の戻し方から1つ置く',
    forbidden_scope: '休息処方',
    primaryChapterRoman: 'Ⅳ',
  },
  {
    reply_theme_id: 'fatigue',
    reply_question_id: 'fatigue.rhythm',
    labelJa: '生活のリズムを整えたい',
    themeLabelJa: REPLY_THEME_LABEL_JA.fatigue,
    output_intent: 'リズム整理の追加読み解き',
    grounding_target: 'Ⅳ + 個別化補助',
    promptFocusAnchor: '生活のリズムが乱れやすい場面を、保存版の個別化補助と接続する',
    forbidden_scope: '治療助言',
    primaryChapterRoman: 'Ⅳ',
  },
  {
    reply_theme_id: 'fatigue',
    reply_question_id: 'fatigue.boundary',
    labelJa: '無理が出る前に区切りを置きたい',
    themeLabelJa: REPLY_THEME_LABEL_JA.fatigue,
    output_intent: '予防区切りの追加読み解き',
    grounding_target: 'Ⅲ + Ⅳ',
    promptFocusAnchor: '無理が出る前に区切りを置ける場面を、保存版から1つ具体化する',
    forbidden_scope: '能力不足断定',
    primaryChapterRoman: 'Ⅲ',
    secondaryChapterRoman: 'Ⅳ',
  },
  {
    reply_theme_id: 'tendency',
    reply_question_id: 'tendency.read_pattern',
    labelJa: '傾向の読み方を整理したい',
    themeLabelJa: REPLY_THEME_LABEL_JA.tendency,
    output_intent: '読み方案内の追加読み解き',
    grounding_target: 'Ⅰ + 傾向語',
    promptFocusAnchor: '傾向の読み方を、保存版の輪郭章から整理する',
    forbidden_scope: 'タイプ名付け',
    primaryChapterRoman: 'Ⅰ',
  },
  {
    reply_theme_id: 'tendency',
    reply_question_id: 'tendency.focus',
    labelJa: 'いま注目したい傾向に焦点を置きたい',
    themeLabelJa: REPLY_THEME_LABEL_JA.tendency,
    output_intent: '焦点整理の追加読み解き',
    grounding_target: 'Ⅰ + 主章1つ',
    promptFocusAnchor: 'いま注目したい傾向を、保存版の輪郭から1つに絞る',
    forbidden_scope: 'ランキング',
    primaryChapterRoman: 'Ⅰ',
  },
  {
    reply_theme_id: 'tendency',
    reply_question_id: 'tendency.reread',
    labelJa: '保存版のどこを読み返すか見たい',
    themeLabelJa: REPLY_THEME_LABEL_JA.tendency,
    output_intent: '読み返しナビの追加読み解き',
    grounding_target: 'Ⅰ土台 + 章ナビ',
    promptFocusAnchor: '保存版のどこを読み返すかを、章構成から1つ示す',
    forbidden_scope: '正解章',
    primaryChapterRoman: 'Ⅰ',
    secondaryChapterRoman: 'Ⅱ',
  },
  {
    reply_theme_id: 'tendency',
    reply_question_id: 'tendency.lens',
    labelJa: '別の見方で、少しほどいて読みたい',
    themeLabelJa: REPLY_THEME_LABEL_JA.tendency,
    output_intent: '別視点の追加読み解き',
    grounding_target: 'Ⅲ少しほどく',
    promptFocusAnchor: '別の見方で少しほどく読み返しを、保存版の無理の章から1つ置く',
    forbidden_scope: '鑑定',
    primaryChapterRoman: 'Ⅲ',
  },
  {
    reply_theme_id: 'report',
    reply_question_id: 'report.how_to_use',
    labelJa: '保存版の使い方を整理したい',
    themeLabelJa: REPLY_THEME_LABEL_JA.report,
    output_intent: '使い方の追加読み解き',
    grounding_target: '4章 + Ⅰ土台',
    promptFocusAnchor: '保存版の使い方を、4章構成から読み返す',
    forbidden_scope: '新鑑定',
    primaryChapterRoman: 'Ⅰ',
    secondaryChapterRoman: 'Ⅱ',
  },
  {
    reply_theme_id: 'report',
    reply_question_id: 'report.chapter_pick',
    labelJa: 'いま開きやすい章を選びたい',
    themeLabelJa: REPLY_THEME_LABEL_JA.report,
    output_intent: '章選択の追加読み解き',
    grounding_target: '主章1 + 補助章1',
    promptFocusAnchor: 'いま開きやすい章を、保存版から主章1つ・補助章最大1つで示す',
    forbidden_scope: 'おすすめ章',
    primaryChapterRoman: 'Ⅱ',
    secondaryChapterRoman: 'Ⅲ',
  },
  {
    reply_theme_id: 'report',
    reply_question_id: 'report.review_timing',
    labelJa: '読み返すタイミングを見直したい',
    themeLabelJa: REPLY_THEME_LABEL_JA.report,
    output_intent: '見直し目印の追加読み解き',
    grounding_target: 'Ⅳ見直し',
    promptFocusAnchor: '読み返すタイミングの見直し目印を、保存版から1つ置く',
    forbidden_scope: '未来予測',
    primaryChapterRoman: 'Ⅳ',
  },
  {
    reply_theme_id: 'report',
    reply_question_id: 'report.next_step',
    labelJa: '読んだあと、次の一手を一つ置きたい',
    themeLabelJa: REPLY_THEME_LABEL_JA.report,
    output_intent: '次の一手の追加読み解き',
    grounding_target: '今日の一手 + 抜粋',
    promptFocusAnchor: '読んだあとの次の一手を、保存版抜粋から1つだけ置く',
    forbidden_scope: '行動断定',
    primaryChapterRoman: 'Ⅳ',
  },
];

export const CONSULT_QUESTION_CATALOG_V1: readonly ConsultQuestionCatalogEntry[] = CATALOG_ENTRIES;

const byThemeAndQuestion = new Map<string, ConsultQuestionCatalogEntry>(
  CATALOG_ENTRIES.map((entry) => [`${entry.reply_theme_id}:${entry.reply_question_id}`, entry]),
);

export function getQuestionsForTheme(themeId: ReplyThemeId): ConsultQuestionCatalogEntry[] {
  return CATALOG_ENTRIES.filter((entry) => entry.reply_theme_id === themeId);
}

export function resolveReplyQuestion(
  themeId: ReplyThemeId,
  questionId: string,
): ConsultQuestionCatalogEntry | null {
  return byThemeAndQuestion.get(`${themeId}:${questionId}`) ?? null;
}

export function resolveReplyThemeIdFromLegacyLabel(themeLabel: string): ReplyThemeId | null {
  return LEGACY_THEME_LABEL_TO_REPLY_THEME_ID[themeLabel.trim()] ?? null;
}
