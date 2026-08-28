/**
 * M55 Japanese commercial comprehension baseline runner.
 */

import {
  attachKnownHumanFindingId,
  countValidatedKnownHumanFindings,
  finalizeFindingSeverity,
  summarizeBaselinePass,
} from '../../../commercialQuality/japaneseComprehensionBaselinePolicy';
import {
  buildQuestionChoiceIndex,
  checkAmbiguousReference,
  checkCopyLengthAndClauses,
  checkCtaComprehension,
  checkExactDuplicateSubstantiveCopy,
  checkHedgeDensity,
  checkNearDuplicateSubstantiveCopy,
  checkOptionAxisConsistency,
  checkProductDiscoverability,
  checkProhibitedPublicTerms,
  checkQuestionAnswerability,
  checkQuestionSemantics,
  checkR6Ambiguity,
} from '../../../commercialQuality/japaneseComprehensionChecks';
import { bindRenderedCopyToGovernedInventory } from '../../../commercialQuality/japaneseComprehensionRenderedBinding';
import {
  JAPANESE_COMPREHENSION_SCHEMA_VERSION,
  type ComprehensionFinding,
  type CurrentProductFindingGroup,
  type JapaneseComprehensionBaselineReport,
  type SurfaceFamily,
} from '../../../commercialQuality/japaneseComprehensionTypes';
import { buildFrozenOpenBaselineRegistry } from './m55JapaneseComprehensionFrozenBaseline';
import {
  buildM55AiReviewCorpus,
  buildM55CtaComprehensionRegistry,
  buildM55GovernedCopyInventory,
  buildM55OptionAxisRegistrations,
  buildM55ProductDiscoverabilityRegistry,
  buildM55PublicProhibitedTerminology,
  countInventoryByFamily,
} from './m55JapaneseComprehensionInventory';
import { countParentDerivedOptionAxes } from './m55JapaneseComprehensionOptionSemantics';
import { computeQuestionAnswerabilitySourceFingerprint } from './m55JapaneseComprehensionQuestionSource';
import {
  countDiscoveredSourceItems,
  countUnregisteredGovernedCopy,
  evaluateSourceDomainCoverage,
  evaluateSourceIdentityCoverage,
} from './m55JapaneseComprehensionSourceCoverage';
import {
  buildPairScenarioMatrix,
  buildQuestionStageBindings,
  M55_NO_OBSERVATION_CHOICE_REGISTRY,
  pairScenarioMatrixCoverageCount,
  QUESTION_SEMANTIC_METADATA,
} from './m55PairScenarioMatrix';
import { questionsForRelationStage } from '../../compatibility/currentContextContract.v2';
import { RELATION_STATUS_IDS } from '../../compatibility/pairReadingCatalog.v1';

const SURFACE_MINIMUMS: Record<SurfaceFamily, number> = {
  HOME: 3,
  SELF: 10,
  PAIR: 20,
  SHARED: 8,
};

function finalizeFindings(rawFindings: ComprehensionFinding[]): ComprehensionFinding[] {
  const frozenRegistry = buildFrozenOpenBaselineRegistry();
  return rawFindings
    .map(attachKnownHumanFindingId)
    .map((finding) => finalizeFindingSeverity(finding, frozenRegistry));
}

function buildChoiceIndexByStageQuestion(): Map<string, readonly string[]> {
  const index = new Map<string, readonly string[]>();
  for (const stageId of RELATION_STATUS_IDS) {
    for (const q of questionsForRelationStage(stageId)) {
      index.set(`${stageId}|${q.questionId}`, q.choices.map((choice) => choice.answerId));
    }
  }
  return index;
}

function runRenderedBindingSelfTests(inventory: ReturnType<typeof buildM55GovernedCopyInventory>) {
  const homeHeading = inventory.find((e) => e.copyId === 'home.hero.heading');
  const homeBody = inventory.find((e) => e.copyId === 'home.hero.body');
  const homeCta = inventory.find((e) => e.copyId === 'home.cta.primary');

  const shortSubstringFail = bindRenderedCopyToGovernedInventory({
    surfaceId: 'm55:public.home',
    runtimeStateId: 'home.hero',
    observedTexts: [homeHeading?.visibleText.slice(0, 4) ?? '短'],
    observedCtaLabels: [],
    expectedCopy: homeHeading
      ? [{ copyId: homeHeading.copyId, visibleText: homeHeading.visibleText, copyRole: 'HEADING' }]
      : [],
    expectedCtas: [],
  });

  const exactCopyPass =
    homeHeading && homeBody
      ? bindRenderedCopyToGovernedInventory({
          surfaceId: 'm55:public.home',
          runtimeStateId: 'home.hero',
          observedTexts: [homeHeading.visibleText, homeBody.visibleText],
          observedCtaLabels: [],
          expectedCopy: [
            { copyId: homeHeading.copyId, visibleText: homeHeading.visibleText, copyRole: 'HEADING' },
            { copyId: homeBody.copyId, visibleText: homeBody.visibleText, copyRole: 'BODY' },
          ],
          expectedCtas: [],
        })
      : null;

  const ctaBinding =
    homeCta
      ? bindRenderedCopyToGovernedInventory({
          surfaceId: 'm55:public.home',
          runtimeStateId: 'home.hero',
          observedTexts: [],
          observedCtaLabels: [homeCta.visibleText],
          expectedCopy: [],
          expectedCtas: [{ ctaId: homeCta.copyId, expectedLabel: homeCta.visibleText }],
        })
      : null;

  return {
    implemented: true,
    shortSubstringFalsePositiveTest: (shortSubstringFail.passed ? 'FAIL' : 'PASS') as 'PASS' | 'FAIL',
    exactCopyTest: (exactCopyPass?.passed ? 'PASS' : 'FAIL') as 'PASS' | 'FAIL',
    ctaBindingTest: (ctaBinding?.passed ? 'PASS' : 'FAIL') as 'PASS' | 'FAIL',
    unexpectedCandidateStatus: 'NOT_EVALUATED' as const,
  };
}

export function runM55JapaneseComprehensionBaseline(): JapaneseComprehensionBaselineReport {
  const structuralFailures: string[] = [];
  const inventory = buildM55GovernedCopyInventory();
  const optionAxes = buildM55OptionAxisRegistrations();
  const ctaRegistry = buildM55CtaComprehensionRegistry();
  const productRegistry = buildM55ProductDiscoverabilityRegistry(inventory);
  const scenarioMatrix = buildPairScenarioMatrix();
  const stageBindings = buildQuestionStageBindings();
  const choiceIndex = buildQuestionChoiceIndex(stageBindings, buildChoiceIndexByStageQuestion());
  const aiCorpus = buildM55AiReviewCorpus(inventory);
  const sourceDomainCoverage = evaluateSourceDomainCoverage(inventory);
  const sourceIdentityCoverage = evaluateSourceIdentityCoverage(inventory);
  const frozenRegistry = buildFrozenOpenBaselineRegistry();

  if (inventory.length === 0) structuralFailures.push('inventory_empty');

  const discoveredFromSources = countDiscoveredSourceItems();
  const unregisteredCopy = countUnregisteredGovernedCopy(inventory, sourceIdentityCoverage);
  if (unregisteredCopy > 0) {
    structuralFailures.push(`unregistered_governed_copy:${unregisteredCopy}`);
  }
  if (sourceDomainCoverage.missing > 0) {
    structuralFailures.push(`source_domain_missing:${sourceDomainCoverage.missing}`);
  }
  if (sourceIdentityCoverage.unmappedGovernedCopy > 0) {
    structuralFailures.push(`unmapped_governed_copy:${sourceIdentityCoverage.unmappedGovernedCopy}`);
  }
  if (sourceIdentityCoverage.missingIdentities > 0) {
    structuralFailures.push(`source_identity_missing:${sourceIdentityCoverage.missingIdentities}`);
  }
  if (sourceIdentityCoverage.fingerprintMismatches > 0) {
    structuralFailures.push(`source_identity_fingerprint_mismatch:${sourceIdentityCoverage.fingerprintMismatches}`);
  }
  if (sourceIdentityCoverage.duplicateIdentities > 0) {
    structuralFailures.push(`source_identity_duplicate:${sourceIdentityCoverage.duplicateIdentities}`);
  }

  const rawFindings: ComprehensionFinding[] = [];

  for (const entry of inventory) {
    rawFindings.push(
      ...checkCopyLengthAndClauses(entry),
      ...checkAmbiguousReference(entry),
      ...checkHedgeDensity(entry),
      ...checkProhibitedPublicTerms(entry, buildM55PublicProhibitedTerminology()),
    );
    if (entry.copyId === 'pair.relation_stage.R6') {
      const r6 = checkR6Ambiguity(entry);
      if (r6) rawFindings.push(r6);
    }
  }

  rawFindings.push(
    ...checkExactDuplicateSubstantiveCopy(inventory),
    ...checkNearDuplicateSubstantiveCopy(inventory),
    ...checkOptionAxisConsistency(optionAxes, inventory),
    ...checkCtaComprehension(ctaRegistry),
    ...checkProductDiscoverability(productRegistry),
    ...checkQuestionAnswerability(scenarioMatrix, computeQuestionAnswerabilitySourceFingerprint),
    ...checkQuestionSemantics({
      metadata: QUESTION_SEMANTIC_METADATA,
      stageBindings,
      noObservationRegistry: M55_NO_OBSERVATION_CHOICE_REGISTRY,
      scenarioEvaluations: scenarioMatrix,
      choiceIndex,
    }),
  );

  const findings = finalizeFindings(rawFindings);

  const familyCounts = countInventoryByFamily(inventory);
  const surfaceCoverage = (Object.keys(SURFACE_MINIMUMS) as SurfaceFamily[]).reduce(
    (acc, family) => {
      const registered = familyCounts[family];
      acc[family] = {
        registered,
        requiredMinimum: SURFACE_MINIMUMS[family],
        covered: registered >= SURFACE_MINIMUMS[family],
      };
      return acc;
    },
    {} as JapaneseComprehensionBaselineReport['surfaceCoverage'],
  );

  for (const [family, summary] of Object.entries(surfaceCoverage)) {
    if (!summary.covered) {
      structuralFailures.push(`surface_coverage_insufficient:${family}`);
    }
  }

  const questionIds = new Set(
    inventory.filter((e) => e.copyRole === 'QUESTION' && e.surfaceFamily === 'PAIR').map((e) => e.copyId),
  );
  const questionsRequiringNoObservation = scenarioMatrix.filter(
    (e) => e.applicability === 'REQUIRES_NO_OBSERVATION',
  ).length;
  const questionsFailingAnswerability = scenarioMatrix.filter(
    (e) => !e.answerableWithoutFabrication && !e.explicitNoObservationPath,
  ).length;

  const knownHumanFindingsReproduced = countValidatedKnownHumanFindings(findings);
  if (knownHumanFindingsReproduced < 4) {
    structuralFailures.push(`known_human_finding_missing:${4 - knownHumanFindingsReproduced}`);
  }

  const finalPassSummary = summarizeBaselinePass({
    structuralFailures,
    findings,
    frozenRegistry,
    aiCorpusCount: aiCorpus.length,
  });

  const openBaselineMatched = findings.filter(
    (f) => f.severity === 'OPEN_BASELINE' && frozenRegistry.has(f.findingId),
  ).length;

  const relationStageSelectorCovered = optionAxes.some(
    (reg) => reg.selectorCopyId === 'pair.relation_stage.selector',
  );
  const parentDerivedOptionAxes = countParentDerivedOptionAxes(optionAxes);
  if (parentDerivedOptionAxes > 0) {
    structuralFailures.push(`parent_derived_option_axes:${parentDerivedOptionAxes}`);
  }

  const independentlyRegisteredOptionAxes = optionAxes.reduce(
    (sum, reg) => sum + new Set(reg.options.map((o) => o.semanticAxis)).size,
    0,
  );

  const materialP1Findings = findings.filter((f) => f.severity === 'P1');
  const currentProductPendingHuman = materialP1Findings.filter(
    (f) => !frozenRegistry.has(f.findingId),
  );
  const logicalGroupedDefects: CurrentProductFindingGroup[] = [];
  if (
    materialP1Findings.some(
      (f) =>
        f.category.startsWith('option_axis_mixed') &&
        f.findingId.includes('pair.relation_stage.selector'),
    )
  ) {
    logicalGroupedDefects.push('relation_stage_selector_mixed_semantic_dimensions');
  }
  if (materialP1Findings.some((f) => f.findingId === 'JC-Q-FABRICATION-decisionPace')) {
    logicalGroupedDefects.push('decisionPace_fabrication_risk');
  }
  if (
    materialP1Findings.some(
      (f) =>
        f.findingId === 'JC-Q-FABRICATION-disagreement' ||
        f.findingId === 'JC-Q-PARTNER-PRIVATE-disagreement',
    )
  ) {
    logicalGroupedDefects.push('disagreement_fabrication_private_state_risk');
  }
  if (materialP1Findings.some((f) => f.findingId === 'JC-Q-FABRICATION-returnPattern')) {
    logicalGroupedDefects.push('returnPattern_fabrication_risk');
  }

  const globalSourceCoverageClosure =
    sourceDomainCoverage.presentUngoverned === 0 && sourceDomainCoverage.missing === 0
      ? 'GREEN'
      : 'RED';
  const implementationIntegrity =
    structuralFailures.length === 0 &&
    finalPassSummary.materialP0Count === 0 &&
    finalPassSummary.unexpectedFindingCount === 0 &&
    finalPassSummary.identityFingerprintMismatchCount === 0 &&
    parentDerivedOptionAxes === 0
      ? 'GREEN'
      : 'RED';
  const currentProductComprehensionGate =
    finalPassSummary.materialP1Count === 0 ? 'GREEN' : 'RED';

  const verifiedStageSpecificNoObservationPaths = Object.values(M55_NO_OBSERVATION_CHOICE_REGISTRY).reduce(
    (sum, entries) => sum + entries.length,
    0,
  );

  const sellableProducts = productRegistry.filter((p) => p.purchaseType !== 'none');
  const sellableSkus = sellableProducts.length;
  const valueBoundSkus = sellableProducts.filter((p) => p.valuePropositionPresent).length;

  const answerOptionAiCoverage = aiCorpus.filter(
    (item) => item.role === 'ANSWER_OPTION' && item.reviewPolicy === 'AI_REQUIRED',
  ).length;
  const unclassifiedGovernedRoles = inventory.filter(
    (entry) => !aiCorpus.some((item) => item.copyId === entry.copyId),
  ).length;

  const renderedBinding = runRenderedBindingSelfTests(inventory);

  return {
    schemaVersion: JAPANESE_COMPREHENSION_SCHEMA_VERSION,
    inventory: {
      totalGovernedCopy: inventory.length,
      registeredCopy: inventory.length - unregisteredCopy,
      unregisteredCopy,
      discoveredFromSources,
    },
    sourceDomainCoverage,
    sourceIdentityCoverage,
    frozenBaseline: {
      literalEntriesCount: frozenRegistry.size,
      dynamicSourceDerivedEntries: 0,
      identityFingerprintMismatches: finalPassSummary.identityFingerprintMismatchCount,
      currentMatchedCount: openBaselineMatched,
      unexpectedFindingCount: finalPassSummary.unexpectedFindingCount,
      newCurrentFindingsNotFrozen: finalPassSummary.newCurrentFindingCount,
      questionSourceFingerprintBound: true,
    },
    controlPlaneIntegrity: {
      implementationIntegrity,
      globalSourceCoverageClosure,
      currentProductComprehensionGate,
    },
    currentProductFindings: {
      rawP1Count: materialP1Findings.length,
      autoFrozenCount: 0,
      pendingHumanDecisionCount: currentProductPendingHuman.length,
      logicalGroupedDefects,
    },
    comprehensionStatus: {
      machineGateStatus: finalPassSummary.machineGateStatus,
      aiReviewStatus: finalPassSummary.aiReviewStatus,
      humanApprovalStatus: finalPassSummary.humanApprovalStatus,
      overallComprehensionStatus: finalPassSummary.overallComprehensionStatus,
    },
    aiStatus: {
      machineGateStatus: finalPassSummary.machineGateStatus,
      aiReviewStatus: finalPassSummary.aiReviewStatus,
      humanApprovalStatus: finalPassSummary.humanApprovalStatus,
      overallComprehensionStatus: finalPassSummary.overallComprehensionStatus,
      aiCorpusItems: aiCorpus.length,
      answerOptionAiCoverage,
      unclassifiedGovernedRoles,
      aiAutoGreenCount: 0,
    },
    productValue: {
      sellableSkus,
      valueBoundSkus,
      missingValuePropositions: sellableSkus - valueBoundSkus,
    },
    renderedBinding,
    questionSemantics: {
      logicalQuestions: QUESTION_SEMANTIC_METADATA.length,
      stageBindings: stageBindings.length,
      stageSetMismatches: findings.filter((f) => f.category === 'question_stage_mismatch').length,
      missingMetadata: findings.filter((f) => f.category === 'question_metadata_missing').length,
      invalidNoObservationRegistrations: findings.filter(
        (f) =>
          f.category === 'question_no_observation_false_claim' ||
          f.category === 'question_no_observation_invalid_registration',
      ).length,
      verifiedStageSpecificNoObservationPaths,
      registryKeyMismatches: findings.filter(
        (f) => f.category === 'question_no_observation_registry_key_mismatch',
      ).length,
      invalidNoObservationAnswerIds: findings.filter(
        (f) => f.category === 'question_no_observation_invalid_registration',
      ).length,
      partialStageUnsafeFindings: findings.filter(
        (f) =>
          (f.category === 'question_partner_private_dependency' ||
            f.category === 'question_fabrication_risk') &&
          f.severity === 'P1' &&
          f.deterministicEvidence.includes('unsafeStages='),
      ).length,
      partnerPrivateMaterialFindings: findings.filter(
        (f) => f.category === 'question_partner_private_dependency' && f.severity === 'P1',
      ).length,
      fabricationMaterialFindings: findings.filter(
        (f) => f.category === 'question_fabrication_risk' && f.severity === 'P1',
      ).length,
    },
    optionAxisSummary: {
      selectors: optionAxes.length,
      relationStageSelectorCovered,
      options: optionAxes.reduce((sum, reg) => sum + reg.options.length, 0),
      independentlyRegisteredOptionAxes,
      parentDerivedOptionAxes,
      unknownAxes: findings.filter((f) => f.category === 'option_axis_missing').length,
      missingOptionRegistrations: findings.filter((f) => f.category === 'option_axis_option_unregistered').length,
      mixedAxisFindings: findings.filter((f) => f.category.startsWith('option_axis_mixed')).length,
    },
    surfaceCoverage,
    questionCount: questionIds.size,
    questionApplicabilityCovered: scenarioMatrix.length,
    questionsRequiringNoObservation,
    questionsFailingAnswerability,
    pairScenarioMatrixCoverage: pairScenarioMatrixCoverageCount(),
    optionAxisFindings: findings.filter((f) => f.category.startsWith('option_axis')).length,
    prohibitedTerminologyFindings: findings.filter((f) => f.category === 'prohibited_terminology').length,
    ambiguityFindings: findings.filter((f) => f.category.includes('ambigu')).length,
    duplicateResultFindings: findings.filter((f) => f.category.includes('duplicate')).length,
    vagueHedgeReviewFindings: findings.filter((f) => f.category === 'vague_hedge_density').length,
    ctaFindings: findings.filter((f) => f.category.startsWith('cta_') || f.category.startsWith('share_')).length,
    productDiscoverabilityFindings: findings.filter((f) => f.category.startsWith('product_')).length,
    materialP0Count: finalPassSummary.materialP0Count,
    materialP1Count: finalPassSummary.materialP1Count,
    unexpectedFindingCount: finalPassSummary.unexpectedFindingCount,
    p0Count: findings.filter((f) => f.severity === 'P0').length,
    p1Count: findings.filter((f) => f.severity === 'P1').length,
    p2Count: findings.filter((f) => f.severity === 'P2').length,
    pendingAiReviewCount: finalPassSummary.pendingAiReviewCount,
    openBaselineCount: finalPassSummary.openBaselineCount,
    knownHumanFindingsReproduced,
    aiReviewCorpusItemCount: aiCorpus.length,
    aiAutoGreenCount: 0,
    findings,
    structuralFailures,
    passed: finalPassSummary.passed,
    machineGatePassed: finalPassSummary.machineGateStatus === 'PASS',
  };
}

export function summarizeJapaneseComprehensionBaselineForVerifier(): {
  passed: boolean;
  durableComprehensionGatePassed: boolean;
  implementationGatePassed: boolean;
  machineGatePassed: boolean;
  machineGateStatus: 'PASS' | 'FAIL';
  aiReviewStatus: 'PENDING' | 'COMPLETE';
  humanApprovalStatus: 'REQUIRED' | 'APPROVED';
  overallComprehensionStatus:
    | 'BLOCKED_MACHINE'
    | 'PENDING_AI_REVIEW'
    | 'PENDING_HUMAN_APPROVAL'
    | 'USER_VISIBLE_CLOSED_GREEN';
  knownHumanFindingsReproduced: number;
  structuralFailures: readonly string[];
  inventoryTotal: number;
  aiAutoGreenCount: number;
  materialP0Count: number;
  materialP1Count: number;
  unexpectedFindingCount: number;
  sourceDomainMissing: number;
  sourceDomainPresentUngoverned: number;
  unregisteredCopy: number;
  unmappedGovernedCopy: number;
  newCurrentFindingsNotFrozen: number;
  implementationIntegrity: 'GREEN' | 'RED';
  currentProductComprehensionGate: 'GREEN' | 'RED';
  globalSourceCoverageClosure: 'GREEN' | 'RED';
  parentDerivedOptionAxes: number;
} {
  const report = runM55JapaneseComprehensionBaseline();
  const durableComprehensionGatePassed =
    report.structuralFailures.length === 0 &&
    report.materialP0Count === 0 &&
    report.materialP1Count === 0 &&
    report.unexpectedFindingCount === 0 &&
    report.controlPlaneIntegrity.globalSourceCoverageClosure === 'GREEN' &&
    report.sourceDomainCoverage.presentUngoverned === 0 &&
    report.sourceDomainCoverage.missing === 0;
  const implementationGatePassed =
    report.controlPlaneIntegrity.implementationIntegrity === 'GREEN' &&
    report.knownHumanFindingsReproduced === 4 &&
    report.aiAutoGreenCount === 0 &&
    report.inventory.unregisteredCopy === 0 &&
    report.sourceIdentityCoverage.fingerprintMismatches === 0;
  return {
    passed: durableComprehensionGatePassed,
    durableComprehensionGatePassed,
    implementationGatePassed,
    machineGatePassed: report.machineGatePassed,
    machineGateStatus: report.comprehensionStatus.machineGateStatus,
    aiReviewStatus: report.comprehensionStatus.aiReviewStatus,
    humanApprovalStatus: report.comprehensionStatus.humanApprovalStatus,
    overallComprehensionStatus: report.comprehensionStatus.overallComprehensionStatus,
    knownHumanFindingsReproduced: report.knownHumanFindingsReproduced,
    structuralFailures: report.structuralFailures,
    inventoryTotal: report.inventory.totalGovernedCopy,
    aiAutoGreenCount: report.aiAutoGreenCount,
    materialP0Count: report.materialP0Count,
    materialP1Count: report.materialP1Count,
    unexpectedFindingCount: report.unexpectedFindingCount,
    sourceDomainMissing: report.sourceDomainCoverage.missing,
    sourceDomainPresentUngoverned: report.sourceDomainCoverage.presentUngoverned,
    unregisteredCopy: report.inventory.unregisteredCopy,
    unmappedGovernedCopy: report.sourceIdentityCoverage.unmappedGovernedCopy,
    newCurrentFindingsNotFrozen: report.frozenBaseline.newCurrentFindingsNotFrozen,
    implementationIntegrity: report.controlPlaneIntegrity.implementationIntegrity,
    currentProductComprehensionGate: report.controlPlaneIntegrity.currentProductComprehensionGate,
    globalSourceCoverageClosure: report.controlPlaneIntegrity.globalSourceCoverageClosure,
    parentDerivedOptionAxes: report.optionAxisSummary.parentDerivedOptionAxes,
  };
}
