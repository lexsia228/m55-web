import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { CONSISTENCY_OUTCOMES, EVIDENCE_LEVELS, canonicalEvidenceIdentity, canonicalEvidenceRepresentation, codePointCompare, compareEvidenceRecords, evaluateConsistency, memoryReader, normalizeSemanticData, repositoryReader } from './consistency-engine.mjs';
import { CONSISTENCY_PACKET_TARGETS, cleanupOwnedConsistencyStaging, consistencyMarkdown, renderConsistencyPacket, renderFieldValue, renderJudgeHtml, renderOperatorHtml, renderPrintHtml, semanticDigest, semanticPayload, validateOutputBoundary, writeArtifactManifest, writeConsistencyPacket } from './consistency-packet.mjs';
import { orbitConsistencyManifest, ORBIT_FILES } from './examples/orbit-consistency-adapter.mjs';
import { m55ConsistencyManifest } from './m55-consistency-adapter.mjs';
import { stableJson } from './engine.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const provenance = { branch: 'synthetic/main', commit: 'abc123', timestamp: '2026-07-21T00:00:00.000Z' };
const inspect = (fixture) => evaluateConsistency(fixture.manifest, { readText: memoryReader(fixture.files), provenance, generatedAt: provenance.timestamp });
const inspectM55 = (timestamp = provenance.timestamp) => evaluateConsistency(m55ConsistencyManifest(), { readText: repositoryReader(ROOT), provenance: { branch: 'feat/m55-build-week-control-plane-v1', commit: 'c1751c7b9c3aba6cb5fea2dfd0dd22c72b98f440', timestamp }, generatedAt: timestamp });
const mutated = (change, options = {}) => orbitConsistencyManifest({ ...options, mutate: (files) => { change(files); return files; } });
const humanReview = (summary, ruleId = 'human_review.fixture') => ({ ruleId, summary });

test('PASS-only synthetic project reduces to CONSISTENT', () => {
  const report = inspect(orbitConsistencyManifest());
  assert.equal(report.status, 'CONSISTENT');
  assert.deepEqual(report.counts, {
    totalEvidence: 14, compliancePasses: 14, currentDebtObservations: 0, humanReviewItems: 0,
    explicitExclusions: 0, blockingFailures: 0,
    countsByEvidenceLevel: { SOURCE_STATIC: 14, RUNTIME_VERIFIED: 0, VISUAL_CAPTURE: 0, HUMAN_APPROVED: 0 },
    coveredSurfaces: ['landing'], excludedSurfaces: [],
  });
});

test('Human visual decision pending reduces to REVIEW_REQUIRED', () => {
  const report = inspect(orbitConsistencyManifest({ humanReview: [{ ruleId: 'human_review.composition', summary: 'Human composition review', evidenceLevel: 'VISUAL_CAPTURE' }] }));
  assert.equal(report.status, 'REVIEW_REQUIRED');
  assert.equal(report.counts.humanReviewItems, 1);
  assert.equal(report.counts.countsByEvidenceLevel.VISUAL_CAPTURE, 1);
});

test('observed current-state debt is CURRENT_DEBT at its declared level and never PASS', () => {
  const fixture = orbitConsistencyManifest();
  fixture.manifest.surfaces[0].currentDebt = [{ ruleId: 'legacy.label.current_debt', path: 'src/landing.html', observedMarker: 'Begin orbit', expected: 'Launch orbit', observed: 'Begin orbit', summary: 'Legacy label remains in current runtime.' }];
  const report = inspect(fixture);
  const debt = report.evidenceRecords.find((record) => record.ruleId === 'legacy.label.current_debt');
  assert.equal(report.status, 'REVIEW_REQUIRED');
  assert.equal(debt.outcome, 'CURRENT_DEBT');
  assert.equal(debt.evidenceLevel, 'SOURCE_STATIC');
  assert.equal(report.counts.currentDebtObservations, 1);
  assert.ok(!report.evidenceRecords.some((record) => record.ruleId === debt.ruleId && record.outcome === 'PASS'));
  assert.doesNotMatch(renderOperatorHtml(report), /verified current runtime debt/i);
});

test('explicit exclusion is not compliance and does not change CONSISTENT', () => {
  const fixture = orbitConsistencyManifest();
  fixture.manifest.surfaces.push({ id: 'future-map', route: '/future', journeyGroup: 'FUTURE', status: 'excluded', sourcePaths: [], authoritySources: ['GOVERNANCE.md'], exclusionReason: 'Future lane is outside current scope.' });
  const report = inspect(fixture);
  assert.equal(report.status, 'CONSISTENT');
  assert.equal(report.counts.compliancePasses, 14);
  assert.equal(report.counts.explicitExclusions, 1);
  assert.deepEqual(report.counts.excludedSurfaces, ['future-map']);
  assert.equal(report.exclusions[0].outcome, 'EXCLUDED');
});

test('any blocking failure reduces to HOLD', () => {
  const report = inspect(mutated((files) => delete files['src/landing.html']));
  assert.equal(report.status, 'HOLD');
  assert.ok(report.counts.blockingFailures > 0);
  assert.ok(report.reasonCodes.includes('INVENTORY_SOURCE_READABLE'));
});

test('malformed manifest reduces to HOLD distinctly', () => {
  const report = evaluateConsistency({ project: 'Orbit' }, { readText: memoryReader({}), provenance });
  assert.equal(report.status, 'HOLD');
  assert.ok(report.reasonCodes.includes('MANIFEST_STRUCTURE'));
});

test('malformed nested evidence declaration reduces to HOLD', () => {
  const report = inspect(orbitConsistencyManifest({ humanReview: [{}] }));
  assert.equal(report.status, 'HOLD');
  assert.ok(report.reasonCodes.includes('MANIFEST_NESTED_SCHEMA_VALID'));
  assert.match(report.failures[0].observed, /manifest\.humanReview\[0\]/);
});

test('malformed nested collections fail closed without throwing TypeError', () => {
  const cases = [
    ['surfaces[0].ctas', (fixture) => { fixture.manifest.surfaces[0].ctas = {}; }],
    ['surfaces[0].currentDebt', (fixture) => { fixture.manifest.surfaces[0].currentDebt = {}; }],
    ['surfaces[0].humanReview', (fixture) => { fixture.manifest.surfaces[0].humanReview = {}; }],
    ['manifest.humanReview', (fixture) => { fixture.manifest.humanReview = {}; }],
    ['surfaces[0].terminology.required', (fixture) => { fixture.manifest.surfaces[0].terminology.required = {}; }],
    ['surfaces[0].terminology.prohibited', (fixture) => { fixture.manifest.surfaces[0].terminology.prohibited = {}; }],
    ['surfaces[0].responsiveEvidence', (fixture) => { fixture.manifest.surfaces[0].responsiveEvidence = {}; }],
  ];
  for (const [section, mutate] of cases) {
    const fixture = orbitConsistencyManifest();
    mutate(fixture);
    let report;
    assert.doesNotThrow(() => { report = inspect(fixture); }, section);
    assert.equal(report.status, 'HOLD', section);
    assert.ok(report.reasonCodes.includes('MANIFEST_NESTED_SCHEMA_VALID'), section);
    assert.ok(report.failures.some((record) => record.observed.includes(section)), section);
  }
});

test('additional malformed manifest collections have exact deterministic diagnostics', () => {
  const cases = [
    ['manifest.journeyOrder', (fixture) => { fixture.manifest.journeyOrder = {}; }],
    ['manifest.humanDecisions', (fixture) => { fixture.manifest.humanDecisions = {}; }],
    ['surfaces[0].sourcePaths', (fixture) => { fixture.manifest.surfaces[0].sourcePaths = {}; }],
    ['surfaces[0].authoritySources', (fixture) => { fixture.manifest.surfaces[0].authoritySources = {}; }],
    ['surfaces[0].layout.markers', (fixture) => { fixture.manifest.surfaces[0].layout.markers = {}; }],
    ['surfaces[0].tokens.forbiddenRawValues', (fixture) => { fixture.manifest.surfaces[0].tokens.forbiddenRawValues = {}; }],
    ['surfaces[0].responsiveEvidence[0].blocking', (fixture) => { fixture.manifest.surfaces[0].responsiveEvidence[0].blocking = 'yes'; }],
  ];
  for (const [section, mutate] of cases) {
    const fixture = orbitConsistencyManifest();
    mutate(fixture);
    const first = inspect(fixture);
    const second = inspect(fixture);
    assert.equal(first.status, 'HOLD', section);
    assert.ok(first.failures.some((record) => record.observed.includes(section)), section);
    assert.equal(stableJson(first), stableJson(second), section);
  }
});

test('covered surfaces require non-vacuous source and authority evidence', () => {
  for (const field of ['sourcePaths', 'authoritySources']) {
    const fixture = orbitConsistencyManifest();
    fixture.manifest.surfaces[0][field] = [];
    const report = inspect(fixture);
    assert.equal(report.status, 'HOLD', field);
    assert.ok(report.reasonCodes.includes('MANIFEST_SURFACE_EVIDENCE_EMPTY'), field);
    assert.ok(report.failures.some((record) => record.observed.includes(`surfaces[0].${field}`)), field);
  }
});

test('an all-excluded manifest is HOLD rather than vacuously CONSISTENT', () => {
  const fixture = orbitConsistencyManifest();
  fixture.manifest.surfaces = [{ id: 'future', route: '/future', status: 'excluded', sourcePaths: [], authoritySources: ['GOVERNANCE.md'], exclusionReason: 'Future scope.' }];
  const report = inspect(fixture);
  assert.equal(report.status, 'HOLD');
  assert.ok(report.reasonCodes.includes('MANIFEST_NO_COVERED_SURFACE'));
  assert.equal(report.counts.coveredSurfaces.length, 0);
});

test('excluded surfaces require readable authority and never mask failure as EXCLUDED', () => {
  const fixture = orbitConsistencyManifest();
  fixture.manifest.surfaces.push({ id: 'future', route: '/future', status: 'excluded', sourcePaths: [], authoritySources: ['MISSING_AUTHORITY.md'], exclusionReason: 'Future scope.' });
  const report = inspect(fixture);
  const authority = report.evidenceRecords.find((record) => record.surfaceId === 'future' && record.ruleId === 'authority.exclusion_source.readable');
  assert.equal(report.status, 'HOLD');
  assert.equal(authority?.outcome, 'FAIL');
  assert.ok(report.reasonCodes.includes('AUTHORITY_EXCLUSION_SOURCE_READABLE'));
  assert.ok(!report.evidenceRecords.some((record) => record.surfaceId === 'future' && record.outcome === 'EXCLUDED'));
});

test('unreadable negative-check sources never prove forbidden-token or prohibited-term absence', () => {
  const cases = [
    ['token.forbidden_raw_value.absent', (surface) => { surface.tokens.forbiddenRawValues = [{ path: 'missing-token.css', value: '#bad' }]; }],
    ['terminology.prohibited.absent', (surface) => { surface.terminology.prohibited = [{ path: 'missing-copy.txt', value: 'Forbidden' }]; }],
  ];
  for (const [ruleId, mutate] of cases) {
    const fixture = orbitConsistencyManifest();
    mutate(fixture.manifest.surfaces[0]);
    const report = inspect(fixture);
    const records = report.evidenceRecords.filter((record) => record.ruleId === ruleId);
    assert.equal(report.status, 'HOLD', ruleId);
    assert.ok(records.length > 0, ruleId);
    assert.ok(records.every((record) => record.outcome === 'FAIL'), ruleId);
    for (const record of records) {
      assert.match(record.observed, /source unreadable/i);
      assert.doesNotMatch(`${record.summary} ${record.expected} ${record.observed}`, /\babsent\b|not present/i);
    }
  }
});

test('missing layout marker is HOLD', () => {
  const report = inspect(mutated((files) => { files['src/landing.html'] = files['src/landing.html'].replace('data-layout="editorial"', ''); }));
  assert.equal(report.status, 'HOLD');
  assert.ok(report.reasonCodes.includes('LAYOUT_MARKER_PRESENT'));
});

test('prohibited terminology is HOLD', () => {
  const report = inspect(mutated((files) => { files['src/landing.html'] += 'Legacy launch'; }));
  assert.equal(report.status, 'HOLD');
  assert.ok(report.reasonCodes.includes('TERMINOLOGY_PROHIBITED_ABSENT'));
});

test('required product terminology mismatch is HOLD', () => {
  const report = inspect(mutated((files) => { files['src/landing.html'] = files['src/landing.html'].replace('Begin orbit', 'Start'); }));
  assert.equal(report.status, 'HOLD');
  assert.ok(report.reasonCodes.includes('TERMINOLOGY_REQUIRED_PRESENT'));
});

test('CTA label, href, and role contradictions are HOLD', () => {
  for (const [field, value] of [['label', 'Wrong label'], ['href', 'href="/wrong"'], ['role', 'class="secondary"']]) {
    const fixture = orbitConsistencyManifest();
    fixture.manifest.surfaces[0].ctas[0][field] = value;
    const report = inspect(fixture);
    assert.equal(report.status, 'HOLD');
    assert.ok(report.reasonCodes.includes(`CTA_${field.toUpperCase()}_MATCHES`));
  }
});

test('target represented as live is HOLD', () => {
  const fixture = orbitConsistencyManifest();
  fixture.manifest.surfaces[0].targetPresentedAsLive = true;
  const report = inspect(fixture);
  assert.equal(report.status, 'HOLD');
  assert.ok(report.reasonCodes.includes('CURRENT_TARGET_TARGET_PRESENTED_AS_LIVE'));
});

test('required responsive evidence missing is blocking HOLD', () => {
  const report = inspect(mutated((files) => delete files['evidence/mobile.txt']));
  assert.equal(report.status, 'HOLD');
  assert.ok(report.reasonCodes.includes('RESPONSIVE_SOURCE_MARKER_PRESENT'));
});

test('configured nonblocking responsive evidence missing is REVIEW_REQUIRED', () => {
  const fixture = mutated((files) => { files['evidence/mobile.txt'] = 'pending'; });
  fixture.manifest.surfaces[0].responsiveEvidence[1].blocking = false;
  const report = inspect(fixture);
  assert.equal(report.status, 'REVIEW_REQUIRED');
  assert.equal(report.reviewRequired[0].outcome, 'REVIEW_REQUIRED');
});

test('duplicate surface id is HOLD', () => {
  const fixture = orbitConsistencyManifest();
  fixture.manifest.surfaces.push(structuredClone(fixture.manifest.surfaces[0]));
  const report = inspect(fixture);
  assert.equal(report.status, 'HOLD');
  assert.ok(report.reasonCodes.includes('MANIFEST_SURFACE_ID_UNIQUE'));
});

test('unreadable authority is HOLD', () => {
  const report = inspect(mutated((files) => delete files['GOVERNANCE.md']));
  assert.equal(report.status, 'HOLD');
  assert.ok(report.reasonCodes.includes('AUTHORITY_SOURCE_READABLE'));
});

test('project-defined forbidden raw token is HOLD', () => {
  const report = inspect(mutated((files) => { files['src/landing.css'] += '#ff00ff'; }));
  assert.equal(report.status, 'HOLD');
  assert.ok(report.reasonCodes.includes('TOKEN_FORBIDDEN_RAW_VALUE_ABSENT'));
});

test('all stable evidence fields are present and valid', () => {
  const report = inspect(orbitConsistencyManifest());
  const fields = ['surfaceId', 'ruleId', 'category', 'outcome', 'summary', 'expected', 'observed', 'authorityRefs', 'sourceRefs', 'evidenceLevel', 'blocking', 'currentOrTarget', 'nextAction'];
  for (const record of report.evidenceRecords) {
    for (const field of fields) assert.ok(Object.hasOwn(record, field), `${record.ruleId}:${field}`);
    assert.ok(CONSISTENCY_OUTCOMES.includes(record.outcome));
    assert.ok(EVIDENCE_LEVELS.includes(record.evidenceLevel));
    assert.ok(Array.isArray(record.authorityRefs));
    assert.ok(Array.isArray(record.sourceRefs));
    assert.equal(typeof record.blocking, 'boolean');
  }
});

test('rule ids are stable while expected and observed stay separate', () => {
  const base = inspect(orbitConsistencyManifest()).evidenceRecords.find((record) => record.ruleId === 'cta.label.matches');
  const fixture = orbitConsistencyManifest();
  fixture.manifest.surfaces[0].ctas[0].label = 'Different expectation';
  const changed = inspect(fixture).evidenceRecords.find((record) => record.ruleId === 'cta.label.matches');
  assert.equal(base.ruleId, changed.ruleId);
  assert.notEqual(base.expected, changed.expected);
  assert.notEqual(changed.expected, changed.observed);
});

test('deterministic canonical JSON ordering', () => {
  const fixture = orbitConsistencyManifest();
  const a = inspect(fixture);
  const b = inspect({ files: fixture.files, manifest: { ...fixture.manifest, surfaces: [...fixture.manifest.surfaces].reverse() } });
  assert.equal(stableJson(a), stableJson(b));
});

test('project identity survives evaluation, presentations, and canonical JSON', () => {
  const orbit = inspect(orbitConsistencyManifest());
  const m55 = inspectM55();
  assert.equal(orbit.project, 'Orbit Field Notes');
  assert.equal(m55.project, 'M55');
  assert.notEqual(orbit.project, m55.project);
  assert.equal(JSON.parse(stableJson(orbit)).project, 'Orbit Field Notes');
  assert.match(consistencyMarkdown(orbit), /Project: \*\*Orbit Field Notes\*\*/);
  assert.match(renderOperatorHtml(orbit), /Project <code>Orbit Field Notes<\/code>/);
});

test('project identity is nonvolatile semantic evidence', () => {
  const firstFixture = orbitConsistencyManifest();
  const secondFixture = orbitConsistencyManifest();
  secondFixture.manifest.project = 'Orbit Field Notes - Alternate';
  const first = inspect(firstFixture);
  const second = inspect(secondFixture);
  assert.notEqual(first.project, second.project);
  assert.notEqual(semanticDigest(first), semanticDigest(second));
  assert.equal(semanticPayload(first).project, first.project);
});

test('Unicode canonical ordering is code-point deterministic and input-order independent', () => {
  assert.deepEqual(['😀', 'あ', 'é', 'Z'].sort(codePointCompare), ['Z', 'é', 'あ', '😀']);
  const files = { '権限.md': 'authority', 'src/é.txt': 'évidence', 'src/😀.txt': 'emoji' };
  const surfaces = [
    { id: '😀', route: '/emoji', journeyGroup: '入口', status: 'current', sourcePaths: ['src/😀.txt'], authoritySources: ['権限.md'] },
    { id: 'é', route: '/accent', journeyGroup: '入口', status: 'current', sourcePaths: ['src/é.txt'], authoritySources: ['権限.md'], humanReview: [{ ruleId: '規則.é', summary: 'Unicode review.', sourceRefs: ['src/😀.txt', 'src/é.txt'], authorityRefs: ['権限.md'] }] },
  ];
  const make = (ordered) => ({ files, manifest: { project: '宇宙 Project', journeyOrder: ['入口'], humanDecisions: ['😀', 'é'], surfaces: ordered } });
  let first;
  let second;
  const originalLocaleCompare = String.prototype.localeCompare;
  String.prototype.localeCompare = () => { throw new Error('locale-sensitive canonical sort invoked'); };
  try {
    first = inspect(make(surfaces));
    second = inspect(make([...surfaces].reverse()));
  } finally {
    String.prototype.localeCompare = originalLocaleCompare;
  }
  assert.equal(stableJson(first), stableJson(second));
  assert.equal(semanticDigest(first), semanticDigest(second));
  assert.deepEqual(first.surfaceSummaries.map((surface) => surface.id), ['é', '😀']);
  const review = first.reviewRequired.find((record) => record.ruleId === '規則.é');
  assert.deepEqual(review.sourceRefs, ['src/é.txt', 'src/😀.txt']);
});

test('total evidence ordering includes every semantic field and resolves former sort-key ties', () => {
  const base = {
    surfaceId: 'surface', ruleId: 'rule', category: 'CATEGORY', outcome: 'PASS', summary: 'Summary',
    expected: 'Expected', observed: 'Observed', authorityRefs: ['AUTHORITY.md'], sourceRefs: ['src/file.ts'],
    evidenceLevel: 'SOURCE_STATIC', blocking: false, currentOrTarget: 'CURRENT', nextAction: 'Next action',
  };
  const changes = {
    surfaceId: 'surface-z', ruleId: 'rule-z', category: 'CATEGORY_Z', outcome: 'CURRENT_DEBT', summary: 'Summary z',
    expected: 'Expected z', observed: 'Observed z', authorityRefs: ['Z_AUTHORITY.md'], sourceRefs: ['src/z.ts'],
    evidenceLevel: 'RUNTIME_VERIFIED', blocking: true, currentOrTarget: 'TARGET', nextAction: 'Next action z',
  };
  for (const [field, value] of Object.entries(changes)) {
    const changed = { ...base, [field]: value };
    assert.notEqual(canonicalEvidenceRepresentation(base), canonicalEvidenceRepresentation(changed), field);
    assert.notEqual(compareEvidenceRecords(base, changed), 0, field);
  }
  const tied = [{ ...base, summary: 'Zulu' }, { ...base, summary: 'Alpha' }];
  const forward = [...tied].sort(compareEvidenceRecords).map(canonicalEvidenceRepresentation);
  const reversed = [...tied].reverse().sort(compareEvidenceRecords).map(canonicalEvidenceRepresentation);
  assert.deepEqual(forward, reversed);
  assert.notEqual(compareEvidenceRecords(tied[0], tied[1]), 0);
  assert.equal(canonicalEvidenceRepresentation({ ...base, authorityRefs: ['B.md', 'A.md'] }), canonicalEvidenceRepresentation({ ...base, authorityRefs: ['A.md', 'B.md'] }));
});

test('NFC and NFD semantic inputs produce identical canonical reports and digests', () => {
  const fixture = (accent) => {
    const value = orbitConsistencyManifest();
    const relativePath = `evidence/caf${accent}.txt`;
    value.files['evidence/café.txt'] = 'accent:evidence';
    value.manifest.project = `Orbit Caf${accent}`;
    value.manifest.humanDecisions = [`Approve Caf${accent}`];
    value.manifest.surfaces[0].sourcePaths.push(relativePath.replaceAll('/', '\\'));
    value.manifest.surfaces[0].humanReview = [{
      ruleId: `human_review.caf${accent}`, summary: `Review Caf${accent}.`, expected: `Caf${accent}`,
      observed: `Caf${accent}`, sourceRefs: [relativePath.replaceAll('/', '\\')], authorityRefs: ['GOVERNANCE.md'],
    }];
    return value;
  };
  const nfc = inspect(fixture('é'));
  const nfd = inspect(fixture('e\u0301'));
  assert.equal(nfc.project, 'Orbit Café');
  assert.deepEqual(nfc, nfd);
  assert.equal(stableJson(nfc), stableJson(nfd));
  assert.equal(semanticDigest(nfc), semanticDigest(nfd));
  assert.ok(nfc.evidenceRecords.every((record) => record.sourceRefs.every((reference) => !reference.includes('\\') && reference === reference.normalize('NFC'))));
  assert.deepEqual(normalizeSemanticData({ value: 'Cafe\u0301' }), { value: 'Café' });
});

test('exact duplicate evidence identity fails closed without deduplication', () => {
  const fixture = orbitConsistencyManifest();
  const item = { ruleId: 'human_review.duplicate', summary: 'Same review.', expected: 'Same', observed: 'Same', sourceRefs: ['src/landing.html'], authorityRefs: ['GOVERNANCE.md'] };
  fixture.manifest.humanReview = [item, structuredClone(item)];
  const report = inspect(fixture);
  assert.equal(report.status, 'HOLD');
  assert.ok(report.reasonCodes.includes('EVIDENCE_IDENTITY_COLLISION'));
  assert.equal(report.evidenceRecords.filter((record) => record.ruleId === item.ruleId).length, 2);
  const collision = report.failures.find((record) => record.ruleId === 'evidence.identity.collision');
  assert.match(collision.observed, /EXACT_DUPLICATE/);
  assert.match(collision.observed, /recordIndices/);
  assert.doesNotMatch(collision.observed, /\/Users\/|\\Users\\|file:\/\//i);
});

test('conflicting evidence identity fails closed with stable identity and indices', () => {
  const fixture = orbitConsistencyManifest();
  const shared = { ruleId: 'human_review.conflict', expected: 'Same', observed: 'Same', sourceRefs: ['src/landing.html'], authorityRefs: ['GOVERNANCE.md'] };
  fixture.manifest.humanReview = [{ ...shared, summary: 'First meaning.' }, { ...shared, summary: 'Different meaning.' }];
  const report = inspect(fixture);
  assert.equal(report.status, 'HOLD');
  assert.ok(report.reasonCodes.includes('EVIDENCE_IDENTITY_COLLISION'));
  const records = report.evidenceRecords.filter((record) => record.ruleId === shared.ruleId);
  assert.equal(records.length, 2);
  assert.equal(canonicalEvidenceIdentity(records[0]), canonicalEvidenceIdentity(records[1]));
  const collision = report.failures.find((record) => record.ruleId === 'evidence.identity.collision');
  assert.match(collision.observed, /CONFLICTING_CONTENT/);
  assert.match(collision.observed, /\[0,1\]|\[1,2\]|recordIndices/);
});

test('every non-PASS Markdown entry includes structured sourceRefs and authorityRefs', () => {
  const fixture = orbitConsistencyManifest({ humanReview: [{ ruleId: 'human_review.grounded', summary: 'Grounded review.', sourceRefs: ['src/landing.html'], authorityRefs: ['GOVERNANCE.md'] }] });
  fixture.manifest.surfaces[0].currentDebt = [{ ruleId: 'legacy.label.current_debt', path: 'src/landing.html', observedMarker: 'Begin orbit', expected: 'Launch orbit', observed: 'Begin orbit', summary: 'Legacy label remains in current runtime.' }];
  const report = inspect(fixture);
  const markdown = consistencyMarkdown(report);
  const nonPassCount = report.evidenceRecords.filter((record) => record.outcome !== 'PASS').length;
  assert.equal((markdown.match(/^  - sourceRefs:/gm) || []).length, nonPassCount);
  assert.equal((markdown.match(/^  - authorityRefs:/gm) || []).length, nonPassCount);
  assert.match(markdown, /sourceRefs: \["src\/landing\.html"\]/);
  assert.match(markdown, /authorityRefs: \["GOVERNANCE\.md"\]/);
  assert.doesNotMatch(markdown, /\/Users\/|\\Users\\|file:\/\//i);
});

test('all HTML audiences safely escape untrusted evidence', () => {
  const report = inspect(orbitConsistencyManifest({ humanReview: [humanReview('<script>alert(1)</script>')] }));
  for (const html of [renderOperatorHtml(report), renderJudgeHtml(report), renderPrintHtml(report)]) {
    assert.ok(!html.includes('<script>alert(1)</script>'));
    assert.match(html, /&lt;script&gt;/);
    assert.match(html, /<html lang="en">/);
  }
});

test('operator contains every canonical evidence rule id', () => {
  const report = inspect(orbitConsistencyManifest());
  const html = renderOperatorHtml(report);
  for (const record of report.evidenceRecords) assert.ok(html.includes(record.ruleId));
});

test('judge is product-first and includes canonical verdict and counts', () => {
  const report = inspect(orbitConsistencyManifest({ humanReview: [humanReview('Human review')] }));
  const html = renderJudgeHtml(report);
  assert.ok(html.indexOf('M55 CONTROL PLANE') < html.indexOf('Current project verdict'));
  assert.match(html, /Stops unsafe AI work/);
  assert.match(html, /REVIEW REQUIRED/);
  assert.match(html, new RegExp(`Compliance passes</dt><dd>${report.counts.compliancePasses}`));
});

test('print audience has five logical A4 pages and no raw PASS record log', () => {
  const report = inspect(orbitConsistencyManifest({ humanReview: [humanReview('Human review')] }));
  const html = renderPrintHtml(report);
  assert.equal((html.match(/class="print-page(?: [^"]*)?"/g) || []).length, 5);
  assert.match(html, /@page\{size:A4/);
  assert.match(html, /page-break-after:always/);
  assert.ok(!html.includes('inventory.source.readable'));
});

test('JSON, Markdown, operator, judge, and print share one canonical verdict', () => {
  const report = inspect(orbitConsistencyManifest({ humanReview: [humanReview('Human review')] }));
  const presentations = [stableJson(report), consistencyMarkdown(report)];
  for (const presentation of presentations) assert.ok(presentation.includes(report.status));
  for (const presentation of [renderOperatorHtml(report), renderJudgeHtml(report), renderPrintHtml(report)]) assert.ok(presentation.includes(report.status.replaceAll('_', ' ')));
});

test('packet writes five audience artifacts outside repository and rejects repository output', () => {
  const parent = fs.mkdtempSync(path.join(os.tmpdir(), 'consistency packet-'));
  const out = path.join(parent, 'packet');
  try {
    const report = inspect(orbitConsistencyManifest());
    const phases = [];
    const resolved = writeConsistencyPacket(out, report, { repositoryRoot: ROOT, outputSafety: { onIdentityCheck: (phase) => phases.push(phase) } });
    assert.deepEqual(phases, ['pre-create', 'post-create', 'post-create']);
    assert.equal(fs.realpathSync(resolved).startsWith(`${fs.realpathSync(ROOT)}${path.sep}`), false);
    for (const file of ['consistency-report.json', 'consistency-handoff.md', 'consistency-operator.html', 'consistency-judge.html', 'consistency-print.html']) assert.ok(fs.existsSync(path.join(out, file)));
    assert.throws(() => writeConsistencyPacket(path.join(ROOT, '.consistency-output'), report, { repositoryRoot: ROOT }), /OUTPUT_INSIDE_REPOSITORY/);
  } finally { fs.rmSync(parent, { recursive: true, force: true }); }
});

test('packet rejects output symlinks, symlink parents, and nonexistent suffixes that resolve inside repository', (t) => {
  const sandbox = fs.mkdtempSync(path.join(os.tmpdir(), 'consistency output symlink-'));
  const repository = path.join(sandbox, 'repository');
  const repositoryTarget = path.join(repository, 'generated');
  const outside = path.join(sandbox, 'outside');
  fs.mkdirSync(repositoryTarget, { recursive: true });
  fs.mkdirSync(outside, { recursive: true });
  const directLink = path.join(outside, 'direct-link');
  const parentLink = path.join(outside, 'parent-link');
  try {
    try {
      fs.symlinkSync(repositoryTarget, directLink, 'dir');
      fs.symlinkSync(repository, parentLink, 'dir');
    } catch (error) {
      if (error.code === 'EPERM') {
        t.skip('host returned EPERM because symlink creation is not permitted');
        return;
      }
      throw error;
    }
    const report = inspect(orbitConsistencyManifest());
    assert.throws(() => writeConsistencyPacket(directLink, report, { repositoryRoot: repository }), /OUTPUT_INSIDE_REPOSITORY/);
    assert.throws(() => writeConsistencyPacket(path.join(parentLink, 'generated'), report, { repositoryRoot: repository }), /OUTPUT_INSIDE_REPOSITORY/);
    assert.throws(() => writeConsistencyPacket(path.join(parentLink, 'not-created', 'nested'), report, { repositoryRoot: repository }), /OUTPUT_INSIDE_REPOSITORY/);
    assert.equal(fs.existsSync(path.join(repository, 'not-created')), false);
    assert.equal(fs.existsSync(path.join(repositoryTarget, 'consistency-report.json')), false);
  } finally {
    fs.rmSync(sandbox, { recursive: true, force: true });
  }
});

test('artifact-manifest writer rejects the same real symlink output identities', (t) => {
  const sandbox = fs.mkdtempSync(path.join(os.tmpdir(), 'consistency manifest symlink-'));
  const repository = path.join(sandbox, 'repository');
  const repositoryTarget = path.join(repository, 'generated');
  const outside = path.join(sandbox, 'outside');
  fs.mkdirSync(repositoryTarget, { recursive: true });
  fs.mkdirSync(outside, { recursive: true });
  const directLink = path.join(outside, 'direct-link');
  const parentLink = path.join(outside, 'parent-link');
  try {
    try {
      fs.symlinkSync(repositoryTarget, directLink, 'dir');
      fs.symlinkSync(repository, parentLink, 'dir');
    } catch (error) {
      if (error.code === 'EPERM') {
        t.skip('host returned EPERM because symlink creation is not permitted');
        return;
      }
      throw error;
    }
    const report = inspect(orbitConsistencyManifest());
    for (const out of [directLink, path.join(parentLink, 'generated'), path.join(parentLink, 'not-created', 'nested')]) {
      assert.throws(() => writeArtifactManifest(out, report, [], { repositoryRoot: repository, generatedAt: provenance.timestamp }), /OUTPUT_INSIDE_REPOSITORY/);
    }
    assert.equal(fs.existsSync(path.join(repositoryTarget, 'consistency-artifact-manifest.json')), false);
    assert.equal(fs.existsSync(path.join(repository, 'not-created')), false);
  } finally {
    fs.rmSync(sandbox, { recursive: true, force: true });
  }
});

test('injected Windows junction identity, path case, and slash variants fail closed deterministically', () => {
  const normalize = (value) => path.win32.normalize(value).toLowerCase();
  const identities = new Map([
    [normalize('C:\\Repo'), 'C:\\Repo'],
    [normalize('D:\\external-junction'), 'c:\\REPO\\junction-target'],
  ]);
  const options = {
    platform: 'win32',
    cwd: 'C:\\',
    existsSync: (value) => identities.has(normalize(value)),
    realpathSync: (value) => {
      const identity = identities.get(normalize(value));
      if (!identity) throw Object.assign(new Error('ENOENT'), { code: 'ENOENT' });
      return identity;
    },
  };
  assert.throws(() => validateOutputBoundary('D:/external-junction/new/packet', 'C:\\Repo', options), /OUTPUT_INSIDE_REPOSITORY/);

  const directOptions = {
    ...options,
    existsSync: (value) => [normalize('c:\\repo'), normalize('c:\\repo\\packet')].includes(normalize(value)),
    realpathSync: (value) => path.win32.normalize(value),
  };
  assert.throws(() => validateOutputBoundary('c:/REPO/packet', 'C:\\Repo', directOptions), /OUTPUT_INSIDE_REPOSITORY/);
  assert.throws(() => validateOutputBoundary('C:\\repo\\packet', 'c:/REPO', directOptions), /OUTPUT_INSIDE_REPOSITORY/);
});

test('output identity uncertainty is OUTPUT_PATH_UNVERIFIABLE and never downgraded', () => {
  const out = path.join(os.tmpdir(), 'unverifiable-output');
  const denied = Object.assign(new Error('identity denied'), { code: 'EACCES' });
  assert.throws(
    () => validateOutputBoundary(out, ROOT, { realpathSync: () => { throw denied; } }),
    (error) => error.code === 'OUTPUT_PATH_UNVERIFIABLE' && error.cause === denied,
  );
  assert.throws(
    () => writeConsistencyPacket(out, inspect(orbitConsistencyManifest()), { repositoryRoot: null }),
    (error) => error.code === 'OUTPUT_PATH_UNVERIFIABLE',
  );
});

test('external packet generation leaves repository Git status byte-identical', () => {
  const before = spawnSync('git', ['status', '--porcelain=v1', '--untracked-files=all'], { cwd: ROOT, encoding: 'utf8', shell: false, windowsHide: true });
  assert.equal(before.status, 0, before.stderr);
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'consistency clean output-'));
  try {
    const packetPhases = [];
    const manifestPhases = [];
    writeConsistencyPacket(path.join(out, 'packet'), inspect(orbitConsistencyManifest()), { repositoryRoot: ROOT, outputSafety: { onIdentityCheck: (phase) => packetPhases.push(phase) } });
    fs.mkdirSync(path.join(out, 'manifest'));
    writeArtifactManifest(path.join(out, 'manifest'), inspect(orbitConsistencyManifest()), [], { repositoryRoot: ROOT, generatedAt: provenance.timestamp, outputSafety: { onIdentityCheck: (phase) => manifestPhases.push(phase) } });
    assert.deepEqual(packetPhases, ['pre-create', 'post-create', 'post-create']);
    assert.deepEqual(manifestPhases, ['pre-create', 'post-create']);
    const after = spawnSync('git', ['status', '--porcelain=v1', '--untracked-files=all'], { cwd: ROOT, encoding: 'utf8', shell: false, windowsHide: true });
    assert.equal(after.status, 0, after.stderr);
    assert.equal(after.stdout, before.stdout);
  } finally {
    fs.rmSync(out, { recursive: true, force: true });
  }
});

test('rendering and target validation finish before any staging or final entry exists', () => {
  const parent = fs.mkdtempSync(path.join(os.tmpdir(), 'consistency render first-'));
  const out = path.join(parent, 'packet');
  const renderCalls = [];
  const definitions = CONSISTENCY_PACKET_TARGETS.map((filename, index) => ({
    filename,
    render: () => {
      renderCalls.push(filename);
      return index === CONSISTENCY_PACKET_TARGETS.length - 1 ? { invalid: true } : `rendered:${filename}`;
    },
  }));
  try {
    assert.throws(
      () => writeConsistencyPacket(out, inspect(orbitConsistencyManifest()), { repositoryRoot: ROOT, renderOptions: { targetDefinitions: definitions } }),
      (error) => error.code === 'OUTPUT_WRITE_INCOMPLETE',
    );
    assert.deepEqual(renderCalls, CONSISTENCY_PACKET_TARGETS);
    assert.equal(fs.existsSync(out), false);
    assert.deepEqual(fs.readdirSync(parent), []);
    assert.throws(
      () => renderConsistencyPacket(inspect(orbitConsistencyManifest()), { targetDefinitions: [{ filename: 'same.txt', render: () => 'a' }, { filename: 'same.txt', render: () => 'b' }] }),
      (error) => error.code === 'OUTPUT_TARGET_UNVERIFIABLE',
    );
    assert.deepEqual(fs.readdirSync(parent), []);
  } finally {
    fs.rmSync(parent, { recursive: true, force: true });
  }
});

test('packet publication uses one directory rename and the final path is absent until complete', () => {
  const parent = fs.mkdtempSync(path.join(os.tmpdir(), 'consistency atomic publish-'));
  const out = path.join(parent, 'packet');
  const visibility = [];
  let renameCount = 0;
  try {
    const result = writeConsistencyPacket(out, inspect(orbitConsistencyManifest()), {
      repositoryRoot: ROOT,
      outputSafety: {
        hooks: {
          afterStagingCreated: () => visibility.push(['staging', fs.existsSync(out)]),
          afterChildWritten: ({ filename }) => visibility.push([filename, fs.existsSync(out)]),
          beforePublish: () => visibility.push(['before-publish', fs.existsSync(out)]),
          afterPublish: () => visibility.push(['after-publish', fs.existsSync(out)]),
        },
        operations: {
          renameSync: (source, target) => {
            renameCount += 1;
            assert.equal(fs.existsSync(target), false);
            fs.renameSync(source, target);
          },
        },
      },
    });
    assert.equal(result, fs.realpathSync(out));
    assert.equal(renameCount, 1);
    assert.ok(visibility.slice(0, -1).every(([, visible]) => visible === false));
    assert.deepEqual(visibility.at(-1), ['after-publish', true]);
    for (const filename of CONSISTENCY_PACKET_TARGETS) assert.ok(fs.statSync(path.join(out, filename)).isFile());
    assert.ok(fs.statSync(path.join(out, '.control-plane-staging-owner.json')).isFile());
    assert.throws(() => writeConsistencyPacket(out, inspect(orbitConsistencyManifest()), { repositoryRoot: ROOT }), (error) => error.code === 'OUTPUT_TARGET_EXISTS');
  } finally {
    fs.rmSync(parent, { recursive: true, force: true });
  }
});

test('existing ordinary final target is rejected without replacement', () => {
  const parent = fs.mkdtempSync(path.join(os.tmpdir(), 'consistency existing target-'));
  const out = path.join(parent, 'packet');
  try {
    fs.writeFileSync(out, 'unrelated');
    assert.throws(() => writeConsistencyPacket(out, inspect(orbitConsistencyManifest()), { repositoryRoot: ROOT }), (error) => error.code === 'OUTPUT_TARGET_EXISTS');
    assert.equal(fs.readFileSync(out, 'utf8'), 'unrelated');
  } finally {
    fs.rmSync(parent, { recursive: true, force: true });
  }
});

test('final target created after staging wins and is never replaced or merged', () => {
  const parent = fs.mkdtempSync(path.join(os.tmpdir(), 'consistency publish conflict-'));
  const out = path.join(parent, 'packet');
  try {
    assert.throws(
      () => writeConsistencyPacket(out, inspect(orbitConsistencyManifest()), {
        repositoryRoot: ROOT,
        outputSafety: { hooks: { beforePublish: ({ finalDirectory }) => {
          fs.mkdirSync(finalDirectory);
          fs.writeFileSync(path.join(finalDirectory, 'unrelated.txt'), 'race-winner');
        } } },
      }),
      (error) => error.code === 'OUTPUT_PUBLISH_CONFLICT',
    );
    assert.equal(fs.readFileSync(path.join(out, 'unrelated.txt'), 'utf8'), 'race-winner');
    assert.deepEqual(fs.readdirSync(out), ['unrelated.txt']);
    assert.equal(fs.readdirSync(parent).filter((name) => name.includes('.consistency-staging-')).length, 0);
  } finally {
    fs.rmSync(parent, { recursive: true, force: true });
  }
});

test('staging child report symlink into repository is rejected and repository bytes remain identical', (t) => {
  const sandbox = fs.mkdtempSync(path.join(os.tmpdir(), 'consistency child symlink-'));
  const repository = path.join(sandbox, 'repository');
  const outside = path.join(sandbox, 'outside');
  const authority = path.join(repository, 'authority.txt');
  fs.mkdirSync(repository);
  fs.mkdirSync(outside);
  fs.writeFileSync(authority, 'repository-authority');
  const capability = path.join(outside, 'symlink-capability');
  try {
    try {
      fs.symlinkSync(authority, capability);
      fs.unlinkSync(capability);
    } catch (error) {
      if (error.code === 'EPERM') {
        t.skip('host returned EPERM because symlink creation is not permitted');
        return;
      }
      throw error;
    }
    const out = path.join(outside, 'packet');
    assert.throws(
      () => writeConsistencyPacket(out, inspect(orbitConsistencyManifest()), { repositoryRoot: repository, outputSafety: { hooks: { afterStagingCreated: ({ stagingDirectory }) => fs.symlinkSync(authority, path.join(stagingDirectory, 'consistency-report.json')) } } }),
      (error) => error.code === 'OUTPUT_TARGET_EXISTS',
    );
    assert.equal(fs.existsSync(out), false);
    assert.equal(fs.readFileSync(authority, 'utf8'), 'repository-authority');
  } finally {
    fs.rmSync(sandbox, { recursive: true, force: true });
  }
});

test('staging child report hardlink and injected Windows reparse identity are rejected', () => {
  const sandbox = fs.mkdtempSync(path.join(os.tmpdir(), 'consistency child hardlink-'));
  const repository = path.join(sandbox, 'repository');
  const outside = path.join(sandbox, 'outside');
  const authority = path.join(repository, 'authority.txt');
  fs.mkdirSync(repository);
  fs.mkdirSync(outside);
  fs.writeFileSync(authority, 'repository-authority');
  try {
    const hardlinkOut = path.join(outside, 'hardlink-packet');
    assert.throws(
      () => writeConsistencyPacket(hardlinkOut, inspect(orbitConsistencyManifest()), { repositoryRoot: repository, outputSafety: { hooks: { afterStagingCreated: ({ stagingDirectory }) => fs.linkSync(authority, path.join(stagingDirectory, 'consistency-report.json')) } } }),
      (error) => error.code === 'OUTPUT_TARGET_EXISTS',
    );
    assert.equal(fs.readFileSync(authority, 'utf8'), 'repository-authority');

    const injectedOut = path.join(outside, 'windows-reparse-packet');
    assert.throws(
      () => writeConsistencyPacket(injectedOut, inspect(orbitConsistencyManifest()), {
        repositoryRoot: repository,
        outputSafety: { operations: { openSync: (target, flags, mode) => {
          if (target.endsWith(`${path.sep}consistency-report.json`)) throw Object.assign(new Error('injected Windows reparse/hardlink target'), { code: 'EEXIST' });
          return fs.openSync(target, flags, mode);
        } } },
      }),
      (error) => error.code === 'OUTPUT_TARGET_EXISTS',
    );
    assert.equal(fs.existsSync(injectedOut), false);
  } finally {
    fs.rmSync(sandbox, { recursive: true, force: true });
  }
});

test('mid-write failure removes only owned staging and leaves final absent', () => {
  const parent = fs.mkdtempSync(path.join(os.tmpdir(), 'consistency mid-write-'));
  const out = path.join(parent, 'packet');
  const unrelated = path.join(parent, '.packet.consistency-staging-unrelated');
  fs.mkdirSync(unrelated);
  fs.writeFileSync(path.join(unrelated, 'keep.txt'), 'keep');
  let writes = 0;
  try {
    assert.throws(
      () => writeConsistencyPacket(out, inspect(orbitConsistencyManifest()), {
        repositoryRoot: ROOT,
        outputSafety: { operations: { writeSync: (...args) => {
          writes += 1;
          if (writes === 3) throw Object.assign(new Error('injected EIO'), { code: 'EIO' });
          return fs.writeSync(...args);
        } } },
      }),
      (error) => error.code === 'OUTPUT_WRITE_INCOMPLETE',
    );
    assert.equal(fs.existsSync(out), false);
    assert.equal(fs.readFileSync(path.join(unrelated, 'keep.txt'), 'utf8'), 'keep');
    assert.equal(cleanupOwnedConsistencyStaging(unrelated, 'packet'), false);
    assert.deepEqual(fs.readdirSync(parent), ['.packet.consistency-staging-unrelated']);
  } finally {
    fs.rmSync(parent, { recursive: true, force: true });
  }
});

test('abrupt termination leaves only an owned incomplete staging directory and no final packet', async () => {
  const parent = fs.mkdtempSync(path.join(os.tmpdir(), 'consistency crash injection-'));
  const out = path.join(parent, 'packet');
  const packetModule = pathToFileURL(path.join(ROOT, 'scripts/m55-handoff/consistency-packet.mjs')).href;
  const engineModule = pathToFileURL(path.join(ROOT, 'scripts/m55-handoff/consistency-engine.mjs')).href;
  const orbitModule = pathToFileURL(path.join(ROOT, 'scripts/m55-handoff/examples/orbit-consistency-adapter.mjs')).href;
  const source = `import {evaluateConsistency,memoryReader} from ${JSON.stringify(engineModule)}; import {writeConsistencyPacket} from ${JSON.stringify(packetModule)}; import {orbitConsistencyManifest} from ${JSON.stringify(orbitModule)}; const fixture=orbitConsistencyManifest(); const report=evaluateConsistency(fixture.manifest,{readText:memoryReader(fixture.files),provenance:${JSON.stringify(provenance)},generatedAt:${JSON.stringify(provenance.timestamp)}}); writeConsistencyPacket(${JSON.stringify(out)},report,{repositoryRoot:${JSON.stringify(ROOT)},outputSafety:{hooks:{afterChildWritten:()=>process.exit(73)}}});`;
  try {
    const result = await new Promise((resolve) => {
      const child = spawn(process.execPath, ['--input-type=module', '-e', source], { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'], shell: false, windowsHide: true });
      let stderr = '';
      child.stderr.on('data', (chunk) => { stderr += chunk; });
      child.on('close', (code) => resolve({ code, stderr }));
    });
    assert.equal(result.code, 73, result.stderr);
    assert.equal(fs.existsSync(out), false);
    const staging = fs.readdirSync(parent).filter((name) => name.startsWith('.packet.consistency-staging-'));
    assert.equal(staging.length, 1);
    const stagingPath = path.join(parent, staging[0]);
    assert.ok(fs.statSync(path.join(stagingPath, '.control-plane-staging-owner.json')).isFile());
    assert.equal(cleanupOwnedConsistencyStaging(stagingPath, 'packet'), true);
    assert.deepEqual(fs.readdirSync(parent), []);
  } finally {
    fs.rmSync(parent, { recursive: true, force: true });
  }
});

test('two concurrent writers cannot both publish the same final packet', async () => {
  const parent = fs.mkdtempSync(path.join(os.tmpdir(), 'consistency concurrent-'));
  const out = path.join(parent, 'packet');
  const packetModule = pathToFileURL(path.join(ROOT, 'scripts/m55-handoff/consistency-packet.mjs')).href;
  const engineModule = pathToFileURL(path.join(ROOT, 'scripts/m55-handoff/consistency-engine.mjs')).href;
  const orbitModule = pathToFileURL(path.join(ROOT, 'scripts/m55-handoff/examples/orbit-consistency-adapter.mjs')).href;
  const source = `import {evaluateConsistency,memoryReader} from ${JSON.stringify(engineModule)}; import {writeConsistencyPacket} from ${JSON.stringify(packetModule)}; import {orbitConsistencyManifest} from ${JSON.stringify(orbitModule)}; const fixture=orbitConsistencyManifest(); const report=evaluateConsistency(fixture.manifest,{readText:memoryReader(fixture.files),provenance:${JSON.stringify(provenance)},generatedAt:${JSON.stringify(provenance.timestamp)}}); try { writeConsistencyPacket(${JSON.stringify(out)},report,{repositoryRoot:${JSON.stringify(ROOT)}}); console.log('PUBLISHED'); } catch(error) { console.error(error.code); process.exit(1); }`;
  const run = () => new Promise((resolve) => {
    const child = spawn(process.execPath, ['--input-type=module', '-e', source], { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'], shell: false, windowsHide: true });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.on('close', (code) => resolve({ code, stdout, stderr }));
  });
  try {
    const results = await Promise.all([run(), run()]);
    assert.deepEqual(results.map((result) => result.code).sort(), [0, 1]);
    assert.equal(results.filter((result) => result.stdout.includes('PUBLISHED')).length, 1);
    assert.match(results.find((result) => result.code === 1).stderr, /OUTPUT_TARGET_EXISTS|OUTPUT_PUBLISH_CONFLICT/);
    for (const filename of CONSISTENCY_PACKET_TARGETS) assert.ok(fs.statSync(path.join(out, filename)).isFile());
    assert.equal(fs.readdirSync(parent).filter((name) => name.includes('.consistency-staging-')).length, 0);
  } finally {
    fs.rmSync(parent, { recursive: true, force: true });
  }
});

test('artifact manifest rejects existing symlink, hardlink, regular, and publish-race targets', (t) => {
  const sandbox = fs.mkdtempSync(path.join(os.tmpdir(), 'consistency manifest targets-'));
  const repository = path.join(sandbox, 'repository');
  fs.mkdirSync(repository);
  const repositoryTarget = path.join(repository, 'authority.txt');
  fs.writeFileSync(repositoryTarget, 'repository-authority');
  const report = inspect(orbitConsistencyManifest());
  const makeOut = (name) => {
    const out = path.join(sandbox, name);
    fs.mkdirSync(out);
    const artifact = path.join(out, 'artifact.txt');
    fs.writeFileSync(artifact, 'artifact');
    return { out, artifacts: [{ filename: 'artifact.txt', filePath: artifact }] };
  };
  try {
    const symlink = makeOut('symlink');
    try {
      fs.symlinkSync(repositoryTarget, path.join(symlink.out, 'consistency-artifact-manifest.json'));
    } catch (error) {
      if (error.code === 'EPERM') {
        t.skip('host returned EPERM because symlink creation is not permitted');
        return;
      }
      throw error;
    }
    assert.throws(() => writeArtifactManifest(symlink.out, report, symlink.artifacts, { repositoryRoot: repository }), (error) => error.code === 'OUTPUT_TARGET_EXISTS');

    const hardlink = makeOut('hardlink');
    fs.linkSync(repositoryTarget, path.join(hardlink.out, 'consistency-artifact-manifest.json'));
    assert.throws(() => writeArtifactManifest(hardlink.out, report, hardlink.artifacts, { repositoryRoot: repository }), (error) => error.code === 'OUTPUT_TARGET_EXISTS');

    const ordinary = makeOut('ordinary');
    fs.writeFileSync(path.join(ordinary.out, 'consistency-artifact-manifest.json'), 'ordinary');
    assert.throws(() => writeArtifactManifest(ordinary.out, report, ordinary.artifacts, { repositoryRoot: repository }), (error) => error.code === 'OUTPUT_TARGET_EXISTS');

    const race = makeOut('race');
    assert.throws(
      () => writeArtifactManifest(race.out, report, race.artifacts, { repositoryRoot: repository, outputSafety: { hooks: { beforeManifestPublish: ({ target }) => fs.writeFileSync(target, 'race-winner', { flag: 'wx' }) } } }),
      (error) => error.code === 'OUTPUT_TARGET_EXISTS',
    );
    assert.equal(fs.readFileSync(path.join(race.out, 'consistency-artifact-manifest.json'), 'utf8'), 'race-winner');
    assert.equal(fs.readFileSync(repositoryTarget, 'utf8'), 'repository-authority');
  } finally {
    fs.rmSync(sandbox, { recursive: true, force: true });
  }
});

test('artifact manifest is absent until every supplied artifact hash verifies', () => {
  const sandbox = fs.mkdtempSync(path.join(os.tmpdir(), 'consistency manifest verify-'));
  const repository = path.join(sandbox, 'repository');
  const out = path.join(sandbox, 'output');
  fs.mkdirSync(repository);
  fs.mkdirSync(out);
  const artifact = path.join(out, 'artifact.txt');
  fs.writeFileSync(artifact, 'artifact');
  try {
    assert.throws(
      () => writeArtifactManifest(out, inspect(orbitConsistencyManifest()), [{ filename: 'artifact.txt', filePath: artifact, sha256: '0'.repeat(64) }], { repositoryRoot: repository }),
      (error) => error.code === 'OUTPUT_TARGET_UNVERIFIABLE',
    );
    assert.equal(fs.existsSync(path.join(out, 'consistency-artifact-manifest.json')), false);
    assert.equal(fs.readdirSync(out).some((name) => name.includes('artifact-manifest.json.staging-')), false);
  } finally {
    fs.rmSync(sandbox, { recursive: true, force: true });
  }
});

test('Orbit generic E2E covers canonical packet, HTML audiences, digest, and artifact completion', () => {
  const before = spawnSync('git', ['status', '--porcelain=v1', '--untracked-files=all'], { cwd: ROOT, encoding: 'utf8', shell: false, windowsHide: true });
  const parent = fs.mkdtempSync(path.join(os.tmpdir(), 'orbit generic e2e-'));
  try {
    const fixture = orbitConsistencyManifest();
    const firstReport = inspect(fixture);
    const secondReport = inspect(orbitConsistencyManifest());
    assert.equal(firstReport.project, 'Orbit Field Notes');
    assert.equal(firstReport.status, 'CONSISTENT');
    assert.equal(semanticDigest(firstReport), semanticDigest(secondReport));
    assert.equal(stableJson(firstReport), stableJson(secondReport));
    const first = writeConsistencyPacket(path.join(parent, 'first'), firstReport, { repositoryRoot: ROOT });
    const second = writeConsistencyPacket(path.join(parent, 'second'), secondReport, { repositoryRoot: ROOT });
    assert.ok(path.relative(fs.realpathSync(ROOT), fs.realpathSync(first)).startsWith('..'));
    const audienceFiles = CONSISTENCY_PACKET_TARGETS.map((filename) => path.join(first, filename));
    const publicText = audienceFiles.map((filename) => fs.readFileSync(filename, 'utf8')).join('\n');
    assert.doesNotMatch(publicText, /M55|Self Funnel|保存版|見取り図|\/Users\/|\\Users\\|https?:\/\//i);
    assert.match(publicText, /Orbit Field Notes/);
    const artifacts = audienceFiles.map((filePath) => ({ filename: path.basename(filePath), filePath }));
    const manifest = writeArtifactManifest(first, firstReport, artifacts, { repositoryRoot: ROOT, generatedAt: provenance.timestamp });
    assert.equal(manifest.project, 'Orbit Field Notes');
    assert.equal(manifest.semanticDigest, semanticDigest(firstReport));
    assert.doesNotMatch(fs.readFileSync(path.join(first, 'consistency-artifact-manifest.json'), 'utf8'), /M55|Self Funnel|保存版|見取り図/i);
    for (const artifact of manifest.artifacts) {
      const bytes = fs.readFileSync(path.join(first, artifact.filename));
      assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'), artifact.sha256);
    }
    const malformed = orbitConsistencyManifest();
    malformed.manifest.surfaces[0].ctas = {};
    assert.equal(inspect(malformed).status, 'HOLD');
    assert.equal(stableJson(JSON.parse(fs.readFileSync(path.join(first, 'consistency-report.json'), 'utf8'))), stableJson(firstReport));
    assert.equal(stableJson(JSON.parse(fs.readFileSync(path.join(second, 'consistency-report.json'), 'utf8'))), stableJson(secondReport));
    const after = spawnSync('git', ['status', '--porcelain=v1', '--untracked-files=all'], { cwd: ROOT, encoding: 'utf8', shell: false, windowsHide: true });
    assert.equal(after.stdout, before.stdout);
  } finally {
    fs.rmSync(parent, { recursive: true, force: true });
  }
});

test('public synthetic fixture contains no username or machine path', () => {
  for (const source of Object.values(ORBIT_FILES)) assert.doesNotMatch(source, /\\Users\\|\/Users\/|\/private\/var\/folders|file:\/\//i);
});

test('non-M55 Orbit adapter contains no M55 concepts', () => {
  const source = fs.readFileSync(path.join(ROOT, 'scripts/m55-handoff/examples/orbit-consistency-adapter.mjs'), 'utf8');
  assert.doesNotMatch(source, /M55|Self Funnel|保存版|見取り図/);
  assert.equal(inspect(orbitConsistencyManifest()).status, 'CONSISTENT');
});

test('generic engine contains no M55 routes, vocabulary, prices, or worktree names', () => {
  const source = fs.readFileSync(path.join(ROOT, 'scripts/m55-handoff/consistency-engine.mjs'), 'utf8');
  assert.doesNotMatch(source, /M55|今の関心|見取り図|保存版|4980|19800|WT-009|Self Funnel/i);
});

test('audience HTML has no network dependency, telemetry, or local-path leakage', () => {
  const report = inspect(orbitConsistencyManifest());
  for (const html of [renderOperatorHtml(report), renderJudgeHtml(report), renderPrintHtml(report)]) {
    assert.doesNotMatch(html, /https?:\/\/|file:\/\/|\/Users\/|\\Users\\|\/private\/var\/folders|<script|@import/i);
  }
});

test('M55 canonical outcomes and evidence maturity remain unchanged', () => {
  const report = inspectM55();
  assert.equal(report.status, 'REVIEW_REQUIRED');
  assert.equal(semanticDigest(report), 'd70da14926b02d5efdef7584647ba66f6798ff297c40918bd40ce7b1f90637a9');
  assert.deepEqual({
    totalEvidence: report.counts.totalEvidence,
    compliancePasses: report.counts.compliancePasses,
    currentDebtObservations: report.counts.currentDebtObservations,
    humanReviewItems: report.counts.humanReviewItems,
    explicitExclusions: report.counts.explicitExclusions,
    blockingFailures: report.counts.blockingFailures,
    countsByEvidenceLevel: report.counts.countsByEvidenceLevel,
  }, {
    totalEvidence: 161,
    compliancePasses: 142,
    currentDebtObservations: 13,
    humanReviewItems: 2,
    explicitExclusions: 4,
    blockingFailures: 0,
    countsByEvidenceLevel: { SOURCE_STATIC: 161, RUNTIME_VERIFIED: 0, VISUAL_CAPTURE: 0, HUMAN_APPROVED: 0 },
  });
  assert.ok(report.exclusions.every((record) => record.outcome === 'EXCLUDED'));
});

test('M55 journey group order is exact and exclusions are last', () => {
  const report = inspectM55();
  const groups = [...new Set(report.surfaceSummaries.map((surface) => surface.journeyGroup))];
  assert.deepEqual(groups, ['ENTRY', 'EXPERIENCE', 'COMMERCIAL', 'OWNED EXPERIENCE', 'TRUST', 'SCOPE / EXCLUSIONS']);
  assert.ok(report.surfaceSummaries.filter((surface) => surface.scopeStatus === 'EXCLUDED').every((surface) => surface.journeyGroup === 'SCOPE / EXCLUSIONS'));
});

test('Judge and Operator each expose one primary root and one verdict', () => {
  const report = inspectM55();
  const judge = renderJudgeHtml(report);
  const operator = renderOperatorHtml(report);
  assert.equal((judge.match(/data-primary-report-root="judge"/g) || []).length, 1);
  assert.equal((judge.match(/data-verdict-block/g) || []).length, 1);
  assert.equal((judge.match(/class="judge-title"/g) || []).length, 1);
  assert.equal((operator.match(/data-primary-report-root="operator"/g) || []).length, 1);
  assert.equal((operator.match(/data-verdict-block/g) || []).length, 1);
  assert.equal((operator.match(/<h1>/g) || []).length, 1);
  for (const html of [judge, operator]) assert.equal((html.match(/data-render-instance="canonical"/g) || []).length, 1);
});

test('desktop layout contract prevents report-root duplication and identifier clipping', () => {
  const report = inspectM55();
  for (const html of [renderJudgeHtml(report), renderOperatorHtml(report)]) {
    assert.match(html, /main\[data-primary-report-root\]\{width:min\(1180px,100%\)/);
    assert.match(html, /body\{[^}]*overflow-wrap:anywhere/);
    assert.match(html, /\.provenance code,.rule code\{word-break:break-all\}/);
    assert.doesNotMatch(html, /duplicated-render|render-copy|second-report-root/i);
  }
});

test('Judge positioning is precise and avoids unsupported claims', () => {
  const html = renderJudgeHtml(inspectM55());
  assert.match(html, /REPOSITORY-NATIVE CONTROL FOR HUMAN \+ MULTI-AGENT SOFTWARE DEVELOPMENT/);
  assert.match(html, /Stops unsafe AI work\.<br>Keeps coding agents aligned to repository evidence\./);
  assert.match(html, /intentional Human gate, not a system failure/);
  assert.match(html, /HOLD is the fail-closed blocking state/);
  assert.doesNotMatch(html, /Keeps every agent aligned/);
  assert.doesNotMatch(html, /zero-config|\bnpx\b|risk reduction|money saved|incidents prevented/i);
  assert.doesNotMatch(html, /GPT-5\.6[^.]{0,80}(classif|runtime call|API call)/i);
});

test('Judge exposes derived maturity without overstating screenshots', () => {
  const report = inspectM55();
  const html = renderJudgeHtml(report);
  for (const [level, count] of Object.entries(report.counts.countsByEvidenceLevel)) assert.match(html, new RegExp(`${level}</dt><dd>${count}`));
  assert.match(html, /prove encoded repository consistency, not complete runtime or visual quality/);
  assert.match(html, /screenshots of this report are not visual evidence for M55 consumer pages/);
  assert.doesNotMatch(html, /SOURCE_STATIC[^<]{0,80}runtime verified/i);
});

test('Control Plane release review stays separate from both consumer review gates', () => {
  const report = inspectM55();
  const crossSurface = report.reviewRequired.find((record) => record.ruleId === 'human_review.cross_surface_quality');
  const selfResult = report.reviewRequired.find((record) => record.ruleId === 'human_review.self_result_quality');
  assert.ok(crossSurface);
  assert.ok(selfResult);
  for (const record of [crossSurface, selfResult]) {
    assert.equal(record.outcome, 'REVIEW_REQUIRED');
    assert.equal(record.evidenceLevel, 'SOURCE_STATIC');
  }
  assert.match(crossSurface.nextAction, /actual covered M55 consumer surfaces/);
  assert.match(crossSurface.nextAction, /separately authorized visual-review lane/);
  assert.match(crossSurface.nextAction, /Judge, Operator, and print review does not satisfy this evidence/);
  assert.match(crossSurface.nextAction, /keep this record REVIEW_REQUIRED/);
  assert.match(selfResult.nextAction, /actual Self free-result consumer page/);
  assert.match(selfResult.nextAction, /content, composition, and identifiability/);
  assert.match(selfResult.nextAction, /desktop and mobile evidence/);
  assert.match(selfResult.nextAction, /authorized Self Funnel lane/);
  assert.match(selfResult.nextAction, /Do not repair it in this Control Plane lane/);
  assert.match(selfResult.nextAction, /use the Consistency preview as consumer evidence/);
  assert.equal(report.counts.countsByEvidenceLevel.VISUAL_CAPTURE, 0);
  assert.equal(report.counts.countsByEvidenceLevel.HUMAN_APPROVED, 0);
  for (const copy of [renderJudgeHtml(report), renderPrintHtml(report)]) {
    assert.match(copy, /Control Plane tooling-release prerequisite/);
    assert.match(copy, /does not resolve consumer review/);
  }
  const handoff = consistencyMarkdown(report);
  assert.match(handoff, /actual covered M55 consumer surfaces/);
  assert.match(handoff, /actual Self free-result consumer page/);
});

test('print media forces the complete A4 canvas to opaque white', () => {
  const html = renderPrintHtml(inspectM55());
  assert.match(html, /@page\{size:A4;margin:14mm;background:#fff\}/);
  assert.match(html, /@media print\{html,body,main\[data-primary-report-root\],\.print-page\{background:#fff!important;background-image:none!important\}/);
  assert.equal((html.match(/class="print-page(?: [^"]*)?"/g) || []).length, 5);
});

test('CURRENT_DEBT copy preserves outcome/evidence-level independence', () => {
  const report = inspectM55();
  const docs = fs.readFileSync(path.join(ROOT, 'docs/M55_CONTROL_PLANE_CONSISTENCY_PREVIEW.md'), 'utf8');
  for (const copy of [docs, renderJudgeHtml(report), renderOperatorHtml(report), renderPrintHtml(report)]) {
    assert.match(copy, /observed current-state debt proven at its declared evidence level/i);
    assert.match(copy, /SOURCE_STATIC`? debt is not runtime-verified/i);
    assert.doesNotMatch(copy, /verified current runtime debt/i);
  }
  assert.ok(report.currentDebt.every((record) => record.outcome === 'CURRENT_DEBT' && record.evidenceLevel === 'SOURCE_STATIC'));
});

test('public platform boundary distinguishes Guardrail and Consistency evidence', () => {
  const report = inspectM55();
  const docs = fs.readFileSync(path.join(ROOT, 'docs/M55_CONTROL_PLANE_CONSISTENCY_PREVIEW.md'), 'utf8');
  for (const copy of [docs, renderJudgeHtml(report), renderPrintHtml(report)]) {
    assert.match(copy, /Guardrail core:<\/strong> native macOS and Windows verification|Guardrail core: native macOS and Windows\s+verification/);
    assert.match(copy, /Consistency distribution layer:<\/strong> native macOS execution; final Windows rerun pending|Consistency distribution layer: native macOS execution; final Windows rerun\s+pending/);
    assert.match(copy, /Linux path semantics remain test-covered, with no native Linux claim/);
    assert.doesNotMatch(copy, /macOS and Windows have native (?:execution )?evidence/i);
  }
});

test('print distinguishes 15 debt/review records, four exclusions, and three decisions', () => {
  const html = renderPrintHtml(inspectM55());
  assert.match(html, /complete 15-item debt\/review record remains in JSON and Operator HTML; 4 explicit exclusions remain in Coverage/);
  assert.match(html, /2 Human-review evidence records; 3 pending Human decisions/);
  assert.doesNotMatch(html, /15-item non-PASS record/);
});

test('rendered field values preserve terminal punctuation and code paths exactly', () => {
  for (const value of ['Already.', '終わり。', 'Stop!', 'Why?', 'src/path/file.ts', 'rule.identifier']) assert.equal(renderFieldValue(value), value);
  const fixture = orbitConsistencyManifest();
  fixture.manifest.surfaces[0].currentDebt = [{
    ruleId: 'punctuation.current_debt', path: 'src/landing.html', observedMarker: 'Begin orbit',
    expected: 'Already.', observed: '終わり。', summary: 'Punctuation fixture.', nextAction: 'Stop!',
  }];
  const report = inspect(fixture);
  const markdown = consistencyMarkdown(report);
  const operator = renderOperatorHtml(report);
  assert.match(markdown, /Expected: Already\. Observed: 終わり。 Next: Stop!/);
  assert.doesNotMatch(markdown, /Already\.\.|終わり。\.|Stop!\./);
  for (const value of ['Already.', '終わり。', 'Stop!']) assert.ok(operator.includes(`>${value}</dd>`));
});

test('Build Week provenance is truthful and Session ID remains private', () => {
  for (const html of [renderJudgeHtml(inspectM55()), renderPrintHtml(inspectM55())]) {
    assert.match(html, /BUILT WITH CODEX \+ GPT-5\.6/);
    assert.match(html, /GPT-5\.6 Sol was used inside Codex/);
    assert.match(html, /shipped evaluator remains deterministic/);
    assert.match(html, /Human approval remained authoritative/);
    assert.doesNotMatch(html, /PRIMARY_CODEX_SESSION_ID_PENDING_HUMAN_INSERTION|Session ID[:=]\s*[A-Za-z0-9-]{8}/);
  }
});

test('real fail-closed case study names only grounded evidence', () => {
  const html = renderJudgeHtml(inspectM55());
  assert.match(html, /INDEPENDENT WINDOWS VERIFICATION/);
  assert.match(html, /HOLD \/ WORKTREE_UNREGISTERED/);
  assert.match(html, /did not edit or auto-repair/);
  assert.match(html, /scripts\/m55-handoff\/samples\/hold-report\.json/);
  assert.match(html, /3a09b53/);
  assert.match(html, /8a6eeb5/);
  assert.match(html, /c1751c7/);
  assert.match(html, /No counterfactual impact metric is claimed/);
});

test('print contains five required sections, maturity, provenance, case study, and limitations', () => {
  const html = renderPrintHtml(inspectM55());
  assert.equal((html.match(/class="print-page(?: [^"]*)?"/g) || []).length, 5);
  for (const value of ['Evidence maturity', 'BUILT WITH CODEX + GPT-5.6', 'INDEPENDENT WINDOWS VERIFICATION', 'Support boundary and limitations']) assert.ok(html.includes(value));
  assert.ok(!html.includes('inventory.source.readable'));
  assert.doesNotMatch(html, /file:\/\/|\/private\/var\/folders|C:\\Users\\/i);
});

test('semantic digest ignores only documented volatile report fields', () => {
  const first = inspectM55('2026-07-21T00:00:00.000Z');
  const second = inspectM55('2026-07-21T01:00:00.000Z');
  assert.notEqual(first.generatedAt, second.generatedAt);
  assert.deepEqual(first.evidenceRecords, second.evidenceRecords);
  assert.deepEqual(first.counts, second.counts);
  assert.deepEqual(first.reasonCodes, second.reasonCodes);
  assert.equal(semanticDigest(first), semanticDigest(second));
  assert.deepEqual(semanticPayload(first), semanticPayload(second));
  const changed = structuredClone(first);
  changed.evidenceRecords[0].observed = 'Meaningful evidence changed.';
  assert.notEqual(semanticDigest(first), semanticDigest(changed));
});

test('artifact manifest hashes every required artifact and records capture dimensions', () => {
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'consistency artifact manifest-'));
  const artifactDir = fs.mkdtempSync(path.join(os.tmpdir(), 'consistency artifacts-'));
  const required = [
    'consistency-report.json', 'consistency-handoff.md', 'consistency-operator.html', 'consistency-judge.html', 'consistency-print.html', 'consistency-print.pdf',
    'm55-consistency-judge-1440.png', 'm55-consistency-judge-390.png', 'm55-consistency-operator-1440.png', 'm55-consistency-operator-390.png',
    'm55-consistency-print-page-1.png', 'm55-consistency-print-page-2.png', 'm55-consistency-print-page-3.png', 'm55-consistency-print-page-4.png', 'm55-consistency-print-page-5.png',
  ];
  const fakePng = (width, height) => { const bytes = Buffer.alloc(24); Buffer.from('89504e470d0a1a0a', 'hex').copy(bytes); bytes.writeUInt32BE(width, 16); bytes.writeUInt32BE(height, 20); return bytes; };
  try {
    for (const filename of required) {
      const png = filename.endsWith('.png');
      const desktop = filename.includes('1440');
      fs.writeFileSync(path.join(artifactDir, filename), png ? fakePng(desktop ? 1440 : 390, desktop ? 1000 : 844) : `artifact:${filename}`);
    }
    const artifacts = required.map((filename) => ({ filename, filePath: path.join(artifactDir, filename) }));
    const report = inspectM55();
    const manifest = writeArtifactManifest(out, report, artifacts, { repositoryRoot: ROOT, generatedAt: provenance.timestamp });
    assert.equal(manifest.artifacts.length, required.length);
    assert.equal(manifest.project, 'M55');
    assert.equal(manifest.semanticDigest, semanticDigest(report));
    for (const record of manifest.artifacts) {
      const bytes = fs.readFileSync(path.join(artifactDir, record.filename));
      assert.equal(record.byteSize, bytes.length);
      assert.equal(record.sha256, crypto.createHash('sha256').update(bytes).digest('hex'));
    }
    const desktop = manifest.artifacts.find((record) => record.filename === 'm55-consistency-judge-1440.png');
    assert.deepEqual({ width: desktop.width, height: desktop.height }, { width: 1440, height: 1000 });
    assert.throws(() => writeArtifactManifest(path.join(ROOT, '.artifact-output'), report, artifacts, { repositoryRoot: ROOT }), /OUTPUT_INSIDE_REPOSITORY/);
  } finally {
    fs.rmSync(out, { recursive: true, force: true });
    fs.rmSync(artifactDir, { recursive: true, force: true });
  }
});

test('artifact manifest ordering is Unicode code-point deterministic', () => {
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'consistency unicode manifest-'));
  const artifactDir = fs.mkdtempSync(path.join(os.tmpdir(), 'consistency unicode artifacts-'));
  try {
    const filenames = ['😀.txt', 'é.txt', 'Z.txt'];
    for (const filename of filenames) fs.writeFileSync(path.join(artifactDir, filename), filename);
    const manifest = writeArtifactManifest(out, inspect(orbitConsistencyManifest()), filenames.map((filename) => ({ filename, filePath: path.join(artifactDir, filename) })), { repositoryRoot: ROOT, generatedAt: provenance.timestamp });
    assert.deepEqual(manifest.artifacts.map((artifact) => artifact.filename), ['Z.txt', 'é.txt', '😀.txt']);
  } finally {
    fs.rmSync(out, { recursive: true, force: true });
    fs.rmSync(artifactDir, { recursive: true, force: true });
  }
});

test('zero-install demo emits four complete packets', () => {
  const isolated = fs.mkdtempSync(path.join(os.tmpdir(), 'consistency zero install-'));
  try {
    fs.mkdirSync(path.join(isolated, 'scripts'), { recursive: true });
    fs.cpSync(path.join(ROOT, 'scripts/m55-handoff'), path.join(isolated, 'scripts/m55-handoff'), { recursive: true });
    assert.ok(!fs.existsSync(path.join(isolated, 'node_modules')));
    const run = spawnSync(process.execPath, [path.join(isolated, 'scripts/m55-handoff/consistency-demo.mjs')], { cwd: isolated, encoding: 'utf8', env: process.env, shell: false, windowsHide: true });
    assert.equal(run.status, 0, `${run.stdout}${run.stderr}`);
    const output = path.join(os.tmpdir(), 'm55-consistency-preview');
    for (const name of ['SYNTHETIC_CONSISTENT', 'SYNTHETIC_REVIEW_REQUIRED', 'SYNTHETIC_HOLD', 'M55_READ_ONLY']) {
      for (const file of ['consistency-report.json', 'consistency-handoff.md', 'consistency-operator.html', 'consistency-judge.html', 'consistency-print.html']) assert.ok(fs.existsSync(path.join(output, name, file)), `${name}/${file}`);
    }
  } finally { fs.rmSync(isolated, { recursive: true, force: true }); }
});
