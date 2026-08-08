import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  DEPLOYMENT_ID_AUTHORITY_CLASS,
  DEPLOYMENT_ID_RUNTIME_VERIFIABLE,
  M55_PREVIEW_EVIDENCE_ENV,
  assertExactAuthorizedPreviewOrigin,
  assertPreviewBuildIdentityBound,
  assertPreviewHostnameAllowed,
  assertPreviewNavigationTargetAllowed,
  buildPreviewEvidenceRecordMetadata,
  classifyMainFrameNavigationRequest,
  classifyObservedPageOrigin,
  isPreviewEvidenceActive,
  loadPreviewEvidenceAuthority,
  normalizePreviewOriginInput,
  parsePreviewOriginEnv,
  requirePreviewEvidenceMode,
  validatePreviewBuildDiagnostics,
  validatePreviewNavigationTarget,
} from './previewEvidenceAuthority';

const AUTHORIZED_ORIGIN = 'https://m55-webv2-le93v4lxi-m55-official.vercel.app';
const EXPECTED_SHA = 'a41e3862e5e1c63151a665811ebe1aef999c20dc';
const EXPECTED_BRANCH = 'feat/m55-mrq-p1b-visual-contrast-v1';

function withEnv(
  overrides: Record<string, string | undefined>,
  fn: () => void,
): void {
  const prior = new Map<string, string | undefined>();
  for (const key of Object.keys(overrides)) {
    prior.set(key, process.env[key]);
    const value = overrides[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  try {
    fn();
  } finally {
    for (const [key, value] of prior) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

describe('previewEvidenceAuthority', () => {
  it('accepts authorized exact Preview origin', () => {
    const origin = normalizePreviewOriginInput(AUTHORIZED_ORIGIN);
    assert.equal(origin, AUTHORIZED_ORIGIN);
    assertPreviewHostnameAllowed(new URL(origin).hostname);
    assert.doesNotThrow(() =>
      assertExactAuthorizedPreviewOrigin(AUTHORIZED_ORIGIN, AUTHORIZED_ORIGIN),
    );
  });

  it('rejects Production m-55.jp', () => {
    assert.throws(
      () => normalizePreviewOriginInput('https://m-55.jp'),
      /PREVIEW_ORIGIN_REJECTED/,
    );
  });

  it('rejects m55.jp', () => {
    assert.throws(
      () => normalizePreviewOriginInput('https://m55.jp'),
      /PREVIEW_ORIGIN_REJECTED/,
    );
  });

  it('rejects localhost', () => {
    assert.throws(
      () => normalizePreviewOriginInput('https://localhost'),
      /PREVIEW_ORIGIN_REJECTED/,
    );
  });

  it('rejects 127.0.0.1', () => {
    assert.throws(
      () => normalizePreviewOriginInput('https://127.0.0.1'),
      /PREVIEW_ORIGIN_REJECTED/,
    );
  });

  it('rejects http', () => {
    assert.throws(
      () => normalizePreviewOriginInput('http://m55-webv2-le93v4lxi-m55-official.vercel.app'),
      /protocol must be https/,
    );
  });

  it('rejects custom domain', () => {
    assert.throws(
      () => normalizePreviewOriginInput('https://preview.example.com'),
      /authorized vercel.app/,
    );
  });

  it('rejects wrong vercel.app origin after exact-origin check', () => {
    const wrong = 'https://other-project-le93v4lxi-m55-official.vercel.app';
    assert.throws(
      () => assertExactAuthorizedPreviewOrigin(wrong, AUTHORIZED_ORIGIN),
      /exact origin mismatch/,
    );
  });

  it('rejects missing Preview flag/env where applicable', () => {
    withEnv({ [M55_PREVIEW_EVIDENCE_ENV]: undefined }, () => {
      assert.equal(isPreviewEvidenceActive(), false);
      assert.throws(() => requirePreviewEvidenceMode('unit-test'), /M55_PREVIEW_EVIDENCE=1/);
      assert.throws(() => loadPreviewEvidenceAuthority(), /M55_PREVIEW_EVIDENCE=1/);
    });
  });

  it('rejects vercel_env != preview', () => {
    assert.throws(
      () =>
        assertPreviewBuildIdentityBound(
          {
            vercel_env: 'production',
            vercel_git_sha: EXPECTED_SHA,
            vercel_branch: EXPECTED_BRANCH,
            node_env: 'production',
          },
          { expectedSha: EXPECTED_SHA, expectedBranch: EXPECTED_BRANCH },
        ),
      /vercel_env must be preview/,
    );
  });

  it('rejects SHA mismatch', () => {
    assert.throws(
      () =>
        assertPreviewBuildIdentityBound(
          {
            vercel_env: 'preview',
            vercel_git_sha: '0000000000000000000000000000000000000000',
            vercel_branch: EXPECTED_BRANCH,
            node_env: 'production',
          },
          { expectedSha: EXPECTED_SHA, expectedBranch: EXPECTED_BRANCH },
        ),
      /vercel_git_sha mismatch/,
    );
  });

  it('rejects branch mismatch', () => {
    assert.throws(
      () =>
        assertPreviewBuildIdentityBound(
          {
            vercel_env: 'preview',
            vercel_git_sha: EXPECTED_SHA,
            vercel_branch: 'main',
            node_env: 'production',
          },
          { expectedSha: EXPECTED_SHA, expectedBranch: EXPECTED_BRANCH },
        ),
      /vercel_branch mismatch/,
    );
  });

  it('accepts bound preview diagnostics', () => {
    const binding = validatePreviewBuildDiagnostics(
      {
        vercel_env: 'preview',
        vercel_git_sha: EXPECTED_SHA,
        vercel_branch: EXPECTED_BRANCH,
        node_env: 'production',
      },
      { expectedSha: EXPECTED_SHA, expectedBranch: EXPECTED_BRANCH },
    );
    assert.equal(binding.previewEnvBound, true);
    assert.equal(binding.previewShaBound, true);
    assert.equal(binding.previewBranchBound, true);
  });

  it('rejects redirect/origin drift', () => {
    const drift = classifyObservedPageOrigin(
      'https://other-project-le93v4lxi-m55-official.vercel.app/core',
      AUTHORIZED_ORIGIN,
    );
    assert.equal(drift.ok, false);
    if (!drift.ok) assert.match(drift.reason, /another vercel.app origin/);
  });

  it('rejects accounts.dev', () => {
    const drift = classifyObservedPageOrigin(
      'https://accounts.dev/sign-in?redirect_url=foo',
      AUTHORIZED_ORIGIN,
    );
    assert.equal(drift.ok, false);
    if (!drift.ok) assert.match(drift.reason, /clerk hosted sign-in/);
  });

  it('rejects Stripe external origin', () => {
    const drift = classifyObservedPageOrigin('https://checkout.stripe.com/c/pay/foo', AUTHORIZED_ORIGIN);
    assert.equal(drift.ok, false);
    if (!drift.ok) assert.match(drift.reason, /stripe purchase surface/);
  });

  it('represents deployment ID semantics honestly', () => {
    assert.equal(DEPLOYMENT_ID_RUNTIME_VERIFIABLE, false);
    assert.equal(DEPLOYMENT_ID_AUTHORITY_CLASS, 'OPERATOR_SUPPLIED_METADATA');
    const record = buildPreviewEvidenceRecordMetadata({
      authority: {
        authorizedOrigin: AUTHORIZED_ORIGIN,
        expectedSha: EXPECTED_SHA,
        expectedBranch: EXPECTED_BRANCH,
        deploymentIdMetadata: '5809751886',
        deploymentIdAuthorityClass: DEPLOYMENT_ID_AUTHORITY_CLASS,
      },
      diagnostics: {
        vercel_env: 'preview',
        vercel_git_sha: EXPECTED_SHA,
        vercel_branch: EXPECTED_BRANCH,
        node_env: 'production',
      },
      governedCaseId: 'core-free-result',
      route: '/core',
      viewId: 'core-free-result-320x568',
      viewport: { width: 320, height: 568 },
      screenshotPath: 'test-results/p1b-preview-evidence/core-free-result-320x568.png',
    });
    assert.equal(record.deploymentIdMetadata, '5809751886');
    assert.equal(record.deploymentIdAuthorityClass, 'OPERATOR_SUPPLIED_METADATA');
    assert.equal(record.observedRuntimeSha, EXPECTED_SHA);
  });

  it('loads authority from explicit env when Preview flag is active', () => {
    withEnv(
      {
        [M55_PREVIEW_EVIDENCE_ENV]: '1',
        M55_PREVIEW_ORIGIN: AUTHORIZED_ORIGIN,
        M55_PREVIEW_EXPECTED_SHA: EXPECTED_SHA,
        M55_PREVIEW_EXPECTED_BRANCH: EXPECTED_BRANCH,
        M55_PREVIEW_EXPECTED_DEPLOYMENT_ID: '5809751886',
      },
      () => {
        const authority = loadPreviewEvidenceAuthority();
        assert.equal(authority.authorizedOrigin, AUTHORIZED_ORIGIN);
        assert.equal(authority.expectedSha, EXPECTED_SHA);
        assert.equal(authority.expectedBranch, EXPECTED_BRANCH);
        assert.equal(authority.deploymentIdMetadata, '5809751886');
        assert.equal(parsePreviewOriginEnv(process.env.M55_PREVIEW_ORIGIN), AUTHORIZED_ORIGIN);
      },
    );
  });
});

describe('preview navigation target authority', () => {
  it('accepts relative /core', () => {
    const result = validatePreviewNavigationTarget('/core', AUTHORIZED_ORIGIN);
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.resolvedUrl, `${AUTHORIZED_ORIGIN}/core`);
    }
  });

  it('accepts relative /dtr/lp', () => {
    const result = validatePreviewNavigationTarget('/dtr/lp', AUTHORIZED_ORIGIN);
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.resolvedUrl, `${AUTHORIZED_ORIGIN}/dtr/lp`);
    }
  });

  it('accepts same-authority absolute URL without userinfo', () => {
    const target = `${AUTHORIZED_ORIGIN}/core`;
    const result = validatePreviewNavigationTarget(target, AUTHORIZED_ORIGIN);
    assert.equal(result.ok, true);
    assert.doesNotThrow(() => assertPreviewNavigationTargetAllowed(target, AUTHORIZED_ORIGIN));
  });

  it('rejects absolute external URL', () => {
    const result = validatePreviewNavigationTarget('https://evil.example/path', AUTHORIZED_ORIGIN);
    assert.equal(result.ok, false);
    if (!result.ok) assert.match(result.reason, /external origin/);
  });

  it('rejects scheme-relative external URL', () => {
    const result = validatePreviewNavigationTarget('//evil.example/path', AUTHORIZED_ORIGIN);
    assert.equal(result.ok, false);
    if (!result.ok) assert.match(result.reason, /external origin/);
  });

  it('rejects userinfo same-host URL', () => {
    const host = new URL(AUTHORIZED_ORIGIN).hostname;
    const result = validatePreviewNavigationTarget(`https://user@${host}/core`, AUTHORIZED_ORIGIN);
    assert.equal(result.ok, false);
    if (!result.ok) assert.match(result.reason, /userinfo is forbidden/);
  });

  it('rejects javascript scheme', () => {
    const result = validatePreviewNavigationTarget('javascript:alert(1)', AUTHORIZED_ORIGIN);
    assert.equal(result.ok, false);
    if (!result.ok) assert.match(result.reason, /javascript:/);
  });

  it('rejects data scheme', () => {
    const result = validatePreviewNavigationTarget('data:text/html,hello', AUTHORIZED_ORIGIN);
    assert.equal(result.ok, false);
    if (!result.ok) assert.match(result.reason, /data:/);
  });

  it('rejects wrong vercel.app origin', () => {
    const result = validatePreviewNavigationTarget(
      'https://other-project-le93v4lxi-m55-official.vercel.app/core',
      AUTHORIZED_ORIGIN,
    );
    assert.equal(result.ok, false);
    if (!result.ok) assert.match(result.reason, /another vercel.app origin/);
  });

  it('rejects Production origin m-55.jp', () => {
    const result = validatePreviewNavigationTarget('https://m-55.jp/core', AUTHORIZED_ORIGIN);
    assert.equal(result.ok, false);
    if (!result.ok) assert.match(result.reason, /forbidden hostname/);
  });

  it('rejects accounts.dev origin', () => {
    const result = validatePreviewNavigationTarget(
      'https://accounts.dev/sign-in',
      AUTHORIZED_ORIGIN,
    );
    assert.equal(result.ok, false);
  });

  it('rejects Stripe origin', () => {
    const result = validatePreviewNavigationTarget(
      'https://checkout.stripe.com/c/pay/foo',
      AUTHORIZED_ORIGIN,
    );
    assert.equal(result.ok, false);
  });

  it('main-frame guard rejects redirect escape target', () => {
    const decision = classifyMainFrameNavigationRequest(
      'https://evil.example/redirect-target',
      AUTHORIZED_ORIGIN,
    );
    assert.equal(decision.allow, false);
    if (!decision.allow) assert.match(decision.reason, /external origin/);
  });

  it('main-frame guard allows authorized redirect hop', () => {
    const decision = classifyMainFrameNavigationRequest(
      `${AUTHORIZED_ORIGIN}/dtr/lp`,
      AUTHORIZED_ORIGIN,
    );
    assert.equal(decision.allow, true);
  });
});
