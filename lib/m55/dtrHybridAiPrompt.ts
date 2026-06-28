/**
 * Hybrid AI prompt payload builder.
 *
 * Converts a ChapterMaterialPack + PaidDtrIndividualization into a structured
 * HybridAiPromptPayload that can be sent to any AI provider.
 *
 * Critical constraints:
 * - Raw internal labels (stemLaneIndex numbers, solarTerm keys like "xiaohan",
 *   DB IDs, internal code names) MUST NOT appear in the user-facing prompt sections.
 * - AI must not re-judge the primary trait or auxiliary tendency.
 * - Fortune-telling hard claims, medical/financial/relationship assertions forbidden.
 * - Each section has a role constraint; the AI must respect it.
 * - This module is pure-function: no network, no AI, no DB.
 */
import type { ChapterMaterialPack } from './dtrPaidChapterMaterialPack';
import type { PaidDtrIndividualization } from './dtrPaidIndividualization';

// ── Prompt version ─────────────────────────────────────────────────────────────

export const HYBRID_AI_PROMPT_VERSION = 'hybrid-prompt-v1-2026-07' as const;

// ── Types ──────────────────────────────────────────────────────────────────────

/** Human-readable description of a single chapter's generation role. */
export type SectionPromptSpec = {
  sectionId: string;
  roleDescription: string;
  forbiddenTopics: readonly string[];
  requiredThemes: readonly string[];
  lengthGuidance: string;
};

/** Structured context about the primary trait (no internal codes). */
export type TraitContext = {
  publicTitle: string;
  interactionNote: string;
  blueprintDescription: string;
};

/** Structured DOB-derived context (no solarTerm keys, no raw numbers). */
export type DobContext = {
  seasonDescription: string;
  phaseDescription: string;
  essenceNote: string;
  auxiliaryNote: string;
};

/**
 * The complete prompt payload passed to any HybridAiProvider.
 * Contains everything the AI needs and nothing it should not see.
 */
export type HybridAiPromptPayload = {
  promptVersion: typeof HYBRID_AI_PROMPT_VERSION;
  /** Shared system-level constraints (applies to all sections). */
  systemConstraints: {
    toneName: string;
    forbiddenPhrases: readonly string[];
    hardClaims: readonly string[];
    styleGuidance: string;
    roleGuidance: string;
  };
  traitContext: TraitContext;
  dobContext: DobContext;
  sections: readonly SectionPromptSpec[];
  /** v2.1 fallback material as reference (style anchor; not verbatim output). */
  fallbackMaterial: {
    s1Note: string;
    s2Note: string;
    s3Note: string;
    s4Note: string;
  };
};

// ── Season / phase → human description ────────────────────────────────────────

const SEASON_DESCRIPTIONS: Readonly<Record<string, string>> = {
  winter: '冷えや静けさが深まる時期の生まれ',
  spring: '芽吹きと立ち上がりの時期の生まれ',
  summer: '熱量が外へ向きやすい時期の生まれ',
  autumn: '見直しと整理に向きやすい時期の生まれ',
};

const PHASE_DESCRIPTIONS: Readonly<Record<string, string>> = {
  early: '月の前半に近い生まれとして、始める場面が合いやすい',
  mid:   '月の中頃の生まれとして、続ける場面で力が出やすい',
  late:  '月の後半に近い生まれとして、整える場面が合いやすい',
};

// ── Forbidden phrases / hard claims ───────────────────────────────────────────

const SYSTEM_FORBIDDEN_PHRASES: readonly string[] = [
  'このタイプ', '分析', '判定', '観測', '外部化',
  '感受の解像度', '微細な信号', '観測所型', '読み取りです', '正午基準',
  '補正した読み取り', 'miさん', '甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸',
  'xiaohan', 'dahan', 'lichun', 'yushui', 'jingzhe', 'chunfen',
  'qingming', 'guyu', 'lixia', 'xiaoman', 'mangzhong', 'xiazhi',
  'xiaoshu', 'dashu', 'liqiu', 'chushu', 'bailu', 'qiufen',
  'hanlu', 'shuangjiang', 'lidong', 'xiaoxue', 'daxue', 'dongzhi',
];

const HARD_CLAIM_PATTERNS: readonly string[] = [
  '必ず成功', '絶対に', '必ず失敗', '運命的', '宿命',
  '病気になります', '健康に注意', '金銭的に危険',
  '恋愛が', '結婚できない', '離婚', 'お金を失い',
  '仕事を失い', '人間関係が壊れ',
];

// ── Section specs ─────────────────────────────────────────────────────────────

const SECTION_SPECS: readonly SectionPromptSpec[] = [
  {
    sectionId: 's1_identity',
    roleDescription: '「あなたという人物」— 自分の輪郭・力の出やすい状況を伝える章。読んだ人が「自分の形」を感じられること。',
    forbiddenTopics: ['仕事の成功/失敗の断定', '恋愛/結婚の断定', '健康の断定', '金銭的断定'],
    requiredThemes: ['自分の形・輪郭', '力の出やすい場面', '生年月日のリズムとの関係'],
    lengthGuidance: '200〜400字程度。1〜3段落。自然な読み物として。',
  },
  {
    sectionId: 's2_composition',
    roleDescription: '「構成と傾向の全体像」— 進め方・段取り・ペースを伝える章。どう動くと整いやすいかを自然語で。',
    forbiddenTopics: ['仕事の断定', '能力の優劣評価', '達成の保証'],
    requiredThemes: ['進め方のコツ', '段取りの考え方', '生年月日リズムとの関係'],
    lengthGuidance: '250〜450字程度。実践的で読みやすく。',
  },
  {
    sectionId: 's3_essence',
    roleDescription: '「本質と安定の条件」— 安定条件・本質のリズムを伝える章。生年月日の細かなリズムを根拠に。',
    forbiddenTopics: ['断定的な運命言及', '他者との比較評価'],
    requiredThemes: ['安定の核心', '本質のリズム', '生年月日の細かなリズムから見ると'],
    lengthGuidance: '300〜500字程度。保存版として読み返せる深さ。',
  },
  {
    sectionId: 's4_strengths',
    roleDescription: '「自分の出やすい面」— 生活・疲れ・戻し方を伝える章。体調断定でなく「戻し方・切り替え方」に寄せる。',
    forbiddenTopics: ['健康断定', '病気の示唆', '金銭・恋愛の断定'],
    requiredThemes: ['疲れの戻し方', '生活リズムのコツ', '切り替えのサイン'],
    lengthGuidance: '200〜400字程度。生活語として読める文体。',
  },
];

// ── Builder ────────────────────────────────────────────────────────────────────

/**
 * Build a HybridAiPromptPayload from a ChapterMaterialPack and fallback individualization.
 * Pure function — no AI, no network, no DB.
 */
export function buildHybridAiPromptPayload(
  materialPack: ChapterMaterialPack,
  fallbackInd: PaidDtrIndividualization,
): HybridAiPromptPayload {
  const traitContext: TraitContext = {
    publicTitle: materialPack.publicTitle,
    interactionNote: materialPack.interactionNote,
    blueprintDescription: materialPack.axisEntry.note,
  };

  const dobContext: DobContext = {
    seasonDescription: SEASON_DESCRIPTIONS[materialPack.seasonGroup] ?? '季節のリズムの生まれ',
    phaseDescription: PHASE_DESCRIPTIONS[materialPack.lunarPhase] ?? '月のリズムの生まれ',
    essenceNote: materialPack.essenceRhythmNote,
    auxiliaryNote: materialPack.auxiliaryReading,
  };

  return {
    promptVersion: HYBRID_AI_PROMPT_VERSION,
    systemConstraints: {
      toneName: 'M55生活語',
      forbiddenPhrases: SYSTEM_FORBIDDEN_PHRASES,
      hardClaims: HARD_CLAIM_PATTERNS,
      styleGuidance: [
        '保存版として読み返せる丁寧な日本語で書くこと。',
        'ユーザーを決めつけず、「〜しやすくなります」「〜が合いやすくなります」の形を基本にすること。',
        '「あなたは必ず〜」「絶対に〜」は使わないこと。',
        '占い断定・医療断定・金銭断定・恋愛断定は一切しないこと。',
        '保存版だけで完結しすぎず、返書購入につながる余白を残すこと。',
        '見出し・markdown記法は使わないこと。',
        '章の役割を必ず守ること。',
      ].join('\n'),
      roleGuidance: [
        '生年月日のリズムを根拠に、その人固有の傾向を生活語で伝えること。',
        '主要特性（publicTitle）と補助傾向は、与えられた情報以外に判断・再定義しないこと。',
        '各章のroleDescriptionに従い、章の役割を超えないこと。',
      ].join('\n'),
    },
    traitContext,
    dobContext,
    sections: SECTION_SPECS,
    fallbackMaterial: {
      s1Note: fallbackInd.s1IdentityRhythmNote ?? '',
      s2Note: fallbackInd.s2CompositionRhythmNote ?? '',
      s3Note: fallbackInd.essenceRhythmNote,
      s4Note: fallbackInd.s4StrengthsRhythmNote ?? '',
    },
  };
}
