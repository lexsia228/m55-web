// @ts-nocheck — imports canonical JS verifier scan helpers without generated declarations
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  collectPremiumPublicTerminologyViolations,
  isAllowedPremiumPublicTerminologyOccurrence,
  PREMIUM_PUBLIC_TERMINOLOGY_ALLOWED_OCCURRENCES,
  PREMIUM_PUBLIC_TERMINOLOGY_PROHIBITED,
  PREMIUM_PUBLIC_TERMINOLOGY_SCAN_ROOTS,
  PREMIUM_PUBLIC_TERMINOLOGY_SKIP_PATH_PARTS,
  shouldScanPremiumPublicTerminologyFile,
} from '../../scripts/verify-m55-commercial-ssot.mjs';

type TerminologyViolation = {
  file: string;
  line: number;
  match: string;
  text: string;
};

const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '../..');

function formatViolations(violations: TerminologyViolation[]) {
  return violations.map((v) => `${v.file}:${v.line} match=${v.match} ${v.text}`).join('\n');
}

function withSyntheticLeak(
  relDir: string,
  fileName: string,
  source: string,
  run: (rel: string, violations: TerminologyViolation[]) => void,
) {
  const absDir = join(ROOT, relDir);
  const rel = `${relDir.replace(/\\/g, '/')}/${fileName}`.replace(/\/+/g, '/');
  const abs = join(ROOT, rel);
  mkdirSync(absDir, { recursive: true });
  try {
    writeFileSync(abs, source, 'utf8');
    const violations = collectPremiumPublicTerminologyViolations(ROOT).filter(
      (v: TerminologyViolation) => v.file === rel,
    );
    run(rel, violations);
  } finally {
    rmSync(absDir, { recursive: true, force: true });
  }
}

describe('premiumPublicTerminologyGuard', () => {
  it('has no prohibited public 保存版 terminology in user-visible source boundaries', () => {
    const violations = collectPremiumPublicTerminologyViolations(ROOT);
    assert.equal(violations.length, 0, formatViolations(violations));
  });

  it('covers public metadata, aria labels, Legal, Support, and lib/m55 generated sources', () => {
    assert.ok(PREMIUM_PUBLIC_TERMINOLOGY_SCAN_ROOTS.includes('app'));
    assert.ok(PREMIUM_PUBLIC_TERMINOLOGY_SCAN_ROOTS.includes('components'));
    assert.ok(PREMIUM_PUBLIC_TERMINOLOGY_SCAN_ROOTS.includes('lib/m55'));
    assert.ok(shouldScanPremiumPublicTerminologyFile('app/legal/privacy/page.tsx'));
    assert.ok(shouldScanPremiumPublicTerminologyFile('app/support/page.tsx'));
    assert.ok(shouldScanPremiumPublicTerminologyFile('components/dtr/DtrFullReader.tsx'));
    assert.ok(shouldScanPremiumPublicTerminologyFile('lib/m55/paidDtrProductCopy.ts'));
    assert.ok(shouldScanPremiumPublicTerminologyFile('lib/m55/consult/consultReplyGenerationContract.ts'));
  });

  it('scans contract publicName fields and permits only exact internal registry occurrences', () => {
    assert.equal(
      shouldScanPremiumPublicTerminologyFile('lib/m55/contracts/m55CommercialFunnelContract.ts'),
      true,
    );
    assert.equal(
      PREMIUM_PUBLIC_TERMINOLOGY_SKIP_PATH_PARTS.some((p: string) => p === 'lib/m55/contracts/'),
      false,
    );

    const contractSource = readFileSync(
      join(ROOT, 'lib/m55/contracts/m55CommercialFunnelContract.ts'),
      'utf8',
    );
    assert.match(contractSource, /publicName:/);
    assert.match(contractSource, /internalOnlyTerms:\s*\[\s*'保存版'\s*\]/);

    assert.equal(
      isAllowedPremiumPublicTerminologyOccurrence(
        'lib/m55/contracts/m55CommercialFunnelContract.ts',
        '保存版',
        "  internalOnlyTerms: ['保存版'] as const,",
      ),
      true,
    );
    assert.equal(
      isAllowedPremiumPublicTerminologyOccurrence(
        'lib/m55/contracts/m55CommercialFunnelContract.ts',
        '保存版',
        "    publicName: '保存版レポート',",
      ),
      false,
    );

    const allowedFiles = PREMIUM_PUBLIC_TERMINOLOGY_ALLOWED_OCCURRENCES.map(
      (e: { file: string }) => e.file,
    );
    assert.ok(allowedFiles.every((f: string) => f === 'lib/m55/contracts/m55CommercialFunnelContract.ts'));
  });

  it('scans fixture and Compatibility Preview paths (no directory-wide skip)', () => {
    assert.equal(
      PREMIUM_PUBLIC_TERMINOLOGY_SKIP_PATH_PARTS.some((p: string) => p === 'lib/m55/fixtures/'),
      false,
    );
    assert.equal(
      PREMIUM_PUBLIC_TERMINOLOGY_SKIP_PATH_PARTS.some((p: string) =>
        p.includes('components/compatibility/__preview__/'),
      ),
      false,
    );
    assert.ok(shouldScanPremiumPublicTerminologyFile('lib/m55/fixtures/consultRoomPreviewFixture.ts'));
    assert.ok(
      shouldScanPremiumPublicTerminologyFile(
        'components/compatibility/__preview__/CompatibilityCommercePreviewClient.tsx',
      ),
    );
  });

  it('corrected Compatibility Preview source contains no public 保存版', () => {
    const preview = readFileSync(
      join(ROOT, 'components/compatibility/__preview__/CompatibilityCommercePreviewClient.tsx'),
      'utf8',
    );
    assert.doesNotMatch(preview, /保存版/);
    assert.match(preview, /プレミアムレポートは1件のままです。/);
  });

  it('keeps exact-file exceptions for normalizer / replacement catalogs', () => {
    for (const part of [
      'lib/m55/paidReportPublicDisplayTerminology.ts',
      'lib/m55/consult/normalizeConsultReplyDisplayText.ts',
      'lib/m55/freeResult/buildFreeDepthAnalysisV1.ts',
    ]) {
      assert.equal(shouldScanPremiumPublicTerminologyFile(part), false, `expected exact-file skip: ${part}`);
      assert.ok(
        PREMIUM_PUBLIC_TERMINOLOGY_SKIP_PATH_PARTS.some((p: string) => p === part),
        `expected skip path entry: ${part}`,
      );
    }
  });

  it('fails synthetic leak in formerly excluded contracts boundary with exact path and match', () => {
    withSyntheticLeak(
      'lib/m55/contracts/__premium_guard_tmp__',
      'SyntheticContractLeak.ts',
      `export const product = { publicName: '保存版レポート' };\n`,
      (rel, violations) => {
        assert.equal(violations.length, 1, formatViolations(violations));
        assert.equal(violations[0]!.file, rel);
        assert.equal(violations[0]!.line, 1);
        assert.equal(violations[0]!.match, '保存版レポート');
        assert.match(formatViolations(violations), new RegExp(`${rel}:1 match=保存版レポート`));
      },
    );
  });

  it('fails synthetic leak in fixtures boundary with exact path and match', () => {
    withSyntheticLeak(
      'lib/m55/fixtures/__premium_guard_tmp__',
      'SyntheticFixtureLeak.ts',
      `export const FIXTURE = '保存版ライト';\n`,
      (rel, violations) => {
        assert.equal(violations.length, 1, formatViolations(violations));
        assert.equal(violations[0]!.file, rel);
        assert.equal(violations[0]!.match, '保存版ライト');
        assert.match(formatViolations(violations), new RegExp(`${rel}:1 match=保存版ライト`));
      },
    );
  });

  it('fails synthetic leak in Compatibility Preview boundary with exact path and match', () => {
    withSyntheticLeak(
      'components/compatibility/__preview__/__premium_guard_tmp__',
      'SyntheticPreviewLeak.tsx',
      `export const LEAK = '保存版は1件のままです。';\n`,
      (rel, violations) => {
        assert.equal(violations.length, 1, formatViolations(violations));
        assert.equal(violations[0]!.file, rel);
        assert.equal(violations[0]!.match, '保存版');
        assert.match(formatViolations(violations), new RegExp(`${rel}:1 match=保存版`));
      },
    );
  });

  it('does not false-pass on comment-only zero-occurrence claims', () => {
    withSyntheticLeak(
      'components/__premium_guard_tmp__',
      'SyntheticPublicLeak.tsx',
      `export const LEAK = '保存版ライト';\n// 保存版 comment must not mask string literal above\n`,
      (rel, violations) => {
        assert.equal(violations.length, 1);
        assert.match(violations[0]!.text, /保存版ライト/);
        assert.equal(violations[0]!.match, '保存版ライト');
        assert.equal(violations[0]!.file, rel);
      },
    );
  });

  it('reports exact path and match on synthetic prohibited public string', () => {
    withSyntheticLeak(
      'app/__premium_guard_tmp__',
      'page.tsx',
      `export const metadata = { title: '保存版レポート' };\n`,
      (rel, violations) => {
        assert.equal(violations.length, 1);
        assert.equal(violations[0]!.file, rel);
        assert.equal(violations[0]!.line, 1);
        assert.equal(violations[0]!.match, '保存版レポート');
      },
    );
  });

  it('ignores historical docs and migration paths outside scan roots', () => {
    assert.equal(shouldScanPremiumPublicTerminologyFile('docs/ssot/M55_PRODUCT_TRUTH.md'), false);
    assert.equal(shouldScanPremiumPublicTerminologyFile('supabase/migrations/001.sql'), false);
  });

  it('uses longest prohibited labels before generic 保存版', () => {
    const labels = PREMIUM_PUBLIC_TERMINOLOGY_PROHIBITED.map((p: { label: string }) => p.label);
    assert.equal(labels[0], '保存版ライト');
    assert.equal(labels[labels.length - 1], '保存版');
  });

  it('does not scan test files as public consumer surfaces', () => {
    assert.equal(shouldScanPremiumPublicTerminologyFile('lib/m55/paidDtrProductCopy.test.ts'), false);
    assert.equal(
      shouldScanPremiumPublicTerminologyFile('lib/m55/premiumPublicTerminologyGuard.test.ts'),
      false,
    );
  });
});
