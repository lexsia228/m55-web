/**
 * Pure-function Quality Judge for paid DTR chapter bodies (s1–s4).
 * No AI / no network / no DB. Deterministic / static checks.
 *
 * Interface is designed to be replaced with an LLM Judge in a future gate.
 * This gate implements a keyword-based deterministic judge.
 */

import { findForbiddenPaidIndividualizationLeak } from './dtrPaidIndividualization';
import type { ChapterMaterialPack } from './dtrPaidChapterMaterialPack';

// ── Check IDs ──

export type ChapterBodyCheckId =
  | 'template_verbatim'          // body too similar to seed (major)
  | 'dob_material_unreflected'   // DOB-v2 season/phase keywords absent (major)
  | 'forbidden_internal_labels'  // 甲乙丙丁 / solarTerm keys etc exposed (major)
  | 'forbidden_cold_language'    // 「このタイプ」etc. user-dismissive language (major)
  | 'medical_legal_financial'    // high-risk assertion language (major)
  | 'trait_rejudgment'           // AI re-assigned main trait / auxiliary (major)
  | 'japanese_corruption'        // non-printable / corrupted bytes (major)
  | 'char_count_insufficient'    // below minimum chars per chapter (minor)
  | 'repetition'                 // same sentence appearing 3+ times (minor)
  | 'density_insufficient';      // body too short/sparse (minor)

export type ChapterBodyCheckSeverity = 'major' | 'minor';

export type ChapterBodyFailedCheck = {
  check: ChapterBodyCheckId;
  severity: ChapterBodyCheckSeverity;
  excerpt?: string;
};

export type ChapterBodyJudgeVerdict = 'PASS' | 'MINOR_FIX' | 'FAIL';

export type ChapterBodySectionResult = {
  sectionId: string;
  verdict: ChapterBodyJudgeVerdict;
  failedChecks: ChapterBodyFailedCheck[];
};

export type ChapterBodyJudgeResult = {
  verdict: ChapterBodyJudgeVerdict;
  sections: ChapterBodySectionResult[];
};

// ── Constants ──

const MIN_CHAR_COUNTS: Readonly<Record<string, number>> = {
  s1_identity:   200,
  s2_composition: 250,
  s3_essence:    300,
  s4_strengths:  200,
};

const COLD_LANGUAGE_PATTERNS: readonly RegExp[] = [
  /このタイプ/,
  /こういう人は/,
  /タイプの人/,
  /そういう人は/,
  /あなたはAです/,
];

const TRAIT_REJUDGMENT_PATTERNS: readonly RegExp[] = [
  /あなたは実は/,
  /本当は.*型/,
  /実際には.*タイプ/,
  /より正確には.*資質/,
];

const HIGH_RISK_PATTERNS: readonly RegExp[] = [
  /必ず成功/,
  /間違いなく.*うまくいく/,
  /病院に行(くべき|った方)/,
  /医師に相談(すべき|してください)/,
  /投資(すべき|した方がいい)/,
  /絶対に.*損はない/,
];

// ── Verbatim ratio helper ──
// Computes how much of `generated` is covered by 20-char windows from `seed`.
// Returns 0.0–1.0 where 1.0 = identical content.

function computeVerbatimRatio(generated: string, seed: string): number {
  if (!generated || !seed) return 0;
  const WINDOW = 20;
  if (generated.length < WINDOW) return 0;
  const matched = new Array<boolean>(generated.length).fill(false);
  for (let i = 0; i <= seed.length - WINDOW; i++) {
    const chunk = seed.slice(i, i + WINDOW);
    let j = generated.indexOf(chunk);
    while (j !== -1) {
      for (let k = 0; k < WINDOW; k++) {
        if (j + k < matched.length) matched[j + k] = true;
      }
      j = generated.indexOf(chunk, j + 1);
    }
  }
  return matched.filter(Boolean).length / generated.length;
}

// ── Section judge ──

function judgeOneSection(
  sectionId: string,
  body: string,
  materialPack: ChapterMaterialPack,
  seedBody: string,
): ChapterBodySectionResult {
  const failedChecks: ChapterBodyFailedCheck[] = [];

  // 1. template_verbatim (major) — more than 50% of generated overlaps with seed
  const verbatimRatio = computeVerbatimRatio(body, seedBody);
  if (verbatimRatio > 0.5) {
    failedChecks.push({
      check: 'template_verbatim',
      severity: 'major',
      excerpt: `verbatim: ${(verbatimRatio * 100).toFixed(0)}%`,
    });
  }

  // 2. forbidden_internal_labels (major) — 甲乙丙丁, solarTerm keys, etc.
  const leak = findForbiddenPaidIndividualizationLeak(body);
  if (leak != null) {
    failedChecks.push({ check: 'forbidden_internal_labels', severity: 'major', excerpt: leak });
  }

  // 3. forbidden_cold_language (major)
  for (const pattern of COLD_LANGUAGE_PATTERNS) {
    const m = body.match(pattern);
    if (m) {
      failedChecks.push({ check: 'forbidden_cold_language', severity: 'major', excerpt: m[0] });
      break;
    }
  }

  // 4. medical_legal_financial (major)
  for (const pattern of HIGH_RISK_PATTERNS) {
    const m = body.match(pattern);
    if (m) {
      failedChecks.push({ check: 'medical_legal_financial', severity: 'major', excerpt: m[0] });
      break;
    }
  }

  // 5. trait_rejudgment (major) — AI re-assigned trait
  for (const pattern of TRAIT_REJUDGMENT_PATTERNS) {
    const m = body.match(pattern);
    if (m) {
      failedChecks.push({ check: 'trait_rejudgment', severity: 'major', excerpt: m[0] });
      break;
    }
  }

  // 6. dob_material_unreflected (major) — season AND phase keywords both absent
  const hasSeasonKw = materialPack.seasonJudgeKeywords.some((kw) => body.includes(kw));
  const hasPhaseKw = materialPack.phaseJudgeKeywords.some((kw) => body.includes(kw));
  if (!hasSeasonKw && !hasPhaseKw) {
    failedChecks.push({
      check: 'dob_material_unreflected',
      severity: 'major',
      excerpt: `season:${materialPack.seasonGroup} phase:${materialPack.lunarPhase}`,
    });
  }

  // 7. japanese_corruption (major) — non-printable bytes
  if (/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/.test(body)) {
    failedChecks.push({ check: 'japanese_corruption', severity: 'major' });
  }

  // 8. char_count_insufficient (minor)
  const stripped = body.replace(/\s/g, '').length;
  const minChars = MIN_CHAR_COUNTS[sectionId] ?? 200;
  if (stripped < minChars) {
    failedChecks.push({
      check: 'char_count_insufficient',
      severity: 'minor',
      excerpt: `${stripped} < ${minChars}`,
    });
  }

  // 9. repetition (minor) — same sentence (≥15 chars) appears 3+ times
  const sentences = body
    .split(/[。！？\n]/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 15);
  const sentenceCount = new Map<string, number>();
  for (const s of sentences) sentenceCount.set(s, (sentenceCount.get(s) ?? 0) + 1);
  const repeated = [...sentenceCount.entries()].find(([, c]) => c >= 3);
  if (repeated) {
    failedChecks.push({ check: 'repetition', severity: 'minor', excerpt: repeated[0].slice(0, 30) });
  }

  // 10. density_insufficient (minor) — very sparse body
  if (body.trim().split('\n').length < 3 && stripped < 100) {
    failedChecks.push({ check: 'density_insufficient', severity: 'minor' });
  }

  const hasMajor = failedChecks.some((c) => c.severity === 'major');
  const hasMinor = failedChecks.some((c) => c.severity === 'minor');
  const verdict: ChapterBodyJudgeVerdict = hasMajor ? 'FAIL' : hasMinor ? 'MINOR_FIX' : 'PASS';

  return { sectionId, verdict, failedChecks };
}

// ── Public API ──

export type GeneratedChapterBodiesInput = {
  s1_identity: string;
  s2_composition: string;
  s3_essence: string;
  s4_strengths: string;
};

/**
 * Judge all four generated chapter bodies against the material pack and seeds.
 * Returns an aggregate verdict (PASS / MINOR_FIX / FAIL) plus per-section results.
 *
 * Extensible: this function signature is the stable interface.
 * The deterministic implementation can be replaced with an LLM Judge in a future gate
 * without changing the caller contract.
 */
export function judgePaidDtrChapterBodies(
  bodies: GeneratedChapterBodiesInput,
  materialPack: ChapterMaterialPack,
): ChapterBodyJudgeResult {
  const sections: ChapterBodySectionResult[] = [
    judgeOneSection('s1_identity',   bodies.s1_identity,   materialPack, materialPack.seedBodies.s1_identity),
    judgeOneSection('s2_composition', bodies.s2_composition, materialPack, materialPack.seedBodies.s2_composition),
    judgeOneSection('s3_essence',     bodies.s3_essence,    materialPack, materialPack.seedBodies.s3_essence),
    judgeOneSection('s4_strengths',   bodies.s4_strengths,  materialPack, materialPack.seedBodies.s4_strengths),
  ];

  const hasFail = sections.some((s) => s.verdict === 'FAIL');
  const hasMinorFix = sections.some((s) => s.verdict === 'MINOR_FIX');
  const verdict: ChapterBodyJudgeVerdict = hasFail ? 'FAIL' : hasMinorFix ? 'MINOR_FIX' : 'PASS';

  return { verdict, sections };
}
