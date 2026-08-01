#!/usr/bin/env node
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runPremiumExperienceVerifier } from './premiumExperienceVerifier.ts';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');

const report = runPremiumExperienceVerifier(ROOT);

console.log('M55 Premium Experience SSOT verifier');
console.log(`root: ${ROOT}`);
console.log('\n--- report ---');
console.log(
  JSON.stringify(
    {
      ...report,
      failures: report.failures.length,
    },
    null,
    2,
  ),
);
console.log(`\nPASS/FAIL: ${report.failures.length === 0 ? 'PASS' : 'FAIL'}`);
if (report.failures.length) {
  for (const f of report.failures) console.error(`[${f.rule}] ${f.message}`);
  process.exit(1);
}
