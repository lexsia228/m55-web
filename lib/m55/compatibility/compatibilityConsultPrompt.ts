import { buildM55AiSafetySystemInstruction } from '../ai/m55AiSafetyPolicy';
import type { ConsultQuestionCatalogEntry } from '../consult/consultQuestionCatalog.v1';
import type { ReplyThemeId } from '../consult/consultQuestionCatalog.v1';
import {
  CONSULT_REPLY_GENERATION_INCOMPLETE_USER_MESSAGE_JA,
  CONSULT_REPLY_PROMPT_COMPLETION_REQUIREMENTS_JA,
  CONSULT_REPLY_QUALITY_VOICE_JA,
  CONSULT_REPLY_GENERATION,
} from '../consult/consultReplyGenerationContract';
import { parseConsultUserMessage } from '../consult/consultSendMessage';
import type { ChapterId } from './pairReadingTypes';
import { COMPATIBILITY_CONSULT_SIX_CHAPTER_KEYS } from './compatibilityConsultReportContext';

/** Pair included reply — relationship + report-use themes only (no Self work/fatigue/tendency). */
export const COMPATIBILITY_CONSULT_REPLY_THEME_IDS = ['relation', 'report'] as const satisfies readonly ReplyThemeId[];

export function isCompatibilityConsultReplyThemeId(
  value: string,
): value is (typeof COMPATIBILITY_CONSULT_REPLY_THEME_IDS)[number] {
  return (COMPATIBILITY_CONSULT_REPLY_THEME_IDS as readonly string[]).includes(value);
}

export const COMPATIBILITY_CONSULT_GROUNDING_JA = `
【二人の相性レポート — 追加読み解きの根拠】
- 根拠は購入済みの6章レポートと、購入時に本人が答えた表示用コンテキストのみ。
- 相手の本音・内面・秘密の感情を断定しない。相手が何を考えているかを決めつけない。
- 未来の結末・関係改善の成功・相性の吉凶を断定しない。
- レポートにない事実や第三者の心理を付け足さない。
- 片思い・未返信の場面では、相手が返信した・望んでいる・同意した前提で書かない。
- 会話を続ける形式ではなく、今回の1テーマに沿った読み解き1回分として完結させる。
`.trim();

type PairConsultQuestionId =
  | 'relation.distance'
  | 'relation.words'
  | 'relation.timing'
  | 'relation.recovery'
  | 'report.how_to_use'
  | 'report.chapter_pick'
  | 'report.review_timing'
  | 'report.next_step';

export const COMPATIBILITY_CONSULT_PAIR_QUESTION_IDS: readonly PairConsultQuestionId[] = [
  'relation.distance',
  'relation.words',
  'relation.timing',
  'relation.recovery',
  'report.how_to_use',
  'report.chapter_pick',
  'report.review_timing',
  'report.next_step',
] as const;

export const COMPATIBILITY_CONSULT_QUESTION_CHAPTER_FOCUS: Readonly<
  Record<PairConsultQuestionId, { primary: readonly ChapterId[]; secondary: readonly ChapterId[] }>
> = {
  'relation.distance': { primary: ['ch_pair_gap'], secondary: ['ch_other_pace'] },
  'relation.words': { primary: ['ch_you_pace'], secondary: ['ch_pair_gap'] },
  'relation.timing': { primary: ['ch_you_pace'], secondary: ['ch_today_clue'] },
  'relation.recovery': { primary: ['ch_today_clue'], secondary: ['ch_pair_gap'] },
  'report.how_to_use': { primary: ['ch_about'], secondary: ['ch_topic_deep'] },
  'report.chapter_pick': { primary: ['ch_topic_deep'], secondary: ['ch_pair_gap'] },
  'report.review_timing': { primary: ['ch_today_clue'], secondary: ['ch_about'] },
  'report.next_step': { primary: ['ch_today_clue'], secondary: ['ch_you_pace'] },
};

const COMPATIBILITY_CONSULT_PAIR_PROMPT_FOCUS: Readonly<Record<PairConsultQuestionId, string>> = {
  'relation.distance': '距離の取り方を、6章レポートのズレとペース章から読み返す',
  'relation.words': '言葉の選び方が重くなる場面を、6章レポートの場面語と接続する',
  'relation.timing': '伝えるタイミングの見直し目印を、6章レポートから1つ置く',
  'relation.recovery': 'やりとりのあとの戻し方を、6章レポートの戻し方から整理する',
  'report.how_to_use': '6章レポート全体の読み返し順序を、購入済みスナップショットから整理する',
  'report.chapter_pick': 'いま開きやすい章を、6章キーから主章1・補助章最大1で示す',
  'report.review_timing': '読み返すタイミングの見直し目印を、6章レポートから1つ置く',
  'report.next_step': '読んだあとの次の一手を、6章レポート抜粋から1つだけ置く',
};

export function resolveCompatibilityConsultQuestionChapterFocus(
  catalogEntry?: ConsultQuestionCatalogEntry | null,
): readonly ChapterId[] {
  if (!catalogEntry) return COMPATIBILITY_CONSULT_SIX_CHAPTER_KEYS;
  const id = catalogEntry.reply_question_id as PairConsultQuestionId;
  const mapping = COMPATIBILITY_CONSULT_QUESTION_CHAPTER_FOCUS[id];
  if (!mapping) return COMPATIBILITY_CONSULT_SIX_CHAPTER_KEYS;
  return [...mapping.primary, ...mapping.secondary];
}

function buildCompatibilityConsultUserAnchors(
  parsed: ReturnType<typeof parseConsultUserMessage>,
  catalogEntry?: ConsultQuestionCatalogEntry | null,
): string {
  const theme = parsed.theme?.trim() ?? '';
  if (!theme || !parsed.isQuestionSelect || !catalogEntry) return '';

  const questionId = catalogEntry.reply_question_id as PairConsultQuestionId;
  const focus = COMPATIBILITY_CONSULT_QUESTION_CHAPTER_FOCUS[questionId];
  const primaryKeys = focus?.primary.join(', ') ?? 'ch_pair_gap';
  const secondaryKeys = focus?.secondary.join(', ') ?? 'ch_today_clue';
  const promptFocus =
    COMPATIBILITY_CONSULT_PAIR_PROMPT_FOCUS[questionId] ?? catalogEntry.promptFocusAnchor;

  return `【今回の追加読み解きアンカー（Pair・6章レポート）】
- テーマ: ${theme}
- 読み返したい焦点: ${parsed.question ?? catalogEntry.labelJa}
- 質問焦点: ${promptFocus}
- 主章（6章キー）: ${primaryKeys}
- 補助章（最大1つ）: ${secondaryKeys}
- 6章レポートの scene / 視点A・B / ループ / 戻し方 / 使える言い回し / 小さな試し / 振り返り を根拠に使う
- Selfプレミアムの4章（ローマ数字章）や相手の返信・好意の前提は置かない
- 1段落目は質問焦点をレポートの場面語と接続する
- 5段落目は「今日やることは1つだけです。」で始め、本人だけが試せる一手を1つ`;
}

export function buildCompatibilityConsultSystemPrompt(
  reportContext: string,
  userMessage: string,
  catalogEntry?: ConsultQuestionCatalogEntry | null,
): string {
  const safetyPrefix = buildM55AiSafetySystemInstruction('consult');
  const parsed = parseConsultUserMessage(userMessage);
  const userAnchors = buildCompatibilityConsultUserAnchors(parsed, catalogEntry);
  const anchorsBlock = userAnchors ? `\n${userAnchors}\n` : '';

  return `${safetyPrefix}

あなたはM55の「二人の相性レポート」に付帯する追加読み解きAIです。
購入済みレポートの要点:

${reportContext}
${anchorsBlock}
${COMPATIBILITY_CONSULT_GROUNDING_JA}

${CONSULT_REPLY_PROMPT_COMPLETION_REQUIREMENTS_JA}

役割:
- 6章レポートと本人の回答に沿って、ユーザーが選んだ1テーマを整理する
- 相手の心理・未来・関係の結果を断定しない
- 医療・法律・投資等の専門助言は行わない

${CONSULT_REPLY_QUALITY_VOICE_JA}

回答は${CONSULT_REPLY_GENERATION.targetMinJa}〜${CONSULT_REPLY_GENERATION.targetMaxJa}日本語文字を目標とし、${CONSULT_REPLY_GENERATION.outputHardCapJa}文字を超えないこと。
${CONSULT_REPLY_GENERATION_INCOMPLETE_USER_MESSAGE_JA}`;
}

export function buildCompatibilityConsultPromptForCatalogEntry(
  reportContext: string,
  userMessage: string,
  catalogEntry: ConsultQuestionCatalogEntry,
): string {
  return buildCompatibilityConsultSystemPrompt(reportContext, userMessage, catalogEntry);
}
