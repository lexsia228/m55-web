/**
 * DTR Visible Copy Naturalness Guardrail.
 * Pure functions only. No AI, no network, no DB.
 *
 * Guards against internal analysis language leaking into user-facing DTR body text.
 * All text that will be stored in snapshots or displayed in the reader must pass this guard
 * before real AI provider integration or feature-flag activation.
 */

export type NaturalnessViolation = {
  rule: string;
  match: string;
  /** Character index of first occurrence in the checked text */
  index: number;
};

export type NaturalnessResult = {
  pass: boolean;
  violations: NaturalnessViolation[];
};

/**
 * Terms that belong to internal analysis / computation domain.
 * They must not appear in user-facing saved-report copy.
 */
const FORBIDDEN_INTERNAL_TERMS: readonly string[] = [
  '感受の解像度',
  '微細な信号',
  '観測所型',
  '外部化',
  '長期記憶として保持',
  'パターンを立ち上げる',
];

/**
 * Mechanical or computation-disclosure phrases.
 * Sentences ending with 読み取りです or containing system-processing framing.
 */
const FORBIDDEN_MECHANICAL_PHRASES: readonly string[] = [
  '読み取りです。',
  '読み取りです\n',
  '補正した読み取り',
  '正午基準',
];

/**
 * Raw computation / backend processing terms.
 */
const FORBIDDEN_RAW_COMPUTATION: readonly string[] = [
  '正午基準',
  '補正した読み取り',
];

/**
 * Speed/volume framing that sounds like a system performance log rather than life advice.
 */
const FORBIDDEN_SYSTEM_FRAMING: readonly string[] = [
  '速報より、蓄積',
];

/**
 * Cold evaluator-perspective phrases.
 * "外からは〜に見えても" sounds like an outside observer assessing a subject —
 * not the warm, user-addressed voice expected in M55 visible copy.
 * Covers the specific patterns removed from stems 7, 8, 9 in the naturalness patch.
 * Other stem-level occurrences of "外からは" remain as a documented claim boundary
 * and are candidates for a future sweep gate.
 */
const FORBIDDEN_COLD_EVALUATION_PHRASES: readonly string[] = [
  '外からは慎重に見えても',
  '外からは細かい人に見えても',
  '外からは器用に見えても',
];

/**
 * Scientific monitoring / system-observer vocabulary out of place in life-advice copy.
 */
const FORBIDDEN_OBSERVATION_TERMS: readonly string[] = [
  '観測所型',
  '観測を支えます',
  '観測した事実',
  '観測蓄積型',
];

function findAll(text: string, term: string, rule: string): NaturalnessViolation[] {
  const results: NaturalnessViolation[] = [];
  let idx = text.indexOf(term);
  while (idx >= 0) {
    results.push({ rule, match: term, index: idx });
    idx = text.indexOf(term, idx + 1);
  }
  return results;
}

/** A: Forbidden internal analysis terms */
export function checkForbiddenInternalTerms(text: string): NaturalnessViolation[] {
  return FORBIDDEN_INTERNAL_TERMS.flatMap(term =>
    findAll(text, term, 'forbidden_internal_term'),
  );
}

/** B: Forbidden mechanical / computation-framing phrases */
export function checkForbiddenMechanicalPhrases(text: string): NaturalnessViolation[] {
  return FORBIDDEN_MECHANICAL_PHRASES.flatMap(phrase =>
    findAll(text, phrase, 'forbidden_mechanical_phrase'),
  );
}

/** C: Raw computation disclosure (subset of mechanical, surfaced separately) */
export function checkRawComputationDisclosure(text: string): NaturalnessViolation[] {
  return FORBIDDEN_RAW_COMPUTATION.flatMap(term =>
    findAll(text, term, 'raw_computation_disclosure'),
  );
}

/** D: Scientific observation vocabulary in user-facing copy */
export function checkForbiddenObservationTerms(text: string): NaturalnessViolation[] {
  return FORBIDDEN_OBSERVATION_TERMS.flatMap(term =>
    findAll(text, term, 'forbidden_observation_term'),
  );
}

/** F: System-performance / speed-vs-accumulation framing */
export function checkForbiddenSystemFraming(text: string): NaturalnessViolation[] {
  return FORBIDDEN_SYSTEM_FRAMING.flatMap(term =>
    findAll(text, term, 'forbidden_system_framing'),
  );
}

/** G: Cold evaluator-perspective phrases (外からは〜見えても pattern) */
export function checkForbiddenColdEvaluationPhrases(text: string): NaturalnessViolation[] {
  return FORBIDDEN_COLD_EVALUATION_PHRASES.flatMap(phrase =>
    findAll(text, phrase, 'forbidden_cold_evaluation'),
  );
}

/**
 * E: Detect repeated sentences in the same block.
 * A sentence is defined as text ending with 。 or delimited by \n.
 * Only checks sentences longer than 15 chars (ignore short fragments).
 */
export function checkRepeatedSentenceNearby(text: string): NaturalnessViolation[] {
  const violations: NaturalnessViolation[] = [];
  const sentences = text
    .split(/(?<=。)|\n/)
    .map(s => s.trim())
    .filter(s => s.length > 15);
  const seen = new Map<string, number>();
  for (let i = 0; i < sentences.length; i++) {
    const s = sentences[i]!;
    const prev = seen.get(s);
    if (prev !== undefined) {
      violations.push({ rule: 'repeated_sentence_nearby', match: s, index: prev });
    } else {
      seen.set(s, i);
    }
  }
  return violations;
}

/**
 * Master naturalness check for a single block of user-facing visible copy.
 * Returns { pass: true } when all rules are satisfied.
 * Returns { pass: false, violations } for any failure — callers should log and reject.
 */
export function checkNaturalness(text: string): NaturalnessResult {
  const violations: NaturalnessViolation[] = [
    ...checkForbiddenInternalTerms(text),
    ...checkForbiddenMechanicalPhrases(text),
    ...checkRawComputationDisclosure(text),
    ...checkForbiddenObservationTerms(text),
    ...checkForbiddenSystemFraming(text),
    ...checkForbiddenColdEvaluationPhrases(text),
    ...checkRepeatedSentenceNearby(text),
  ];
  return { pass: violations.length === 0, violations };
}

/**
 * Convenience wrapper: throws if text fails the guard.
 * Use before storing any AI-generated body to a snapshot.
 */
export function assertNaturalness(text: string, label = 'visible copy'): void {
  const result = checkNaturalness(text);
  if (!result.pass) {
    const detail = result.violations.map(v => `[${v.rule}] "${v.match}"`).join(', ');
    throw new Error(`Naturalness guard failed for ${label}: ${detail}`);
  }
}
