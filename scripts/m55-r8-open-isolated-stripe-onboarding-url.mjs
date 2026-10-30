#!/usr/bin/env node
/**
 * Opens gitignored isolated onboarding URL via OS handler — does not print the URL.
 */
import { readFileSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { isolatedSmokeOnboardingUrlPathV1 } from '../lib/m55/creatorProvider/stripeConnectV2IsolatedSmokeState.ts';

const path = isolatedSmokeOnboardingUrlPathV1();
if (!existsSync(path)) {
  console.error('M55_R8_STRIPE_CONNECT_ONBOARDING_URL_MISSING');
  console.error('- Run npx tsx scripts/m55-r8-stripe-connect-v2-isolated-test-e2e.mjs first');
  process.exit(2);
}

const url = readFileSync(path, 'utf8').trim();
if (!url.startsWith('https://')) {
  console.error('M55_R8_STRIPE_CONNECT_ONBOARDING_URL_INVALID');
  process.exit(2);
}

const openCmd = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open';
const result = spawnSync(openCmd, process.platform === 'win32' ? ['', url] : [url], {
  stdio: 'ignore',
  shell: process.platform === 'win32',
});
if (result.status !== 0) {
  console.error('M55_R8_STRIPE_CONNECT_ONBOARDING_OPEN_FAILED');
  process.exit(2);
}

console.log(JSON.stringify({ ok: true, action: 'OPENED_VIA_OS_HANDLER', classification: 'STRIPE_CONNECT_V2_API_SMOKE' }));
