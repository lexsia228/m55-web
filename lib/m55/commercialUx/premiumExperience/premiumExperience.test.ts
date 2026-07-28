import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import {
  PREMIUM_EXPERIENCE_STATE_REGISTRY,
  assertPremiumExperienceRegistryComplete,
} from './premiumExperienceStateRegistry';
import { PREMIUM_VISUAL_AUTHORITY_KEY, PREMIUM_VISUAL_SOURCE, PREMIUM_VISUAL_TOKENS } from './premiumVisualAuthority';
import { M55_EXPERIENCE_ROUTE_REGISTRY } from '../experience/experienceRouteRegistry';
import { M55_ASSET_ROUTE_CONSUMPTION } from '../assetLedger/assetRouteConsumption';

const ROOT = join(import.meta.dirname, '../../../..');

describe('premium experience SSOT', () => {
  it('registry is complete and PREMIUM-only', () => {
    assertPremiumExperienceRegistryComplete();
    assert.ok(PREMIUM_EXPERIENCE_STATE_REGISTRY.length >= 10);
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

  it('premium CSS encodes canonical tokens', () => {
    const css = readFileSync(
      join(ROOT, 'lib/m55/commercialUx/premiumExperience/premiumExperience.css'),
      'utf8',
    );
    assert.match(css, new RegExp(PREMIUM_VISUAL_TOKENS.ink.replace('#', '#')));
    assert.match(css, /data-m55-experience-tier='PREMIUM'/);
    assert.match(css, /Shippori Mincho/);
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

  it('governed premium surfaces declare PremiumExperienceSurface', () => {
    const owners = [
      'components/core/CoreFreeToPaidConversionBridge.tsx',
      'components/dtr/DtrPaidQuestionnaireLayer.tsx',
      'components/dtr/DtrPaidPurchasePrep.tsx',
    ];
    for (const rel of owners) {
      const src = readFileSync(join(ROOT, rel), 'utf8');
      assert.match(src, /PremiumExperienceSurface/, rel);
      if (rel.includes('CoreFreeToPaidConversionBridge')) {
        assert.match(src, /premium\.core\.bridge/, rel);
      }
    }
  });

  it('free questionnaire layer does not declare premium tier wrapper', () => {
    const src = readFileSync(join(ROOT, 'components/core/CoreFreeQuestionnaireLayer.tsx'), 'utf8');
    assert.doesNotMatch(src, /PremiumExperienceSurface/);
    assert.doesNotMatch(src, /data-m55-experience-tier="PREMIUM"/);
  });
});
