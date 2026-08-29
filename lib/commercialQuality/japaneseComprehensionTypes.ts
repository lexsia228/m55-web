/**
 * Repository-independent Japanese commercial comprehension control plane — schema types.
 * Project copy enters only through adapters; stable semantic identity is never raw text alone.
 */

export const JAPANESE_COMPREHENSION_SCHEMA_VERSION = 1 as const;

export const COPY_ROLES = [
  'HEADING',
  'BODY',
  'QUESTION',
  'ANSWER_OPTION',
  'CTA',
  'PRODUCT_NAME',
  'PRODUCT_VALUE',
  'PRICE_PRESENTATION',
  'HELP',
  'VALIDATION',
  'ERROR',
  'EMPTY',
  'LOADING',
  'RECOVERY',
  'SHARE_MOTIVATION',
  'PRIVACY_SAFETY',
] as const;
export type CopyRole = (typeof COPY_ROLES)[number];

export const SURFACE_FAMILIES = ['HOME', 'SELF', 'PAIR', 'SHARED'] as const;
export type SurfaceFamily = (typeof SURFACE_FAMILIES)[number];

export const FINDING_SEVERITIES = ['P0', 'P1', 'P2', 'PENDING_AI_REVIEW', 'OPEN_BASELINE'] as const;
export type FindingSeverity = (typeof FINDING_SEVERITIES)[number];

export const AI_REVIEW_OUTCOMES = ['GREEN', 'P0', 'P1', 'P2', 'REVIEW_REQUIRED', 'PENDING_AI_REVIEW'] as const;
export type AiReviewOutcome = (typeof AI_REVIEW_OUTCOMES)[number];

export const COMMERCIAL_CTA_ROLES = [
  'DISCOVERY',
  'CONTINUE',
  'UNLOCK',
  'PURCHASE',
  'OPEN_OWNED_REPORT',
  'SHARE_TO_PARTNER',
  'SHARE_TO_SOCIAL',
  'RECOVER',
] as const;
export type CommercialCtaRole = (typeof COMMERCIAL_CTA_ROLES)[number];

export const SCENARIO_APPLICABILITY = ['APPLICABLE', 'NOT_APPLICABLE', 'REQUIRES_NO_OBSERVATION'] as const;
export type ScenarioApplicability = (typeof SCENARIO_APPLICABILITY)[number];

export type GovernedCopyEntry = {
  copyId: string;
  surfaceId: string;
  runtimeStateId: string;
  surfaceFamily: SurfaceFamily;
  copyRole: CopyRole;
  sourceOwner: string;
  audienceContext: string;
  textRef: string;
  visibleText: string;
  claimAuthority?: string;
};

export type QuestionSemanticMetadata = {
  questionId: string;
  copyId: string;
  subjectReferent: string;
  timeFrame: string;
  observationRequirement: string;
  relationStageApplicability: readonly string[];
  answerSemanticAxis: string;
  noObservationAvailable: boolean;
  partnerPrivateStateDependency: boolean;
  fabricationRisk: boolean;
};

export type PairScenarioId =
  | 'R1'
  | 'R2'
  | 'R3'
  | 'R4'
  | 'R5'
  | 'R6'
  | 'NEVER_SPOKEN'
  | 'NO_SHARED_DECISION_YET'
  | 'NO_DISAGREEMENT_YET'
  | 'INSUFFICIENT_OBSERVATION';

export type QuestionScenarioEvaluation = {
  scenarioId: PairScenarioId;
  questionId: string;
  relationStageId: string;
  applicability: ScenarioApplicability;
  answerableWithoutFabrication: boolean;
  explicitNoObservationPath: boolean;
};

export type OptionAxisRegistration = {
  selectorCopyId: string;
  semanticAxis: string;
  options: readonly {
    optionCopyId: string;
    semanticAxis: string;
    semanticValue: string;
  }[];
};

export type OptionSemanticValue = {
  optionCopyId: string;
  semanticValue: string;
  semanticAxis: string;
};

export type CtaComprehensionEntry = {
  ctaId: string;
  surfaceId: string;
  runtimeStateId: string;
  action: string;
  userOutcome: string | null;
  destinationSuccessState: string;
  commercialRole: CommercialCtaRole;
  sourceOwner: string;
};

export type ProductDiscoverabilityEntry = {
  productKey: string;
  productFamily: string;
  valuePropositionPresent: boolean;
  pricePresentationPresent: boolean;
  purchaseType: string;
  discoverySurfaces: readonly string[];
  nextAction: string | null;
  contextualPrerequisiteRequired: boolean;
  firstClassMerchandise: boolean;
};

export type AiReviewCorpusItem = {
  reviewUnitId: string;
  copyId: string;
  surfaceId: string;
  runtimeStateId: string;
  currentText: string;
  role: CopyRole;
  context: string;
  reviewPolicy: AiReviewRolePolicy;
  questionMetadata?: Pick<QuestionSemanticMetadata, 'questionId' | 'fabricationRisk'>;
  rubricDimensions: readonly string[];
  requiredOutcome: 'PENDING_AI_REVIEW';
};

export type ComprehensionFinding = {
  findingId: string;
  copyId: string | null;
  surfaceId: string | null;
  runtimeStateId: string | null;
  sourceOwner: string;
  category: string;
  severity: FindingSeverity;
  userImpact: string;
  deterministicEvidence: string;
  aiReviewRequired: boolean;
  remediationDirection: string;
  knownHumanFindingId?: string;
  currentTextOrItem?: string;
};

export type CopyInventorySummary = {
  totalGovernedCopy: number;
  registeredCopy: number;
  unregisteredCopy: number;
  discoveredFromSources: number;
};

export type SourceDomainCoverageEntry = {
  domainId: string;
  sourceOwner: string | null;
  extractionStrategy: string;
  status:
    | 'PRESENT_COVERED'
    | 'PRESENT_UNGOVERNED'
    | 'ABSENT_BY_DESIGN_WITH_AUTHORITY_EVIDENCE'
    | 'MISSING';
  absentByDesignAuthorityEvidence?: string;
  ungovernedReason?: string;
  discoveredIdentities: number;
  registeredIdentities: number;
  missingIdentities: number;
};

export type SourceDomainCoverageSummary = {
  required: number;
  presentCovered: number;
  presentUngoverned: number;
  absentByDesignWithAuthorityEvidence: number;
  missing: number;
  unresolvedDomainIds: readonly string[];
  domains: readonly SourceDomainCoverageEntry[];
};

export type UnexpectedIdentityClassification =
  | 'EXPECTED_EXTRA_WITH_REASON'
  | 'UNMAPPED_GOVERNED_COPY';

export type UnexpectedIdentityEntry = {
  copyId: string;
  classification: UnexpectedIdentityClassification;
  reason: string;
};

export type SourceIdentityCoverageSummary = {
  discoveredIdentities: number;
  registeredIdentities: number;
  missingIdentities: number;
  unexpectedIdentities: number;
  unexpectedClassified: readonly UnexpectedIdentityEntry[];
  unmappedGovernedCopy: number;
  duplicateIdentities: number;
  fingerprintMismatches: number;
  sourceFingerprintCompared: boolean;
  missingCopyIds: readonly string[];
  unexpectedCopyIds: readonly string[];
  fingerprintMismatchCopyIds: readonly string[];
};

export type AiReviewRolePolicy = 'AI_REQUIRED' | 'DETERMINISTIC_ONLY_WITH_REASON' | 'NOT_APPLICABLE_WITH_REASON';

export type ComprehensionStatusSummary = {
  machineGateStatus: 'PASS' | 'FAIL';
  aiReviewStatus: 'PENDING' | 'COMPLETE';
  humanApprovalStatus: 'REQUIRED' | 'APPROVED';
  overallComprehensionStatus:
    | 'BLOCKED_MACHINE'
    | 'PENDING_AI_REVIEW'
    | 'PENDING_HUMAN_APPROVAL'
    | 'USER_VISIBLE_CLOSED_GREEN';
};

export type FrozenBaselineSummary = {
  literalEntriesCount: number;
  dynamicSourceDerivedEntries: number;
  identityFingerprintMismatches: number;
  currentMatchedCount: number;
  unexpectedFindingCount: number;
  newCurrentFindingsNotFrozen: number;
  questionSourceFingerprintBound: boolean;
};

export type QuestionSemanticsSummary = {
  logicalQuestions: number;
  stageBindings: number;
  stageSetMismatches: number;
  missingMetadata: number;
  invalidNoObservationRegistrations: number;
  partnerPrivateMaterialFindings: number;
  fabricationMaterialFindings: number;
  verifiedStageSpecificNoObservationPaths: number;
  registryKeyMismatches: number;
  invalidNoObservationAnswerIds: number;
  partialStageUnsafeFindings: number;
};

export type OptionAxisSummary = {
  selectors: number;
  relationStageSelectorCovered: boolean;
  options: number;
  independentlyRegisteredOptionAxes: number;
  parentDerivedOptionAxes: number;
  unknownAxes: number;
  missingOptionRegistrations: number;
  mixedAxisFindings: number;
};

export type CurrentProductFindingGroup =
  | 'relation_stage_selector_mixed_semantic_dimensions'
  | 'decisionPace_fabrication_risk'
  | 'disagreement_fabrication_private_state_risk'
  | 'returnPattern_fabrication_risk';

export type CurrentProductFindingsSummary = {
  rawP1Count: number;
  autoFrozenCount: number;
  pendingHumanDecisionCount: number;
  logicalGroupedDefects: readonly CurrentProductFindingGroup[];
};

export type ControlPlaneIntegritySummary = {
  implementationIntegrity: 'GREEN' | 'RED';
  globalSourceCoverageClosure: 'GREEN' | 'RED';
  currentProductComprehensionGate: 'GREEN' | 'RED';
};

export type ProductValueSummary = {
  sellableSkus: number;
  valueBoundSkus: number;
  missingValuePropositions: number;
};

export type RenderedBindingSummary = {
  implemented: boolean;
  shortSubstringFalsePositiveTest: 'PASS' | 'FAIL' | 'NOT_RUN';
  exactCopyTest: 'PASS' | 'FAIL' | 'NOT_RUN';
  ctaBindingTest: 'PASS' | 'FAIL' | 'NOT_RUN';
  unexpectedCandidateStatus: 'COMPUTED' | 'NOT_EVALUATED';
};

export type AiStatusSummary = {
  machineGateStatus: 'PASS' | 'FAIL';
  aiReviewStatus: 'PENDING' | 'COMPLETE';
  humanApprovalStatus: 'REQUIRED' | 'APPROVED';
  overallComprehensionStatus:
    | 'BLOCKED_MACHINE'
    | 'PENDING_AI_REVIEW'
    | 'PENDING_HUMAN_APPROVAL'
    | 'USER_VISIBLE_CLOSED_GREEN';
  aiCorpusItems: number;
  answerOptionAiCoverage: number;
  unclassifiedGovernedRoles: number;
  aiAutoGreenCount: number;
};

export type SurfaceCoverageSummary = Record<SurfaceFamily, { registered: number; requiredMinimum: number; covered: boolean }>;

export type JapaneseComprehensionBaselineReport = {
  schemaVersion: typeof JAPANESE_COMPREHENSION_SCHEMA_VERSION;
  inventory: CopyInventorySummary;
  sourceDomainCoverage: SourceDomainCoverageSummary;
  sourceIdentityCoverage: SourceIdentityCoverageSummary;
  frozenBaseline: FrozenBaselineSummary;
  controlPlaneIntegrity: ControlPlaneIntegritySummary;
  currentProductFindings: CurrentProductFindingsSummary;
  comprehensionStatus: ComprehensionStatusSummary;
  aiStatus: AiStatusSummary;
  productValue: ProductValueSummary;
  renderedBinding: RenderedBindingSummary;
  questionSemantics: QuestionSemanticsSummary;
  optionAxisSummary: OptionAxisSummary;
  surfaceCoverage: SurfaceCoverageSummary;
  questionCount: number;
  questionApplicabilityCovered: number;
  questionsRequiringNoObservation: number;
  questionsFailingAnswerability: number;
  pairScenarioMatrixCoverage: number;
  optionAxisFindings: number;
  prohibitedTerminologyFindings: number;
  ambiguityFindings: number;
  duplicateResultFindings: number;
  vagueHedgeReviewFindings: number;
  ctaFindings: number;
  productDiscoverabilityFindings: number;
  materialP0Count: number;
  materialP1Count: number;
  unexpectedFindingCount: number;
  p0Count: number;
  p1Count: number;
  p2Count: number;
  pendingAiReviewCount: number;
  openBaselineCount: number;
  /**
   * @deprecated Compatibility field only. Mirrors historical regression-fixture
   * detector coverage (`knownHumanRegressionFixturesCovered`), not current live
   * Human defect reproduction. Use `currentActiveKnownHumanFindingIds` for
   * findings reproduced by current source/runtime evaluation.
   */
  knownHumanFindingsReproduced: number;
  /** Regression/detector fixture coverage count (target: 4/4). */
  knownHumanRegressionFixturesCovered: number;
  /** Human finding IDs currently reproduced by live source/runtime evaluation. */
  currentActiveKnownHumanFindingIds: readonly string[];
  aiReviewCorpusItemCount: number;
  aiAutoGreenCount: number;
  findings: readonly ComprehensionFinding[];
  structuralFailures: readonly string[];
  passed: boolean;
  machineGatePassed: boolean;
};
