/**
 * Display-only semantic guard for hybrid_ai visible chapter Ⅲ (relationship).
 * Prevents s3_essence (stability/work) bodies from dominating a relationship chapter.
 */

const CHAPTER3_RELATIONSHIP_SEMANTIC_PASS: readonly string[] = [
  '近い人',
  '関係',
  '距離',
  '言葉',
  'やりとり',
  '相手',
  '受け取り',
  '伝え方',
];

const CHAPTER3_WORK_PROGRESS_SEMANTIC_FAIL: readonly string[] = [
  '仕事やこれからの動き',
  '進め方のコツ',
  '力が出やすい条件と安定',
  '作業',
  '優先順位',
];

/** True when stored body is safe to use as chapter Ⅲ primary narrative. */
export function passesRelationshipSemanticGuard(body: string): boolean {
  const text = body.trim();
  if (!text) return false;
  for (const phrase of CHAPTER3_WORK_PROGRESS_SEMANTIC_FAIL) {
    if (text.includes(phrase)) return false;
  }
  for (const phrase of CHAPTER3_RELATIONSHIP_SEMANTIC_PASS) {
    if (text.includes(phrase)) return true;
  }
  return false;
}

export function hybridAiChapter3PrimaryEligible(body: string): boolean {
  return passesRelationshipSemanticGuard(body);
}
