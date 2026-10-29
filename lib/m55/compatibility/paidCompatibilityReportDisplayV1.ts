import type {
  PaidCompatibilityChapter,
  PaidCompatibilityReportSnapshot,
} from './buildPaidCompatibilityReportV1';
import {
  paidCompatibilityPhrasePurpose,
  type PaidCompatibilityPhrasePurpose,
} from './buildPaidCompatibilityReportV1';

export const PAID_COMPATIBILITY_GENERATION_CONTRACT_VERSION =
  'paid_compatibility_generation_contract_v1' as const;

const GENERATION_CONTRACT_KEYS = [
  'version',
  'personAUsesFirstPerspective',
  'perspectiveLayout',
] as const;

export type PaidCompatibilityGenerationContractV1 = {
  readonly version: typeof PAID_COMPATIBILITY_GENERATION_CONTRACT_VERSION;
  readonly personAUsesFirstPerspective: boolean;
  readonly perspectiveLayout: 'product_ab_v1' | 'legacy_semantic_ab_v1';
};

export type PaidCompatibilityReportDisplayLimits = {
  readonly perspectiveLayoutCorrected: boolean;
  readonly sharedContextMerged: boolean;
  readonly uncorrectableLegacyPerspective: boolean;
  readonly legacyFieldFallbackApplied: boolean;
};

export const UNCORRECTABLE_SELF_PERSPECTIVE =
  'この保存形式では、あなた側の説明を安全に整えられないため、場面と整え方から読み返してください。';
export const UNCORRECTABLE_PARTNER_PERSPECTIVE =
  'この保存形式では、相手側の説明を安全に整えられないため、場面と連鎖から読み返してください。';
export const UNCORRECTABLE_RELATIONSHIP_LOOP_LINE =
  'この保存形式では、人物の読み取りを安全に整えられないため、場面と整え方から読み返してください。';
export const UNCORRECTABLE_RELATIONSHIP_LOOP: readonly string[] = Object.freeze([
  UNCORRECTABLE_RELATIONSHIP_LOOP_LINE,
]);
export const LEGACY_FIELD_RECOVERY_GUIDANCE =
  '一部の本文だけ保存形式の都合で整えられませんでした。場面・整え方・一言はそのまま使えます。開き直しても表示が直らない場合は、購入履歴の内容を添えてサポート（/support）から問い合わせください。';

export const LEGACY_FIELD_RECOVERY_GUIDANCE_LEAD =
  '一部の本文だけ保存形式の都合で整えられませんでした。場面・整え方・一言はそのまま使えます。開き直しても表示が直らない場合は、購入履歴の内容を添えて';

export const LEGACY_FIELD_RECOVERY_SUPPORT_HREF = '/support';

export const LEGACY_FIELD_RECOVERY_GUIDANCE_TAIL = 'から問い合わせください。';

export type LegacyFieldDisplayResult = {
  readonly chapter: PaidCompatibilityChapter;
  readonly limits: PaidCompatibilityReportDisplayLimits;
  readonly fieldsReplaced: readonly ('personA' | 'personB' | 'relationshipLoop')[];
};

export function parsePaidCompatibilityGenerationContract(
  value: unknown,
): PaidCompatibilityGenerationContractV1 | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  const item = value as Record<string, unknown>;
  const keys = Object.keys(item);
  if (keys.length !== GENERATION_CONTRACT_KEYS.length) {
    return null;
  }
  if (!GENERATION_CONTRACT_KEYS.every((key) => keys.includes(key))) {
    return null;
  }
  if (item.version !== PAID_COMPATIBILITY_GENERATION_CONTRACT_VERSION) {
    return null;
  }
  if (typeof item.personAUsesFirstPerspective !== 'boolean') {
    return null;
  }
  if (
    item.perspectiveLayout !== 'product_ab_v1' &&
    item.perspectiveLayout !== 'legacy_semantic_ab_v1'
  ) {
    return null;
  }
  return Object.freeze({
    version: PAID_COMPATIBILITY_GENERATION_CONTRACT_VERSION,
    personAUsesFirstPerspective: item.personAUsesFirstPerspective,
    perspectiveLayout: item.perspectiveLayout,
  });
}

export function phrasePurposeBlockLabel(purpose: PaidCompatibilityPhrasePurpose): string {
  return purpose === 'introspective'
    ? '自分の中で整理する言葉'
    : '相手とのやり取りに使う表現例';
}

export function displayPhraseSpeakerBlockLabel(
  speaker: PaidCompatibilityChapter['phraseSpeaker'],
  usablePhrase: string,
  phrasePurpose?: PaidCompatibilityPhrasePurpose,
): string {
  const purpose = phrasePurpose ?? (R1_PHRASE_FALLBACK.has(usablePhrase) ? 'introspective' : 'dialogue');
  if (purpose === 'introspective') {
    return phrasePurposeBlockLabel('introspective');
  }
  switch (speaker) {
    case 'personA':
      return 'あなた側の一言';
    case 'personB':
      return '相手側の言い方の例';
    case 'either':
      return '相手とのやり取りに使う表現例';
  }
}

const R1_PHRASE_FALLBACK: ReadonlySet<string> = new Set([
  '相手の反応を決めつけず、自分が置きたい言葉の形だけ一つ選ばない？',
  '近づくかどうかは後で決めて、今は短い一文だけ書き留めない？',
  '会話の前に、自分が知りたい一点だけ整理しない？',
  '相手の気持ちより、自分が確認したい一点だけ先に書かない？',
  'まだ言葉にしない前提で、自分が感じていることを一文で書き留めない？',
  '近づく前に、自分が確認したい一点だけ先に整理しない？',
]);

const SAFE_PARTNER_UNCERTAINTY =
  /相手については、.*(確かめにくい|決めにくい|読み取りにくい|見えにくい|読みやすい|反応材料が少ない)/;

function splitJaSentences(text: string): string[] {
  return text
    .split('。')
    .map((part) => part.trim())
    .filter(Boolean);
}

function joinJaSentences(parts: readonly string[]): string {
  if (parts.length === 0) return '';
  return `${parts.join('。')}。`;
}

function usesProductBuyerLayout(
  contract: PaidCompatibilityGenerationContractV1 | undefined,
): boolean {
  return contract?.perspectiveLayout === 'product_ab_v1';
}

function containsKnownStaleRoleMarkers(text: string): boolean {
  return /Aには|Bには/.test(text);
}

function legacyPerspectiveLooksInverted(
  personAPerspective: string,
  personBPerspective: string,
): boolean {
  const a = personAPerspective.trim();
  const b = personBPerspective.trim();
  const partnerLedA =
    /^相手/.test(a) ||
    a.includes('相手には、') ||
    a.includes('相手から見ると、');
  const youLedB =
    /^あなた/.test(b) ||
    b.includes('あなたから見ると、') ||
    b.includes('あなたには、');
  return partnerLedA && youLedB;
}

function partnerUncertaintyMisplacedInBuyerColumn(personAPerspective: string): boolean {
  const trimmed = personAPerspective.trim();
  return (
    /^相手については、/.test(trimmed) ||
    trimmed.includes('まだ反応材料が少ないため、あなたからは意味を決めにくい')
  );
}

function partnerColumnUsesBuyerVoice(text: string): boolean {
  const trimmed = text.trim();
  return /あなたは、/.test(text) || /^あなたから見ると、/.test(trimmed);
}

function legacySemanticFalseLayoutHeuristic(chapter: PaidCompatibilityChapter): boolean {
  return partnerColumnUsesBuyerVoice(chapter.personBPerspective);
}

/** Base @ feeffe33 stored B-role text in personA when personAUsesFirstPerspective was false. */
function legacyChapterUsesSemanticSwappedBuyerColumn(
  chapter: PaidCompatibilityChapter,
): boolean {
  return !chapter.personAPerspective.includes('あなた');
}

function legacyChapterNeedsStrictLoopSafety(chapter: PaidCompatibilityChapter): boolean {
  return (
    legacySemanticFalseLayoutHeuristic(chapter) ||
    legacyChapterUsesSemanticSwappedBuyerColumn(chapter)
  );
}

function loopContainsUnsafePersonClaims(
  loop: readonly string[],
  chapter?: PaidCompatibilityChapter,
): boolean {
  const blob = loop.join('');
  if (containsKnownStaleRoleMarkers(blob)) {
    return true;
  }
  if (/相手には、相手の/.test(blob)) {
    return true;
  }
  if (chapter && legacyChapterNeedsStrictLoopSafety(chapter)) {
    if (/あなたが先に動こう|あなたが先に動くと、相手からは返事を急かされている/u.test(blob)) {
      return true;
    }
    if (/相手には、/.test(blob) && !/相手から見ると、/.test(blob)) {
      return true;
    }
  }
  return false;
}

function fieldPersonAVerifiable(chapter: PaidCompatibilityChapter): boolean {
  if (legacyPerspectiveLooksInverted(chapter.personAPerspective, chapter.personBPerspective)) {
    return false;
  }
  if (containsKnownStaleRoleMarkers(chapter.personAPerspective)) {
    return false;
  }
  if (partnerUncertaintyMisplacedInBuyerColumn(chapter.personAPerspective)) {
    return false;
  }
  return chapter.personAPerspective.includes('あなた');
}

function fieldPersonBVerifiable(chapter: PaidCompatibilityChapter): boolean {
  if (legacyPerspectiveLooksInverted(chapter.personAPerspective, chapter.personBPerspective)) {
    return false;
  }
  if (containsKnownStaleRoleMarkers(chapter.personBPerspective)) {
    return false;
  }
  if (/^あなたから見ると、/.test(chapter.personBPerspective.trim())) {
    return false;
  }
  if (partnerColumnUsesBuyerVoice(chapter.personBPerspective)) {
    return false;
  }
  if (SAFE_PARTNER_UNCERTAINTY.test(chapter.personBPerspective)) {
    return true;
  }
  if (/相手は、/.test(chapter.personBPerspective)) {
    return true;
  }
  if (/相手から/.test(chapter.personBPerspective)) {
    return true;
  }
  return false;
}

function fieldRelationshipLoopVerifiable(chapter: PaidCompatibilityChapter): boolean {
  return !loopContainsUnsafePersonClaims(chapter.relationshipLoop, chapter);
}

function applyLegacyFieldSafety(
  chapter: PaidCompatibilityChapter,
  contract: PaidCompatibilityGenerationContractV1 | undefined,
): LegacyFieldDisplayResult {
  if (usesProductBuyerLayout(contract)) {
    return {
      chapter,
      limits: {
        perspectiveLayoutCorrected: false,
        sharedContextMerged: false,
        uncorrectableLegacyPerspective: false,
        legacyFieldFallbackApplied: false,
      },
      fieldsReplaced: [],
    };
  }

  if (legacyPerspectiveLooksInverted(chapter.personAPerspective, chapter.personBPerspective)) {
    return {
      chapter: {
        ...chapter,
        personAPerspective: UNCORRECTABLE_SELF_PERSPECTIVE,
        personBPerspective: UNCORRECTABLE_PARTNER_PERSPECTIVE,
        relationshipLoop: [...UNCORRECTABLE_RELATIONSHIP_LOOP],
      },
      limits: {
        perspectiveLayoutCorrected: false,
        sharedContextMerged: false,
        uncorrectableLegacyPerspective: true,
        legacyFieldFallbackApplied: true,
      },
      fieldsReplaced: ['personA', 'personB', 'relationshipLoop'],
    };
  }

  const fieldsReplaced: Array<'personA' | 'personB' | 'relationshipLoop'> = [];
  let personAPerspective = chapter.personAPerspective;
  let personBPerspective = chapter.personBPerspective;
  let relationshipLoop = chapter.relationshipLoop;

  if (contract?.perspectiveLayout === 'legacy_semantic_ab_v1') {
    if (!fieldPersonAVerifiable(chapter)) {
      personAPerspective = UNCORRECTABLE_SELF_PERSPECTIVE;
      fieldsReplaced.push('personA');
    }
    if (!fieldPersonBVerifiable(chapter)) {
      personBPerspective = UNCORRECTABLE_PARTNER_PERSPECTIVE;
      fieldsReplaced.push('personB');
    }
    if (!fieldRelationshipLoopVerifiable(chapter)) {
      relationshipLoop = UNCORRECTABLE_RELATIONSHIP_LOOP;
      fieldsReplaced.push('relationshipLoop');
    }
  } else if (!contract) {
    if (!fieldPersonAVerifiable(chapter)) {
      personAPerspective = UNCORRECTABLE_SELF_PERSPECTIVE;
      fieldsReplaced.push('personA');
    }
    if (!fieldPersonBVerifiable(chapter)) {
      personBPerspective = UNCORRECTABLE_PARTNER_PERSPECTIVE;
      fieldsReplaced.push('personB');
    }
    if (!fieldRelationshipLoopVerifiable(chapter)) {
      relationshipLoop = UNCORRECTABLE_RELATIONSHIP_LOOP;
      fieldsReplaced.push('relationshipLoop');
    }
  }

  const uncorrectableLegacyPerspective =
    fieldsReplaced.includes('personA') || fieldsReplaced.includes('personB');
  return {
    chapter: {
      ...chapter,
      personAPerspective,
      personBPerspective,
      relationshipLoop,
    },
    limits: {
      perspectiveLayoutCorrected: false,
      sharedContextMerged: false,
      uncorrectableLegacyPerspective,
      legacyFieldFallbackApplied: fieldsReplaced.length > 0,
    },
    fieldsReplaced,
  };
}

function mergeLeadingDuplicateSentences(chapter: PaidCompatibilityChapter): {
  chapter: PaidCompatibilityChapter;
  merged: boolean;
} {
  let sceneBase = chapter.scene.replace(/。+$/u, '');
  let scene = chapter.scene;
  const aParts = splitJaSentences(chapter.personAPerspective);
  const bParts = splitJaSentences(chapter.personBPerspective);
  let merged = false;
  while (aParts[0] && bParts[0] && aParts[0] === bParts[0]) {
    const sentence = aParts[0]!;
    aParts.shift();
    bParts.shift();
    merged = true;
    if (!sceneBase.includes(sentence)) {
      scene = `${sceneBase}。${sentence}。`;
      sceneBase = scene.replace(/。+$/u, '');
    }
  }
  if (!merged) {
    return { chapter, merged: false };
  }
  const personA = joinJaSentences(aParts) || chapter.personAPerspective;
  const personB = joinJaSentences(bParts) || chapter.personBPerspective;
  return {
    chapter: {
      ...chapter,
      scene,
      personAPerspective: personA,
      personBPerspective: personB,
    },
    merged: true,
  };
}

function normalizeLegacyPhraseSpeaker(
  chapter: PaidCompatibilityChapter,
  phrasePurpose: PaidCompatibilityPhrasePurpose,
): PaidCompatibilityChapter {
  if (phrasePurpose === 'introspective' && chapter.phraseSpeaker !== 'personA') {
    return { ...chapter, phraseSpeaker: 'personA' };
  }
  return chapter;
}

export function preparePaidCompatibilityChapterForDisplay(
  chapter: PaidCompatibilityChapter,
  contract?: PaidCompatibilityGenerationContractV1,
  relationStatusId?: Parameters<typeof paidCompatibilityPhrasePurpose>[0],
): LegacyFieldDisplayResult {
  const phrasePurpose =
    relationStatusId === undefined
      ? R1_PHRASE_FALLBACK.has(chapter.usablePhrase)
        ? 'introspective'
        : 'dialogue'
      : paidCompatibilityPhrasePurpose(
          relationStatusId,
          chapter.key,
          chapter.usablePhrase,
        );
  const withPhraseSpeaker = normalizeLegacyPhraseSpeaker(chapter, phrasePurpose);
  const { chapter: deduped, merged } = mergeLeadingDuplicateSentences(withPhraseSpeaker);
  const fieldSafe = applyLegacyFieldSafety(deduped, contract);
  return {
    chapter: fieldSafe.chapter,
    limits: {
      ...fieldSafe.limits,
      sharedContextMerged: merged,
    },
    fieldsReplaced: fieldSafe.fieldsReplaced,
  };
}

export function preparePaidCompatibilityReportForDisplay(
  snapshot: PaidCompatibilityReportSnapshot,
): PaidCompatibilityReportSnapshot {
  const contract =
    snapshot.generationContract === undefined
      ? undefined
      : parsePaidCompatibilityGenerationContract(snapshot.generationContract) ?? undefined;
  const relationStatusId = inferRelationStatusFromSnapshot(snapshot);
  return {
    ...snapshot,
    chapters: snapshot.chapters.map(
      (chapter) =>
        preparePaidCompatibilityChapterForDisplay(chapter, contract, relationStatusId).chapter,
    ),
  };
}

export function inferRelationStatusFromSnapshot(
  snapshot: PaidCompatibilityReportSnapshot,
): Parameters<typeof paidCompatibilityPhrasePurpose>[0] | undefined {
  const sceneBlob = snapshot.chapters.map((chapter) => chapter.scene).join('\n');
  if (/まだ会話がない|まだやり取りがなく/.test(sceneBlob)) {
    return 'R1';
  }
  if (/やり取りのリズム|連絡のあと/.test(sceneBlob)) {
    return 'R2';
  }
  if (/意見が分かれ|交際中/.test(sceneBlob)) {
    return 'R3';
  }
  if (/距離が|間合い/.test(sceneBlob)) {
    return 'R4';
  }
  if (/再接近|離れた後/.test(sceneBlob)) {
    return 'R5';
  }
  return 'R6';
}

export function paidCompatibilityReportDisplayLimits(
  snapshot: PaidCompatibilityReportSnapshot,
): PaidCompatibilityReportDisplayLimits {
  const contract =
    snapshot.generationContract === undefined
      ? undefined
      : parsePaidCompatibilityGenerationContract(snapshot.generationContract) ?? undefined;
  const relationStatusId = inferRelationStatusFromSnapshot(snapshot);
  let sharedContextMerged = false;
  let uncorrectableLegacyPerspective = false;
  let legacyFieldFallbackApplied = false;
  for (const chapter of snapshot.chapters) {
    const result = preparePaidCompatibilityChapterForDisplay(
      chapter,
      contract,
      relationStatusId,
    );
    sharedContextMerged ||= result.limits.sharedContextMerged;
    uncorrectableLegacyPerspective ||= result.limits.uncorrectableLegacyPerspective;
    legacyFieldFallbackApplied ||= result.limits.legacyFieldFallbackApplied;
  }
  return {
    perspectiveLayoutCorrected: false,
    sharedContextMerged,
    uncorrectableLegacyPerspective,
    legacyFieldFallbackApplied,
  };
}

export function paidCompatibilityPhraseBlockLabelForChapter(
  chapter: PaidCompatibilityChapter,
  relationStatusId?: Parameters<typeof paidCompatibilityPhrasePurpose>[0],
): string {
  const purpose =
    relationStatusId === undefined
      ? R1_PHRASE_FALLBACK.has(chapter.usablePhrase)
        ? 'introspective'
        : 'dialogue'
      : paidCompatibilityPhrasePurpose(
          relationStatusId,
          chapter.key,
          chapter.usablePhrase,
        );
  return displayPhraseSpeakerBlockLabel(
    chapter.phraseSpeaker,
    chapter.usablePhrase,
    purpose,
  );
}

/** Base-era saved snapshots omit generationContract; strip only for display fixtures. */
export function stripGenerationContractForLegacyFixture(
  snapshot: PaidCompatibilityReportSnapshot,
): PaidCompatibilityReportSnapshot {
  const { generationContract: _removed, ...rest } = snapshot;
  return rest as PaidCompatibilityReportSnapshot;
}
