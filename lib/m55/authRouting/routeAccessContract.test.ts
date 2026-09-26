import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, it } from 'node:test';
import {
  getRedirectUrl,
  getRewrittenUrl,
  isRewrite,
  unstable_doesMiddlewareMatch,
} from 'next/experimental/testing/server';
import {
  PROTECTED_API_PATHS,
  PROTECTED_PAGE_PATHS,
  UNKNOWN_DOCUMENT_RECOVERY_PATH,
  classifyRouteAccess,
  createPlainUnknownApi404Response,
  createUnknownDocumentRecoveryRewrite,
  evaluateLocalE2ECleanCaptureBypass,
  evaluateNonProdReplyVerificationBypass,
  isE2ECleanCaptureDevFixturePath,
  isReplyRuntimeVerificationPath,
  isUnknownApiPath,
  isUnknownDocumentPath,
  matchesProtectedRoutePath,
  matchesPublicRoutePath,
  normalizePathname,
  resolveAuthRoutingOutcome,
} from './routeAccessContract';

const ROOT = join(import.meta.dirname, '../../..');

function fileDirToRouteTemplate(relDir: string): string {
  if (!relDir) return '/';
  return `/${relDir.split('/').join('/')}`;
}

function walkApplicationRoutes(appDir: string, dir: string, out: string[]): void {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) {
      walkApplicationRoutes(appDir, full, out);
      continue;
    }
    if (name !== 'page.tsx' && name !== 'route.ts') continue;
    const relDir = relative(appDir, dir).replace(/\\/g, '/');
    out.push(fileDirToRouteTemplate(relDir));
  }
}

function discoverApplicationRouteTemplates(repoRoot = ROOT): string[] {
  const appDir = join(repoRoot, 'app');
  const templates: string[] = [];
  walkApplicationRoutes(appDir, appDir, templates);
  return [...new Set(templates)].sort();
}

function routeTemplateToSamplePathname(template: string): string {
  if (template === '/') return '/';
  const parts = template.split('/').filter(Boolean);
  const out: string[] = [];
  for (const part of parts) {
    if (part.startsWith('[[...') || part.startsWith('[...')) break;
    if (part.startsWith('[') && part.endsWith(']')) {
      out.push('sample-param');
      continue;
    }
    out.push(part);
  }
  return out.length === 0 ? '/' : `/${out.join('/')}`;
}

function assertApplicationRouteInventoryClassified(repoRoot = ROOT): void {
  const unclassified: string[] = [];
  for (const template of discoverApplicationRouteTemplates(repoRoot)) {
    const sample = routeTemplateToSamplePathname(template);
    if (classifyRouteAccess(sample) === 'unknown') {
      unclassified.push(`${template} -> ${sample}`);
    }
  }
  if (unclassified.length > 0) {
    throw new Error(
      `Unclassified application routes (fail-closed drift): ${unclassified.join('; ')}`,
    );
  }
}

const MIDDLEWARE_MATCHER = {
  matcher: [
    '/prototype/:path*',
    '/((?!_next|.*\\..*).*)',
    '/(api|trpc)(.*)',
  ],
} as const;

const PUBLIC_PAGE_SAMPLES = [
  '/',
  '/home',
  '/core',
  '/today',
  '/weekly',
  '/pricing',
  '/my',
  '/how-m55-works',
  '/ten-views',
  '/creator',
  '/creator/apply',
  '/creator/portal',
  '/creator/invite/sample-token',
  '/support',
  '/synastry',
  '/synastry/purchase/confirm',
  '/dtr',
  '/dtr/core',
  '/dtr/lp',
  '/dtr/processing',
  '/legal/privacy',
  '/legal/terms',
  '/sign-in',
  '/sign-up',
  '/r/sample-token',
  '/r/sample-token/share-image',
  '/dev/synastry-paid-report-preview',
  '/dev/synastry-commerce-preview',
  '/dev/synastry-guest-result-preview',
  '/dev/my-owned-preview',
  '/dev/pair-share-preview',
] as const;

const PUBLIC_API_SAMPLES = [
  '/api/stripe/webhook',
  '/api/clerk/webhook',
  '/api/compatibility/checkout',
  '/api/purchase/checkout',
  '/api/diagnostics/env',
  '/api/diagnostics/build',
  '/api/diagnostics/core-regression',
  '/api/reply/generate',
  '/api/dtr/draft',
  '/api/dtr/report-snapshot-ready',
  '/api/dtr/report-snapshot/hide',
  '/api/creator/invite/sample-token',
  '/api/m55/attribution/creator-touch',
] as const;

describe('routeAccessContract — normalization', () => {
  it('strips trailing slashes except root', () => {
    assert.equal(normalizePathname('/home/'), '/home');
    assert.equal(normalizePathname('/'), '/');
  });
});

describe('routeAccessContract — exhaustive inventory', () => {
  it('classifies every app page and route handler template', () => {
    assert.doesNotThrow(() => assertApplicationRouteInventoryClassified(ROOT));
  });

  it('discovers the current application route count', () => {
    const templates = discoverApplicationRouteTemplates(ROOT);
    assert.equal(templates.length, 83);
  });
});

describe('routeAccessContract — protected regression', () => {
  it('keeps all 17 protected pages protected', () => {
    assert.equal(PROTECTED_PAGE_PATHS.length, 17);
    for (const path of PROTECTED_PAGE_PATHS) {
      assert.equal(classifyRouteAccess(path), 'protected', path);
      assert.equal(matchesProtectedRoutePath(path), true, path);
    }
  });

  it('keeps all 16 protected static Route Handlers protected', () => {
    assert.equal(PROTECTED_API_PATHS.length, 16);
    for (const path of PROTECTED_API_PATHS) {
      assert.equal(classifyRouteAccess(path), 'protected', path);
      assert.equal(matchesProtectedRoutePath(path), true, path);
    }
  });
});

describe('routeAccessContract — public regression', () => {
  it('does not move current public pages into protected', () => {
    for (const path of PUBLIC_PAGE_SAMPLES) {
      assert.equal(classifyRouteAccess(path), 'public', path);
      assert.equal(matchesPublicRoutePath(path), true, path);
      assert.equal(matchesProtectedRoutePath(path), false, path);
    }
  });

  it('does not move current public Route Handlers into protected', () => {
    for (const path of PUBLIC_API_SAMPLES) {
      assert.equal(classifyRouteAccess(path), 'public', path);
      assert.equal(matchesPublicRoutePath(path), true, path);
      assert.equal(matchesProtectedRoutePath(path), false, path);
    }
  });
});

describe('routeAccessContract — dynamic boundaries', () => {
  it('protects one-segment synastry report ids only', () => {
    assert.equal(classifyRouteAccess('/synastry/report/abc'), 'protected');
    assert.equal(classifyRouteAccess('/synastry/report'), 'unknown');
    assert.equal(classifyRouteAccess('/synastry/report/abc/more'), 'unknown');
  });

  it('protects one-segment reply session ids only', () => {
    assert.equal(classifyRouteAccess('/api/reply/session/abc'), 'protected');
    assert.equal(classifyRouteAccess('/api/reply/session'), 'unknown');
    assert.equal(classifyRouteAccess('/api/reply/session/abc/more'), 'unknown');
  });

  it('classifies attribution touch ingest routes', () => {
    assert.equal(classifyRouteAccess('/api/m55/attribution/creator-touch'), 'public');
    assert.equal(classifyRouteAccess('/api/m55/attribution/creator-touch/continue'), 'protected');
    assert.equal(classifyRouteAccess('/m55/attribution/creator-touch/continue'), 'protected');
  });

  it('publishes only the one-segment Creator invite document and API families', () => {
    for (const root of ['/creator/invite', '/api/creator/invite']) {
      assert.equal(classifyRouteAccess(`${root}/token`), 'public');
      assert.equal(classifyRouteAccess(root), 'unknown');
      assert.equal(classifyRouteAccess(`${root}/token/more`), 'unknown');
    }
  });

  it('protects only the one-segment internal Creator review action family', () => {
    assert.equal(classifyRouteAccess('/api/internal/creator-review/application-id'), 'protected');
    assert.equal(classifyRouteAccess('/api/internal/creator-review/application-id/more'), 'unknown');
    assert.equal(classifyRouteAccess('/api/internal/anything-else'), 'unknown');
  });

  it('rejects sibling prefix and suffix prototype paths', () => {
    assert.equal(classifyRouteAccess('/prototype'), 'protected');
    assert.equal(classifyRouteAccess('/prototype/hub'), 'protected');
    assert.equal(classifyRouteAccess('/prototype/x'), 'unknown');
    assert.equal(classifyRouteAccess('/prototype-anything'), 'unknown');
  });

  it('rejects extra reply descendants', () => {
    assert.equal(classifyRouteAccess('/reply'), 'protected');
    assert.equal(classifyRouteAccess('/reply/result'), 'protected');
    assert.equal(classifyRouteAccess('/reply/foo'), 'unknown');
  });

  it('normalizes trailing slashes on unknown checks', () => {
    assert.equal(isUnknownDocumentPath('/does-not-exist/'), true);
    assert.equal(isUnknownApiPath('/api/does-not-exist/'), true);
  });
});

describe('routeAccessContract — reply bypass preservation', () => {
  it('matches only the governed reply verification path family', () => {
    assert.equal(isReplyRuntimeVerificationPath('/reply'), true);
    assert.equal(isReplyRuntimeVerificationPath('/reply/result'), true);
    assert.equal(isReplyRuntimeVerificationPath('/api/reply/history'), true);
    assert.equal(isReplyRuntimeVerificationPath('/api/reply/session/'), true);
    assert.equal(isReplyRuntimeVerificationPath('/api/reply/session/abc'), true);
    assert.equal(isReplyRuntimeVerificationPath('/reply/foo'), false);
    assert.equal(isReplyRuntimeVerificationPath('/api/reply/session'), false);
    assert.equal(isReplyRuntimeVerificationPath('/api/reply/sessionXYZ'), false);
  });

  it('preserves raw reply session prefix semantics without broadening', () => {
    assert.equal(
      evaluateNonProdReplyVerificationBypass({
        nodeEnv: 'development',
        pathname: '/api/reply/session/',
        testUserIdHeader: 'user-1',
      }),
      true,
    );
    assert.equal(
      evaluateNonProdReplyVerificationBypass({
        nodeEnv: 'development',
        pathname: '/api/reply/session/abc',
        testUserIdHeader: 'user-1',
      }),
      true,
    );
    assert.equal(
      evaluateNonProdReplyVerificationBypass({
        nodeEnv: 'development',
        pathname: '/api/reply/session',
        testUserIdHeader: 'user-1',
      }),
      false,
    );
    assert.equal(
      evaluateNonProdReplyVerificationBypass({
        nodeEnv: 'development',
        pathname: '/api/reply/sessionXYZ',
        testUserIdHeader: 'user-1',
      }),
      false,
    );
    assert.equal(
      evaluateNonProdReplyVerificationBypass({
        nodeEnv: 'production',
        pathname: '/api/reply/session/abc',
        testUserIdHeader: 'user-1',
      }),
      false,
    );
  });

  it('preserves exact non-production reply verification bypass conditions', () => {
    assert.equal(
      evaluateNonProdReplyVerificationBypass({
        nodeEnv: 'development',
        pathname: '/reply',
        testUserIdHeader: ' user-1 ',
      }),
      true,
    );
    assert.equal(
      evaluateNonProdReplyVerificationBypass({
        nodeEnv: 'production',
        pathname: '/reply',
        testUserIdHeader: 'user-1',
      }),
      false,
    );
    assert.equal(
      evaluateNonProdReplyVerificationBypass({
        nodeEnv: 'development',
        pathname: '/reply',
        testUserIdHeader: '   ',
      }),
      false,
    );
    assert.equal(
      evaluateNonProdReplyVerificationBypass({
        nodeEnv: 'development',
        pathname: '/does-not-exist',
        testUserIdHeader: 'user-1',
      }),
      false,
    );
  });

  it('continues protected reply routes only when bypass is active', () => {
    const bypassOutcome = resolveAuthRoutingOutcome({
      pathname: '/reply',
      isPublicRoute: false,
      nonProdReplyBypass: true,
      cleanCaptureBypass: false,
    });
    assert.equal(bypassOutcome.action, 'continue');

    const normalOutcome = resolveAuthRoutingOutcome({
      pathname: '/reply',
      isPublicRoute: false,
      nonProdReplyBypass: false,
      cleanCaptureBypass: false,
    });
    assert.equal(normalOutcome.action, 'protect');
  });
});

describe('routeAccessContract — clean-capture bypass preservation', () => {
  it('matches only governed dev fixture paths', () => {
    assert.equal(isE2ECleanCaptureDevFixturePath('/dev/dtr-drawer-preview'), true);
    assert.equal(isE2ECleanCaptureDevFixturePath('/dev/paid-dtr-analysis-preview'), false);
  });

  it('preserves exact local clean-capture conditions', () => {
    assert.equal(
      evaluateLocalE2ECleanCaptureBypass({
        m55E2ECleanCapture: '1',
        nodeEnv: 'development',
        vercel: undefined,
        vercelEnv: undefined,
        pathname: '/dev/dtr-drawer-preview',
        host: '127.0.0.1:3010',
        isCleanCaptureDevFixture: true,
      }),
      true,
    );
    assert.equal(
      evaluateLocalE2ECleanCaptureBypass({
        m55E2ECleanCapture: '1',
        nodeEnv: 'production',
        vercel: undefined,
        vercelEnv: undefined,
        pathname: '/dev/dtr-drawer-preview',
        host: '127.0.0.1:3010',
        isCleanCaptureDevFixture: true,
      }),
      false,
    );
    assert.equal(
      evaluateLocalE2ECleanCaptureBypass({
        m55E2ECleanCapture: '1',
        nodeEnv: 'development',
        vercel: '1',
        vercelEnv: 'preview',
        pathname: '/dev/dtr-drawer-preview',
        host: '127.0.0.1:3010',
        isCleanCaptureDevFixture: true,
      }),
      false,
    );
    assert.equal(
      evaluateLocalE2ECleanCaptureBypass({
        m55E2ECleanCapture: '1',
        nodeEnv: 'development',
        vercel: undefined,
        vercelEnv: undefined,
        pathname: '/dev/dtr-drawer-preview',
        host: 'example.com',
        isCleanCaptureDevFixture: true,
      }),
      false,
    );
  });
});

describe('routeAccessContract — unknown documents and APIs', () => {
  it('routes signed-out unknown documents to branded recovery rewrite', () => {
    const outcome = resolveAuthRoutingOutcome({
      pathname: '/m55-uiux-branded-404-probe',
      isPublicRoute: false,
      nonProdReplyBypass: false,
      cleanCaptureBypass: false,
    });
    assert.equal(outcome.action, 'unknown_document_rewrite');
    assert.equal(isUnknownDocumentPath('/m55-uiux-branded-404-probe'), true);
  });

  it('routes signed-in unknown documents to branded recovery rewrite', () => {
    const outcome = resolveAuthRoutingOutcome({
      pathname: '/signed-in-unknown-path',
      isPublicRoute: false,
      nonProdReplyBypass: false,
      cleanCaptureBypass: false,
    });
    assert.equal(outcome.action, 'unknown_document_rewrite');
  });

  it('returns plain unknown API 404 without HTML or redirect', async () => {
    const outcome = resolveAuthRoutingOutcome({
      pathname: '/api/does-not-exist',
      isPublicRoute: false,
      nonProdReplyBypass: false,
      cleanCaptureBypass: false,
    });
    assert.equal(outcome.action, 'unknown_api');
    const res = createPlainUnknownApi404Response();
    assert.equal(res.status, 404);
    assert.equal(res.headers.get('content-type'), 'text/plain; charset=utf-8');
    assert.match(await res.text(), /^Not Found$/);
  });

  it('does not classify unknown API paths as unknown documents', () => {
    assert.equal(isUnknownApiPath('/api/unknown-endpoint'), true);
    assert.equal(isUnknownDocumentPath('/api/unknown-endpoint'), false);
  });
});

describe('routeAccessContract — internal recovery loop safety', () => {
  it('continues on the internal recovery pathname without a second rewrite', () => {
    const outcome = resolveAuthRoutingOutcome({
      pathname: UNKNOWN_DOCUMENT_RECOVERY_PATH,
      isPublicRoute: false,
      nonProdReplyBypass: false,
      cleanCaptureBypass: false,
    });
    assert.equal(outcome.action, 'continue');
  });

  it('rewrites unknown documents to the internal recovery target only once', () => {
    const res = createUnknownDocumentRecoveryRewrite('http://127.0.0.1:3010/m55-unknown-probe');
    assert.equal(isRewrite(res), true);
    assert.equal(getRewrittenUrl(res), 'http://127.0.0.1:3010/_not-found');
    assert.equal(getRedirectUrl(res), null);
  });
});

describe('routeAccessContract — middleware boundary', () => {
  it('matches unknown document and API paths through middleware config', () => {
    assert.equal(
      unstable_doesMiddlewareMatch({
        config: MIDDLEWARE_MATCHER,
        url: 'http://127.0.0.1:3010/m55-unknown-probe',
      }),
      true,
    );
    assert.equal(
      unstable_doesMiddlewareMatch({
        config: MIDDLEWARE_MATCHER,
        url: 'http://127.0.0.1:3010/api/unknown-endpoint',
      }),
      true,
    );
  });

  it('does not match static asset paths', () => {
    assert.equal(
      unstable_doesMiddlewareMatch({
        config: MIDDLEWARE_MATCHER,
        url: 'http://127.0.0.1:3010/icons/icon-192.png',
      }),
      false,
    );
  });

  it('wires middleware to the route contract without auth relaxation', () => {
    const src = readFileSync(join(ROOT, 'middleware.ts'), 'utf8');
    assert.match(src, /resolveAuthRoutingOutcome/);
    assert.match(src, /createPlainUnknownApi404Response/);
    assert.match(src, /createUnknownDocumentRecoveryRewrite/);
    assert.doesNotMatch(src, /NextResponse\.next\(\)/);
    for (const route of [
      "'/creator'", "'/creator/apply'", "'/creator/portal'",
      "'/creator/invite/:token'", "'/api/creator/invite/:token'",
    ]) {
      assert.match(src, new RegExp(route.replace(/[/:]/g, '\\$&')));
    }
    for (const protectedRoute of [
      '/internal/creator-review', '/api/creator/application', '/api/creator/portal',
      '/api/creator/compliance/content', '/api/creator/compliance/appeal',
      '/api/internal/creator-review', '/api/internal/creator-compliance',
    ]) {
      assert.doesNotMatch(src, new RegExp(`['"]${protectedRoute.replace(/\//g, '\\/')}[^'"]*['"]`));
    }
  });
});

describe('routeAccessContract — inventory drift guard', () => {
  it('maps every discovered template sample to public or protected', () => {
    for (const template of discoverApplicationRouteTemplates(ROOT)) {
      const sample = routeTemplateToSamplePathname(template);
      const access = classifyRouteAccess(sample);
      assert.notEqual(access, 'unknown', `${template} -> ${sample}`);
    }
  });
});
