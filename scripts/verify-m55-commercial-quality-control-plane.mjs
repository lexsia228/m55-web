#!/usr/bin/env node
/**
 * Deterministic verifier for the integrated commercial quality control plane.
 * npm run verify:m55-commercial-quality-control-plane
 *
 * Enforces:
 * - ownership boundary (repository-independent engine imports no M55 authority)
 * - manifest schema v1 registration for every imported governed identity
 * - 51 ECP entries / 12 Premium states / 14 Premium captures / 6 visual cases
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

const REQUIRED_DEFERRAL_RECORD_IDS = [
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

  if (setupCounts.total !== 90) {
    fail('registration.setup', `setup registry total must be 90 (received ${setupCounts.total})`);
  }
  if (setupCounts.executable !== 76) {
    fail(
      'registration.setup',
      `setup registry executable count must be 76 (received ${setupCounts.executable})`,
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
  if (report.expectedCounts.commercialVisualCases !== 6) {
    fail('registration.coverage', `expected 6 commercial visual cases, authority reports ${report.expectedCounts.commercialVisualCases}`);
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

  // Every accessibility deferral must be recorded with exact IDs, ratios, and owners.
  const adapterManifest = read('lib/m55/commercialUx/qualityControl/m55SurfaceManifest.ts');
  const deferralBlocks = [
    ...adapterManifest.matchAll(
      /decisionRecordId:\s*'([^']+)'[\s\S]*?route:\s*'([^']+)'[\s\S]*?selector:\s*'([^']+)'[\s\S]*?ownerFile:\s*'([^']+)'[\s\S]*?measuredRatio:\s*([\d.]+)[\s\S]*?classification:\s*'([^']+)'/g,
    ),
  ];
  REPORT.accessibilityDeferrals = deferralBlocks.length;
  if (!log.includes('M55_ACCESSIBILITY_DEFERRALS')) {
    fail('policy.deferral', `${DECISION_LOG} must name the machine deferral authority`);
  }
  for (const recordId of REQUIRED_DEFERRAL_RECORD_IDS) {
    if (!adapterManifest.includes(recordId)) {
      fail('policy.deferral', `adapter deferral missing decisionRecordId: ${recordId}`);
    }
    if (!log.includes(recordId)) {
      fail('policy.deferral', `decision log missing deferral record id: ${recordId}`);
    }
  }
  for (const match of deferralBlocks) {
    const [, decisionRecordId, route, selector, ownerFile, measuredRatio, classification] = match;
    if (classification !== 'CLOSE_IN_COMMIT_B') {
      fail(
        'policy.deferral',
        `deferral ${decisionRecordId} classification must be CLOSE_IN_COMMIT_B (received ${classification})`,
      );
    }
    if (!log.includes(decisionRecordId)) {
      fail('policy.deferral', `decision log missing deferral record id: ${decisionRecordId}`);
    }
    if (!log.includes(route)) {
      fail('policy.deferral', `decision log missing deferral route: ${route}`);
    }
    if (!log.includes(selector)) {
      fail('policy.deferral', `decision log missing deferral selector: ${selector}`);
    }
    if (!log.includes(ownerFile)) {
      fail('policy.deferral', `decision log missing deferral owner file: ${ownerFile}`);
    }
    if (!log.includes(String(measuredRatio))) {
      fail(
        'policy.deferral',
        `decision log missing measuredRatio ${measuredRatio} for ${decisionRecordId}`,
      );
    }
    if (!log.includes('CLOSE_IN_COMMIT_B')) {
      fail('policy.deferral', `${DECISION_LOG} must record CLOSE_IN_COMMIT_B classification`);
    }
  }
  for (const deferral of [...adapterManifest.matchAll(/axeRuleId:\s*'([^']+)'/g)].map((m) => m[1])) {
    if (!log.includes(`axe \`${deferral}\``)) {
      fail('policy.deferral', `axe rule deferral not recorded in the decision log: ${deferral}`);
    }
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

function main() {
  console.log('M55 commercial quality control plane verifier');
  console.log(`root: ${ROOT}`);
  console.log(`engine: ${ENGINE_DIR}\n`);
  requireArtifacts();
  checkOwnershipBoundary();
  checkRegistration();
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
