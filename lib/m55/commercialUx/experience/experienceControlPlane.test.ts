import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { EXPERIENCE_COMPONENT_OWNERS } from '../../../../components/experience/experienceComponentOwners';
import {
  EXPERIENCE_TRAIT_FIELDS,
  M55_CTA_FORBIDDEN_PHRASES,
  M55_CTA_LABELS,
  M55_EXPERIENCE_ARCHETYPES,
  M55_EXPERIENCE_CONTROL_PLANE,
  resolveExperience,
  resolveExperienceArchetype,
  resolveExperienceCtaLabel,
  resolveExperienceCtaState,
} from './index';
// route registry is exposed via control plane facade
import {
  TRAIT_IDENTITY_CATALOG,
  assertTraitIdentityCatalogComplete,
} from '../traitIdentityCatalog';
import { M55_ASSET_ROUTE_CONSUMPTION } from '../assetLedger/assetRouteConsumption';
import { M55_COMMERCIAL_TERMINOLOGY as T } from '../terminology';

const ROOT = join(import.meta.dirname, '../../../..');

describe('M55 Experience Control Plane v2', () => {
  it('exposes nine archetypes with full contracts', () => {
    assert.equal(M55_EXPERIENCE_ARCHETYPES.length, 9);
    assert.equal(M55_EXPERIENCE_CONTROL_PLANE.version, 'm55-ecp-v2');
    for (const id of M55_EXPERIENCE_ARCHETYPES) {
      const contract = M55_EXPERIENCE_CONTROL_PLANE.archetypes[id];
      assert.equal(contract.id, id);
      assert.ok(contract.printMode);
      assert.ok(contract.header);
      assert.ok(contract.sectionRhythm);
      assert.ok(['commercial', 'workflow', 'recipient'].includes(contract.primaryCtaTone));
      M55_EXPERIENCE_CONTROL_PLANE.constitution.assertArchetypeContractComplete(id);
    }
  });

  it('registers complete user-visible route coverage', () => {
    assert.ok(M55_EXPERIENCE_CONTROL_PLANE.routeRegistry.length >= 40);
    const ids = new Set(M55_EXPERIENCE_CONTROL_PLANE.routeRegistry.map((e) => e.id));
    for (const id of [
      'public.home',
      'free.core.result',
      'shared.entry',
      'premium.lp.checkout',
      'purchased.reader',
    ]) {
      assert.ok(ids.has(id), id);
    }
  });

  it('maps routes to archetypes', () => {
    assert.equal(resolveExperienceArchetype({ pathname: '/home' }), 'PUBLIC_POSTER');
    assert.equal(resolveExperienceArchetype({ pathname: '/how-m55-works' }), 'PUBLIC_EDITORIAL');
    assert.equal(resolveExperienceArchetype({ pathname: '/ten-views' }), 'PUBLIC_EDITORIAL');
    assert.equal(resolveExperienceArchetype({ pathname: '/pricing' }), 'PRODUCT_DECISION');
    assert.equal(
      resolveExperienceArchetype({ pathname: '/core', coreUxPhase: 'INTAKE' }),
      'GUIDED_FREE_FLOW',
    );
    assert.equal(
      resolveExperienceArchetype({ pathname: '/core', coreUxPhase: 'RESULT' }),
      'EDITORIAL_FREE_RESULT',
    );
    assert.equal(resolveExperienceArchetype({ pathname: '/r/abc' }), 'SHARED_SOCIAL_ENTRY');
    assert.equal(
      resolveExperienceArchetype({ pathname: '/dtr/lp', paidPhase: 'questionnaire' }),
      'PREMIUM_GUIDED_FLOW',
    );
    assert.equal(
      resolveExperienceArchetype({ pathname: '/dtr/lp', paidPhase: 'plans' }),
      'PRODUCT_DECISION',
    );
    assert.equal(
      resolveExperienceArchetype({ pathname: '/dtr/lp', paidPhase: 'checkout' }),
      'PURCHASE_CONFIRMATION',
    );
    assert.equal(resolveExperienceArchetype({ pathname: '/dtr/core' }), 'DIGITAL_PUBLICATION');
  });

  it('centralizes CTA labels and forbids construction phrases', () => {
    assert.equal(M55_CTA_LABELS.FRESH, T.freeStart);
    assert.equal(M55_CTA_LABELS.FREE_TO_PREMIUM, T.premiumBridgeCta);
    assert.equal(M55_CTA_LABELS.PREMIUM_COMPLETE, T.selectPlan);
    assert.equal(M55_CTA_LABELS.PAYMENT_READY, T.checkoutProceed);
    assert.equal(M55_CTA_LABELS.SHARED_RECIPIENT, T.recipientAction);
    assert.equal(resolveExperienceCtaState({ stage: 'EMPTY' }), 'FRESH');
    assert.equal(
      resolveExperienceCtaLabel({ stage: 'FREE_RESULT_READY', surface: 'core' }),
      T.premiumBridgeCta,
    );
    assert.equal(
      resolveExperienceCtaLabel({ stage: 'FREE_RESULT_READY', surface: 'home' }),
      '無料結果を開く',
    );
    assert.equal(
      resolveExperienceCtaLabel({ stage: 'PAID_QUESTIONS_COMPLETE', surface: 'home' }),
      '回答を確認してプランを見る',
    );
    for (const phrase of M55_CTA_FORBIDDEN_PHRASES) {
      for (const label of Object.values(M55_CTA_LABELS)) {
        assert.equal(label.includes(phrase), false, `${label} contains ${phrase}`);
      }
    }
  });

  it('has all-ten trait editorial parity', () => {
    assertTraitIdentityCatalogComplete();
    assert.equal(TRAIT_IDENTITY_CATALOG.length, 10);
    for (const field of EXPERIENCE_TRAIT_FIELDS) {
      for (const trait of TRAIT_IDENTITY_CATALOG) {
        const value = trait[field as keyof typeof trait];
        assert.ok(value != null, `missing ${field}`);
        if (typeof value === 'string') assert.ok(value.trim().length > 0);
      }
    }
    const names = new Set(TRAIT_IDENTITY_CATALOG.map((t) => t.traitName));
    assert.equal(names.size, 10);
  });

  it('wires PublicShell and ShellLayout to ECP v2 markers', () => {
    const shell = readFileSync(join(ROOT, 'app/_components/PublicShell.tsx'), 'utf8');
    const layout = readFileSync(join(ROOT, 'components/shell/ShellLayout.tsx'), 'utf8');
    for (const src of [shell, layout]) {
      assert.match(src, /experienceControlPlane\.css/);
      assert.match(src, /data-m55-ecp="v2"/);
      assert.match(src, /data-m55-archetype/);
      assert.match(src, /data-m55-print-mode/);
      assert.match(src, /resolveExperienceArchetype/);
    }
  });

  it('documents component owners without duplicating shell', () => {
    assert.equal(EXPERIENCE_COMPONENT_OWNERS.ExperienceShell, 'app/_components/PublicShell');
    assert.ok(EXPERIENCE_COMPONENT_OWNERS.StickyAction.includes('CorePremiumStickyCta'));
    const resolved = resolveExperience({ pathname: '/pricing' });
    assert.equal(resolved.archetype, 'PRODUCT_DECISION');
    assert.equal(resolved.contract.printMode, 'product_fact');
  });

  it('does not leave deprecated fresh CTA copy in primary gates', () => {
    const locked = readFileSync(join(ROOT, 'components/core/CoreLockedState.tsx'), 'utf8');
    const needFree = readFileSync(join(ROOT, 'components/dtr/DtrNeedFreeResultGate.tsx'), 'utf8');
    const guest = readFileSync(join(ROOT, 'lib/m55/freeResult/guestFreeJourneyCopyV1.ts'), 'utf8');
    assert.doesNotMatch(locked, /無料結果を始める/);
    assert.doesNotMatch(needFree, /無料結果を始める/);
    assert.match(locked, /T\.freeStart/);
    assert.match(needFree, /T\.freeStart/);
    assert.match(guest, /T\.freeStart/);
  });

  it('registers shared export route and updated free share ownership', () => {
    const exportRoute = M55_EXPERIENCE_CONTROL_PLANE.routeRegistry.find((e) => e.id === 'shared.export');
    assert.ok(exportRoute);
    assert.equal(exportRoute!.pattern, '/r/:token/share-image');
    assert.equal(exportRoute!.state, 'export');
    assert.equal(exportRoute!.archetype, 'SHARED_SOCIAL_ENTRY');
    assert.equal(exportRoute!.privacy, 'privacy_safe_share');
    assert.deepEqual(exportRoute!.ownerFiles, [
      'app/r/[token]/share-image/route.ts',
      'lib/m55/narrative/publicShareImageV1.tsx',
    ]);

    const shareRoute = M55_EXPERIENCE_CONTROL_PLANE.routeRegistry.find((e) => e.id === 'free.core.share');
    assert.ok(shareRoute);
    assert.ok(shareRoute!.ownerFiles.includes('components/narrative/ShareCardChooser.tsx'));
    assert.ok(shareRoute!.ownerFiles.includes('components/narrative/NarrativeShareActions.tsx'));
    assert.ok(shareRoute!.ownerFiles.includes('lib/m55/narrative/projectPublicShareV1.ts'));
    assert.ok(shareRoute!.ownerFiles.includes('lib/m55/freeResult/privacySafeShareCardV1.ts'));

    assert.equal(resolveExperienceArchetype({ pathname: '/r/abc/share-image' }), 'SHARED_SOCIAL_ENTRY');

    assert.deepEqual(M55_ASSET_ROUTE_CONSUMPTION['shared.export'], [
      'share.card',
      'trait.identity',
    ]);
  });
});
