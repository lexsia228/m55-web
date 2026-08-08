#!/usr/bin/env node
/**
 * Deterministic verifier for the integrated commercial quality control plane.
 * npm run verify:m55-commercial-quality-control-plane
 *
 * Enforces:
 * - ownership boundary (repository-independent engine imports no M55 authority)
 * - manifest schema v1 registration for every imported governed identity
 * - 51 ECP entries / 12 Premium states / 14 Premium captures / 7 visual cases
 * - candidate-only approval pack (never a canonical promotion)
 * - locked @axe-core/playwright dependency and CI wiring
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const FAILURES = [];

const ENGINE_DIR = 'lib/commercialQuality';
const ENGINE_FILES = [
  'lib/commercialQuality/types.ts',
  'lib/commercialQuality/surfaceManifest.ts',
  'lib/commercialQuality/continuousResponsiveEngine.ts',
  'lib/commercialQuality/layoutInvariants.ts',
  'lib/commercialQuality/contentStateStress.ts',
  'lib/commercialQuality/approvalPack.ts',
  'lib/commercialQuality/fixtures.ts',
  'lib/commercialQuality/commercialQuality.test.ts',
];
const ADAPTER_FILES = [
  'lib/m55/commercialUx/qualityControl/m55SurfaceManifest.ts',
  'lib/m55/commercialUx/qualityControl/m55ManifestAdapter.ts',
  'lib/m55/commercialUx/qualityControl/m55SetupRegistry.ts',
  'lib/m55/commercialUx/qualityControl/m55StateDomContracts.ts',
  'lib/m55/commercialUx/qualityControl/m55AuthGateFixtureRegistry.ts',
  'lib/m55/commercialUx/qualityControl/m55StateIdentityReconciliation.ts',
];
const BROWSER_FILES = [
  'e2e/helpers/commercialQualityRunner.ts',
  'e2e/commercial-quality-control-plane.spec.ts',
  'scripts/run-m55-commercial-quality-control-plane-e2e.mjs',
];
const CONTRACT_DOC = 'docs/ssot/M55_COMMERCIAL_QUALITY_CONTRACT.md';
const DECISION_LOG = 'docs/ssot/M55_DECISION_LOG.md';
const WORKFLOW = '.github/workflows/audit.yml';
const APPROVAL_PACK_DIR = 'test-results/commercial-quality-approval-pack';
/** Written by the browser gate only when geometry/semantic/a11y are GREEN. */
const GATE_EVIDENCE_FILE = 'test-results/commercial-quality-gate/gate-summary.json';

const EMIT_CANDIDATE_PACK = process.argv.includes('--emit-candidate-pack');

/** The engine must never reach into project authority. */
const FORBIDDEN_ENGINE_IMPORT_PATTERNS = [
  /from\s+['"][^'"]*lib\/m55/,
  /from\s+['"][^'"]*m55CommercialFunnelContract/,
  /from\s+['"][^'"]*premiumExperience/,
  /from\s+['"][^'"]*experienceRouteRegistry/,
  /from\s+['"][^'"]*commercialVisualQuality/,
  /from\s+['"][^'"]*Copy['"]/,
  /from\s+['"]@\/lib\/m55/,
];

const REQUIRED_NEGATIVE_FIXTURE_IDS = [
  'duplicate_surface',
  'remove_ecp_route',
  'alter_ecp_route',
  'remove_premium_state',
  'alter_premium_state',
  'duplicate_imported_authority',
  'unknown_setup',
  'setup_wrong_route',
  'setup_wrong_runtime_state',
  'unregistered_route',
  'unregistered_runtime_state',
  'duplicate_ecp',
  'missing_protected_element',
  'clipped_protected_content',
  'home_absolute_overlay_clipping',
  'horizontal_overflow',
  'fixed_element_obstruction',
  'undersized_cta',
  'route_drift',
  'state_drift',
  'shell_only_page',
  'loading_state_accepted',
  'japanese_punctuation_only_line',
  'neighbor_geometry_discontinuity',
  'automatic_canonical_promotion',
  'stale_source_commit',
  'stale_manifest_digest',
  'altered_candidate_hash',
];

/** Active temporary deferrals must be empty after Commit B contrast closure. */
const REQUIRED_DEFERRAL_RECORD_IDS = [];
const CLOSED_COMMIT_B_DEFERRAL_RECORD_IDS = [
  'CQ-A11Y-DEFER-METHOD-SECTION-ORDER-2026-07-30',
  'CQ-A11Y-DEFER-PUBLIC-FOOTER-COPY-2026-07-30',
];

const REQUIRED_CI_STEPS = [
  'M55 commercial quality manifest registration',
  'M55 commercial quality negative fixtures',
  'M55 commercial quality registered-surface browser gate',
  'M55 commercial quality candidate approval pack',
];

const REPORT = {
  schemaVersion: null,
  manifestDigest: null,
  ecpEntriesRegistered: 0,
  premiumStatesRegistered: 0,
  premiumCapturesRegistered: 0,
  commercialVisualCasesRegistered: 0,
  totalSurfaces: 0,
  setupRegistryTotal: 0,
  setupRegistryExecutable: 0,
  setupRegistryNonRuntime: 0,
  registrationFailures: 0,
  negativeFixtures: 0,
  negativeFixtureRejections: 0,
  engineBoundaryViolations: 0,
  axeDependencyLocked: false,
  ciStepsWired: 0,
  approvalPackCandidateOnly: false,
  approvalPackGitignored: false,
  approvalPackPresentInWorktree: false,
  consolidationPoints: 0,
  accessibilityDeferrals: 0,
  observableSignatureCount: 0,
  observableSignatureCollisions: 0,
  canonicalObservableStateCount: 0,
  registrationAliasCount: 0,
  fixedAuthGateFixtureCount: 0,
  candidatePack: null,
};

function fail(rule, message) {
  FAILURES.push({ rule, message });
}

function read(rel) {
  return readFileSync(join(ROOT, rel), 'utf8');
}

function requireArtifacts() {
  for (const rel of [
    ...ENGINE_FILES,
    ...ADAPTER_FILES,
    ...BROWSER_FILES,
    CONTRACT_DOC,
    DECISION_LOG,
    WORKFLOW,
  ]) {
    if (!existsSync(join(ROOT, rel))) fail('artifact.missing', `required artifact absent: ${rel}`);
  }
}

/** Repository-independent engine must not import project authority. */
function checkOwnershipBoundary() {
  let violations = 0;
  for (const rel of ENGINE_FILES) {
    if (!existsSync(join(ROOT, rel))) continue;
    const src = read(rel);
    for (const pattern of FORBIDDEN_ENGINE_IMPORT_PATTERNS) {
      if (pattern.test(src)) {
        violations += 1;
        fail(
          'ownership.boundary',
          `${rel} imports project authority (${pattern}); all project data must enter through the adapter`,
        );
      }
    }
  }
  REPORT.engineBoundaryViolations = violations;

  const adapterSrc = ADAPTER_FILES.filter((rel) => existsSync(join(ROOT, rel))).map(read).join('\n');
  for (const authority of [
    'experienceRouteRegistry',
    'premiumExperienceStateRegistry',
    'premiumExperienceCaptureModel',
    'commercialVisualQualityContract',
    'm55MethodRouteConsumption',
    'assetLedger',
    'm55CommercialFunnelContract',
  ]) {
    if (!adapterSrc.includes(authority)) {
      fail('adapter.import', `adapter must import the existing authority: ${authority}`);
    }
  }
  // Extending by reference means no restated price / copy literal in the adapter.
  if (/[¥￥]\s*\d|\d{3,}\s*円/.test(adapterSrc)) {
    fail('adapter.product_truth', 'adapter must not restate prices; reference Product Truth keys');
  }
}

/** Run the typed registration reconciliation through tsx. */
function checkRegistration() {
  let raw;
  try {
    raw = execFileSync(
      'npx',
      [
        'tsx',
        '-e',
        [
          "import { verifyM55CommercialQualityRegistration, M55_CONSOLIDATION_POINTS } from './lib/m55/commercialUx/qualityControl/m55ManifestAdapter';",
          "import { M55_COMMERCIAL_QUALITY_MANIFEST } from './lib/m55/commercialUx/qualityControl/m55SurfaceManifest';",
          "import { M55_SETUP_REGISTRY, countAuthorityRegistrations } from './lib/m55/commercialUx/qualityControl/m55SetupRegistry';",
          "import { COMMERCIAL_QUALITY_NEGATIVE_FIXTURES, evaluateFixture } from './lib/commercialQuality/fixtures';",
          'const report = verifyM55CommercialQualityRegistration();',
          'const setupCounts = countAuthorityRegistrations();',
          'const setupUnresolved = report.failures.filter((f) => f.code.startsWith("SETUP_")).length;',
          'const fixtures = COMMERCIAL_QUALITY_NEGATIVE_FIXTURES.map((f) => ({ id: f.id, expectedCode: f.expectedCode, rejected: evaluateFixture(f).includes(f.expectedCode) }));',
          'process.stdout.write(JSON.stringify({ report, fixtures, consolidationPoints: M55_CONSOLIDATION_POINTS.length, setupCounts, manifestEntryCount: M55_COMMERCIAL_QUALITY_MANIFEST.entries.length, setupUnresolved }));',
        ].join('\n'),
      ],
      { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
    );
  } catch (error) {
    fail('registration.execution', `registration reconciliation failed to run: ${error.message}`);
    return;
  }

  const jsonStart = raw.indexOf('{');
  let parsed;
  try {
    parsed = JSON.parse(raw.slice(jsonStart));
  } catch {
    fail('registration.execution', 'registration reconciliation produced no parseable report');
    return;
  }

  const { report, fixtures, consolidationPoints, setupCounts, manifestEntryCount, setupUnresolved } =
    parsed;
  REPORT.schemaVersion = report.schemaVersion;
  REPORT.manifestDigest = report.manifestDigest;
  REPORT.ecpEntriesRegistered = report.counts.ecpEntries;
  REPORT.premiumStatesRegistered = report.counts.premiumStates;
  REPORT.premiumCapturesRegistered = report.counts.premiumCaptures;
  REPORT.commercialVisualCasesRegistered = report.counts.commercialVisualCases;
  REPORT.totalSurfaces = report.counts.total;
  REPORT.setupRegistryTotal = setupCounts.total;
  REPORT.setupRegistryExecutable = setupCounts.executable;
  REPORT.setupRegistryNonRuntime = setupCounts.nonRuntime;
  REPORT.registrationFailures = report.failures.length;
  REPORT.consolidationPoints = consolidationPoints;

  if (setupCounts.total !== 91) {
    fail('registration.setup', `setup registry total must be 91 (received ${setupCounts.total})`);
  }
  if (setupCounts.executable !== 77) {
    fail(
      'registration.setup',
      `setup registry executable count must be 77 (received ${setupCounts.executable})`,
    );
  }
  if (setupCounts.nonRuntime !== 14) {
    fail(
      'registration.setup',
      `setup registry non_runtime_reference count must be 14 (received ${setupCounts.nonRuntime})`,
    );
  }
  if (setupCounts.executable + setupCounts.nonRuntime !== setupCounts.total) {
    fail(
      'registration.setup',
      `setup registry executable + non_runtime must equal total (${setupCounts.executable} + ${setupCounts.nonRuntime} ≠ ${setupCounts.total})`,
    );
  }
  if (manifestEntryCount !== report.counts.total) {
    fail(
      'registration.setup',
      `manifest entry count ${manifestEntryCount} must equal registered surfaces ${report.counts.total}`,
    );
  }
  if (setupUnresolved !== 0) {
    fail('registration.setup', `setup registry has ${setupUnresolved} unresolved SETUP_ failures`);
  }

  if (report.schemaVersion !== 1) {
    fail('registration.schema', `surface manifest schema version must be 1 (received ${report.schemaVersion})`);
  }
  for (const [key, label] of [
    ['ecpEntries', 'ECP page entries'],
    ['premiumStates', 'Premium runtime states'],
    ['premiumCaptures', 'Premium capture cases'],
    ['commercialVisualCases', 'commercial visual cases'],
  ]) {
    if (report.counts[key] !== report.expectedCounts[key]) {
      fail(
        'registration.coverage',
        `${label}: registered ${report.counts[key]} of ${report.expectedCounts[key]}`,
      );
    }
  }
  if (report.expectedCounts.ecpEntries !== 51) {
    fail('registration.coverage', `expected 51 ECP entries, authority reports ${report.expectedCounts.ecpEntries}`);
  }
  if (report.expectedCounts.premiumStates !== 12) {
    fail('registration.coverage', `expected 12 Premium states, authority reports ${report.expectedCounts.premiumStates}`);
  }
  if (report.expectedCounts.premiumCaptures !== 14) {
    fail('registration.coverage', `expected 14 Premium captures, authority reports ${report.expectedCounts.premiumCaptures}`);
  }
  if (report.expectedCounts.commercialVisualCases !== 7) {
    fail('registration.coverage', `expected 7 commercial visual cases, authority reports ${report.expectedCounts.commercialVisualCases}`);
  }
  for (const failure of report.failures) {
    fail('registration.failure', `${failure.code}: ${failure.message}`);
  }
  if (consolidationPoints < 6) {
    fail('consolidation.points', 'six existing-system consolidation points must be declared');
  }

  REPORT.negativeFixtures = fixtures.length;
  REPORT.negativeFixtureRejections = fixtures.filter((f) => f.rejected).length;
  if (fixtures.length < REQUIRED_NEGATIVE_FIXTURE_IDS.length) {
    fail('fixtures.count', `expected at least ${REQUIRED_NEGATIVE_FIXTURE_IDS.length} negative fixtures`);
  }
  const byId = new Map(fixtures.map((f) => [f.id, f]));
  for (const id of REQUIRED_NEGATIVE_FIXTURE_IDS) {
    const fixture = byId.get(id);
    if (!fixture) {
      fail('fixtures.missing', `negative fixture missing: ${id}`);
      continue;
    }
    if (!fixture.rejected) {
      fail('fixtures.accepted', `negative fixture ${id} was not rejected with ${fixture.expectedCode}`);
    }
  }
}

/** Candidate output may never become a canonical baseline by itself. */
function checkApprovalPackDiscipline() {
  const src = existsSync(join(ROOT, 'lib/commercialQuality/approvalPack.ts'))
    ? read('lib/commercialQuality/approvalPack.ts')
    : '';
  const candidateOnly =
    src.includes("status: 'candidate'") &&
    src.includes('humanApprovalRecorded: false') &&
    src.includes('PROMOTION_SELF_APPROVAL') &&
    src.includes('ALLOWED_APPROVAL_AUTHORITIES');
  REPORT.approvalPackCandidateOnly = candidateOnly;
  if (!candidateOnly) {
    fail('approval_pack.candidate', 'approval pack must be candidate-only and non-self-approving');
  }
  if (src.includes('e2e/screenshots') || src.includes('-snapshots')) {
    fail('approval_pack.canonical', 'approval pack must never write canonical snapshot paths');
  }

  const gitignore = existsSync(join(ROOT, '.gitignore')) ? read('.gitignore') : '';
  REPORT.approvalPackGitignored =
    gitignore.includes(APPROVAL_PACK_DIR) || gitignore.split('\n').some((line) => line.trim() === 'test-results/');
  if (!REPORT.approvalPackGitignored) {
    fail('approval_pack.gitignore', `${APPROVAL_PACK_DIR} must be gitignored`);
  }

  try {
    const tracked = execFileSync('git', ['ls-files', APPROVAL_PACK_DIR], {
      cwd: ROOT,
      encoding: 'utf8',
    }).trim();
    if (tracked.length > 0) {
      fail('approval_pack.tracked', 'candidate approval pack must not be tracked');
    }
  } catch {
    // git unavailable: the gitignore assertion above still applies.
  }
  REPORT.approvalPackPresentInWorktree = existsSync(join(ROOT, APPROVAL_PACK_DIR));
}

function checkDependencies() {
  const pkg = JSON.parse(read('package.json'));
  const axeVersion = pkg.devDependencies?.['@axe-core/playwright'];
  REPORT.axeDependencyLocked = typeof axeVersion === 'string' && /^\d+\.\d+\.\d+$/.test(axeVersion);
  if (!REPORT.axeDependencyLocked) {
    fail('dependency.axe', '@axe-core/playwright must be a locked exact devDependency');
  }
  const lock = read('package-lock.json');
  if (!lock.includes('@axe-core/playwright')) {
    fail('dependency.lock', 'package-lock.json must resolve @axe-core/playwright');
  }
  for (const script of [
    'verify:m55-commercial-quality-control-plane',
    'test:m55-commercial-quality-control-plane',
    'test:e2e:commercial-quality-control-plane',
  ]) {
    if (!pkg.scripts?.[script]) fail('dependency.script', `package.json must define ${script}`);
  }
  const e2eScript = pkg.scripts?.['test:e2e:commercial-quality-control-plane'] ?? '';
  if (!e2eScript.includes('run-m55-commercial-quality-control-plane-e2e.mjs')) {
    fail(
      'dependency.e2e_wrapper',
      'test:e2e:commercial-quality-control-plane must use the post-Playwright cleanup wrapper',
    );
  }
  const wrapper = existsSync(join(ROOT, 'scripts/run-m55-commercial-quality-control-plane-e2e.mjs'))
    ? read('scripts/run-m55-commercial-quality-control-plane-e2e.mjs')
    : '';
  if (!wrapper.includes('cleanOwnedResidue') || !wrapper.includes('process.exit(status')) {
    fail('dependency.e2e_wrapper', 'e2e wrapper must clean residue after Playwright and preserve exit status');
  }
  const runner = existsSync(join(ROOT, 'e2e/helpers/commercialQualityRunner.ts'))
    ? read('e2e/helpers/commercialQualityRunner.ts')
    : '';
  if (!runner.includes('@axe-core/playwright')) {
    fail('dependency.axe', 'the browser runner must integrate @axe-core/playwright');
  }
  if (!runner.includes('requireCleanCaptureEnvironment') || !runner.includes('assertOverlayAbsence')) {
    fail('runner.clean_capture', 'the browser runner must reuse the clean-capture environment');
  }
  if (!runner.includes('getClientRects')) {
    fail('runner.rendered_lines', 'rendered Japanese line detection must use Range client rects');
  }
}

function checkCiWiring() {
  const src = read(WORKFLOW);
  let wired = 0;
  for (const step of REQUIRED_CI_STEPS) {
    if (src.includes(step)) wired += 1;
    else fail('ci.step', `audit workflow must add the step: ${step}`);
  }
  REPORT.ciStepsWired = wired;

  for (const script of [
    'verify:m55-commercial-quality-control-plane',
    'test:m55-commercial-quality-control-plane',
    'test:e2e:commercial-quality-control-plane',
  ]) {
    if (!src.includes(script)) fail('ci.script', `audit workflow must run ${script}`);
  }
  // Existing gates must not be weakened by this lane.
  for (const existing of [
    'verify:m55-commercial-visual-quality',
    'verify:m55-method-authority',
    'verify:m55-premium-proof-records',
    'verify:m55-experience-control-plane',
    'test:e2e:commercial-visual-quality',
    'test:e2e:method-authority-placement',
  ]) {
    if (!src.includes(existing)) fail('ci.regression', `existing audit gate removed: ${existing}`);
  }
  if (!src.includes('M55_E2E_CLEAN_CAPTURE')) {
    fail('ci.clean_capture', 'browser gate must reuse the clean-capture Clerk test-key wiring');
  }
  if (!src.includes('secrets.M55_E2E_CLERK_PUBLISHABLE_KEY')) {
    fail('ci.clean_capture', 'browser gate must consume the dedicated Clerk test-key secrets');
  }
  if (/--update-snapshots/.test(src)) {
    fail('ci.canonical', 'audit workflow must never update canonical snapshots');
  }
}

function checkDurablePolicy() {
  const contract = read(CONTRACT_DOC);
  for (const needle of [
    'Commercial quality control plane',
    'lib/commercialQuality',
    'candidate',
    'human-approved',
  ]) {
    if (!contract.includes(needle)) {
      fail('policy.contract', `${CONTRACT_DOC} must document: ${needle}`);
    }
  }
  const log = read(DECISION_LOG);
  if (!log.includes('commercial quality control plane')) {
    fail('policy.decision_log', `${DECISION_LOG} must record the control-plane decision`);
  }

  // Active accessibility deferrals must be empty after Commit B; closed IDs stay in the log.
  const adapterManifest = read('lib/m55/commercialUx/qualityControl/m55SurfaceManifest.ts');
  const activeDeferralArray = adapterManifest.match(
    /export const M55_ACCESSIBILITY_DEFERRALS: readonly AccessibilityDeferral\[\] = (\[[\s\S]*?\]);/,
  );
  const activeDeferralBody = activeDeferralArray?.[1] ?? '';
  const activeDeferralCount = [...activeDeferralBody.matchAll(/decisionRecordId:/g)].length;
  REPORT.accessibilityDeferrals = activeDeferralCount;
  if (!log.includes('M55_ACCESSIBILITY_DEFERRALS')) {
    fail('policy.deferral', `${DECISION_LOG} must name the machine deferral authority`);
  }
  if (activeDeferralCount !== REQUIRED_DEFERRAL_RECORD_IDS.length) {
    fail(
      'policy.deferral',
      `expected ${REQUIRED_DEFERRAL_RECORD_IDS.length} active deferrals, got ${activeDeferralCount}`,
    );
  }
  for (const recordId of CLOSED_COMMIT_B_DEFERRAL_RECORD_IDS) {
    if (activeDeferralBody.includes(recordId)) {
      fail('policy.deferral', `closed Commit B deferral still active: ${recordId}`);
    }
    if (!log.includes(recordId)) {
      fail('policy.deferral', `decision log missing closed deferral record id: ${recordId}`);
    }
  }
  if (!log.includes('CLOSED_IN_COMMIT_B')) {
    fail('policy.deferral', `${DECISION_LOG} must record CLOSED_IN_COMMIT_B for contrast closure`);
  }
  if (!log.includes('4.36') || !log.includes('2.69')) {
    fail('policy.deferral', `${DECISION_LOG} must retain pre-closure measuredRatio evidence`);
  }
}

/**
 * Candidate-only pack generation. Fails closed unless the browser gate wrote
 * GREEN gate evidence whose pre-recorded hashes match current HEAD / digest.
 */
function emitCandidatePack() {
  const evidencePath = join(ROOT, GATE_EVIDENCE_FILE);
  if (!existsSync(evidencePath)) {
    fail(
      'approval_pack.evidence',
      `${GATE_EVIDENCE_FILE} absent: the registered-surface browser gate must run GREEN first`,
    );
    return;
  }

  let currentSourceCommit;
  try {
    currentSourceCommit = execFileSync('git', ['rev-parse', 'HEAD'], {
      cwd: ROOT,
      encoding: 'utf8',
    }).trim();
  } catch (error) {
    fail('approval_pack.evidence', `unable to resolve current HEAD: ${error.message}`);
    return;
  }

  if (!REPORT.manifestDigest) {
    fail('approval_pack.evidence', 'manifest digest unavailable from registration report');
    return;
  }

  try {
    const output = execFileSync(
      'npx',
      [
        'tsx',
        '-e',
        [
          "import { readFileSync } from 'node:fs';",
          "import { join, dirname } from 'node:path';",
          "import { generateApprovalPack } from './lib/commercialQuality/approvalPack';",
          "import { loadProvenancedCaptures, validateCandidateProvenance, manifestTuplesFromEntries } from './lib/commercialQuality/candidateProvenance';",
          "import { M55_COMMERCIAL_QUALITY_MANIFEST } from './lib/m55/commercialUx/qualityControl/m55SurfaceManifest';",
          "import { M55_SETUP_REGISTRY } from './lib/m55/commercialUx/qualityControl/m55SetupRegistry';",
          `const evidence = JSON.parse(readFileSync(${JSON.stringify(GATE_EVIDENCE_FILE)}, 'utf8'));`,
          `const captureDir = dirname(${JSON.stringify(GATE_EVIDENCE_FILE)});`,
          `const currentSourceCommit = ${JSON.stringify(currentSourceCommit)};`,
          `const currentManifestDigest = ${JSON.stringify(REPORT.manifestDigest)};`,
          'const fixtureBySetupId = new Map(M55_SETUP_REGISTRY.setups.map((s) => [s.setupId, s.fixtureId]));',
          'const manifestTuples = manifestTuplesFromEntries(M55_COMMERCIAL_QUALITY_MANIFEST.entries, fixtureBySetupId);',
          'const provenanceFailures = validateCandidateProvenance({ evidence, currentSourceCommit, currentManifestDigest, captureDirectory: captureDir, manifestTuples });',
          'if (provenanceFailures.length > 0) {',
          '  process.stderr.write(JSON.stringify({ provenanceFailures }));',
          '  process.exit(2);',
          '}',
          'const entries = M55_COMMERCIAL_QUALITY_MANIFEST.entries.filter((e) => evidence.changedSurfaces.includes(e.surfaceId));',
          'const captures = loadProvenancedCaptures(evidence, captureDir);',
          'const pack = generateApprovalPack(process.cwd(), {',
          '  sourceCommit: currentSourceCommit,',
          '  manifestDigest: currentManifestDigest,',
          '  entries,',
          '  results: [],',
          '  gates: evidence.gates,',
          '  changedSurfaces: evidence.changedSurfaces,',
          '  captures,',
          '});',
          'process.stdout.write(JSON.stringify({ directory: pack.directory, status: pack.provenance.status, artifacts: pack.provenance.artifacts.length, humanApprovalRecorded: pack.provenance.humanApprovalRecorded, sourceCommit: pack.provenance.sourceCommit, manifestDigest: pack.provenance.manifestDigest }));',
        ].join('\n'),
      ],
      { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
    );
    const parsed = JSON.parse(output.slice(output.indexOf('{')));
    if (parsed.status !== 'candidate' || parsed.humanApprovalRecorded !== false) {
      fail('approval_pack.candidate', 'generated pack must be candidate-only');
    }
    if (parsed.sourceCommit !== currentSourceCommit) {
      fail('approval_pack.evidence', 'generated pack must bind to current HEAD');
    }
    if (parsed.manifestDigest !== REPORT.manifestDigest) {
      fail('approval_pack.evidence', 'generated pack must bind to current manifest digest');
    }
    REPORT.candidatePack = parsed;
  } catch (error) {
    if (error.status === 2 && error.stderr) {
      fail('approval_pack.provenance', `candidate provenance validation failed: ${error.stderr}`);
    } else {
      fail('approval_pack.generation', `candidate pack generation failed: ${error.message}`);
    }
  }
}

function checkStateIdentityUniqueness() {
  try {
    const output = execFileSync(
      'npx',
      [
        'tsx',
        '-e',
        [
          "import { listExecutableSmokeTargets } from './lib/m55/commercialUx/qualityControl/m55SetupRegistry.ts';",
          "import { resolveSmokeManifestEntry } from './e2e/helpers/commercialQualitySmokeEvidence.ts';",
          "import { stateDomContractForEntry, reconcileExecutableStateContracts, countUniqueObservableSignatures, countObservableSignatureCollisions, countGenericStateMarkers } from './lib/m55/commercialUx/qualityControl/m55StateDomContracts.ts';",
          "import { M55_AUTH_GATE_FIXTURE_REGISTRY, authGateFixtureById, IMAGE_RESPONSE_FIXTURE } from './lib/m55/commercialUx/qualityControl/m55AuthGateFixtureRegistry.ts';",
          "import { readFileSync } from 'node:fs';",
          "import * as aliasMap from './lib/m55/commercialUx/qualityControl/m55ObservableStateAliasMap.ts';",
          "import { recomputeCanonicalAliasCounts, M55_OBSERVABLE_STATE_ALIASES, assertAliasMapClosed, canonicalObservableStateIdFor, countProjectionAliases, reconcileResolverParity, probeExcludedProjectionResolverNegative, probeRenamedDivergentResolverNegative, findDisallowedAliasMapFunctionExports, findDivergentExportedStringResolvers } from './lib/m55/commercialUx/qualityControl/m55ObservableStateAliasMap.ts';",
          "const targets = listExecutableSmokeTargets();",
          "const ids = targets.map((t) => t.runtimeStateId);",
          "assertAliasMapClosed(ids);",
          "const counts = recomputeCanonicalAliasCounts(ids);",
          "const projections = countProjectionAliases(ids);",
          "const parity = reconcileResolverParity(ids, canonicalObservableStateIdFor);",
          "const excludedProjectionFailures = probeExcludedProjectionResolverNegative(ids);",
          "const renamedDivergent = probeRenamedDivergentResolverNegative(ids);",
          "const aliasMapSource = readFileSync('lib/m55/commercialUx/qualityControl/m55ObservableStateAliasMap.ts','utf8');",
          "const disallowedExports = findDisallowedAliasMapFunctionExports(aliasMapSource);",
          "const divergentExports = findDivergentExportedStringResolvers(ids, aliasMap);",
          "const contracts = targets.map((t) => stateDomContractForEntry(resolveSmokeManifestEntry(t)));",
          "const failures = reconcileExecutableStateContracts(contracts);",
          // Cross-owner collision: identical route/selector/value, different canonicals.
          "const crossOwner = reconcileExecutableStateContracts([",
          "  { surfaceId: 't-app', runtimeStateId: 'ecp:public.home:default', canonicalObservableStateId: 'ecp:public.home:default', ownership: 'application', selector: '[data-x=shared]', stateAttribute: 'data-m55-cq-state-id', expectedAttributeValue: 'shared-value', fixtureId: null, setupId: 's', route: '/home', expectedText: null, teardown: 'none' },",
          "  { surfaceId: 't-fix', runtimeStateId: 'ecp:public.pricing:default', canonicalObservableStateId: 'ecp:public.pricing:default', ownership: 'fixture', selector: '[data-x=shared]', stateAttribute: 'data-m55-cq-state-id', expectedAttributeValue: 'shared-value', fixtureId: 'auth_gate.public.sign_in', setupId: 's2', route: '/home', expectedText: null, teardown: 'none' },",
          "], { skipAliasMapClosed: true });",
          "const crossOwnerRejected = crossOwner.some((f) => f.code === 'STATE_CONTRACT_COLLISION');",
          "let unknownOk = false; try { authGateFixtureById('auth_gate.DOES_NOT_EXIST'); } catch { unknownOk = true; }",
          "console.log(JSON.stringify({",
          "  executable: contracts.length,",
          "  canonical: counts.canonical,",
          "  alias: counts.alias,",
          "  mapping: counts.mapping,",
          "  dualAliasTable: Object.keys(M55_OBSERVABLE_STATE_ALIASES).length,",
          "  projectionRegistrations: projections.projectionRegistrations,",
          "  projectionAliases: projections.projectionAliases,",
          "  excludedProjectionAliasFailures: excludedProjectionFailures.length,",
          "  renamedParityFailures: renamedDivergent.parityFailures.length,",
          "  renamedDisallowedDetected: renamedDivergent.disallowedExports.includes('sneakyAlternateCanonicalResolver'),",
          "  renamedDivergentDetected: renamedDivergent.divergentExports.includes('sneakyAlternateCanonicalResolver'),",
          "  resolverParityFailures: parity.length,",
          "  disallowedExports,",
          "  divergentExports,",
          "  uniqueSignatures: countUniqueObservableSignatures(contracts),",
          "  collisions: countObservableSignatureCollisions(contracts),",
          "  generic: countGenericStateMarkers(),",
          "  authFixtures: M55_AUTH_GATE_FIXTURE_REGISTRY.length,",
          "  imageFixture: IMAGE_RESPONSE_FIXTURE.fixtureId,",
          "  unknownFixtureRejected: unknownOk,",
          "  crossOwnerRejected,",
          "  failures,",
          "}));",
        ].join(''),
      ],
      { cwd: ROOT, encoding: 'utf8' },
    );
    const report = JSON.parse(output.trim().split('\n').filter(Boolean).at(-1));
    REPORT.observableSignatureCount = report.uniqueSignatures;
    REPORT.observableSignatureCollisions = report.collisions;
    REPORT.canonicalObservableStateCount = report.canonical;
    REPORT.registrationAliasCount = report.alias;
    REPORT.fixedAuthGateFixtureCount = report.authFixtures;
    if (report.executable !== 77) {
      fail('state_identity.executable', `expected 77 executable contracts, got ${report.executable}`);
    }
    if (report.canonical !== 46) {
      fail(
        'state_identity.canonical',
        `expected 46 canonical observable states (recomputed), got ${report.canonical}`,
      );
    }
    if (report.alias !== 31) {
      fail(
        'state_identity.alias',
        `expected 31 registration aliases (recomputed), got alias=${report.alias}`,
      );
    }
    if (report.canonical + report.alias !== 77) {
      fail(
        'state_identity.arithmetic',
        `canonical+alias must equal 77, got ${report.canonical}+${report.alias}`,
      );
    }
    if (report.mapping !== 77) {
      fail('state_identity.mapping', `expected 77 registration mappings, got ${report.mapping}`);
    }
    if (report.uniqueSignatures !== 46) {
      fail(
        'state_identity.unique',
        `expected 46 unique canonical observable signatures, got ${report.uniqueSignatures}`,
      );
    }
    if (report.projectionAliases !== 17 || report.projectionRegistrations !== 17) {
      fail(
        'state_identity.projections',
        `expected 17 projection aliases counted in arithmetic, got registrations=${report.projectionRegistrations} aliases=${report.projectionAliases}`,
      );
    }
    if (report.excludedProjectionAliasFailures < 1) {
      fail(
        'state_identity.excluded_projection_negative',
        'excluding projections from the resolver must fail reconciliation parity',
      );
    }
    if (
      report.renamedParityFailures < 1 ||
      !report.renamedDisallowedDetected ||
      !report.renamedDivergentDetected
    ) {
      fail(
        'state_identity.renamed_divergent_negative',
        'differently named divergent resolver must be detected without relying on one symbol name',
      );
    }
    if (report.resolverParityFailures !== 0) {
      fail(
        'state_identity.resolver_parity',
        `verifier/production resolver parity failures: ${report.resolverParityFailures}`,
      );
    }
    if ((report.disallowedExports ?? []).length !== 0) {
      fail(
        'state_identity.disallowed_exports',
        `disallowed alias-map function exports: ${(report.disallowedExports ?? []).join(',')}`,
      );
    }
    if ((report.divergentExports ?? []).length !== 0) {
      fail(
        'state_identity.divergent_exports',
        `divergent exported string resolvers: ${(report.divergentExports ?? []).join(',')}`,
      );
    }
    if (report.dualAliasTable !== 14) {
      fail(
        'state_identity.dual_table',
        `expected dual-alias metadata table size 14, got ${report.dualAliasTable}`,
      );
    }
    if (report.collisions !== 0) {
      fail('state_identity.collision', `observable signature collisions: ${report.collisions}`);
    }
    if (report.generic !== 0) {
      fail('state_identity.generic', `generic selector-only contracts: ${report.generic}`);
    }
    if (report.authFixtures !== 13) {
      fail('state_identity.auth_fixtures', `expected 13 fixed auth-gate fixtures, got ${report.authFixtures}`);
    }
    if (report.imageFixture !== 'image_response.shared.og') {
      fail('state_identity.image_fixture', 'image_response.shared.og fixture contract missing');
    }
    if (!report.unknownFixtureRejected) {
      fail('state_identity.unknown_fixture', 'unknown auth-gate fixture ID must reject');
    }
    if (!report.crossOwnerRejected) {
      fail('state_identity.cross_owner', 'cross-owner same-signature different-canonical must reject');
    }
    for (const f of report.failures ?? []) {
      fail('state_identity.reconcile', `${f.code}: ${f.detail}`);
    }
  } catch (error) {
    fail('state_identity.execution', `state identity reconciliation failed: ${error.message}`);
  }

  const setupSrc = read('lib/m55/commercialUx/qualityControl/m55SetupRegistry.ts');
  if (/establishLocalAuthGateFixture\(\s*page,\s*baseURL,\s*path,\s*entry\.runtimeStateId/.test(setupSrc)) {
    fail(
      'state_identity.manifest_copy',
      'setup must not pass entry.runtimeStateId into establishLocalAuthGateFixture',
    );
  }
  const fixturesSrc = read('lib/m55/commercialUx/qualityControl/m55QualityFixtures.ts');
  if (/runtimeStateId:\s*string/.test(fixturesSrc) && /establishLocalAuthGateFixture/.test(fixturesSrc)) {
    // Parameter list must take fixtureId, not runtimeStateId.
    const match = fixturesSrc.match(
      /export async function establishLocalAuthGateFixture\(([^)]*)\)/,
    );
    if (match && /runtimeStateId/.test(match[1])) {
      fail(
        'state_identity.manifest_copy',
        'establishLocalAuthGateFixture must accept fixtureId, not runtimeStateId',
      );
    }
  }
}

function main() {
  console.log('M55 commercial quality control plane verifier');
  console.log(`root: ${ROOT}`);
  console.log(`engine: ${ENGINE_DIR}\n`);
  requireArtifacts();
  checkOwnershipBoundary();
  checkRegistration();
  checkStateIdentityUniqueness();
  checkApprovalPackDiscipline();
  checkDependencies();
  checkCiWiring();
  checkDurablePolicy();
  if (EMIT_CANDIDATE_PACK && FAILURES.length === 0) emitCandidatePack();

  console.log('--- report ---');
  console.log(JSON.stringify(REPORT, null, 2));
  if (FAILURES.length) {
    console.log('\n--- failures ---');
    for (const f of FAILURES) console.log(`[${f.rule}] ${f.message}`);
    console.log(`\nPASS/FAIL: FAIL (${FAILURES.length})`);
    process.exit(1);
  }
  console.log('\nPASS/FAIL: PASS');
}

main();
