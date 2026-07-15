import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';
import { buildM55ExperienceCardModel, type M55ExperienceCardInput } from './m55ExperienceCardModel';

const root = process.cwd();
const read = (path: string) => readFileSync(resolve(root, path), 'utf8');

const personalOwned: M55ExperienceCardInput = {
  kind: 'personal',
  identityState: 'authenticated',
  journeyState: 'free_complete',
  ownershipState: 'owned',
  commerceState: 'available',
};

test('personal owned-ready and owned-not-ready retain authoritative routes', () => {
  const ready = buildM55ExperienceCardModel({
    ...personalOwned,
    authority: {
      uxState: 'owned_snapshot_ready',
      action: 'open_owned',
      href: '/dtr/core',
      label: '保存版を読み返す',
    },
  });
  const recovery = buildM55ExperienceCardModel({
    ...personalOwned,
    authority: {
      uxState: 'owned_snapshot_not_ready',
      action: 'recover_owned',
      href: '/dtr/processing?recovery=owned',
      label: '準備状況を確認する',
    },
  });
  assert.equal(ready.primaryAction, 'open_owned');
  assert.equal(ready.primaryHref, '/dtr/core');
  assert.equal(recovery.primaryAction, 'recover_owned');
  assert.equal(recovery.primaryHref, '/dtr/processing?recovery=owned');
  const page = read('app/dtr/page.tsx');
  assert.match(page, /access\.lpCtaMode === 'open'/);
  assert.match(page, /access\.lpCtaMode === 'recovery'/);
  assert.match(page, /'recover_owned'/);
});

test('authority errors retain support instead of a free or purchase route', () => {
  const model = buildM55ExperienceCardModel({
    ...personalOwned,
    ownershipState: 'not_owned',
    authority: {
      uxState: 'error_unknown',
      action: 'authority_support',
      href: '/support',
      label: 'サポートを確認する',
    },
  });
  assert.equal(model.primaryAction, 'authority_support');
  assert.equal(model.primaryHref, '/support');
  assert.match(read('app/dtr/page.tsx'), /access\.uxState === 'error_unknown'/);
});

test('reading home keeps latest compatibility direct and older reports discoverable', () => {
  const source = read('components/dtr/M55ReadingHome.tsx');
  assert.match(source, /compatibilityReports\[0\]/);
  assert.match(source, /`\/synastry\/report\/\$\{latestCompatibility\.id\}`/);
  assert.match(source, /compatibilityReports\.length > 1/);
  assert.match(source, /\/my#my-purchase-heading/);
});

test('compatibility report route remains owner-only', () => {
  const page = read('app/synastry/report/[reportId]/page.tsx');
  const db = read('lib/m55/compatibility/compatibilityCommerceDb.ts');
  assert.match(page, /if \(!userId\) notFound\(\)/);
  assert.match(page, /getOwnedCompatibilityReport\(userId, reportId\)/);
  assert.match(page, /if \(!report\) notFound\(\)/);
  assert.match(db, /\.eq\('owner_user_id', ownerUserId\)/);
});
