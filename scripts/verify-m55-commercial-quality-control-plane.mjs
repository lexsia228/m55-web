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
];
const BROWSER_FILES = [
  'e2e/helpers/commercialQualityRunner.ts',
  'e2e/commercial-quality-control-plane.spec.ts',
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
  'unregistered_route',
  'unregistered_runtime_state',
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
          "import { COMMERCIAL_QUALITY_NEGATIVE_FIXTURES, evaluateFixture } from './lib/commercialQuality/fixtures';",
          'const report = verifyM55CommercialQualityRegistration();',
          'const fixtures = COMMERCIAL_QUALITY_NEGATIVE_FIXTURES.map((f) => ({ id: f.id, expectedCode: f.expectedCode, rejected: evaluateFixture(f).includes(f.expectedCode) }));',
          'process.stdout.write(JSON.stringify({ report, fixtures, consolidationPoints: M55_CONSOLIDATION_POINTS.length }));',
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

  const { report, fixtures, consolidationPoints } = parsed;
  REPORT.schemaVersion = report.schemaVersion;
  REPORT.manifestDigest = report.manifestDigest;
  REPORT.ecpEntriesRegistered = report.counts.ecpEntries;
  REPORT.premiumStatesRegistered = report.counts.premiumStates;
  REPORT.premiumCapturesRegistered = report.counts.premiumCaptures;
  REPORT.commercialVisualCasesRegistered = report.counts.commercialVisualCases;
  REPORT.totalSurfaces = report.counts.total;
  REPORT.registrationFailures = report.failures.length;
  REPORT.consolidationPoints = consolidationPoints;

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

  // Every accessibility deferral must be recorded, owner-attributed and pinned.
  const adapter = read('lib/m55/commercialUx/qualityControl/m55SurfaceManifest.ts');
  const deferralOwners = [...adapter.matchAll(/ownerFile:\s*'([^']+)'/g)].map((m) => m[1]);
  REPORT.accessibilityDeferrals = deferralOwners.length;
  if (!log.includes('M55_ACCESSIBILITY_DEFERRALS')) {
    fail('policy.deferral', `${DECISION_LOG} must name the machine deferral authority`);
  }
  for (const owner of deferralOwners) {
    if (!log.includes(owner)) {
      fail('policy.deferral', `accessibility deferral owner not recorded in the decision log: ${owner}`);
    }
  }
  for (const deferral of [...adapter.matchAll(/axeRuleId:\s*'([^']+)'/g)].map((m) => m[1])) {
    if (!log.includes(`axe \`${deferral}\``)) {
      fail('policy.deferral', `axe rule deferral not recorded in the decision log: ${deferral}`);
    }
  }
}

/**
 * Candidate-only pack generation. Fails closed unless the browser gate wrote
 * GREEN gate evidence for the current source commit and manifest digest.
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
  const evidence = JSON.parse(readFileSync(evidencePath, 'utf8'));
  const gates = evidence.gates ?? {};
  if (!gates.geometryGreen || !gates.semanticGreen || !gates.accessibilityGreen) {
    fail('approval_pack.evidence', 'candidate pack requires geometry, semantic and accessibility GREEN');
    return;
  }
  if (evidence.manifestDigest !== REPORT.manifestDigest) {
    fail(
      'approval_pack.evidence',
      `gate evidence manifest digest ${evidence.manifestDigest} does not match current ${REPORT.manifestDigest}`,
    );
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
          "import { M55_COMMERCIAL_QUALITY_MANIFEST } from './lib/m55/commercialUx/qualityControl/m55SurfaceManifest';",
          `const evidence = JSON.parse(readFileSync(${JSON.stringify(GATE_EVIDENCE_FILE)}, 'utf8'));`,
          `const captureDir = dirname(${JSON.stringify(GATE_EVIDENCE_FILE)});`,
          'const entries = M55_COMMERCIAL_QUALITY_MANIFEST.entries.filter((e) => evidence.changedSurfaces.includes(e.surfaceId));',
          'const pack = generateApprovalPack(process.cwd(), {',
          '  sourceCommit: evidence.sourceCommit,',
          '  manifestDigest: evidence.manifestDigest,',
          '  entries,',
          '  results: [],',
          '  gates: evidence.gates,',
          '  changedSurfaces: evidence.changedSurfaces,',
          '  captures: evidence.captures.map((c) => ({ relativePath: c.relativePath, kind: c.kind, data: readFileSync(join(captureDir, c.relativePath)) })),',
          '});',
          'process.stdout.write(JSON.stringify({ directory: pack.directory, status: pack.provenance.status, artifacts: pack.provenance.artifacts.length, humanApprovalRecorded: pack.provenance.humanApprovalRecorded }));',
        ].join('\n'),
      ],
      { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
    );
    const parsed = JSON.parse(output.slice(output.indexOf('{')));
    if (parsed.status !== 'candidate' || parsed.humanApprovalRecorded !== false) {
      fail('approval_pack.candidate', 'generated pack must be candidate-only');
    }
    REPORT.candidatePack = parsed;
  } catch (error) {
    fail('approval_pack.generation', `candidate pack generation failed: ${error.message}`);
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
