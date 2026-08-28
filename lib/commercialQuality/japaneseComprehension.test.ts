import assert from 'node:assert/strict';
import test from 'node:test';

import {
  attachKnownHumanFindingId,
  computeBaselineEvidenceFingerprint,
  finalizeFindingSeverity,
  summarizeBaselinePass,
} from './japaneseComprehensionBaselinePolicy';
import {
  buildQuestionChoiceIndex,
  checkCtaComprehension,
  checkOptionAxisConsistency,
  checkProhibitedPublicTerms,
  checkQuestionAnswerability,
  checkQuestionSemantics,
  checkR6Ambiguity,
} from './japaneseComprehensionChecks';
import { bindRenderedCopyToGovernedInventory } from './japaneseComprehensionRenderedBinding';
import type {
  ComprehensionFinding,
  GovernedCopyEntry,
  OptionAxisRegistration,
} from './japaneseComprehensionTypes';
import {
  runM55JapaneseComprehensionBaseline,
  summarizeJapaneseComprehensionBaselineForVerifier,
} from '../m55/commercialUx/qualityControl/m55JapaneseComprehensionBaseline';
import {
  buildFrozenOpenBaselineRegistry,
  M55_FROZEN_OPEN_BASELINE_ENTRIES,
} from '../m55/commercialUx/qualityControl/m55JapaneseComprehensionFrozenBaseline';
import {
  buildM55GovernedCopyInventory,
  buildM55OptionAxisRegistrations,
} from '../m55/commercialUx/qualityControl/m55JapaneseComprehensionInventory';
import {
  buildM55OptionAxisRegistrationsFromGovernedSemantics,
} from '../m55/commercialUx/qualityControl/m55JapaneseComprehensionOptionSemantics';
import {
  evaluateSourceDomainCoverage,
} from '../m55/commercialUx/qualityControl/m55JapaneseComprehensionSourceCoverage';
import {
  computeQuestionAnswerabilityBaselineFingerprint,
  computeQuestionAnswerabilitySourceFingerprint,
} from '../m55/commercialUx/qualityControl/m55JapaneseComprehensionQuestionSource';
import {
  buildPairScenarioMatrix,
  buildQuestionStageBindings,
  M55_NO_OBSERVATION_CHOICE_REGISTRY,
  PAIR_SCENARIO_IDS,
  QUESTION_SEMANTIC_METADATA,
} from '../m55/commercialUx/qualityControl/m55PairScenarioMatrix';

const sampleEntry = (overrides: Partial<GovernedCopyEntry> = {}): GovernedCopyEntry => ({
  copyId: 'test.copy',
  surfaceId: 'm55:test',
  runtimeStateId: 'test.state',
  surfaceFamily: 'HOME',
  copyRole: 'BODY',
  sourceOwner: 'test',
  audienceContext: 'public',
  textRef: 'test',
  visibleText: 'テスト文です。',
  ...overrides,
});

test('R6 ambiguity generic invariant maps to GCJQ-01', () => {
  const finding = checkR6Ambiguity(
    sampleEntry({
      copyId: 'pair.relation_stage.R6',
      visibleText: '長く一緒にいることを考えている',
      copyRole: 'ANSWER_OPTION',
    }),
  );
  assert.ok(finding);
  const attached = attachKnownHumanFindingId(finding!);
  assert.equal(attached.knownHumanFindingId, 'GCJQ-01');
});

test('injected prohibited public term P0 fails fail-closed summary', () => {
  const entry = sampleEntry({ visibleText: '保存版テスト' });
  const findings = checkProhibitedPublicTerms(entry, [
    { id: 'hozonban', pattern: /保存版/, reason: 'prohibited' },
  ]);
  const summary = summarizeBaselinePass({ structuralFailures: [], findings, frozenRegistry: new Map(), aiCorpusCount: 0 });
  assert.equal(summary.materialP0Count, 1);
  assert.equal(summary.machineGateStatus, 'FAIL');
});

test('non-baselined P1 fails fail-closed summary', () => {
  const findings: ComprehensionFinding[] = [
    {
      findingId: 'JC-NOVEL-P1',
      copyId: 'novel',
      surfaceId: null,
      runtimeStateId: null,
      sourceOwner: 'test',
      category: 'novel_regression',
      severity: 'P1',
      userImpact: 'novel',
      deterministicEvidence: 'novel',
      aiReviewRequired: false,
      remediationDirection: 'fix',
    },
  ];
  const summary = summarizeBaselinePass({ structuralFailures: [], findings, frozenRegistry: new Map(), aiCorpusCount: 0 });
  assert.equal(summary.materialP1Count, 1);
  assert.equal(summary.machineGateStatus, 'FAIL');
});

test('PENDING_AI_REVIEW does not make machine gate GREEN by itself', () => {
  const findings: ComprehensionFinding[] = [
    {
      findingId: 'JC-AI-PENDING',
      copyId: 'x',
      surfaceId: null,
      runtimeStateId: null,
      sourceOwner: 'test',
      category: 'ai_pending',
      severity: 'PENDING_AI_REVIEW',
      userImpact: 'pending',
      deterministicEvidence: 'pending',
      aiReviewRequired: true,
      remediationDirection: 'review',
    },
  ];
  const summary = summarizeBaselinePass({ structuralFailures: [], findings, frozenRegistry: new Map(), aiCorpusCount: 5 });
  assert.equal(summary.pendingAiReviewCount, 6);
  assert.equal(summary.machineGateStatus, 'PASS');
  assert.equal(summary.aiReviewStatus, 'PENDING');
  assert.equal(summary.overallComprehensionStatus, 'PENDING_AI_REVIEW');
});

test('frozen baseline keeps exact identity OPEN_BASELINE; novel finding stays P1', () => {
  const frozen = buildFrozenOpenBaselineRegistry();
  const frozenEntry = M55_FROZEN_OPEN_BASELINE_ENTRIES[0]!;
  const knownFinding: ComprehensionFinding = {
    findingId: frozenEntry.findingId,
    copyId: frozenEntry.copyId ?? null,
    surfaceId: frozenEntry.surfaceId ?? null,
    runtimeStateId: frozenEntry.runtimeStateId ?? null,
    sourceOwner: 'test',
    category: frozenEntry.invariantCategory,
    severity: 'P1',
    userImpact: 'x',
    deterministicEvidence: 'R6 label contains 長く一緒 + 考え without explicit timeframe',
    aiReviewRequired: true,
    remediationDirection: 'x',
    currentTextOrItem: '長く一緒にいることを考えている',
  };
  assert.equal(computeBaselineEvidenceFingerprint(knownFinding), frozenEntry.baselineEvidenceFingerprint);
  const known = finalizeFindingSeverity(knownFinding, frozen);
  assert.equal(known.severity, 'OPEN_BASELINE');

  const novel = finalizeFindingSeverity(
    {
      findingId: 'JC-NOVEL-CTA',
      copyId: 'cta',
      surfaceId: null,
      runtimeStateId: null,
      sourceOwner: 'test',
      category: 'cta_missing_user_outcome',
      severity: 'OPEN_BASELINE',
      userImpact: 'x',
      deterministicEvidence: 'x',
      aiReviewRequired: true,
      remediationDirection: 'x',
    },
    frozen,
  );
  assert.equal(novel.severity, 'P1');
});

test('same findingId with changed category does NOT freeze', () => {
  const frozen = buildFrozenOpenBaselineRegistry();
  const downgraded = finalizeFindingSeverity(
    {
      findingId: 'JC-R6-AMBIGUITY',
      copyId: 'pair.relation_stage.R6',
      surfaceId: null,
      runtimeStateId: null,
      sourceOwner: 'test',
      category: 'different_category',
      severity: 'P1',
      userImpact: 'x',
      deterministicEvidence: 'x',
      aiReviewRequired: true,
      remediationDirection: 'x',
    },
    frozen,
  );
  assert.equal(downgraded.severity, 'P1');
});

test('new shared CTA missing outcome does NOT auto-freeze', () => {
  const frozen = buildFrozenOpenBaselineRegistry();
  const findings = checkCtaComprehension([
    {
      ctaId: 'shared.cta.NEW_UNFROZEN',
      surfaceId: 'm55:shared.navigation',
      runtimeStateId: 'shared.cta',
      action: '新しいCTA',
      userOutcome: null,
      destinationSuccessState: 'route',
      commercialRole: 'DISCOVERY',
      sourceOwner: 'test',
    },
  ]);
  const finalized = findings.map((f) => finalizeFindingSeverity(f, frozen));
  assert.equal(finalized[0]?.severity, 'P1');
});

test('new answerability failure does NOT auto-freeze', () => {
  const frozen = buildFrozenOpenBaselineRegistry();
  const findings = checkQuestionAnswerability([
    {
      scenarioId: 'R1',
      questionId: 'brandNewQuestion',
      relationStageId: 'R1',
      applicability: 'APPLICABLE',
      answerableWithoutFabrication: false,
      explicitNoObservationPath: false,
    },
  ]);
  const finalized = findings.map((f) => finalizeFindingSeverity(f, frozen));
  assert.equal(finalized[0]?.severity, 'P1');
});

test('novel question answerability defect is material P1 before freeze', () => {
  const findings = checkQuestionAnswerability([
    {
      scenarioId: 'R1',
      questionId: 'novelQuestion',
      relationStageId: 'R1',
      applicability: 'APPLICABLE',
      answerableWithoutFabrication: false,
      explicitNoObservationPath: false,
    },
  ]);
  assert.equal(findings[0]?.severity, 'P1');
  assert.notEqual(findings[0]?.findingId, 'JC-Q-ANS-R1-decisionPace');
});

test('parent axis cannot manufacture option axis GREEN', () => {
  const inventory = buildM55GovernedCopyInventory();
  const registrations: OptionAxisRegistration[] = [
    {
      selectorCopyId: 'pair.question.R1.expressionPace',
      semanticAxis: 'expression_timing',
      options: [
        {
          optionCopyId: 'pair.answer.R1.expressionPace.words_soon',
          semanticAxis: 'other_axis',
          semanticValue: 'fast',
        },
        {
          optionCopyId: 'pair.answer.R1.expressionPace.words_later',
          semanticAxis: 'expression_timing',
          semanticValue: 'slow',
        },
      ],
    },
  ];
  const findings = checkOptionAxisConsistency(registrations, inventory);
  assert.ok(findings.some((f) => f.category === 'option_axis_mixed'));
});

test('real relation-stage registrations have no mixed option axis after Wave-1A', () => {
  const inventory = buildM55GovernedCopyInventory();
  const registrations = buildM55OptionAxisRegistrations();
  const findings = checkOptionAxisConsistency(registrations, inventory);
  assert.equal(
    findings.filter((f) => f.category.startsWith('option_axis_mixed')).length,
    0,
  );
});

test('relation-stage R1-R6 selector is always registered', () => {
  const registrations = buildM55OptionAxisRegistrations();
  const relationStage = registrations.find((r) => r.selectorCopyId === 'pair.relation_stage.selector');
  assert.ok(relationStage);
  assert.equal(relationStage.options.length, 6);
});

test('removing pair.answer.R1.expressionPace.words_soon from real builder fails exact option completeness', () => {
  const inventory = buildM55GovernedCopyInventory();
  const targetOptionCopyId = 'pair.answer.R1.expressionPace.words_soon';
  const targetSelectorCopyId = 'pair.question.R1.expressionPace';
  const registrations = buildM55OptionAxisRegistrationsFromGovernedSemantics().map((reg) => {
    if (reg.selectorCopyId !== targetSelectorCopyId) return reg;
    return {
      ...reg,
      options: reg.options.filter((option) => option.optionCopyId !== targetOptionCopyId),
    };
  });
  const findings = checkOptionAxisConsistency(registrations, inventory);
  const missing = findings.find(
    (finding) =>
      finding.findingId === `JC-AXIS-MISSING-OPTION-${targetOptionCopyId}` &&
      finding.category === 'option_axis_incomplete' &&
      finding.copyId === targetOptionCopyId,
  );
  assert.ok(missing);
  assert.equal(missing?.deterministicEvidence.includes(targetSelectorCopyId), true);
});

test('unknown question axis fails', () => {
  const findings = checkOptionAxisConsistency(
    [
      {
        selectorCopyId: 'pair.question.R1.unknownQ',
        semanticAxis: 'unknown_axis',
        options: [
          { optionCopyId: 'missing.a', semanticAxis: 'unknown_axis', semanticValue: 'a' },
          { optionCopyId: 'missing.b', semanticAxis: 'unknown_axis', semanticValue: 'b' },
        ],
      },
    ],
    [],
  );
  assert.ok(findings.some((f) => f.category === 'option_axis_missing'));
});

test('false manual noObservation metadata fails', () => {
  const findings = checkQuestionSemantics({
    metadata: [
      {
        questionId: 'expressionPace',
        copyId: 'pair.question.expressionPace',
        subjectReferent: '言葉にする速さ',
        timeFrame: '現在',
        observationRequirement: 'self_or_observed_expression',
        relationStageApplicability: ['R1'],
        answerSemanticAxis: 'expression_timing',
        noObservationAvailable: true,
        partnerPrivateStateDependency: false,
        fabricationRisk: false,
      },
    ],
    stageBindings: [{ questionId: 'expressionPace', relationStageId: 'R1' }],
    noObservationRegistry: M55_NO_OBSERVATION_CHOICE_REGISTRY,
  });
  assert.ok(findings.some((f) => f.category === 'question_no_observation_false_claim'));
});

test('partner-private dependency without alternative is P1', () => {
  const findings = checkQuestionSemantics({
    metadata: QUESTION_SEMANTIC_METADATA.filter((m) => m.questionId === 'disagreement'),
    stageBindings: buildQuestionStageBindings().filter((b) => b.questionId === 'disagreement'),
    noObservationRegistry: M55_NO_OBSERVATION_CHOICE_REGISTRY,
    scenarioEvaluations: buildPairScenarioMatrix(),
  });
  assert.ok(
    findings.some(
      (f) => f.category === 'question_partner_private_dependency' && f.severity === 'P1',
    ),
  );
});

test('fabrication risk without mitigation is P1', () => {
  const findings = checkQuestionSemantics({
    metadata: [
      {
        questionId: 'decisionPace',
        copyId: 'pair.question.decisionPace',
        subjectReferent: '二人の共同決定',
        timeFrame: '現在',
        observationRequirement: 'shared_decision_history',
        relationStageApplicability: ['R3'],
        answerSemanticAxis: 'decision_timing',
        noObservationAvailable: false,
        partnerPrivateStateDependency: false,
        fabricationRisk: true,
      },
    ],
    stageBindings: [{ questionId: 'decisionPace', relationStageId: 'R3' }],
    noObservationRegistry: {},
    scenarioEvaluations: [
      {
        scenarioId: 'R3',
        questionId: 'decisionPace',
        relationStageId: 'R3',
        applicability: 'APPLICABLE',
        answerableWithoutFabrication: false,
        explicitNoObservationPath: false,
      },
    ],
  });
  assert.ok(findings.some((f) => f.category === 'question_fabrication_risk' && f.severity === 'P1'));
});

test('rendered binding rejects arbitrary long text without owned selector proof', () => {
  const binding = bindRenderedCopyToGovernedInventory({
    surfaceId: 'm55:public.home',
    runtimeStateId: 'home.hero',
    observedTexts: ['これは任意の長いテキストで、登録されたコピーIDに対応していません。'],
    observedCtaLabels: [],
    expectedCopy: [
      {
        copyId: 'home.hero.heading',
        visibleText: '登録済み見出し',
        copyRole: 'HEADING',
        selector: '[data-testid="owned-heading"]',
      },
    ],
    expectedCtas: [],
  });
  assert.equal(binding.passed, false);
  assert.deepEqual(binding.missingCopyIds, ['home.hero.heading']);
});

test('rendered binding rejects short substring of expected copy on owned element', () => {
  const binding = bindRenderedCopyToGovernedInventory({
    surfaceId: 'm55:public.home',
    runtimeStateId: 'home.hero',
    observedElements: [{ elementId: '[data-testid="owned-heading"]', text: '登録' }],
    observedCtaLabels: [],
    expectedCopy: [
      {
        copyId: 'home.hero.heading',
        visibleText: '登録済み見出しテキスト',
        copyRole: 'HEADING',
        selector: '[data-testid="owned-heading"]',
      },
    ],
    expectedCtas: [],
  });
  assert.equal(binding.passed, false);
  assert.deepEqual(binding.mismatchedCopyIds, ['home.hero.heading']);
});

test('rendered binding exact expected copy passes on owned selector', () => {
  const binding = bindRenderedCopyToGovernedInventory({
    surfaceId: 'm55:public.home',
    runtimeStateId: 'home.hero',
    observedElements: [
      { elementId: '[data-testid="owned-heading"]', text: '登録済み見出しテキスト' },
    ],
    observedCtaLabels: [],
    expectedCopy: [
      {
        copyId: 'home.hero.heading',
        visibleText: '登録済み見出しテキスト',
        copyRole: 'HEADING',
        selector: '[data-testid="owned-heading"]',
      },
    ],
    expectedCtas: [],
  });
  assert.equal(binding.passed, true);
});

test('rendered binding rejects expected text with dangerous suffix on owned element', () => {
  const binding = bindRenderedCopyToGovernedInventory({
    surfaceId: 'm55:public.home',
    runtimeStateId: 'home.hero',
    observedElements: [
      {
        elementId: '[data-testid="owned-cta"]',
        text: '支払い画面へ進む（毎月課金）',
      },
    ],
    observedCtaLabels: [],
    expectedCopy: [
      {
        copyId: 'shared.cta.PAYMENT_READY',
        visibleText: '支払い画面へ進む',
        copyRole: 'CTA',
        selector: '[data-testid="owned-cta"]',
      },
    ],
    expectedCtas: [],
  });
  assert.equal(binding.passed, false);
  assert.deepEqual(binding.mismatchedCopyIds, ['shared.cta.PAYMENT_READY']);
});

test('rendered binding exact CTA passes and superstring CTA fails on owned selector', () => {
  const selector = '[data-testid="owned-cta"]';
  const exact = bindRenderedCopyToGovernedInventory({
    surfaceId: 'm55:public.home',
    runtimeStateId: 'home.hero',
    observedElements: [{ elementId: selector, text: '支払い画面へ進む' }],
    observedCtaLabels: ['別ボタンの支払い画面へ進む'],
    expectedCopy: [],
    expectedCtas: [
      { ctaId: 'shared.cta.PAYMENT_READY', expectedLabel: '支払い画面へ進む', selector },
    ],
  });
  assert.equal(exact.passed, true);
  assert.equal(exact.ctaBindings[0]?.observed, true);

  const superstring = bindRenderedCopyToGovernedInventory({
    surfaceId: 'm55:public.home',
    runtimeStateId: 'home.hero',
    observedElements: [{ elementId: selector, text: '支払い画面へ進む（毎月課金）' }],
    observedCtaLabels: ['支払い画面へ進む'],
    expectedCopy: [],
    expectedCtas: [
      { ctaId: 'shared.cta.PAYMENT_READY', expectedLabel: '支払い画面へ進む', selector },
    ],
  });
  assert.equal(superstring.passed, false);
  assert.equal(superstring.ctaBindings[0]?.observed, false);
  assert.equal(superstring.ctaBindings[0]?.superstringMatch, true);
});

test('rendered binding element binding uses normalized exact equality', () => {
  const selector = '[data-testid="owned-heading"]';
  const binding = bindRenderedCopyToGovernedInventory({
    surfaceId: 'm55:public.home',
    runtimeStateId: 'home.hero',
    observedElements: [{ elementId: selector, text: '登録済み見出しテキスト' }],
    observedCtaLabels: [],
    expectedCopy: [
      {
        copyId: 'home.hero.heading',
        visibleText: '登録済み見出しテキスト',
        copyRole: 'HEADING',
        selector,
      },
    ],
    expectedCtas: [],
  });
  assert.equal(binding.passed, true);
});

test('rendered binding aggregate observedTexts cannot prove governed copy', () => {
  const binding = bindRenderedCopyToGovernedInventory({
    surfaceId: 'm55:public.home',
    runtimeStateId: 'home.hero',
    observedTexts: ['同じ文言'],
    observedCtaLabels: [],
    expectedCopy: [
      {
        copyId: 'copy.a',
        visibleText: '同じ文言',
        copyRole: 'BODY',
        selector: '[data-testid="owned-a"]',
      },
    ],
    expectedCtas: [],
  });
  assert.equal(binding.passed, false);
  assert.deepEqual(binding.missingCopyIds, ['copy.a']);
});

test('rendered binding wrong element with same text does not pass owned copy', () => {
  const ownedSelector = '[data-testid="owned-a"]';
  const binding = bindRenderedCopyToGovernedInventory({
    surfaceId: 'm55:public.home',
    runtimeStateId: 'home.hero',
    observedElements: [{ elementId: '[data-testid="wrong-b"]', text: '同じ文言' }],
    observedTexts: ['同じ文言'],
    observedCtaLabels: [],
    expectedCopy: [
      {
        copyId: 'copy.a',
        visibleText: '同じ文言',
        copyRole: 'BODY',
        selector: ownedSelector,
      },
    ],
    expectedCtas: [],
  });
  assert.equal(binding.passed, false);
  assert.deepEqual(binding.missingCopyIds, ['copy.a']);
  assert.deepEqual(binding.observedCopyIds, []);
});

test('rendered binding missing owned selector is pending', () => {
  const binding = bindRenderedCopyToGovernedInventory({
    surfaceId: 'm55:public.home',
    runtimeStateId: 'home.hero',
    observedElements: [{ elementId: '[data-testid="owned-a"]', text: '同じ文言' }],
    observedCtaLabels: [],
    expectedCopy: [
      {
        copyId: 'copy.a',
        visibleText: '同じ文言',
        copyRole: 'BODY',
      },
    ],
    expectedCtas: [],
  });
  assert.equal(binding.passed, false);
  assert.deepEqual(binding.pendingCopyIds, ['copy.a']);
});

test('rendered binding same CTA label on wrong element fails', () => {
  const ownedSelector = '[data-testid="owned-cta"]';
  const binding = bindRenderedCopyToGovernedInventory({
    surfaceId: 'm55:public.home',
    runtimeStateId: 'home.hero',
    observedElements: [{ elementId: '[data-testid="wrong-cta"]', text: '無料で見る' }],
    observedCtaLabels: ['無料で見る', '無料で見る'],
    expectedCopy: [],
    expectedCtas: [{ ctaId: 'home.cta.primary', expectedLabel: '無料で見る', selector: ownedSelector }],
  });
  assert.equal(binding.passed, false);
  assert.equal(binding.ctaBindings[0]?.observed, false);
});

test('missing rendered paid choice identity prevents PRESENT_COVERED', () => {
  const inventory = buildM55GovernedCopyInventory().filter(
    (entry) => entry.copyId !== 'self.paid.answer.paid.work_focus.paid.work_focus.priority',
  );
  const coverage = evaluateSourceDomainCoverage(inventory);
  const domain = coverage.domains.find((entry) => entry.domainId === 'self.premium.questionnaire');
  assert.notEqual(domain?.status, 'PRESENT_COVERED');
});

test('question answerability frozen binding rejects changed answer label', () => {
  const frozen = buildFrozenOpenBaselineRegistry();
  const entry = frozen.get('JC-Q-ANS-R3-decisionPace')!;
  const matrix = buildPairScenarioMatrix().find(
    (ev) => ev.scenarioId === 'R3' && ev.questionId === 'decisionPace',
  )!;
  const sourceFingerprint = computeQuestionAnswerabilitySourceFingerprint(matrix);
  const mutatedSourceFingerprint = sourceFingerprint.replace(
    'decide_now:その場で決めることが多い',
    'decide_now:変更ラベル',
  );
  const finding: ComprehensionFinding = {
    findingId: entry.findingId,
    copyId: entry.copyId ?? null,
    surfaceId: entry.surfaceId ?? null,
    runtimeStateId: entry.runtimeStateId ?? null,
    sourceOwner: 'test',
    category: entry.invariantCategory,
    severity: 'P1',
    userImpact: 'x',
    deterministicEvidence: `scenario=${matrix.scenarioId} applicability=${matrix.applicability}`,
    aiReviewRequired: true,
    remediationDirection: 'x',
    currentTextOrItem: mutatedSourceFingerprint,
  };
  assert.equal(finalizeFindingSeverity(finding, frozen).severity, 'P1');
});

test('rendered binding changed expected text fails', () => {
  const selector = '[data-testid="owned-heading"]';
  const binding = bindRenderedCopyToGovernedInventory({
    surfaceId: 'm55:public.home',
    runtimeStateId: 'home.hero',
    observedElements: [{ elementId: selector, text: '登録済み見出しテキスト' }],
    observedCtaLabels: [],
    expectedCopy: [
      {
        copyId: 'home.hero.heading',
        visibleText: '別の期待テキスト',
        copyRole: 'HEADING',
        selector,
      },
    ],
    expectedCtas: [],
  });
  assert.equal(binding.passed, false);
});

test('rendered binding missing CTA fails', () => {
  const binding = bindRenderedCopyToGovernedInventory({
    surfaceId: 'm55:public.home',
    runtimeStateId: 'home.hero',
    observedElements: [],
    observedCtaLabels: [],
    expectedCopy: [],
    expectedCtas: [
      {
        ctaId: 'home.cta.primary',
        expectedLabel: '無料で見る',
        selector: '[data-testid="owned-cta"]',
      },
    ],
  });
  assert.equal(binding.passed, false);
  assert.equal(binding.ctaBindings[0]?.observed, false);
});

test('baseline reproduces four known Human findings', () => {
  const report = runM55JapaneseComprehensionBaseline();
  assert.equal(report.knownHumanRegressionFixturesCovered, 4);
  assert.equal(report.knownHumanFindingsReproduced, 4);
  assert.deepEqual(report.currentActiveKnownHumanFindingIds, ['GCJQ-03', 'GCJQ-04']);
  assert.equal(report.aiAutoGreenCount, 0);
  assert.equal(report.frozenBaseline.dynamicSourceDerivedEntries, 0);
  assert.equal(report.frozenBaseline.questionSourceFingerprintBound, true);
  assert.equal(report.inventory.unregisteredCopy, 0);
  assert.equal(report.sourceDomainCoverage.missing, 0);
  assert.equal(report.sourceIdentityCoverage.unmappedGovernedCopy, 0);
  assert.equal(report.sourceIdentityCoverage.unexpectedIdentities, 0);
  assert.ok(report.sourceDomainCoverage.presentUngoverned > 0);
  assert.equal(report.controlPlaneIntegrity.globalSourceCoverageClosure, 'RED');
  assert.equal(report.renderedBinding.shortSubstringFalsePositiveTest, 'PASS');
  assert.equal(report.renderedBinding.exactCopyTest, 'FAIL');
  assert.equal(report.optionAxisSummary.relationStageSelectorCovered, true);
  assert.equal(report.optionAxisSummary.parentDerivedOptionAxes, 0);
  assert.equal(report.aiStatus.aiReviewStatus, 'PENDING');
  assert.equal(report.currentProductFindings.rawP1Count, 0);
  assert.equal(report.currentProductFindings.pendingHumanDecisionCount, 0);
  assert.equal(report.currentProductFindings.autoFrozenCount, 0);
  assert.equal(report.controlPlaneIntegrity.currentProductComprehensionGate, 'GREEN');
  assert.equal(report.controlPlaneIntegrity.implementationIntegrity, 'GREEN');
});

test('pair scenario matrix covers mandatory scenarios', () => {
  const matrix = buildPairScenarioMatrix();
  const scenarios = new Set(matrix.map((m) => m.scenarioId));
  for (const id of PAIR_SCENARIO_IDS) {
    assert.ok(scenarios.has(id), `missing scenario ${id}`);
  }
  assert.ok(buildQuestionStageBindings().length > 0);
  assert.ok(QUESTION_SEMANTIC_METADATA.length > 0);
});

test('novel P1 fails durable verifier acceptance', () => {
  const summary = summarizeBaselinePass({
    structuralFailures: [],
    findings: [
      {
        findingId: 'JC-NOVEL-P1-DURABLE',
        copyId: 'novel',
        surfaceId: null,
        runtimeStateId: null,
        sourceOwner: 'test',
        category: 'novel_regression',
        severity: 'P1',
        userImpact: 'novel',
        deterministicEvidence: 'novel',
        aiReviewRequired: false,
        remediationDirection: 'fix',
      },
    ],
    frozenRegistry: new Map(),
    aiCorpusCount: 0,
  });
  assert.equal(summary.materialP1Count, 1);
  assert.equal(summary.machineGateStatus, 'FAIL');

  const verifier = summarizeJapaneseComprehensionBaselineForVerifier();
  assert.equal(verifier.durableComprehensionGatePassed, false);
  assert.equal(verifier.materialP1Count, 0);
  assert.equal(verifier.newCurrentFindingsNotFrozen, 0);
  assert.equal(verifier.currentProductComprehensionGate, 'GREEN');
});

test('durable verifier blocks novel P1 while preserving diagnostic newCurrent count', () => {
  const verifier = summarizeJapaneseComprehensionBaselineForVerifier();
  assert.equal(verifier.durableComprehensionGatePassed, false);
  assert.equal(verifier.implementationGatePassed, true);
  assert.equal(verifier.implementationIntegrity, 'GREEN');
  assert.equal(verifier.newCurrentFindingsNotFrozen, 0);
});

test('real builder mutation removing one governed option semantic registration fails', () => {
  const inventory = buildM55GovernedCopyInventory();
  const targetOptionCopyId = 'pair.answer.R1.expressionPace.words_soon';
  const registrations = buildM55OptionAxisRegistrationsFromGovernedSemantics().map((reg) => {
    if (reg.selectorCopyId !== 'pair.question.R1.expressionPace') return reg;
    return {
      ...reg,
      options: reg.options.filter((option) => option.optionCopyId !== targetOptionCopyId),
    };
  });
  const findings = checkOptionAxisConsistency(registrations, inventory);
  assert.ok(
    findings.some(
      (finding) =>
        finding.findingId === `JC-AXIS-MISSING-OPTION-${targetOptionCopyId}` &&
        finding.category === 'option_axis_incomplete',
    ),
  );
});

test('question answerability frozen binding rejects changed question text', () => {
  const frozen = buildFrozenOpenBaselineRegistry();
  const entry = frozen.get('JC-Q-ANS-R3-decisionPace')!;
  const matrix = buildPairScenarioMatrix().find(
    (ev) => ev.scenarioId === 'R3' && ev.questionId === 'decisionPace',
  )!;
  const sourceFingerprint = computeQuestionAnswerabilitySourceFingerprint(matrix);
  const finding: ComprehensionFinding = {
    findingId: entry.findingId,
    copyId: entry.copyId ?? null,
    surfaceId: entry.surfaceId ?? null,
    runtimeStateId: entry.runtimeStateId ?? null,
    sourceOwner: 'test',
    category: entry.invariantCategory,
    severity: 'P1',
    userImpact: 'x',
    deterministicEvidence: `scenario=${matrix.scenarioId} applicability=${matrix.applicability}`,
    aiReviewRequired: true,
    remediationDirection: 'x',
    currentTextOrItem: `${sourceFingerprint}|CHANGED_TEXT`,
  };
  const finalized = finalizeFindingSeverity(finding, frozen);
  assert.equal(finalized.severity, 'P1');

  const exactFingerprint = computeQuestionAnswerabilityBaselineFingerprint({
    category: entry.invariantCategory,
    copyId: entry.copyId ?? null,
    surfaceId: entry.surfaceId ?? null,
    runtimeStateId: entry.runtimeStateId ?? null,
    deterministicEvidence: `scenario=${matrix.scenarioId} applicability=${matrix.applicability}`,
    currentTextOrItem: sourceFingerprint,
  });
  assert.notEqual(exactFingerprint, entry.baselineEvidenceFingerprint);
  const exactFinding: ComprehensionFinding = { ...finding, currentTextOrItem: sourceFingerprint };
  assert.equal(finalizeFindingSeverity(exactFinding, frozen).severity, 'P1');
});

test('NO_OBSERVATION in one stage does not make another applicable stage safe', () => {
  const findings = checkQuestionSemantics({
    metadata: QUESTION_SEMANTIC_METADATA.filter((m) => m.questionId === 'disagreement'),
    stageBindings: buildQuestionStageBindings().filter((b) => b.questionId === 'disagreement'),
    noObservationRegistry: {
      disagreement: [
        {
          relationStageId: 'R3',
          questionId: 'disagreement',
          answerId: 'talk_now',
        },
      ],
    },
    scenarioEvaluations: buildPairScenarioMatrix().filter((ev) => ev.questionId === 'disagreement'),
    choiceIndex: buildQuestionChoiceIndex(
      buildQuestionStageBindings().filter((b) => b.questionId === 'disagreement'),
      new Map([
        ['R3|disagreement', ['talk_now', 'take_space', 'one_carries']],
        ['R6|disagreement', ['talk_now', 'take_space', 'one_carries']],
      ]),
    ),
  });
  assert.ok(
    findings.some(
      (f) =>
        f.category === 'question_partner_private_dependency' &&
        f.severity === 'P1' &&
        f.deterministicEvidence.includes('R6'),
    ),
  );
});

test('presentUngoverned=1 blocks durable global source coverage gate', () => {
  const verifier = summarizeJapaneseComprehensionBaselineForVerifier();
  assert.ok(verifier.sourceDomainPresentUngoverned >= 1);
  assert.equal(verifier.globalSourceCoverageClosure, 'RED');
  assert.equal(verifier.durableComprehensionGatePassed, false);
  assert.equal(verifier.implementationIntegrity, 'GREEN');
});

test('registry key mismatch is P0', () => {
  const findings = checkQuestionSemantics({
    metadata: QUESTION_SEMANTIC_METADATA.filter((m) => m.questionId === 'expressionPace'),
    stageBindings: [{ questionId: 'expressionPace', relationStageId: 'R1' }],
    noObservationRegistry: {
      wrongKey: [{ relationStageId: 'R1', questionId: 'expressionPace', answerId: 'words_soon' }],
    },
  });
  assert.ok(findings.some((f) => f.category === 'question_no_observation_registry_key_mismatch' && f.severity === 'P0'));
});
