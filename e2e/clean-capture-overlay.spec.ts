/**
 * Negative fixture: assertOverlayAbsence must fail while a Clerk-like panel
 * remains in the DOM, and must not sanitize/hide that panel first.
 */
import { expect, test } from '@playwright/test';
import {
  assertOverlayAbsence,
  detectUnexpectedOverlay,
  requireCleanCaptureEnvironment,
} from './helpers/cleanCaptureEnvironment';

test.describe.configure({ mode: 'serial', timeout: 60_000 });

test('assertOverlayAbsence fails before mutation when a Clerk-like panel is injected', async ({
  page,
}) => {
  requireCleanCaptureEnvironment('overlay-negative-fixture');

  await page.setContent(`
    <html><body style="margin:0;height:100vh;background:#f5f2ec">
      <main data-testid="commercial-surface">Commercial surface</main>
      <div id="clerk-like-keyless"
           style="position:fixed;right:16px;bottom:16px;z-index:9999;width:288px;height:220px;background:#2b2b2b;color:#fff;padding:16px;box-sizing:border-box">
        <strong>Configure your application</strong>
        <p>Temporary API keys are enabled so you can get started immediately.</p>
        <ul><li>Add SSO connections</li><li>Enable MFA</li></ul>
        <p>Access the dashboard to customize auth settings and explore Clerk features.</p>
      </div>
    </body></html>
  `);

  const before = await detectUnexpectedOverlay(page);
  expect(before.findings.length, 'injected panel must be detected').toBeGreaterThan(0);

  let failed = false;
  try {
    await assertOverlayAbsence(page, 'overlay-negative-fixture');
  } catch (error) {
    failed = true;
    const message = error instanceof Error ? error.message : String(error);
    expect(message).toContain('fail-before-mutation');
    expect(message).toContain('Configure your application');
    expect(message).toMatch(/selector=|kind=/);
  }
  expect(failed, 'assertOverlayAbsence must reject the injected panel').toBe(true);

  // Panel must still be present and visible — assertion must not sanitize.
  const stillPresent = await page.evaluate(() => {
    const el = document.getElementById('clerk-like-keyless');
    if (!el) return { present: false, opacity: null, visibility: null };
    const style = getComputedStyle(el);
    return {
      present: true,
      opacity: style.opacity,
      visibility: style.visibility,
      display: style.display,
      text: (el.textContent || '').includes('Configure your application'),
    };
  });
  expect(stillPresent).toEqual({
    present: true,
    opacity: '1',
    visibility: 'visible',
    display: 'block',
    text: true,
  });
});

test('assertOverlayAbsence passes on an empty commercial surface', async ({ page }) => {
  requireCleanCaptureEnvironment('overlay-negative-fixture-clean');
  await page.setContent(`
    <html><body><main>Commercial surface only</main></body></html>
  `);
  await assertOverlayAbsence(page, 'overlay-negative-fixture-clean');
  const detected = await detectUnexpectedOverlay(page);
  expect(detected.findings).toEqual([]);
});
