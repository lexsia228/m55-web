import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import {
  PREMIUM_EXPERIENCE_STATE_REGISTRY,
  assertPremiumExperienceRegistryComplete,
} from './premiumExperienceStateRegistry';
import {
  PREMIUM_EXPERIENCE_MOUNT_CONTRACT,
  PREMIUM_DEV_FIXTURE_FORBIDDEN_OWNER_FILES,
  PREMIUM_DEV_FIXTURE_OWNER_FILES,
} from './premiumExperienceMountContract';
import { PREMIUM_VISUAL_AUTHORITY_KEY, PREMIUM_VISUAL_SOURCE, PREMIUM_VISUAL_TOKENS } from './premiumVisualAuthority';
import { M55_EXPERIENCE_ROUTE_REGISTRY } from '../experience/experienceRouteRegistry';
import { M55_ASSET_ROUTE_CONSUMPTION } from '../assetLedger/assetRouteConsumption';

const ROOT = join(import.meta.dirname, '../../../..');

describe('premium experience SSOT', () => {
  it('registry is complete and PREMIUM-only', () => {
    assertPremiumExperienceRegistryComplete();
    assert.equal(PREMIUM_EXPERIENCE_STATE_REGISTRY.length, 12);
  });

  it('visual authority references Home editorial sample owners', () => {
    for (const rel of PREMIUM_VISUAL_SOURCE.ownerFiles) {
      const src = readFileSync(join(ROOT, rel), 'utf8');
      assert.ok(src.length > 100, rel);
    }
    assert.match(
      readFileSync(join(ROOT, 'components/home/HomePanel.module.css'), 'utf8'),
      /\.premiumDarkStage/,
    );
  });

  it('premium CSS encodes canonical tokens and decision surface', () => {
    const css = readFileSync(
      join(ROOT, 'lib/m55/commercialUx/premiumExperience/premiumExperience.css'),
      'utf8',
    );
    assert.match(css, new RegExp(PREMIUM_VISUAL_TOKENS.ink.replace('#', '#')));
    assert.match(css, /data-m55-experience-tier='PREMIUM'/);
    assert.match(css, /Shippori Mincho/);
    assert.match(css, /m55-premium-decision-sheet/);
  });

  it('premium ECP routes consume visual authority asset', () => {
    const premiumRoutes = M55_EXPERIENCE_ROUTE_REGISTRY.filter((r) =>
      r.id.startsWith('premium.') || r.id === 'purchased.reader',
    );
    for (const route of premiumRoutes) {
      const keys = M55_ASSET_ROUTE_CONSUMPTION[route.id] ?? [];
      assert.ok(
        keys.includes('premium.experience.home_editorial_sample_v1'),
        `${route.id} missing visual asset consumption`,
      );
    }
  });

  it('shared Premium decision owner governs funnel surfaces', () => {
    const owners = [
      'components/dtr/DtrPaidQuestionnaireLayer.tsx',
      'components/dtr/DtrPaidPurchasePrep.tsx',
    ];
    for (const rel of owners) {
      const src = readFileSync(join(ROOT, rel), 'utf8');
      assert.match(src, /PremiumDecisionSurface/, rel);
    }
    const questionnaire = readFileSync(join(ROOT, 'components/dtr/DtrPaidQuestionnaireLayer.tsx'), 'utf8');
    assert.match(questionnaire, /premium\.lp\.answer_edit/);
  });

  it('free questionnaire layer does not declare premium tier wrapper', () => {
    const src = readFileSync(join(ROOT, 'components/core/CoreFreeQuestionnaireLayer.tsx'), 'utf8');
    assert.doesNotMatch(src, /PremiumExperienceSurface/);
    assert.doesNotMatch(src, /PremiumDecisionSurface/);
    assert.doesNotMatch(src, /data-m55-experience-tier="PREMIUM"/);
  });

  it('mount contract covers every registered state', () => {
    const registryIds = PREMIUM_EXPERIENCE_STATE_REGISTRY.map((s) => s.id);
    const contractIds = PREMIUM_EXPERIENCE_MOUNT_CONTRACT.map((s) => s.id);
    for (const id of registryIds) {
      assert.ok(contractIds.includes(id), `missing mount contract for ${id}`);
    }
  });

  it('dev fixture gate is isolated from production reader', () => {
    const prod = readFileSync(join(ROOT, 'app/dtr/core/page.tsx'), 'utf8');
    for (const rel of PREMIUM_DEV_FIXTURE_FORBIDDEN_OWNER_FILES) {
      const src = readFileSync(join(ROOT, rel), 'utf8');
      assert.doesNotMatch(src, /devPreviewFixtureReady/);
    }
    for (const rel of PREMIUM_DEV_FIXTURE_OWNER_FILES) {
      const src = readFileSync(join(ROOT, rel), 'utf8');
      assert.match(src, /devPreviewFixtureReady|DtrDrawerPreviewClient/);
    }
    assert.doesNotMatch(prod, /devPreviewFixtureReady/);
  });

  it('premium share applies visual authority wrapper', () => {
    const src = readFileSync(join(ROOT, 'components/core/CoreFreeResultShareCTA.tsx'), 'utf8');
    assert.match(src, /PremiumDecisionSurface/);
    assert.match(src, /premium\.share\.card/);
    const keys = M55_ASSET_ROUTE_CONSUMPTION['free.core.share'] ?? [];
    assert.ok(keys.includes(PREMIUM_VISUAL_AUTHORITY_KEY));
  });

  it('saved reopen notice is mounted in purchased reader', () => {
    const reader = readFileSync(join(ROOT, 'components/dtr/DtrFullReader.tsx'), 'utf8');
    assert.match(reader, /SavedSnapshotNotice/);
    const notice = readFileSync(join(ROOT, 'components/dtr/SavedSnapshotNotice.tsx'), 'utf8');
    assert.match(notice, /purchased\.saved_reopen/);
  });
});
