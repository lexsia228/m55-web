/**
 * Hybrid AI snapshot quality validator.
 *
 * Validates AI-generated paid DTR section bodies before snapshot saving.
 * Fail-closed: any major violation → reject, fall back to deterministic.
 *
 * This module is pure-function: no AI, no network, no DB.
 */
import type { HybridAiProviderOutput } from './dtrHybridAiProvider';

// ── Failure code types ────────────────────────────────────────────────────────

export type HybridQualityFailCode =
  | 'section_empty'
  | 'section_too_short'
  | 'forbidden_phrase'
  | 'hard_claim'
  | 'internal_label'
  | 'repeated_sentence'
  | 'generic_output'
  | 'incomplete_sentence_ending'
  | 'malformed_output';

export type HybridQualitySectionResult = {
  sectionId: string;
  pass: boolean;
  failCodes: HybridQualityFailCode[];
  excerpt?: string;
};

export type HybridQualityValidationResult = {
  pass: boolean;
  sections: HybridQualitySectionResult[];
  overallFailCodes: HybridQualityFailCode[];
};

// ── Constants ─────────────────────────────────────────────────────────────────

/**
 * Minimum Japanese character counts per section (stripped of whitespace).
 * These are conservative lower bounds to reject clearly degenerate output.
 */
const MIN_SECTION_CHARS: Readonly<Record<string, number>> = {
  s1_identity:    120,
  s2_composition: 120,
  s3_essence:     120,
  s4_strengths:   120,
};

const FORBIDDEN_PHRASES: readonly string[] = [
  'このタイプ', 'こういう人は', 'タイプの人', 'そういう人は',
  '読み取りです', '正午基準', '補正した読み取り',
  '観測', '外部化', '感受の解像度', '微細な信号', '観測所型',
  'miさん', '分析結果', '判定します',
];

const FORBIDDEN_INTERNAL_LABELS: readonly RegExp[] = [
  /[甲乙丙丁戊己庚辛壬癸]/,
  /\b(xiaohan|dahan|lichun|yushui|jingzhe|chunfen|qingming|guyu)\b/,
  /\b(lixia|xiaoman|mangzhong|xiazhi|xiaoshu|dashu)\b/,
  /\b(liqiu|chushu|bailu|qiufen|hanlu|shuangjiang)\b/,
  /\b(lidong|xiaoxue|daxue|dongzhi)\b/,
  /stemLane|stemIdx|lunarDay|solarTerm|lunarMonth/,
];

const HARD_CLAIM_PATTERNS: readonly RegExp[] = [
  /必ず成功/,
  /絶対に/,
  /必ず失敗/,
  /運命的に/,
  /宿命(です|に|を)/,
  /病気になります/,
  /健康に(注意|気をつけ)/,
  /お金を失/,
  /仕事を失/,
  /恋愛が(うまく|できなく|壊れ)/,
  /結婚(できない|できません)/,
];

const GENERIC_OUTPUT_SIGNATURES: readonly string[] = [
  'あなたは素晴らしい人です',
  'あなたには才能があります',
  '運気が上がります',
  '幸せになれます',
  'すべてうまくいきます',
];

const SENTENCE_ENDING_OK = /[。！？…」』\s]$/;

const REQUIRED_SECTIONS: readonly string[] = [
  's1_identity', 's2_composition', 's3_essence', 's4_strengths',
];

// ── Core validation helpers ───────────────────────────────────────────────────

function countJapaneseChars(text: string): number {
  return [...text.replace(/\s/g, '')].length;
}

function validateSection(
  sectionId: string,
  body: string,
): HybridQualitySectionResult {
  const failCodes: HybridQualityFailCode[] = [];
  let excerpt: string | undefined;

  // 1. Empty check
  if (!body || body.trim().length === 0) {
    return { sectionId, pass: false, failCodes: ['section_empty', 'malformed_output'] };
  }

  // 2. Too short
  const minChars = MIN_SECTION_CHARS[sectionId] ?? 120;
  if (countJapaneseChars(body) < minChars) {
    failCodes.push('section_too_short');
    excerpt = body.slice(0, 40);
  }

  // 3. Forbidden phrases
  for (const phrase of FORBIDDEN_PHRASES) {
    if (body.includes(phrase)) {
      failCodes.push('forbidden_phrase');
      excerpt = excerpt ?? `…${phrase}…`;
      break;
    }
  }

  // 4. Internal labels
  for (const pattern of FORBIDDEN_INTERNAL_LABELS) {
    if (pattern.test(body)) {
      failCodes.push('internal_label');
      excerpt = excerpt ?? body.slice(0, 40);
      break;
    }
  }

  // 5. Hard claims
  for (const pattern of HARD_CLAIM_PATTERNS) {
    if (pattern.test(body)) {
      failCodes.push('hard_claim');
      const match = body.match(pattern);
      excerpt = excerpt ?? (match ? match[0] : body.slice(0, 40));
      break;
    }
  }

  // 6. Generic output signatures
  for (const sig of GENERIC_OUTPUT_SIGNATURES) {
    if (body.includes(sig)) {
      failCodes.push('generic_output');
      excerpt = excerpt ?? sig;
      break;
    }
  }

  // 7. Repeated sentences (exact sentence appearing 3+ times)
  const sentences = body.split(/[。！？]/).map((s) => s.trim()).filter((s) => s.length > 8);
  const sentenceCount = new Map<string, number>();
  for (const s of sentences) {
    sentenceCount.set(s, (sentenceCount.get(s) ?? 0) + 1);
  }
  for (const [s, count] of sentenceCount) {
    if (count >= 3) {
      failCodes.push('repeated_sentence');
      excerpt = excerpt ?? s.slice(0, 40);
      break;
    }
  }

  // 8. Sentence ending check (last non-whitespace char should be a proper ending)
  const trimmed = body.trimEnd();
  if (trimmed.length > 0 && !SENTENCE_ENDING_OK.test(trimmed)) {
    failCodes.push('incomplete_sentence_ending');
  }

  return {
    sectionId,
    pass: failCodes.length === 0,
    failCodes,
    excerpt,
  };
}

// ── Main validator ────────────────────────────────────────────────────────────

/**
 * Validate a HybridAiProviderOutput before it can be used as a snapshot candidate.
 *
 * Returns pass=true only when ALL four sections pass ALL checks.
 * Any failure → caller must use deterministic fallback.
 */
export function validateHybridAiOutput(
  output: HybridAiProviderOutput,
): HybridQualityValidationResult {
  const sectionResults: HybridQualitySectionResult[] = [];
  const overallFailCodes = new Set<HybridQualityFailCode>();

  // Check all required sections are present and non-empty
  for (const sectionId of REQUIRED_SECTIONS) {
    const body = (output as Record<string, unknown>)[sectionId];
    if (typeof body !== 'string') {
      sectionResults.push({
        sectionId,
        pass: false,
        failCodes: ['malformed_output', 'section_empty'],
      });
      overallFailCodes.add('malformed_output');
      continue;
    }
    const result = validateSection(sectionId, body);
    sectionResults.push(result);
    for (const code of result.failCodes) {
      overallFailCodes.add(code);
    }
  }

  const allPass = sectionResults.every((r) => r.pass);
  return {
    pass: allPass,
    sections: sectionResults,
    overallFailCodes: [...overallFailCodes],
  };
}
