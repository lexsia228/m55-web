#!/usr/bin/env node
/**
 * Premium Experience SSOT verifier — extends Asset Ledger + ECP without rebuilding ECP.
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

async function main() {
  const ts = require('typescript');
  const configPath = ts.findConfigFile(ROOT, ts.sys.fileExists, 'tsconfig.json');
  const config = ts.readConfigFile(configPath, ts.sys.readFile).config;
  const parsed = ts.parseJsonConfigFileContent(config, ts.sys, ROOT);

  for (const rel of [
    'lib/m55/commercialUx/premiumExperience/premiumVisualAuthority.ts',
    'lib/m55/commercialUx/premiumExperience/premiumExperienceStateRegistry.ts',
    'lib/m55/commercialUx/premiumExperience/premiumExperience.css',
    'components/experience/PremiumExperienceSurface.tsx',
    'components/shell/PremiumExperienceSync.tsx',
  ]) {
    if (!existsSync(join(ROOT, rel))) fail('files', `missing ${rel}`);
  }

  const css = read('lib/m55/commercialUx/premiumExperience/premiumExperience.css');
  if (!css.includes('premium.experience.home_editorial_sample_v1') && !css.includes('#0b1a2b')) {
    fail('visual.tokens', 'premium CSS missing ink token');
  }
  if (!css.includes('Shippori Mincho')) {
    fail('visual.typography', 'premium CSS missing editorial serif');
  }

  const bridge = read('components/core/CoreFreeToPaidConversionBridge.tsx');
  if (!bridge.includes('PremiumExperienceSurface')) {
    fail('surface.bridge', 'Core bridge missing PremiumExperienceSurface');
  }
  if (!bridge.includes('premium.core.bridge')) {
    fail('surface.bridge', 'Core bridge missing premium state id');
  }

  const freeQ = read('components/core/CoreFreeQuestionnaireLayer.tsx');
  if (freeQ.includes('PremiumExperienceSurface')) {
    fail('fence.free_shell', 'free questionnaire must not use PremiumExperienceSurface');
  }

  const ledger = read('lib/m55/commercialUx/assetLedger/assetLedger.ts');
  if (!ledger.includes("'premium.experience.home_editorial_sample_v1'")) {
    fail('ledger.asset', 'visual authority not in asset ledger');
  }

  const consumption = read('lib/m55/commercialUx/assetLedger/assetRouteConsumption.ts');
  if (!consumption.includes("'premium.lp.questions': [") || !consumption.includes('premium.experience.home_editorial_sample_v1')) {
    fail('ledger.consumption', 'premium.lp.questions missing visual asset consumption');
  }

  console.log('M55 Premium Experience SSOT verifier');
  console.log(`root: ${ROOT}`);
  console.log('\n--- report ---');
  console.log(
    JSON.stringify(
      {
        visualAuthorityKey: 'premium.experience.home_editorial_sample_v1',
        premiumStates: 11,
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
