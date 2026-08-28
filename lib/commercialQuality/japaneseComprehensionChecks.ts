/**
 * Deterministic Japanese comprehension checks — repository-independent.
 */

import { questionsForRelationStage } from '../m55/compatibility/currentContextContract.v2';
import { RELATION_STATUS_CATALOG } from '../m55/compatibility/pairReadingCatalog.v1';
import type { RelationStatusId } from '../m55/compatibility/pairReadingTypes';
import type {
  ComprehensionFinding,
  CtaComprehensionEntry,
  GovernedCopyEntry,
  OptionAxisRegistration,
  ProductDiscoverabilityEntry,
  QuestionScenarioEvaluation,
  QuestionSemanticMetadata,
} from './japaneseComprehensionTypes';

const MAX_SENTENCE_CHARS = 180;
const MAX_CLAUSE_MARKERS = 4;
const HEDGE_MARKERS = ['かもしれ', 'ことがある', '傾向', 'やすい', 'しやすい'] as const;
const AMBIGUOUS_DEMONSTRATIVES = ['この', 'その', 'あの'] as const;
const ABSTRACT_NOUN_CHAIN = /(関係|距離|読み|傾向|状態|感情|気持ち).*(関係|距離|読み|傾向|状態|感情|気持ち)/;

export function checkCopyLengthAndClauses(entry: GovernedCopyEntry): ComprehensionFinding[] {
  const findings: ComprehensionFinding[] = [];
  const text = entry.visibleText.trim();
  if (!text) return findings;
  if (text.length > MAX_SENTENCE_CHARS && entry.copyRole !== 'BODY') {
    findings.push({
      findingId: `JC-LEN-${entry.copyId}`,
      copyId: entry.copyId,
      surfaceId: entry.surfaceId,
      runtimeStateId: entry.runtimeStateId,
      sourceOwner: entry.sourceOwner,
      category: 'excessive_length',
      severity: 'P2',
      userImpact: '一読で意味を取りにくい長さです。',
      deterministicEvidence: `length=${text.length} > ${MAX_SENTENCE_CHARS}`,
      aiReviewRequired: true,
      remediationDirection: '文を分割するか、主語・対象・時間軸を先に示す。',
      currentTextOrItem: text.slice(0, 80),
    });
  }
  const clauseMarkers = (text.match(/、|。/g) ?? []).length;
  if (clauseMarkers > MAX_CLAUSE_MARKERS) {
    findings.push({
      findingId: `JC-CLAUSE-${entry.copyId}`,
      copyId: entry.copyId,
      surfaceId: entry.surfaceId,
      runtimeStateId: entry.runtimeStateId,
      sourceOwner: entry.sourceOwner,
      category: 'nested_clauses',
      severity: 'PENDING_AI_REVIEW',
      userImpact: '節が多く、意味の取り違えが起きやすい可能性があります。',
      deterministicEvidence: `clauseMarkers=${clauseMarkers}`,
      aiReviewRequired: true,
      remediationDirection: '節構造を整理し、一節一義に近づける。',
      currentTextOrItem: text.slice(0, 80),
    });
  }
  return findings;
}

export function checkAmbiguousReference(entry: GovernedCopyEntry): ComprehensionFinding[] {
  const findings: ComprehensionFinding[] = [];
  const text = entry.visibleText;
  if (entry.copyRole === 'QUESTION' || entry.copyRole === 'ANSWER_OPTION' || entry.copyRole === 'BODY') {
    for (const marker of AMBIGUOUS_DEMONSTRATIVES) {
      if (text.includes(marker) && !text.includes('二人') && !text.includes('相手') && !text.includes('あなた')) {
        findings.push({
          findingId: `JC-REF-${entry.copyId}-${marker}`,
          copyId: entry.copyId,
          surfaceId: entry.surfaceId,
          runtimeStateId: entry.runtimeStateId,
          sourceOwner: entry.sourceOwner,
          category: 'ambiguous_reference',
          severity: 'PENDING_AI_REVIEW',
          userImpact: '指示語の対象を推測しなければならない可能性があります。',
          deterministicEvidence: `demonstrative=${marker}`,
          aiReviewRequired: true,
          remediationDirection: '主語・対象・時間軸を明示する。',
          currentTextOrItem: text,
        });
      }
    }
  }
  if (ABSTRACT_NOUN_CHAIN.test(text)) {
    findings.push({
      findingId: `JC-ABSTRACT-${entry.copyId}`,
      copyId: entry.copyId,
      surfaceId: entry.surfaceId,
      runtimeStateId: entry.runtimeStateId,
      sourceOwner: entry.sourceOwner,
      category: 'abstract_noun_chain',
      severity: 'PENDING_AI_REVIEW',
      userImpact: '抽象語が連続し、具体像が取りにくい可能性があります。',
      deterministicEvidence: 'abstract_noun_chain matched',
      aiReviewRequired: true,
      remediationDirection: '抽象語を減らし、観察可能な行為・場面に落とす。',
      currentTextOrItem: text,
    });
  }
  return findings;
}

export function checkHedgeDensity(entry: GovernedCopyEntry): ComprehensionFinding[] {
  if (entry.copyRole !== 'BODY' && entry.copyRole !== 'PRODUCT_VALUE') return [];
  const hits = HEDGE_MARKERS.filter((m) => entry.visibleText.includes(m));
  if (hits.length < 2) return [];
  return [
    {
      findingId: `JC-HEDGE-${entry.copyId}`,
      copyId: entry.copyId,
      surfaceId: entry.surfaceId,
      runtimeStateId: entry.runtimeStateId,
      sourceOwner: entry.sourceOwner,
      category: 'vague_hedge_density',
      severity: 'PENDING_AI_REVIEW',
      userImpact: '曖昧表現が多く、結果の具体性が弱く見える可能性があります。',
      deterministicEvidence: `hedges=${hits.join(',')}`,
      aiReviewRequired: true,
      remediationDirection: '観察可能な差分に言い換える。',
      currentTextOrItem: entry.visibleText.slice(0, 120),
    },
  ];
}

export function checkProhibitedPublicTerms(
  entry: GovernedCopyEntry,
  prohibitedPatterns: readonly { id: string; pattern: RegExp; reason: string }[],
): ComprehensionFinding[] {
  if (entry.audienceContext === 'internal') return [];
  const findings: ComprehensionFinding[] = [];
  for (const rule of prohibitedPatterns) {
    if (rule.pattern.test(entry.visibleText)) {
      findings.push({
        findingId: `JC-PROHIB-${entry.copyId}-${rule.id}`,
        copyId: entry.copyId,
        surfaceId: entry.surfaceId,
        runtimeStateId: entry.runtimeStateId,
        sourceOwner: entry.sourceOwner,
        category: 'prohibited_terminology',
        severity: 'P0',
        userImpact: '公開禁止用語が含まれています。',
        deterministicEvidence: rule.reason,
        aiReviewRequired: false,
        remediationDirection: '公開用語へ置換する。',
        currentTextOrItem: entry.visibleText,
      });
    }
  }
  return findings;
}

export function checkExactDuplicateSubstantiveCopy(entries: readonly GovernedCopyEntry[]): ComprehensionFinding[] {
  const substantive = entries.filter((e) => e.copyRole === 'BODY' || e.copyRole === 'PRODUCT_VALUE');
  const byText = new Map<string, GovernedCopyEntry[]>();
  for (const entry of substantive) {
    const normalized = entry.visibleText.trim();
    if (normalized.length < 12) continue;
    const bucket = byText.get(normalized) ?? [];
    bucket.push(entry);
    byText.set(normalized, bucket);
  }
  const findings: ComprehensionFinding[] = [];
  for (const [text, group] of byText) {
    if (group.length < 2) continue;
    findings.push({
      findingId: `JC-DUP-${group[0]!.copyId}`,
      copyId: group[0]!.copyId,
      surfaceId: group[0]!.surfaceId,
      runtimeStateId: group[0]!.runtimeStateId,
      sourceOwner: group.map((g) => g.sourceOwner).join(' | '),
      category: 'duplicate_result_copy',
      severity: 'P1',
      userImpact: '同じ実質文が繰り返され、読み味が薄くなる可能性があります。',
      deterministicEvidence: `duplicateCount=${group.length}`,
      aiReviewRequired: false,
      remediationDirection: '重複文を統合または差分を明示する。',
      currentTextOrItem: text.slice(0, 120),
    });
  }
  return findings;
}

export function checkNearDuplicateSubstantiveCopy(entries: readonly GovernedCopyEntry[]): ComprehensionFinding[] {
  const substantive = entries.filter((e) => e.copyRole === 'BODY');
  const findings: ComprehensionFinding[] = [];
  for (let i = 0; i < substantive.length; i += 1) {
    for (let j = i + 1; j < substantive.length; j += 1) {
      const a = substantive[i]!;
      const b = substantive[j]!;
      if (a.surfaceId !== b.surfaceId) continue;
      const ratio = overlapRatio(a.visibleText, b.visibleText);
      if (ratio >= 0.82 && a.visibleText.length >= 24) {
        findings.push({
          findingId: `JC-NEARDUP-${a.copyId}-${b.copyId}`,
          copyId: a.copyId,
          surfaceId: a.surfaceId,
          runtimeStateId: a.runtimeStateId,
          sourceOwner: a.sourceOwner,
          category: 'near_duplicate_result_copy',
          severity: 'P2',
          userImpact: '近い文言が繰り返され、情報価値が下がる可能性があります。',
          deterministicEvidence: `overlapRatio=${ratio.toFixed(2)}`,
          aiReviewRequired: true,
          remediationDirection: '差分を明示するか統合する。',
          currentTextOrItem: a.visibleText.slice(0, 80),
        });
      }
    }
  }
  return findings;
}

function overlapRatio(a: string, b: string): number {
  const setA = new Set(a.split(''));
  const setB = new Set(b.split(''));
  let intersection = 0;
  for (const ch of setA) {
    if (setB.has(ch)) intersection += 1;
  }
  return intersection / Math.max(setA.size, setB.size, 1);
}

function expectedOptionCopyIdsForSelector(selectorCopyId: string): readonly string[] {
  if (selectorCopyId === 'pair.relation_stage.selector') {
    return RELATION_STATUS_CATALOG.map((status) => `pair.relation_stage.${status.id}`);
  }
  const pairQuestionMatch = selectorCopyId.match(/^pair\.question\.(R[1-6])\.(.+)$/);
  if (!pairQuestionMatch) return [];
  const [, stageId, questionId] = pairQuestionMatch;
  const question = questionsForRelationStage(stageId as RelationStatusId).find(
    (entry) => entry.questionId === questionId,
  );
  if (!question) return [];
  return question.choices.map(
    (choice) => `pair.answer.${stageId}.${questionId}.${choice.answerId}`,
  );
}

export function checkOptionAxisConsistency(
  registrations: readonly OptionAxisRegistration[],
  inventory: readonly GovernedCopyEntry[],
): ComprehensionFinding[] {
  const findings: ComprehensionFinding[] = [];
  const inventoryById = new Map(inventory.map((entry) => [entry.copyId, entry]));

  for (const reg of registrations) {
    if (!reg.semanticAxis.trim() || reg.semanticAxis === 'unknown_axis') {
      findings.push({
        findingId: `JC-AXIS-MISSING-${reg.selectorCopyId}`,
        copyId: reg.selectorCopyId,
        surfaceId: null,
        runtimeStateId: null,
        sourceOwner: 'option_axis_registry',
        category: 'option_axis_missing',
        severity: 'P0',
        userImpact: '選択肢の意味軸が登録されていません。',
        deterministicEvidence: `semanticAxis=${reg.semanticAxis || 'empty'}`,
        aiReviewRequired: false,
        remediationDirection: '排他選択肢の比較軸を登録する。',
      });
    }

    const expectedOptionCopyIds = new Set(expectedOptionCopyIdsForSelector(reg.selectorCopyId));
    if (expectedOptionCopyIds.size > 0) {
      const registeredOptionIds = new Set(reg.options.map((option) => option.optionCopyId));
      for (const expectedCopyId of expectedOptionCopyIds) {
        if (!registeredOptionIds.has(expectedCopyId)) {
          findings.push({
            findingId: `JC-AXIS-MISSING-OPTION-${expectedCopyId}`,
            copyId: expectedCopyId,
            surfaceId: null,
            runtimeStateId: null,
            sourceOwner: 'option_axis_registry',
            category: 'option_axis_incomplete',
            severity: 'P1',
            userImpact: '実際の選択肢に対する意味軸登録が不足しています。',
            deterministicEvidence: `missingOptionRegistration=${expectedCopyId} selector=${reg.selectorCopyId}`,
            aiReviewRequired: false,
            remediationDirection: '実選択肢ごとに semantic registration を登録する。',
          });
        }
      }
      for (const option of reg.options) {
        if (!expectedOptionCopyIds.has(option.optionCopyId)) {
          findings.push({
            findingId: `JC-AXIS-EXTRA-OPTION-${reg.selectorCopyId}-${option.optionCopyId}`,
            copyId: option.optionCopyId,
            surfaceId: null,
            runtimeStateId: null,
            sourceOwner: 'option_axis_registry',
            category: 'option_axis_extra_registration',
            severity: 'P1',
            userImpact: '実選択肢に存在しない semantic registration が含まれています。',
            deterministicEvidence: `extraOptionRegistration=${option.optionCopyId} selector=${reg.selectorCopyId}`,
            aiReviewRequired: false,
            remediationDirection: '実ソースに存在しない option registration を除去する。',
          });
        }
      }
    }

    if (reg.options.length < 2) {
      findings.push({
        findingId: `JC-AXIS-COUNT-${reg.selectorCopyId}`,
        copyId: reg.selectorCopyId,
        surfaceId: null,
        runtimeStateId: null,
        sourceOwner: 'option_axis_registry',
        category: 'option_axis_incomplete',
        severity: 'P1',
        userImpact: '比較可能な選択肢集合が不足しています。',
        deterministicEvidence: `optionCount=${reg.options.length}`,
        aiReviewRequired: false,
        remediationDirection: '選択肢集合を完成させる。',
      });
    }

    const optionAxes = new Set<string>();
    for (const option of reg.options) {
      if (!inventoryById.has(option.optionCopyId)) {
        findings.push({
          findingId: `JC-AXIS-OPTION-MISSING-${option.optionCopyId}`,
          copyId: option.optionCopyId,
          surfaceId: null,
          runtimeStateId: null,
          sourceOwner: 'option_axis_registry',
          category: 'option_axis_option_unregistered',
          severity: 'P0',
          userImpact: '選択肢が在庫に登録されていません。',
          deterministicEvidence: `optionCopyId=${option.optionCopyId}`,
          aiReviewRequired: false,
          remediationDirection: 'optionCopyId を inventory に登録する。',
        });
        continue;
      }
      if (!option.semanticAxis.trim() || option.semanticAxis === 'unknown_axis') {
        findings.push({
          findingId: `JC-AXIS-OPTION-AXIS-${option.optionCopyId}`,
          copyId: option.optionCopyId,
          surfaceId: null,
          runtimeStateId: null,
          sourceOwner: 'option_axis_registry',
          category: 'option_axis_option_unknown',
          severity: 'P0',
          userImpact: '選択肢の意味軸が未登録です。',
          deterministicEvidence: `semanticAxis=${option.semanticAxis || 'empty'}`,
          aiReviewRequired: false,
          remediationDirection: '選択肢の semanticAxis を独立登録する。',
        });
      }
      if (!option.semanticValue.trim() || option.semanticValue === 'unknown_axis') {
        findings.push({
          findingId: `JC-AXIS-OPTION-VALUE-${option.optionCopyId}`,
          copyId: option.optionCopyId,
          surfaceId: null,
          runtimeStateId: null,
          sourceOwner: 'option_axis_registry',
          category: 'option_axis_option_unknown',
          severity: 'P0',
          userImpact: '選択肢の意味値が未登録です。',
          deterministicEvidence: `semanticValue=${option.semanticValue || 'empty'}`,
          aiReviewRequired: false,
          remediationDirection: '選択肢の semanticValue を登録する。',
        });
      }
      optionAxes.add(option.semanticAxis);
      if (option.semanticAxis !== reg.semanticAxis) {
        findings.push({
          findingId: `JC-AXIS-MIXED-${reg.selectorCopyId}-${option.optionCopyId}`,
          copyId: option.optionCopyId,
          surfaceId: null,
          runtimeStateId: null,
          sourceOwner: 'option_axis_registry',
          category: 'option_axis_mixed',
          severity: 'P1',
          userImpact: '排他選択肢がセレクタ軸と異なる意味軸を持っています。',
          deterministicEvidence: `selectorAxis=${reg.semanticAxis} optionAxis=${option.semanticAxis}`,
          aiReviewRequired: true,
          remediationDirection: '選択肢 semanticAxis をセレクタ軸に揃えるか、セレクタ定義を見直す。',
        });
      }
    }

    if (optionAxes.size > 1) {
      findings.push({
        findingId: `JC-AXIS-MIXED-SET-${reg.selectorCopyId}`,
        copyId: reg.selectorCopyId,
        surfaceId: null,
        runtimeStateId: null,
        sourceOwner: 'option_axis_registry',
        category: 'option_axis_mixed_set',
        severity: 'P1',
        userImpact: '選択肢集合が複数の意味カテゴリを含みます。',
        deterministicEvidence: `optionAxes=${[...optionAxes].join(',')}`,
        aiReviewRequired: true,
        remediationDirection: '比較軸を一つに揃えるか、混合軸を明示的に承認する。',
      });
    }
  }
  return findings;
}

export function checkCtaComprehension(entries: readonly CtaComprehensionEntry[]): ComprehensionFinding[] {
  const findings: ComprehensionFinding[] = [];
  for (const cta of entries) {
    if (!cta.userOutcome?.trim()) {
      findings.push({
        findingId: `JC-CTA-OUTCOME-${cta.ctaId}`,
        copyId: cta.ctaId,
        surfaceId: cta.surfaceId,
        runtimeStateId: cta.runtimeStateId,
        sourceOwner: cta.sourceOwner,
        category: 'cta_missing_user_outcome',
        severity: 'P1',
        userImpact: '押したあと何が得られるかが登録上不明です。',
        deterministicEvidence: 'userOutcome missing',
        aiReviewRequired: true,
        remediationDirection: 'userOutcome と commercialRole を明示する。',
        currentTextOrItem: cta.action,
      });
    }
    if (
      (cta.commercialRole === 'SHARE_TO_PARTNER' || cta.commercialRole === 'SHARE_TO_SOCIAL') &&
      !cta.userOutcome?.includes('motivation')
    ) {
      findings.push({
        findingId: `JC-CTA-SHARE-MOT-${cta.ctaId}`,
        copyId: cta.ctaId,
        surfaceId: cta.surfaceId,
        runtimeStateId: cta.runtimeStateId,
        sourceOwner: cta.sourceOwner,
        category: 'share_motivation_insufficient',
        severity: 'P1',
        userImpact: '共有の安全説明はあるが、共有したくなる動機が弱い可能性があります。',
        deterministicEvidence: 'share CTA lacks registered motivation outcome',
        aiReviewRequired: true,
        remediationDirection: '共有動機と受け手の体験価値を登録する。',
        currentTextOrItem: cta.action,
      });
    }
  }
  return findings;
}

export function checkProductDiscoverability(entries: readonly ProductDiscoverabilityEntry[]): ComprehensionFinding[] {
  const findings: ComprehensionFinding[] = [];
  for (const product of entries) {
    if (!product.firstClassMerchandise) {
      findings.push({
        findingId: `JC-PROD-DISC-${product.productKey}`,
        copyId: null,
        surfaceId: product.discoverySurfaces[0] ?? null,
        runtimeStateId: null,
        sourceOwner: 'product_discoverability_registry',
        category: 'product_not_first_class',
        severity: 'P1',
        userImpact: '技術的に購入可能でも、商品として発見しにくい状態です。',
        deterministicEvidence: `firstClassMerchandise=false discoverySurfaces=${product.discoverySurfaces.join(',') || 'none'}`,
        aiReviewRequired: false,
        remediationDirection: 'first-class merchandise surface を登録する。',
        currentTextOrItem: product.productKey,
      });
    }
    if (!product.valuePropositionPresent) {
      findings.push({
        findingId: `JC-PROD-VALUE-${product.productKey}`,
        copyId: null,
        surfaceId: null,
        runtimeStateId: null,
        sourceOwner: 'product_discoverability_registry',
        category: 'product_value_missing',
        severity: 'P1',
        userImpact: '商品価値の説明が登録されていません。',
        deterministicEvidence: 'valuePropositionPresent=false',
        aiReviewRequired: true,
        remediationDirection: 'value proposition を merchandise registry に追加する。',
      });
    }
  }
  return findings;
}

export function checkQuestionAnswerability(
  evaluations: readonly QuestionScenarioEvaluation[],
  sourceFingerprintFor?: (evaluation: QuestionScenarioEvaluation) => string,
): ComprehensionFinding[] {
  const findings: ComprehensionFinding[] = [];
  for (const ev of evaluations) {
    const ok = ev.answerableWithoutFabrication || ev.explicitNoObservationPath;
    if (ok) continue;
    const sourceFingerprint = sourceFingerprintFor?.(ev) ?? ev.questionId;
    findings.push({
      findingId: `JC-Q-ANS-${ev.scenarioId}-${ev.questionId}`,
      copyId: `question:${ev.questionId}`,
      surfaceId: `m55:pair.${ev.relationStageId}`,
      runtimeStateId: `pair.questionnaire.${ev.relationStageId}`,
      sourceOwner: 'm55PairScenarioMatrix',
      category: 'question_answerability',
      severity: 'P1',
      userImpact: '存在しない出来事を前提に答えを求める可能性があります。',
      deterministicEvidence: `scenario=${ev.scenarioId} applicability=${ev.applicability}`,
      aiReviewRequired: true,
      remediationDirection: 'NOT_APPLICABLE または EXPLICIT_NO_OBSERVATION_PATH を提供する。',
      currentTextOrItem: sourceFingerprint,
    });
  }
  return findings;
}

export function checkR6Ambiguity(copy: GovernedCopyEntry): ComprehensionFinding | null {
  if (!copy.visibleText.includes('長く一緒') || !copy.visibleText.includes('考え')) return null;
  return {
    findingId: 'JC-R6-AMBIGUITY',
    copyId: copy.copyId,
    surfaceId: copy.surfaceId,
    runtimeStateId: copy.runtimeStateId,
    sourceOwner: copy.sourceOwner,
    category: 'relation_stage_ambiguity',
    severity: 'P1',
    userImpact: '「長く一緒」の時間軸・関係段階が一読で取りにくい可能性があります。',
    deterministicEvidence: 'R6 label contains 長く一緒 + 考え without explicit timeframe',
    aiReviewRequired: true,
    remediationDirection: '時間軸と関係段階を明示する。',
    currentTextOrItem: copy.visibleText,
  };
}

export type QuestionStageBinding = {
  questionId: string;
  relationStageId: string;
};

export type NoObservationChoiceEntry = {
  relationStageId: string;
  questionId: string;
  answerId: string;
};

export type NoObservationChoiceRegistry = Readonly<Record<string, readonly NoObservationChoiceEntry[]>>;

export type QuestionChoiceIndex = ReadonlyMap<string, ReadonlySet<string>>;

function choiceKey(stageId: string, questionId: string): string {
  return `${stageId}|${questionId}`;
}

export function buildQuestionChoiceIndex(
  stageBindings: readonly QuestionStageBinding[],
  choicesByStageQuestion: ReadonlyMap<string, readonly string[]>,
): QuestionChoiceIndex {
  const index = new Map<string, Set<string>>();
  for (const binding of stageBindings) {
    const key = choiceKey(binding.relationStageId, binding.questionId);
    const choices = choicesByStageQuestion.get(key) ?? [];
    index.set(key, new Set(choices));
  }
  return index;
}

function hasVerifiedNoObservationForStage(
  questionId: string,
  stageId: string,
  registry: NoObservationChoiceRegistry,
  choiceIndex?: QuestionChoiceIndex,
): boolean {
  const entries = registry[questionId] ?? [];
  return entries.some(
    (entry) =>
      entry.questionId === questionId &&
      entry.relationStageId === stageId &&
      choiceIndex?.get(choiceKey(stageId, questionId))?.has(entry.answerId),
  );
}

function fabricationMitigatedForStage(
  meta: QuestionSemanticMetadata,
  stageId: string,
  scenarioEvaluations: readonly QuestionScenarioEvaluation[],
  registry: NoObservationChoiceRegistry,
  choiceIndex?: QuestionChoiceIndex,
): boolean {
  const stageScenarios = scenarioEvaluations.filter(
    (ev) => ev.questionId === meta.questionId && ev.relationStageId === stageId,
  );
  const applicable = stageScenarios.filter((ev) => ev.applicability !== 'NOT_APPLICABLE');
  if (applicable.length === 0) return true;
  if (hasVerifiedNoObservationForStage(meta.questionId, stageId, registry, choiceIndex)) {
    return true;
  }
  return applicable.every((ev) => ev.explicitNoObservationPath);
}

export function checkQuestionSemantics(input: {
  metadata: readonly QuestionSemanticMetadata[];
  stageBindings: readonly QuestionStageBinding[];
  noObservationRegistry: NoObservationChoiceRegistry;
  scenarioEvaluations?: readonly QuestionScenarioEvaluation[];
  choiceIndex?: QuestionChoiceIndex;
}): ComprehensionFinding[] {
  const findings: ComprehensionFinding[] = [];
  const metadataByQuestion = new Map(input.metadata.map((m) => [m.questionId, m]));
  const bindingsByQuestion = new Map<string, Set<string>>();

  for (const binding of input.stageBindings) {
    const stages = bindingsByQuestion.get(binding.questionId) ?? new Set<string>();
    stages.add(binding.relationStageId);
    bindingsByQuestion.set(binding.questionId, stages);
  }

  for (const [registryKey, entries] of Object.entries(input.noObservationRegistry)) {
    for (const entry of entries) {
      if (registryKey !== entry.questionId) {
        findings.push({
          findingId: `JC-Q-NO-OBS-KEY-${registryKey}-${entry.questionId}`,
          copyId: `question:${entry.questionId}`,
          surfaceId: null,
          runtimeStateId: null,
          sourceOwner: 'question_semantic_metadata',
          category: 'question_no_observation_registry_key_mismatch',
          severity: 'P0',
          userImpact: 'NO_OBSERVATION registry key と questionId が一致しません。',
          deterministicEvidence: `registryKey=${registryKey} entryQuestionId=${entry.questionId}`,
          aiReviewRequired: false,
          remediationDirection: 'registry map key を entry.questionId に一致させる。',
          currentTextOrItem: entry.questionId,
        });
      }
    }
  }

  for (const [questionId, stages] of bindingsByQuestion) {
    const meta = metadataByQuestion.get(questionId);
    if (!meta) {
      findings.push({
        findingId: `JC-Q-META-MISSING-${questionId}`,
        copyId: `question:${questionId}`,
        surfaceId: null,
        runtimeStateId: null,
        sourceOwner: 'question_semantic_metadata',
        category: 'question_metadata_missing',
        severity: 'P0',
        userImpact: '質問の意味メタデータが未登録です。',
        deterministicEvidence: `questionId=${questionId}`,
        aiReviewRequired: false,
        remediationDirection: 'QuestionSemanticMetadata を登録する。',
        currentTextOrItem: questionId,
      });
      continue;
    }

    if (!meta.subjectReferent.trim() || !meta.timeFrame.trim() || !meta.observationRequirement.trim()) {
      findings.push({
        findingId: `JC-Q-META-INCOMPLETE-${questionId}`,
        copyId: meta.copyId,
        surfaceId: null,
        runtimeStateId: null,
        sourceOwner: 'question_semantic_metadata',
        category: 'question_metadata_incomplete',
        severity: 'P1',
        userImpact: '主語・時間軸・観察要件が不足しています。',
        deterministicEvidence: `subject=${meta.subjectReferent} time=${meta.timeFrame} observation=${meta.observationRequirement}`,
        aiReviewRequired: true,
        remediationDirection: 'subject/timeFrame/observationRequirement を補完する。',
        currentTextOrItem: questionId,
      });
    }

    if (!meta.answerSemanticAxis.trim() || meta.answerSemanticAxis === 'unknown_axis') {
      findings.push({
        findingId: `JC-Q-AXIS-UNKNOWN-${questionId}`,
        copyId: meta.copyId,
        surfaceId: null,
        runtimeStateId: null,
        sourceOwner: 'question_semantic_metadata',
        category: 'question_axis_unknown',
        severity: 'P0',
        userImpact: '回答軸が不明です。',
        deterministicEvidence: `answerSemanticAxis=${meta.answerSemanticAxis}`,
        aiReviewRequired: false,
        remediationDirection: 'answerSemanticAxis を登録する。',
        currentTextOrItem: questionId,
      });
    }

    for (const stageId of stages) {
      if (!meta.relationStageApplicability.includes(stageId)) {
        findings.push({
          findingId: `JC-Q-STAGE-MISMATCH-${stageId}-${questionId}`,
          copyId: meta.copyId,
          surfaceId: `m55:pair.${stageId}`,
          runtimeStateId: `pair.questionnaire.${stageId}`,
          sourceOwner: 'question_semantic_metadata',
          category: 'question_stage_mismatch',
          severity: 'P1',
          userImpact: '実際の段階出現とメタデータ適用範囲が一致しません。',
          deterministicEvidence: `stage=${stageId} applicability=${meta.relationStageApplicability.join(',')}`,
          aiReviewRequired: false,
          remediationDirection: 'relationStageApplicability を実ソースに合わせる。',
          currentTextOrItem: questionId,
        });
      }
    }

    for (const stageId of meta.relationStageApplicability) {
      if (!stages.has(stageId)) {
        findings.push({
          findingId: `JC-Q-STAGE-EXTRA-${stageId}-${questionId}`,
          copyId: meta.copyId,
          surfaceId: `m55:pair.${stageId}`,
          runtimeStateId: `pair.questionnaire.${stageId}`,
          sourceOwner: 'question_semantic_metadata',
          category: 'question_stage_mismatch',
          severity: 'P1',
          userImpact: 'メタデータ適用範囲に実ソース未出現の段階が含まれます。',
          deterministicEvidence: `metadataStage=${stageId} actualStages=${[...stages].join(',')}`,
          aiReviewRequired: false,
          remediationDirection: 'relationStageApplicability から未出現段階を除去する。',
          currentTextOrItem: questionId,
        });
      }
    }

    const registeredNoObservation = input.noObservationRegistry[questionId] ?? [];
    for (const entry of registeredNoObservation) {
      const key = choiceKey(entry.relationStageId, entry.questionId);
      const choices = input.choiceIndex?.get(key);
      if (!choices || !choices.has(entry.answerId)) {
        findings.push({
          findingId: `JC-Q-NO-OBS-INVALID-${entry.relationStageId}-${entry.questionId}-${entry.answerId}`,
          copyId: meta.copyId,
          surfaceId: `m55:pair.${entry.relationStageId}`,
          runtimeStateId: `pair.questionnaire.${entry.relationStageId}`,
          sourceOwner: 'question_semantic_metadata',
          category: 'question_no_observation_invalid_registration',
          severity: 'P0',
          userImpact: 'NO_OBSERVATION 登録が実選択肢と一致しません。',
          deterministicEvidence: `stage=${entry.relationStageId} question=${entry.questionId} answer=${entry.answerId}`,
          aiReviewRequired: false,
          remediationDirection: '実選択肢に存在する answerId のみ登録する。',
          currentTextOrItem: questionId,
        });
      }
    }

    if (meta.noObservationAvailable && registeredNoObservation.length === 0) {
      findings.push({
        findingId: `JC-Q-NO-OBS-FALSE-${questionId}`,
        copyId: meta.copyId,
        surfaceId: null,
        runtimeStateId: null,
        sourceOwner: 'question_semantic_metadata',
        category: 'question_no_observation_false_claim',
        severity: 'P0',
        userImpact: 'NO_OBSERVATION 選択肢が実ソースに存在しないのに true と登録されています。',
        deterministicEvidence: 'noObservationAvailable=true without registered choice marker',
        aiReviewRequired: false,
        remediationDirection: '実選択肢に NO_OBSERVATION マーカーを追加するか metadata を false にする。',
        currentTextOrItem: questionId,
      });
    }

    if (meta.partnerPrivateStateDependency) {
      const unsafeStages = [...stages].filter(
        (stageId) =>
          !hasVerifiedNoObservationForStage(
            meta.questionId,
            stageId,
            input.noObservationRegistry,
            input.choiceIndex,
          ),
      );
      if (unsafeStages.length > 0) {
        findings.push({
          findingId: `JC-Q-PARTNER-PRIVATE-${questionId}`,
          copyId: meta.copyId,
          surfaceId: null,
          runtimeStateId: null,
          sourceOwner: 'question_semantic_metadata',
          category: 'question_partner_private_dependency',
          severity: 'P1',
          userImpact: '相手の私的状態に依存し、段階ごとの観察可能な代替パスがありません。',
          deterministicEvidence: `unsafeStages=${unsafeStages.join(',')}`,
          aiReviewRequired: true,
          remediationDirection: '各適用段階で観察可能な代替パスを提供する。',
          currentTextOrItem: questionId,
        });
      }
    }

    if (meta.fabricationRisk && input.scenarioEvaluations) {
      const unsafeStages = [...stages].filter(
        (stageId) =>
          !fabricationMitigatedForStage(
            meta,
            stageId,
            input.scenarioEvaluations!,
            input.noObservationRegistry,
            input.choiceIndex,
          ),
      );
      if (unsafeStages.length > 0) {
        findings.push({
          findingId: `JC-Q-FABRICATION-${questionId}`,
          copyId: meta.copyId,
          surfaceId: null,
          runtimeStateId: null,
          sourceOwner: 'question_semantic_metadata',
          category: 'question_fabrication_risk',
          severity: 'P1',
          userImpact: '存在しない相互作用履歴を前提にするリスクがあり、段階ごとに緩和されていません。',
          deterministicEvidence: `unsafeStages=${unsafeStages.join(',')}`,
          aiReviewRequired: true,
          remediationDirection: '各適用段階で NOT_APPLICABLE / NO_OBSERVATION パスを整備する。',
          currentTextOrItem: questionId,
        });
      }
    }
  }

  for (const meta of input.metadata) {
    if (!bindingsByQuestion.has(meta.questionId)) {
      findings.push({
        findingId: `JC-Q-META-ORPHAN-${meta.questionId}`,
        copyId: meta.copyId,
        surfaceId: null,
        runtimeStateId: null,
        sourceOwner: 'question_semantic_metadata',
        category: 'question_metadata_orphan',
        severity: 'P2',
        userImpact: '未使用の質問メタデータがあります。',
        deterministicEvidence: `questionId=${meta.questionId}`,
        aiReviewRequired: false,
        remediationDirection: '未使用メタデータを削除するか段階出現を登録する。',
        currentTextOrItem: meta.questionId,
      });
    }
  }

  return findings;
}
