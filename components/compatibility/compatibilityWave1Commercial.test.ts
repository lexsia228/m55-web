import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { buildPairDisplayIdentity, isSpecificPairPartnerLabel, legacyPairDisplayIdentity, parsePairDisplayIdentity } from '../../lib/m55/compatibility/pairDisplayIdentity';
import { buildCanonicalCompatibilityPurchaseSnapshot } from '../../lib/m55/compatibility/buildCanonicalCompatibilityPurchaseSnapshot';
import { isPaidCompatibilityReportSnapshot } from '../../lib/m55/compatibility/compatibilityCommerceDb';

const read = (path: string) => readFileSync(path, 'utf8');
const context = { expressionPace: 'words_soon', contactPace: 'steady_contact', focus: 'conversation_focus' } as const;

test('Pair display identity is sanitized, bounded, and has a deterministic legacy fallback', () => {
  const identity = buildPairDisplayIdentity('  相\u0000手   ラベル'.repeat(10), 'R2');
  assert.equal(identity.partnerLabel.includes('\u0000'), false);
  assert.ok(identity.partnerLabel.length <= 24);
  assert.deepEqual(legacyPairDisplayIdentity(), {
    version: 'pair_display_identity_v1', selfLabel: 'あなた', partnerLabel: '相手', relationLabel: '二人の関係',
  });
  assert.equal(parsePairDisplayIdentity({ ...identity, partnerLabel: '' }), null);
  assert.equal(isSpecificPairPartnerLabel('相手'), false);
  assert.equal(isSpecificPairPartnerLabel('Y'), true);
});

test('Pair identity persists in a valid paid snapshot without raw DOB fields', () => {
  const displayIdentity = buildPairDisplayIdentity('ゆう', 'R2');
  const built = buildCanonicalCompatibilityPurchaseSnapshot(
    { personA: '1990-01-01', personB: '1992-02-02' }, 'R2', context, displayIdentity,
  );
  assert.equal(built.ok, true);
  if (!built.ok) return;
  assert.deepEqual(built.snapshot.displayIdentity, displayIdentity);
  assert.equal(isPaidCompatibilityReportSnapshot(built.snapshot), true);
  assert.equal(JSON.stringify(built.snapshot.displayIdentity).includes('1990-01-01'), false);
});

test('Wave 1 UI carries identity and removes pre-result/developer vocabulary', () => {
  const shelf = read('lib/m55/commercialUx/premiumProductShelf.ts');
  const purchase = read('components/compatibility/CompatibilityPurchaseExperience.tsx');
  const saved = read('components/my/CompatibilitySavedReportsSection.tsx');
  const reader = read('components/compatibility/PaidCompatibilityReportReader.tsx');
  assert.match(shelf, /二人の無料読み解きを始める/);
  assert.doesNotMatch(shelf, /二人の無料結果から始める/);
  assert.doesNotMatch(purchase, /今のfocus/);
  assert.match(purchase, /displayIdentity/);
  assert.match(purchase, /purchaseIdentity\?\.partnerLabel/);
  assert.match(saved, /identity\.partnerLabel/);
  assert.match(reader, /displayIdentity\.partnerLabel/);
});

test('checkout is single-flight and bounded; labels do not enter analytics or share blocks', () => {
  const purchase = read('components/compatibility/CompatibilityPurchaseExperience.tsx');
  const reader = read('components/compatibility/PaidCompatibilityReportReader.tsx');
  const share = read('components/narrative/CompatibilityPaidShareBlock.tsx');
  assert.match(purchase, /if \(!journey \|\| !commerceEnabled \|\| loading\) return/);
  assert.match(purchase, /fetchJsonWithTimeout<\{ url\?: unknown \}>\('\/api\/compatibility\/checkout'/);
  assert.doesNotMatch(reader, /trackFunnel(?:Action|ImpressionOnce)\([^)]*partnerLabel/s);
  assert.match(reader, /<CompatibilityPaidShareBlock snapshot=\{snapshot\} \/>/);
  assert.doesNotMatch(share, /displayIdentity|partnerLabel/);
});

test('Clerk and owned-data waits have bounded recovery and safe exits', () => {
  const dtr = read('components/dtr/DtrPaidPurchasePrep.tsx');
  const my = read('components/my/MyPanel.tsx');
  const purchase = read('components/compatibility/CompatibilityPurchaseExperience.tsx');
  const saved = read('components/my/CompatibilitySavedReportsSection.tsx');
  for (const source of [dtr, my, purchase]) {
    assert.match(source, /useBoundedReadiness/);
    assert.match(source, /BoundedRecoveryState/);
    assert.match(source, /window\.location\.reload\(\)/);
  }
  assert.match(my, /Promise\.allSettled/);
  assert.match(my, /fetchJsonWithTimeout<EntitlementsResponse>\('\/api\/me\/entitlements'/);
  assert.match(saved, /fetchJsonWithTimeout<\{/);
  assert.match(purchase, /マイページで確認する/);
  assert.match(purchase, /確認が続く場合はサポートへ/);
});

test('new and legacy Pair journeys require a specific private label before purchase', () => {
  const guest = read('components/compatibility/CompatibilityGuestExperience.tsx');
  const purchase = read('components/compatibility/CompatibilityPurchaseExperience.tsx');
  assert.match(guest, /id="compatibility-partner-dob"/);
  assert.match(guest, /id="compatibility-partner-label"/);
  assert.match(guest, /isSpecificPairPartnerLabel\(partnerLabel\)/);
  assert.match(guest, /本名は不要です/);
  assert.match(guest, /公開シェアには自動で含めません/);
  assert.match(purchase, /compatibility-purchase-identity-completion/);
  assert.match(purchase, /persistCompletedPairJourney/);
  assert.match(purchase, /isSpecificPairPartnerLabel\(journey\.displayIdentity\?\.partnerLabel\)/);
});
