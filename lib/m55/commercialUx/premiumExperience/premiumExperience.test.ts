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
  PREMIUM_SHARE_FREE_OWNER_FILE,
  PREMIUM_SHARE_PREMIUM_OWNER_FILE,
} from './premiumExperienceMountContract';
import { PREMIUM_VISUAL_AUTHORITY_KEY, PREMIUM_VISUAL_SOURCE, PREMIUM_VISUAL_TOKENS } from './premiumVisualAuthority';
import { M55_EXPERIENCE_ROUTE_REGISTRY } from '../experience/experienceRouteRegistry';
import { M55_ASSET_ROUTE_CONSUMPTION } from '../assetLedger/assetRouteConsumption';
import {
  PREMIUM_EXPERIENCE_REQUIRED_PDF_COUNT,
  PREMIUM_EXPERIENCE_REQUIRED_PNG_COUNT,
  PREMIUM_PURCHASED_BODY_MIN_BYTES,
  listExpectedPremiumEvidencePngFileNames,
} from './premiumExperienceEvidenceManifest';
import {
  freeShareAccidentallyPremiumWrapped,
  hasDataPremiumState,
  hasPremiumSurfaceMount,
  inspectPremiumOwnerFile,
} from './premiumExperienceAstInspection';
import {
  buildPrivacySafeShareCardV1,
  resolveShareAbsoluteUrl,
  SHARE_UI_COPY_V1,
} from '../../freeResult/privacySafeShareCardV1';

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
      if (rel.includes('premium-share-preview')) {
        assert.match(src, /premium-share-preview|CorePremiumResultShareCTA/);
        continue;
      }
      assert.match(src, /devPreviewFixtureReady|DtrDrawerPreviewClient/);
    }
    assert.doesNotMatch(prod, /devPreviewFixtureReady/);
  });

  it('free share owner is not premium-wrapped; premium share owner is explicit', () => {
    assert.equal(freeShareAccidentallyPremiumWrapped(ROOT, PREMIUM_SHARE_FREE_OWNER_FILE), false);
    const freeSrc = readFileSync(join(ROOT, PREMIUM_SHARE_FREE_OWNER_FILE), 'utf8');
    assert.doesNotMatch(freeSrc, /PremiumDecisionSurface/);
    assert.match(freeSrc, /data-m55-share-presentation="free"/);

    const premiumInspection = inspectPremiumOwnerFile(ROOT, PREMIUM_SHARE_PREMIUM_OWNER_FILE);
    assert.ok(
      hasPremiumSurfaceMount(premiumInspection, 'PremiumDecisionSurface', 'premium.share.card'),
    );
    assert.match(
      readFileSync(join(ROOT, PREMIUM_SHARE_PREMIUM_OWNER_FILE), 'utf8'),
      /data-m55-share-presentation="premium"/,
    );
  });

  it('free and premium share use the same canonical privacy-safe card authority', () => {
    const card = buildPrivacySafeShareCardV1({ stemLaneIndex: 1 });
    assert.ok(card);
    const freeSrc = readFileSync(join(ROOT, PREMIUM_SHARE_FREE_OWNER_FILE), 'utf8');
    const premiumSrc = readFileSync(join(ROOT, PREMIUM_SHARE_PREMIUM_OWNER_FILE), 'utf8');
    assert.match(freeSrc, /CoreShareResultBody/);
    assert.match(premiumSrc, /CoreShareResultBody/);
    assert.match(freeSrc, /privacySafeShareCardV1/);
    assert.match(premiumSrc, /privacySafeShareCardV1/);
    assert.equal(card.traitNameJa, 'プランナー');
  });

  it('visible share copy hides token while action URL stays privacy-safe', () => {
    const card = buildPrivacySafeShareCardV1({ stemLaneIndex: 1 })!;
    const bodySrc = readFileSync(join(ROOT, 'components/core/CoreShareResultBody.tsx'), 'utf8');
    assert.match(bodySrc, /destinationLabelJa/);
    assert.doesNotMatch(bodySrc, /card\.sharePath/);
    const url = resolveShareAbsoluteUrl(card.sharePath);
    assert.match(url, /\/r\/s1-1$/);
    assert.equal(SHARE_UI_COPY_V1.destinationLabelJa, 'M55の共有ページ');
  });

  it('free.core.share does not consume premium visual authority', () => {
    const keys = M55_ASSET_ROUTE_CONSUMPTION['free.core.share'] ?? [];
    assert.ok(!keys.includes(PREMIUM_VISUAL_AUTHORITY_KEY));
    const devKeys = M55_ASSET_ROUTE_CONSUMPTION['dev.premium_share_preview'] ?? [];
    assert.ok(devKeys.includes(PREMIUM_VISUAL_AUTHORITY_KEY));
  });

  it('AST mount inspection covers purchased states', () => {
    const reader = inspectPremiumOwnerFile(ROOT, 'components/dtr/DtrFullReader.tsx');
    assert.ok(hasDataPremiumState(reader, 'purchased.report.body'));
    const consult = inspectPremiumOwnerFile(ROOT, 'components/dtr/ConsultRoom.tsx');
    assert.ok(hasDataPremiumState(consult, 'purchased.consult.input'));
    const reply = inspectPremiumOwnerFile(ROOT, 'components/dtr/ConsultReplyCard.tsx');
    assert.ok(hasDataPremiumState(reply, 'purchased.consult.result'));
    const notice = inspectPremiumOwnerFile(ROOT, 'components/dtr/SavedSnapshotNotice.tsx');
    assert.ok(hasDataPremiumState(notice, 'purchased.saved_reopen'));
  });

  it('DtrFullReader fixture path bypasses Clerk hook mount', () => {
    const src = readFileSync(join(ROOT, 'components/dtr/DtrFullReader.tsx'), 'utf8');
    assert.match(src, /function DtrFullReaderAuthenticated/);
    assert.match(src, /fixtureMode/);
    assert.match(src, /if \(props\.devPreviewFixtureReady === true\)/);
  });

  it('evidence manifest declares exact 42 PNG + 5 PDF requirements', () => {
    assert.equal(PREMIUM_EXPERIENCE_REQUIRED_PNG_COUNT, 42);
    assert.equal(PREMIUM_EXPERIENCE_REQUIRED_PDF_COUNT, 5);
    assert.equal(listExpectedPremiumEvidencePngFileNames().length, 42);
    assert.ok(PREMIUM_PURCHASED_BODY_MIN_BYTES >= 8000);
  });

  it('saved reopen notice is mounted in purchased reader', () => {
    const reader = readFileSync(join(ROOT, 'components/dtr/DtrFullReader.tsx'), 'utf8');
    assert.match(reader, /SavedSnapshotNotice/);
    const notice = readFileSync(join(ROOT, 'components/dtr/SavedSnapshotNotice.tsx'), 'utf8');
    assert.match(notice, /purchased\.saved_reopen/);
  });
});
