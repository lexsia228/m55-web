/**
 * P1B Preview visual evidence — origin / SHA / branch authority.
 *
 * Fail-closed: Production, custom domains, localhost and unauthorized vercel.app
 * origins are rejected. Preview evidence is active only when M55_PREVIEW_EVIDENCE=1.
 */
import type { Page } from '@playwright/test';

export const M55_PREVIEW_EVIDENCE_ENV = 'M55_PREVIEW_EVIDENCE' as const;
export const M55_PREVIEW_ORIGIN_ENV = 'M55_PREVIEW_ORIGIN' as const;
export const M55_PREVIEW_EXPECTED_SHA_ENV = 'M55_PREVIEW_EXPECTED_SHA' as const;
export const M55_PREVIEW_EXPECTED_BRANCH_ENV = 'M55_PREVIEW_EXPECTED_BRANCH' as const;
export const M55_PREVIEW_EXPECTED_DEPLOYMENT_ID_ENV = 'M55_PREVIEW_EXPECTED_DEPLOYMENT_ID' as const;

/** Runtime endpoint does not expose deployment ID — operator metadata only. */
export const DEPLOYMENT_ID_RUNTIME_VERIFIABLE = false as const;
export const DEPLOYMENT_ID_AUTHORITY_CLASS = 'OPERATOR_SUPPLIED_METADATA' as const;

export const PREVIEW_EVIDENCE_OUTPUT_ROOT = 'test-results/p1b-preview-evidence' as const;

/** Viewport widths that must not use tall-locator element screenshots (tile stitch artifacts). */
export const PREVIEW_HUMAN_VIEWPORT_BOUNDED_WIDTHS = [320, 390] as const;

export type PreviewScreenshotClip = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type PreviewLayoutRect = {
  top: number;
  left: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
};

/**
 * Mobile Human evidence must capture the viewport-bounded visible intersection,
 * not a tall locator screenshot that Playwright tiles and stitches.
 */
export function shouldUseViewportBoundedHumanCapture(viewportWidth: number): boolean {
  return (PREVIEW_HUMAN_VIEWPORT_BOUNDED_WIDTHS as readonly number[]).includes(viewportWidth);
}

/**
 * Intersect a layout rect with the viewport — truthful visible region without
 * fabricating a full-component stitched image.
 */
export function computeViewportBoundedClip(
  rect: PreviewLayoutRect,
  viewport: { width: number; height: number },
): PreviewScreenshotClip | null {
  const left = Math.max(0, rect.left);
  const top = Math.max(0, rect.top);
  const right = Math.min(viewport.width, rect.right);
  const bottom = Math.min(viewport.height, rect.bottom);
  const width = right - left;
  const height = bottom - top;
  if (width <= 0 || height <= 0) return null;
  return { x: left, y: top, width, height };
}

/** Frozen Human visual questions — machine PASS must never set Human approval. */
export const PREVIEW_HUMAN_VISUAL_CHECKLIST = [
  'Premiumは無料結果より明確に格上に見えるか',
  'dark editorial stage上の重要コピーが読めるか',
  'bridge headline / locked heading / CTA階層が自然か',
  'checkout preparationに課金直前の安心感とPremium感があるか',
  '320 / 390 / desktopで崩れないか',
  'CTA / focusが視認・操作可能に見えるか',
] as const;

const FORBIDDEN_EXACT_HOSTNAMES = new Set(['m-55.jp', 'm55.jp', 'localhost', '127.0.0.1']);
const STRIPE_HOST_SUFFIX = '.stripe.com';
const SHA40 = /^[0-9a-f]{40}$/;

export type PreviewBuildDiagnostics = {
  vercel_env: string | null;
  vercel_git_sha: string | null;
  vercel_branch: string | null;
  node_env: string | null;
};

export type PreviewEvidenceAuthority = {
  authorizedOrigin: string;
  expectedSha: string;
  expectedBranch: string;
  deploymentIdMetadata: string | null;
  deploymentIdAuthorityClass: typeof DEPLOYMENT_ID_AUTHORITY_CLASS;
};

export type PreviewBuildIdentityBinding = {
  previewEnvBound: boolean;
  previewShaBound: boolean;
  previewBranchBound: boolean;
};

export type PreviewNavigationStabilityOptions = {
  authorizedOrigin: string;
  label: string;
  expectedPathname?: string | RegExp;
  previousUrl?: string;
};

export type PreviewNavigationTargetValidation =
  | { ok: true; resolvedUrl: string }
  | { ok: false; reason: string };

export type MainFrameNavigationDecision =
  | { allow: true }
  | { allow: false; reason: string };

/**
 * Pure fail-closed validator for an intended navigation URL/target.
 * Resolves relative paths against the authorized Preview origin and rejects
 * absolute external, scheme-relative external, userinfo, non-https, and
 * dangerous schemes before any Playwright navigation commits.
 */
export function validatePreviewNavigationTarget(
  candidate: string,
  authorizedOrigin: string,
): PreviewNavigationTargetValidation {
  const trimmed = candidate.trim();
  const lower = trimmed.toLowerCase();
  if (lower.startsWith('javascript:')) {
    return { ok: false, reason: 'javascript: scheme forbidden' };
  }
  if (lower.startsWith('data:')) {
    return { ok: false, reason: 'data: scheme forbidden' };
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed, authorizedOrigin);
  } catch {
    return { ok: false, reason: `unparseable navigation target ${JSON.stringify(candidate)}` };
  }

  if (parsed.protocol !== 'https:') {
    return { ok: false, reason: `protocol must be https: (got ${parsed.protocol})` };
  }
  if (parsed.username || parsed.password) {
    return { ok: false, reason: 'userinfo is forbidden' };
  }
  if (parsed.port && parsed.port !== '443') {
    return { ok: false, reason: `unexpected port ${parsed.port}` };
  }
  if (isForbiddenPreviewHostname(parsed.hostname)) {
    return { ok: false, reason: `forbidden hostname ${parsed.hostname}` };
  }
  if (/accounts\.dev/i.test(parsed.hostname) || /(^|\.)clerk\./i.test(parsed.hostname)) {
    return { ok: false, reason: `clerk hosted sign-in origin ${parsed.origin}` };
  }
  if (parsed.hostname === 'checkout.stripe.com' || parsed.hostname.endsWith(STRIPE_HOST_SUFFIX)) {
    return { ok: false, reason: `stripe origin ${parsed.origin}` };
  }

  const normalizedAuthorized = normalizePreviewOriginInput(authorizedOrigin);
  if (parsed.origin !== normalizedAuthorized) {
    if (parsed.hostname.endsWith('.vercel.app')) {
      return { ok: false, reason: `another vercel.app origin ${parsed.origin}` };
    }
    return { ok: false, reason: `external origin ${parsed.origin}` };
  }

  return { ok: true, resolvedUrl: parsed.toString() };
}

export function assertPreviewNavigationTargetAllowed(
  candidate: string,
  authorizedOrigin: string,
): string {
  const result = validatePreviewNavigationTarget(candidate, authorizedOrigin);
  if (!result.ok) {
    throw new Error(
      `PREVIEW_NAVIGATION_TARGET_REJECTED: ${result.reason} target=${JSON.stringify(candidate)}`,
    );
  }
  return result.resolvedUrl;
}

/** Pure allow/deny decision for main-frame navigation requests (incl. redirect hops). */
export function classifyMainFrameNavigationRequest(
  requestUrl: string,
  authorizedOrigin: string,
): MainFrameNavigationDecision {
  const validation = validatePreviewNavigationTarget(requestUrl, authorizedOrigin);
  if (!validation.ok) {
    return { allow: false, reason: validation.reason };
  }
  return { allow: true };
}

export type PreviewMainFrameNavigationGuard = {
  uninstall: () => Promise<void>;
  assertNoBlockedNavigation: (label: string) => void;
};

/**
 * Install a Preview-specific main-frame navigation guard.
 * Intercepts only main-frame navigation requests (incl. redirect chain hops)
 * and aborts disallowed targets before they commit. Subresources are untouched.
 */
export async function installPreviewMainFrameNavigationGuard(
  page: Page,
  authority: Pick<PreviewEvidenceAuthority, 'authorizedOrigin'>,
): Promise<PreviewMainFrameNavigationGuard> {
  const { authorizedOrigin } = authority;
  let blockedNavigation: { url: string; reason: string } | null = null;

  const handler = async (route: Parameters<Parameters<Page['route']>[1]>[0]) => {
    const request = route.request();
    if (request.isNavigationRequest() && request.frame() === page.mainFrame()) {
      const decision = classifyMainFrameNavigationRequest(request.url(), authorizedOrigin);
      if (!decision.allow) {
        blockedNavigation = { url: request.url(), reason: decision.reason };
        await route.abort('blockedbyclient');
        return;
      }
    }
    await route.continue();
  };

  await page.route('**/*', handler);

  return {
    uninstall: async () => {
      await page.unroute('**/*', handler);
    },
    assertNoBlockedNavigation: (label: string) => {
      if (blockedNavigation) {
        throw new Error(
          `${label}: main-frame navigation blocked (${blockedNavigation.reason}) url=${blockedNavigation.url}`,
        );
      }
    },
  };
}

export function isPreviewEvidenceActive(): boolean {
  return process.env[M55_PREVIEW_EVIDENCE_ENV] === '1';
}

export function requirePreviewEvidenceMode(label: string): void {
  if (!isPreviewEvidenceActive()) {
    throw new Error(
      `${label}: ${M55_PREVIEW_EVIDENCE_ENV}=1 is required for Preview evidence (fail-closed)`,
    );
  }
}

/**
 * Parse and normalize an origin string. Rejects non-HTTPS, userinfo, unexpected
 * ports, and path/query/hash-derived authority spoofing.
 */
export function normalizePreviewOriginInput(input: string): string {
  let parsed: URL;
  try {
    parsed = new URL(input);
  } catch {
    throw new Error(`PREVIEW_ORIGIN_REJECTED: unparseable origin ${JSON.stringify(input)}`);
  }

  if (parsed.protocol !== 'https:') {
    throw new Error(`PREVIEW_ORIGIN_REJECTED: protocol must be https: (got ${parsed.protocol})`);
  }
  if (parsed.username || parsed.password) {
    throw new Error('PREVIEW_ORIGIN_REJECTED: userinfo is forbidden');
  }
  if (parsed.port && parsed.port !== '443') {
    throw new Error(`PREVIEW_ORIGIN_REJECTED: unexpected port ${parsed.port}`);
  }
  if (parsed.pathname !== '/' || parsed.search || parsed.hash) {
    throw new Error('PREVIEW_ORIGIN_REJECTED: path/query/hash must not appear in origin input');
  }

  assertPreviewHostnameAllowed(parsed.hostname);
  return parsed.origin;
}

export function isForbiddenPreviewHostname(hostname: string): boolean {
  const lower = hostname.toLowerCase();
  if (FORBIDDEN_EXACT_HOSTNAMES.has(lower)) return true;
  if (lower.endsWith('.m-55.jp') || lower.endsWith('.m55.jp')) return true;
  if (lower === 'stripe.com' || lower.endsWith(STRIPE_HOST_SUFFIX)) return true;
  if (/accounts\.dev/i.test(lower) || /(^|\.)clerk\./i.test(lower)) return true;
  return false;
}

/** Authorized Preview hosts must be exact vercel.app deployment hostnames. */
export function isAllowedVercelPreviewHostname(hostname: string): boolean {
  const lower = hostname.toLowerCase();
  return lower.endsWith('.vercel.app') && lower.length > '.vercel.app'.length;
}

export function assertPreviewHostnameAllowed(hostname: string): void {
  if (isForbiddenPreviewHostname(hostname)) {
    throw new Error(`PREVIEW_ORIGIN_REJECTED: forbidden hostname ${hostname}`);
  }
  if (!isAllowedVercelPreviewHostname(hostname)) {
    throw new Error(`PREVIEW_ORIGIN_REJECTED: hostname must be an authorized vercel.app form (${hostname})`);
  }
}

export function assertExactAuthorizedPreviewOrigin(suppliedOrigin: string, authorizedOrigin: string): void {
  const normalizedSupplied = normalizePreviewOriginInput(suppliedOrigin);
  const normalizedAuthorized = normalizePreviewOriginInput(authorizedOrigin);
  if (normalizedSupplied !== normalizedAuthorized) {
    throw new Error(
      `PREVIEW_ORIGIN_REJECTED: exact origin mismatch (supplied=${normalizedSupplied}, authorized=${normalizedAuthorized})`,
    );
  }
  assertPreviewHostnameAllowed(new URL(normalizedSupplied).hostname);
}

export function parsePreviewOriginEnv(raw: string | undefined): string {
  if (!raw?.trim()) {
    throw new Error(`PREVIEW_ORIGIN_REJECTED: ${M55_PREVIEW_ORIGIN_ENV} is required`);
  }
  const origin = normalizePreviewOriginInput(raw.trim());
  assertPreviewHostnameAllowed(new URL(origin).hostname);
  return origin;
}

export function parseExpectedShaEnv(raw: string | undefined): string {
  if (!raw?.trim()) {
    throw new Error(`PREVIEW_SHA_REJECTED: ${M55_PREVIEW_EXPECTED_SHA_ENV} is required`);
  }
  const sha = raw.trim().toLowerCase();
  if (!SHA40.test(sha)) {
    throw new Error(`PREVIEW_SHA_REJECTED: expected SHA must be 40 lowercase hex chars`);
  }
  return sha;
}

export function parseExpectedBranchEnv(raw: string | undefined): string {
  if (!raw?.trim()) {
    throw new Error(`PREVIEW_BRANCH_REJECTED: ${M55_PREVIEW_EXPECTED_BRANCH_ENV} is required`);
  }
  return raw.trim();
}

export function loadPreviewEvidenceAuthority(): PreviewEvidenceAuthority {
  requirePreviewEvidenceMode('loadPreviewEvidenceAuthority');
  return {
    authorizedOrigin: parsePreviewOriginEnv(process.env[M55_PREVIEW_ORIGIN_ENV]),
    expectedSha: parseExpectedShaEnv(process.env[M55_PREVIEW_EXPECTED_SHA_ENV]),
    expectedBranch: parseExpectedBranchEnv(process.env[M55_PREVIEW_EXPECTED_BRANCH_ENV]),
    deploymentIdMetadata: process.env[M55_PREVIEW_EXPECTED_DEPLOYMENT_ID_ENV]?.trim() || null,
    deploymentIdAuthorityClass: DEPLOYMENT_ID_AUTHORITY_CLASS,
  };
}

export function validatePreviewBuildDiagnostics(
  diagnostics: PreviewBuildDiagnostics,
  authority: Pick<PreviewEvidenceAuthority, 'expectedSha' | 'expectedBranch'>,
): PreviewBuildIdentityBinding {
  return {
    previewEnvBound: diagnostics.vercel_env === 'preview',
    previewShaBound: (diagnostics.vercel_git_sha ?? '').toLowerCase() === authority.expectedSha,
    previewBranchBound: diagnostics.vercel_branch === authority.expectedBranch,
  };
}

export function assertPreviewBuildIdentityBound(
  diagnostics: PreviewBuildDiagnostics,
  authority: Pick<PreviewEvidenceAuthority, 'expectedSha' | 'expectedBranch'>,
): PreviewBuildIdentityBinding {
  const binding = validatePreviewBuildDiagnostics(diagnostics, authority);
  if (!binding.previewEnvBound) {
    throw new Error(
      `PREVIEW_BUILD_REJECTED: vercel_env must be preview (observed=${JSON.stringify(diagnostics.vercel_env)})`,
    );
  }
  if (!binding.previewShaBound) {
    throw new Error(
      `PREVIEW_BUILD_REJECTED: vercel_git_sha mismatch (expected=${authority.expectedSha}, observed=${JSON.stringify(diagnostics.vercel_git_sha)})`,
    );
  }
  if (!binding.previewBranchBound) {
    throw new Error(
      `PREVIEW_BUILD_REJECTED: vercel_branch mismatch (expected=${authority.expectedBranch}, observed=${JSON.stringify(diagnostics.vercel_branch)})`,
    );
  }
  return binding;
}

export async function fetchPreviewBuildDiagnostics(origin: string): Promise<PreviewBuildDiagnostics> {
  assertExactAuthorizedPreviewOrigin(origin, origin);
  const url = new URL('/api/diagnostics/build', origin).toString();
  const response = await fetch(url, {
    headers: { Accept: 'application/json' },
    redirect: 'error',
  });
  if (!response.ok) {
    throw new Error(`PREVIEW_BUILD_REJECTED: diagnostics HTTP ${response.status} from ${url}`);
  }
  return (await response.json()) as PreviewBuildDiagnostics;
}

export async function preflightPreviewBuildIdentity(
  authority: PreviewEvidenceAuthority,
): Promise<PreviewBuildDiagnostics> {
  assertExactAuthorizedPreviewOrigin(authority.authorizedOrigin, authority.authorizedOrigin);
  const diagnostics = await fetchPreviewBuildDiagnostics(authority.authorizedOrigin);
  assertPreviewBuildIdentityBound(diagnostics, authority);
  return diagnostics;
}

export function classifyObservedPageOrigin(
  pageUrl: string,
  authorizedOrigin: string,
): { ok: true; origin: string } | { ok: false; reason: string } {
  let parsed: URL;
  try {
    parsed = new URL(pageUrl);
  } catch {
    return { ok: false, reason: `unparseable URL ${pageUrl}` };
  }

  const origin = parsed.origin;
  if (/accounts\.dev/i.test(parsed.hostname) || /(^|\.)clerk\./i.test(parsed.hostname)) {
    return { ok: false, reason: `clerk hosted sign-in origin ${origin}` };
  }
  if (parsed.hostname === 'checkout.stripe.com' || parsed.hostname.endsWith(STRIPE_HOST_SUFFIX)) {
    return { ok: false, reason: `stripe purchase surface ${origin}` };
  }
  if (isForbiddenPreviewHostname(parsed.hostname)) {
    return { ok: false, reason: `forbidden production/custom hostname ${parsed.hostname}` };
  }
  if (parsed.hostname.endsWith('.vercel.app') && origin !== authorizedOrigin) {
    return { ok: false, reason: `another vercel.app origin ${origin}` };
  }
  if (origin !== authorizedOrigin) {
    return { ok: false, reason: `external origin ${origin}` };
  }
  return { ok: true, origin };
}

export async function assertPreviewNavigationStable(
  page: Page,
  options: PreviewNavigationStabilityOptions,
): Promise<void> {
  const { label, authorizedOrigin, expectedPathname, previousUrl } = options;
  if (page.isClosed()) {
    throw new Error(`${label}: page closed${previousUrl ? ` (previousUrl=${previousUrl})` : ''}`);
  }

  let currentUrl: string;
  try {
    currentUrl = page.url();
    await page.evaluate(() => document.readyState);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `${label}: execution context destroyed${previousUrl ? ` previousUrl=${previousUrl}` : ''} detail=${message}`,
    );
  }

  const originCheck = classifyObservedPageOrigin(currentUrl, authorizedOrigin);
  if (!originCheck.ok) {
    throw new Error(
      `${label}: preview navigation drift — ${originCheck.reason}` +
        (previousUrl ? ` previousUrl=${previousUrl}` : '') +
        ` nextUrl=${currentUrl}`,
    );
  }

  if (expectedPathname) {
    const pathname = new URL(currentUrl).pathname;
    const ok =
      typeof expectedPathname === 'string'
        ? pathname === expectedPathname || pathname.startsWith(`${expectedPathname}/`)
        : expectedPathname.test(pathname);
    if (!ok) {
      throw new Error(
        `${label}: unexpected pathname` +
          (previousUrl ? ` previousUrl=${previousUrl}` : '') +
          ` nextUrl=${currentUrl} expected=${expectedPathname}`,
      );
    }
  }
}

export async function safeGotoPreview(
  page: Page,
  targetUrl: string,
  authorizedOrigin: string,
  attempts = 4,
): Promise<void> {
  const resolvedUrl = assertPreviewNavigationTargetAllowed(targetUrl, authorizedOrigin);

  let lastError: unknown;
  for (let i = 0; i < attempts; i += 1) {
    try {
      if (page.isClosed()) {
        throw new Error(`safeGotoPreview(${targetUrl}): page is closed`);
      }
      await page.goto(resolvedUrl, { waitUntil: 'domcontentloaded', timeout: 60_000 });
      await page.waitForTimeout(120);
      await assertPreviewNavigationStable(page, {
        label: `safeGotoPreview(${targetUrl})`,
        authorizedOrigin,
      });
      return;
    } catch (error) {
      lastError = error;
      const message = error instanceof Error ? error.message : String(error);
      if (/navigation|interrupted|Execution context was destroyed|Target closed/i.test(message)) {
        await page.waitForTimeout(250);
        continue;
      }
      throw error;
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new Error(`safeGotoPreview(${targetUrl}): failed after retries`);
}

export type PreviewEvidenceRecordMetadata = {
  previewOrigin: string;
  expectedSha: string;
  observedRuntimeSha: string | null;
  expectedBranch: string;
  observedRuntimeBranch: string | null;
  deploymentIdMetadata: string | null;
  deploymentIdAuthorityClass: typeof DEPLOYMENT_ID_AUTHORITY_CLASS;
  route: string;
  caseId: string;
  viewport: { width: number; height: number };
  viewId: string;
  timestamp: string;
  screenshotPath: string;
  humanChecklist: readonly string[];
};

export function buildPreviewEvidenceRecordMetadata(input: {
  authority: PreviewEvidenceAuthority;
  diagnostics: PreviewBuildDiagnostics;
  governedCaseId: string;
  route: string;
  viewId: string;
  viewport: { width: number; height: number };
  screenshotPath: string;
}): PreviewEvidenceRecordMetadata {
  return {
    previewOrigin: input.authority.authorizedOrigin,
    expectedSha: input.authority.expectedSha,
    observedRuntimeSha: input.diagnostics.vercel_git_sha,
    expectedBranch: input.authority.expectedBranch,
    observedRuntimeBranch: input.diagnostics.vercel_branch,
    deploymentIdMetadata: input.authority.deploymentIdMetadata,
    deploymentIdAuthorityClass: DEPLOYMENT_ID_AUTHORITY_CLASS,
    route: input.route,
    caseId: input.governedCaseId,
    viewport: input.viewport,
    viewId: input.viewId,
    timestamp: new Date().toISOString(),
    screenshotPath: input.screenshotPath,
    humanChecklist: PREVIEW_HUMAN_VISUAL_CHECKLIST,
  };
}
