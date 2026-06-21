import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { TEN_STEM_DISPLAY } from '../tenStemCatalog';
import {
  AUDIT_JSON_PATH,
  AUDIT_MD_PATH,
  CERTIFIED_AUDIT_PROFILES,
  formatOutputAuditMarkdown,
  runCanonicalV2GeneratedOutputAudit,
} from './canonicalV2GeneratedOutputAudit';

describe('canonical v2 generated output audit', () => {
  const report = runCanonicalV2GeneratedOutputAudit();

  it('writes JSON and Markdown audit artifacts', () => {
    mkdirSync('/Users/lexsia/Downloads/m55_legacy_snapshot_v2_rebuild_artifacts', { recursive: true });
    writeFileSync(AUDIT_JSON_PATH, JSON.stringify(report, null, 2), 'utf8');
    writeFileSync(AUDIT_MD_PATH, formatOutputAuditMarkdown(report), 'utf8');
    assert.ok(report.summary.auditedProfileCount >= 20);
  });

  it('summary — all output audits pass', () => {
    console.info('[output-audit] audited profiles:', report.summary.auditedProfileCount);
    console.info('[output-audit] lane coverage:', report.summary.laneCoverage.join(','));
    console.info('[output-audit] body mismatches:', report.summary.bodyMismatchCount);
    console.info('[output-audit] consult mismatches:', report.summary.consultMismatchCount);
    console.info('[output-audit] legacy leakage:', report.summary.legacyBodyLeakageCount);
    console.info('[output-audit] label-only suspected:', report.summary.labelOnlyReplacementSuspectedCount);
    assert.equal(report.summary.allOutputAuditsPass, true);
    assert.equal(report.summary.bodyMismatchCount, 0);
    assert.equal(report.summary.consultMismatchCount, 0);
    assert.equal(report.summary.legacyBodyLeakageCount, 0);
    assert.equal(report.summary.labelOnlyReplacementSuspectedCount, 0);
  });

  it('lane 0–9 representative coverage', () => {
    for (let lane = 0; lane <= 9; lane += 1) {
      assert.ok(report.summary.laneCoverage.includes(lane), `lane ${lane} missing from audit reps`);
    }
  });

  it('certified 1992-12-19 — planner v2 body, not producer legacy', () => {
    const p = report.profiles.find((r) => r.birthDate === '1992-12-19');
    assert.ok(p);
    assert.equal(p!.verdict, 'pass');
    assert.equal(p!.expectedV2Lane, 1);
    assert.equal(p!.displayedTitle, 'プランナー');
    assert.equal(p!.legacyStoredLane, 5);
    assert.equal(p!.legacyStoredTitle, 'プロデューサー');
    assert.equal(p!.displayedMode, 'rebuilt_v2_from_legacy');
    assert.notEqual(
      p!.bodyFingerprint.displayed!.compositeHash,
      p!.bodyFingerprint.legacyRaw!.compositeHash,
    );
    assert.equal(p!.bodyFingerprint.displayed!.compositeHash, p!.bodyFingerprint.v2Expected.compositeHash);
    assert.equal(p!.readerConsultMatch, true);
    assert.equal(p!.freePaidRebuiltShelfMatch, true);
    assert.notEqual(p!.displayedTitle, 'プロデューサー');
  });

  it('certified 1983-02-28 — analyst v2 body, not creator legacy', () => {
    const p = report.profiles.find((r) => r.birthDate === '1983-02-28');
    assert.ok(p);
    assert.equal(p!.verdict, 'pass');
    assert.equal(p!.displayedLane, 9);
    assert.equal(p!.displayedTitle, 'アナリスト');
    assert.equal(p!.legacyStoredLane, 3);
    assert.equal(p!.legacyStoredTitle, 'クリエイター');
    assert.notEqual(
      p!.bodyFingerprint.displayed!.compositeHash,
      p!.bodyFingerprint.legacyRaw!.compositeHash,
    );
  });

  it('certified 1919-11-01 — analyst v2 body, not creator legacy', () => {
    const p = report.profiles.find((r) => r.birthDate === '1919-11-01');
    assert.ok(p);
    assert.equal(p!.verdict, 'pass');
    assert.equal(p!.displayedLane, 9);
    assert.equal(p!.displayedTitle, 'アナリスト');
    assert.equal(p!.legacyStoredLane, 3);
  });

  it('1111-11-01 — fail-close, no displayed legacy body', () => {
    const p = report.profiles.find((r) => r.birthDate === '1111-11-01');
    assert.ok(p);
    assert.equal(p!.verdict, 'pass');
    assert.equal(p!.displayedLane, null);
    assert.equal(p!.freePaidRebuiltShelfMatch, true);
  });

  it('adjacent boundaries — free/paid/rebuilt/shelf/consult aligned per date', () => {
    for (const p of report.profiles.filter((r) => r.category === 'adjacent_boundary')) {
      assert.equal(p.verdict, 'pass', `${p.birthDate} adjacent boundary failed`);
      assert.equal(p.freePaidRebuiltShelfMatch, true, `${p.birthDate} surface mismatch`);
      assert.equal(p.readerConsultMatch, true, `${p.birthDate} consult mismatch`);
    }
  });

  it('displayed body != legacy raw when legacy lane differs', () => {
    for (const p of report.profiles) {
      if (p.verdict !== 'pass' || p.displayedLane == null || p.legacyStoredLane == null) continue;
      if (p.legacyStoredLane === p.displayedLane) continue;
      assert.notEqual(
        p.bodyFingerprint.displayed!.compositeHash,
        p.bodyFingerprint.legacyRaw!.compositeHash,
        `${p.birthDate}: legacy body leaked into display`,
      );
    }
  });

  it('static guards — reader and consult use displayed resolver', () => {
    assert.equal(report.staticGuards.corePageUsesDisplayedResolver, true);
    assert.equal(report.staticGuards.sendRouteUsesDisplayedResolver, true);
  });

  it('certified golden titles match TEN_STEM_DISPLAY', () => {
    for (const spec of CERTIFIED_AUDIT_PROFILES) {
      if (!spec.expectRebuildOk || spec.expectedV2Lane == null) continue;
      assert.equal(
        TEN_STEM_DISPLAY[spec.expectedV2Lane]!.publicTitle,
        spec.expectedV2Title,
      );
    }
  });
});
