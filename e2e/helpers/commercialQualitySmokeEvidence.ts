/**
 * Browser smoke evidence helpers — bind checks to real manifest entries.
 * Not a parallel control plane; thin Playwright-side assertions only.
 */
import { existsSync, readdirSync, rmSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { expect, type Page } from '@playwright/test';

import { COMMERCIAL_QUALITY_SCHEMA_VERSION } from '../../lib/commercialQuality/types';
import type { SurfaceManifestEntry } from '../../lib/commercialQuality/types';
import {
  M55_METHOD_ROUTE_CONSUMPTION,
  methodRouteConsumptionById,
  type MethodRouteConsumptionId,
} from '../../lib/m55/method/m55MethodRouteConsumption';
import { M55_METHOD_CANONICAL_ROUTE } from '../../lib/m55/method/m55MethodAuthority';
import { AUTH_GATE_FIXTURE_ATTR } from '../../lib/m55/commercialUx/qualityControl/m55QualityFixtures';
import { M55_COMMERCIAL_QUALITY_MANIFEST } from '../../lib/m55/commercialUx/qualityControl/m55SurfaceManifest';
import type { RegistrationSmokeTarget } from '../../lib/m55/commercialUx/qualityControl/m55SetupRegistry';
import type { CasePlan } from '../../lib/commercialQuality/types';

export const RESIDUE_PATHS = [
  'test-results/.last-run.json',
  'test-results/playwright-run',
  'test-results/commercial-quality-gate',
  'playwright-report',
] as const;

export function resolveSmokeManifestEntry(target: RegistrationSmokeTarget): SurfaceManifestEntry {
  const fromManifest = M55_COMMERCIAL_QUALITY_MANIFEST.entries.find(
    (entry) => entry.surfaceId === target.surfaceId,
  );
  if (fromManifest) return fromManifest;

  if (target.family !== 'method') {
    throw new Error(`STOP_SCOPE: no manifest entry for ${target.surfaceId}`);
  }
  const placementId = target.surfaceId.replace(/^m55:method\./, '') as MethodRouteConsumptionId;
  const placement = methodRouteConsumptionById(placementId);
  if (!placement) {
    throw new Error(`STOP_SCOPE: unknown method placement ${placementId}`);
  }
  return {
    schemaVersion: COMMERCIAL_QUALITY_SCHEMA_VERSION,
    surfaceId: target.surfaceId,
    runtimeStateId: target.runtimeStateId,
    route: placement.route,
    routeIsPattern: placement.route.includes('*'),
    setupId: target.setupId,
    requiresAuthentication: false,
    preconditions: [
      `method_placement:${placement.id}`,
      `owner:${placement.ownerFile}`,
      `link_target:${placement.linkTarget}`,
    ],
    authorityReferences: [
      { kind: 'route_registry', key: `method.${placement.id}` },
    ],
    viewport: {
      minWidth: 390,
      maxWidth: 406,
      widthStep: 16,
      breakpointNeighborhoods: [],
      heightMatrix: [844],
    },
    protectedElements: [
      {
        selector: `[data-testid="${placement.testId}"]`,
        role: 'container',
        requireText: true,
      },
    ],
    criticalCta: null,
    fixedElements: [],
    sectionBoundaries: [],
    stateVariants: [],
    contentStressProfiles: ['short_text'],
    executionProfiles: ['default'],
    outputBehaviour: { screen: true, print: false, pdf: false, sharedImage: false },
    canonicalBaseline: 'none',
    baselineApproval: null,
    sourceOwnerFiles: [placement.ownerFile],
  };
}

export async function assertNoRunnerWrittenStateMarker(page: Page): Promise<void> {
  const runtimeStamp = await page.locator('html[data-m55-cq-runtime-state]').count();
  expect(runtimeStamp, 'runner-written data-m55-cq-runtime-state must be 0').toBe(0);
  const contractStamp = await page.locator('[data-m55-cq-state-contract]').count();
  expect(contractStamp, 'runner-written data-m55-cq-state-contract must be 0').toBe(0);
}

export async function assertProtectedManifestEvidence(
  page: Page,
  entry: SurfaceManifestEntry,
  _plan: CasePlan,
  _baseURL: string,
  options: {
    imageResponse?: boolean;
    authGate?: boolean;
    allowFixtureRouteRedirect?: boolean;
  } = {},
): Promise<{
  protectedAssertionCount: number;
  missing: number;
  empty: number;
}> {
  expect(entry.preconditions.length).toBeGreaterThan(0);
  expect(entry.runtimeStateId.length).toBeGreaterThan(0);
  expect(entry.setupId.length).toBeGreaterThan(0);
  void options.allowFixtureRouteRedirect;

  if (/accounts\.dev/i.test(page.url())) {
    throw new Error(`external redirect is not accepted as state proof: ${page.url()}`);
  }

  let protectedAssertionCount = 0;
  let missing = 0;
  let empty = 0;

  if (options.authGate) {
    await expect(page.locator(AUTH_GATE_FIXTURE_ATTR)).toBeAttached({ timeout: 10_000 });
  }

  for (const pe of entry.protectedElements) {
    protectedAssertionCount += 1;
    const loc = page.locator(pe.selector).first();
    const count = await loc.count();
    if (count < 1) {
      missing += 1;
      throw new Error(`protected selector missing: ${pe.selector}`);
    }
    await expect(loc, pe.selector).toBeAttached({ timeout: 15_000 });
    await expect(loc, pe.selector).toBeVisible({ timeout: 15_000 });
    const box = await loc.boundingBox();
    if (!box || box.width <= 0 || box.height <= 0) {
      throw new Error(`protected selector has no geometry: ${pe.selector}`);
    }
    if (pe.requireText) {
      const text = (await loc.innerText()).trim();
      if (text.length === 0) {
        empty += 1;
        throw new Error(`protected selector empty: ${pe.selector}`);
      }
    }
  }

  if (entry.criticalCta) {
    protectedAssertionCount += 1;
    const cta = page.locator(entry.criticalCta.selector).first();
    if ((await cta.count()) < 1) {
      missing += 1;
      throw new Error(`critical CTA missing: ${entry.criticalCta.selector}`);
    }
    await expect(cta).toBeVisible({ timeout: 15_000 });
    const box = await cta.boundingBox();
    if (!box || box.width <= 0 || box.height <= 0) {
      throw new Error(`critical CTA has no geometry: ${entry.criticalCta.selector}`);
    }
  }

  for (const boundary of entry.sectionBoundaries) {
    const loc = page.locator(boundary.selector).first();
    if ((await loc.count()) < 1) {
      throw new Error(`section boundary missing: ${boundary.selector}`);
    }
  }

  for (const fixed of entry.fixedElements) {
    const loc = page.locator(fixed).first();
    if ((await loc.count()) > 0) {
      const box = await loc.boundingBox();
      if (box) expect(box.width).toBeGreaterThan(0);
    }
  }

  return { protectedAssertionCount, missing, empty };
}

export async function assertMethodLinkAndOrder(page: Page, surfaceId: string): Promise<string> {
  const placementId = surfaceId.replace(/^m55:method\./, '') as MethodRouteConsumptionId;
  const placement = methodRouteConsumptionById(placementId);
  if (!placement) throw new Error(`method placement missing: ${placementId}`);

  expect(placement.linkTarget).toBe(M55_METHOD_CANONICAL_ROUTE);
  const owner = page.getByTestId(placement.testId);
  await expect(owner).toBeVisible({ timeout: 15_000 });

  // Prefer explicit linkTestId; otherwise the canonical <a> inside the owner.
  let href: string | null = null;
  if (placement.linkTestId) {
    href = await page.getByTestId(placement.linkTestId).getAttribute('href');
  }
  if (!href) {
    href = await owner.locator(`a[href="${M55_METHOD_CANONICAL_ROUTE}"]`).first().getAttribute('href');
  }
  if (!href) {
    href = await owner.locator('a[href]').first().getAttribute('href');
  }
  expect(href, `${placement.id} href`).toBeTruthy();
  const resolved = href!.startsWith('http') ? new URL(href!).pathname : href!.split(/[?#]/)[0];
  expect(resolved, `${placement.id} canonical target`).toBe(M55_METHOD_CANONICAL_ROUTE);

  if (placement.relativeOrder.afterTestId) {
    const after = page.getByTestId(placement.relativeOrder.afterTestId);
    if ((await after.count()) > 0) {
      const ownerBox = await owner.boundingBox();
      const afterBox = await after.boundingBox();
      if (ownerBox && afterBox) {
        expect(ownerBox.y).toBeGreaterThanOrEqual(afterBox.y - 1);
      }
    }
  }
  if (placement.relativeOrder.beforeTestId) {
    const before = page.getByTestId(placement.relativeOrder.beforeTestId);
    if ((await before.count()) > 0) {
      const ownerBox = await owner.boundingBox();
      const beforeBox = await before.boundingBox();
      if (ownerBox && beforeBox) {
        expect(ownerBox.y).toBeLessThanOrEqual(beforeBox.y + 1);
      }
    }
  }

  return href!;
}

export function countResidue(): number {
  let count = 0;
  for (const path of RESIDUE_PATHS) {
    if (!existsSync(path)) continue;
    const st = statSync(path);
    if (st.isFile()) {
      count += 1;
      continue;
    }
    if (st.isDirectory()) {
      const walk = (dir: string): void => {
        for (const name of readdirSync(dir)) {
          const child = join(dir, name);
          const cst = statSync(child);
          if (cst.isDirectory()) walk(child);
          else count += 1;
        }
      };
      walk(path);
    }
  }
  // Also count common Playwright residue folders if present.
  for (const path of ['test-results']) {
    if (!existsSync(path)) continue;
    const walk = (dir: string): void => {
      for (const name of readdirSync(dir)) {
        if (name === 'commercial-quality-approval-pack') continue;
        const child = join(dir, name);
        const cst = statSync(child);
        if (cst.isDirectory()) walk(child);
        else count += 1;
      }
    };
    walk(path);
  }
  return count;
}

export function cleanGeneratedResidue(): void {
  for (const path of [
    'test-results/.last-run.json',
    'test-results/playwright-run',
    'test-results/commercial-quality-gate',
    'playwright-report',
  ]) {
    rmSync(path, { recursive: true, force: true });
  }
  if (existsSync('test-results')) {
    for (const name of readdirSync('test-results')) {
      if (name === 'commercial-quality-approval-pack') continue;
      rmSync(join('test-results', name), { recursive: true, force: true });
    }
  }
}

export { M55_METHOD_ROUTE_CONSUMPTION };
