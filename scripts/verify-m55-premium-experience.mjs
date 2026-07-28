#!/usr/bin/env node
/**
 * Premium Experience SSOT verifier — registry, mount, consumption, fixture isolation.
 */
import { createRequire } from 'node:module';
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const require = createRequire(join(ROOT, 'package.json'));
const FAILURES = [];

function fail(rule, message) {
  FAILURES.push({ rule, message });
}

function read(rel) {
  return readFileSync(join(ROOT, rel), 'utf8');
}

function assertExcludes(rel, needle, rule, message) {
  const src = read(rel);
  if (src.includes(needle)) fail(rule, `${message} (${rel})`);
}

async function main() {
  for (const rel of [
    'lib/m55/commercialUx/premiumExperience/premiumVisualAuthority.ts',
    'lib/m55/commercialUx/premiumExperience/premiumExperienceStateRegistry.ts',
    'lib/m55/commercialUx/premiumExperience/premiumExperienceMountContract.ts',
    'lib/m55/commercialUx/premiumExperience/premiumExperience.css',
    'components/experience/PremiumExperienceSurface.tsx',
    'components/experience/PremiumDecisionSurface.tsx',
    'components/shell/PremiumExperienceSync.tsx',
  ]) {
    if (!existsSync(join(ROOT, rel))) fail('files', `missing ${rel}`);
  }

  const css = read('lib/m55/commercialUx/premiumExperience/premiumExperience.css');
  if (!css.includes('#0b1a2b')) fail('visual.tokens', 'premium CSS missing ink token');
  if (!css.includes('Shippori Mincho')) fail('visual.typography', 'premium CSS missing editorial serif');
  if (!css.includes('m55-premium-decision-field')) fail('visual.decision', 'missing shared decision field');
  if (!css.includes('m55-premium-decision-sheet')) fail('visual.decision', 'missing shared decision sheet');

  const bridge = read('components/core/CoreFreeToPaidConversionBridge.tsx');
  if (!bridge.includes('PremiumExperienceSurface')) fail('surface.bridge', 'Core bridge missing PremiumExperienceSurface');
  if (!bridge.includes('premium.core.bridge')) fail('surface.bridge', 'Core bridge missing premium state id');

  const freeQ = read('components/core/CoreFreeQuestionnaireLayer.tsx');
  if (freeQ.includes('PremiumExperienceSurface') || freeQ.includes('PremiumDecisionSurface')) {
    fail('fence.free_shell', 'free questionnaire must not use Premium wrappers');
  }

  const questionnaire = read('components/dtr/DtrPaidQuestionnaireLayer.tsx');
  if (!questionnaire.includes('PremiumDecisionSurface')) {
    fail('surface.decision', 'paid questionnaire missing PremiumDecisionSurface');
  }
  if (!questionnaire.includes('premium.lp.answer_edit')) {
    fail('surface.answer_edit', 'paid questionnaire missing answer_edit state');
  }

  const purchasePrep = read('components/dtr/DtrPaidPurchasePrep.tsx');
  if (!purchasePrep.includes('PremiumDecisionSurface')) {
    fail('surface.plans', 'purchase prep missing PremiumDecisionSurface');
  }

  const share = read('components/core/CoreFreeResultShareCTA.tsx');
  if (!share.includes('PremiumDecisionSurface') || !share.includes('premium.share.card')) {
    fail('surface.share', 'premium share missing PremiumDecisionSurface');
  }

  const reader = read('components/dtr/DtrFullReader.tsx');
  if (!reader.includes('SavedSnapshotNotice')) fail('mount.saved_reopen', 'SavedSnapshotNotice not mounted in DtrFullReader');
  if (!reader.includes('devPreviewFixtureReady')) fail('fixture.reader', 'DtrFullReader missing dev fixture gate');

  const prodCore = read('app/dtr/core/page.tsx');
  if (prodCore.includes('devPreviewFixtureReady')) {
    fail('fixture.isolation', 'Production /dtr/core must not pass devPreviewFixtureReady');
  }

  const previewClient = read('components/dtr/__preview__/DtrDrawerPreviewClient.tsx');
  if (!previewClient.includes('devPreviewFixtureReady')) {
    fail('fixture.preview', 'dev preview client must inject devPreviewFixtureReady');
  }

  const contractSrc = read('lib/m55/commercialUx/premiumExperience/premiumExperienceMountContract.ts');
  const contractMatch = contractSrc.match(
    /export const PREMIUM_EXPERIENCE_MOUNT_CONTRACT[^=]*=\s*(\[[\s\S]*?\])\s*as const;/,
  );
  if (!contractMatch) fail('mount.contract', 'mount contract parse failed');
  const contract = eval(contractMatch[1]);

  const registrySrc = read('lib/m55/commercialUx/premiumExperience/premiumExperienceStateRegistry.ts');
  const registryIds = [...registrySrc.matchAll(/id: '([^']+)'/g)].map((m) => m[1]);
  const contractIds = contract.map((c) => c.id);

  for (const id of registryIds) {
    if (!contractIds.includes(id)) fail('mount.registry', `registry state ${id} missing mount contract`);
  }
  for (const entry of contract) {
    const owner = read(entry.ownerFile);
    for (const marker of entry.requiredMarkers) {
      if (!owner.includes(marker)) {
        fail('mount.mounted', `${entry.id} missing marker "${marker}" in ${entry.ownerFile}`);
      }
    }
  }

  const ledger = read('lib/m55/commercialUx/assetLedger/assetLedger.ts');
  if (!ledger.includes("'premium.experience.home_editorial_sample_v1'")) {
    fail('ledger.asset', 'visual authority not in asset ledger');
  }

  const consumption = read('lib/m55/commercialUx/assetLedger/assetRouteConsumption.ts');
  if (!consumption.includes("'premium.lp.questions':") || !consumption.includes('premium.experience.home_editorial_sample_v1')) {
    fail('ledger.consumption', 'premium.lp.questions missing visual asset consumption');
  }
  if (!consumption.match(/'free\.core\.share':[^\n]*premium\.experience\.home_editorial_sample_v1/)) {
    fail('ledger.consumption', 'free.core.share missing premium visual asset consumption');
  }

  const forbiddenFourChapter = [
    '6問に答えて4章を作る',
    '4章を作る',
    '4章で深く読む',
    'あなた向けの4章レポートに仕上げます',
  ];
  for (const phrase of forbiddenFourChapter) {
    for (const rel of [
      'components/dtr/DtrPaidQuestionnaireLayer.tsx',
      'components/dtr/DtrPaidPurchasePrep.tsx',
      'components/core/CoreFreeResultShareCTA.tsx',
    ]) {
      assertExcludes(rel, phrase, 'copy.four_chapter', `forbidden phrase "${phrase}"`);
    }
  }

  console.log('M55 Premium Experience SSOT verifier');
  console.log(`root: ${ROOT}`);
  console.log('\n--- report ---');
  console.log(
    JSON.stringify(
      {
        visualAuthorityKey: 'premium.experience.home_editorial_sample_v1',
        premiumStates: registryIds.length,
        mountContract: contract.length,
        coverage: {
          registered: registryIds.length,
          mounted: contract.length,
          fixtureRoutes: contract.filter((c) => c.fixtureRoute).length,
        },
        failures: FAILURES.length,
      },
      null,
      2,
    ),
  );
  console.log(`\nPASS/FAIL: ${FAILURES.length === 0 ? 'PASS' : 'FAIL'}`);
  if (FAILURES.length) {
    for (const f of FAILURES) console.error(`[${f.rule}] ${f.message}`);
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
