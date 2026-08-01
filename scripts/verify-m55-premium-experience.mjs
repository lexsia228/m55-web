#!/usr/bin/env node
/**
 * Premium Experience SSOT verifier launcher — delegates to the typed TS core
 * using the locked proof toolchain (no eval, no regex mounts, no npx install).
 */
import { join } from 'node:path';
import { REPO_ROOT, assertLockedProofToolchain, runProofTs } from './premium-proof-toolchain.mjs';

try {
  const toolchain = assertLockedProofToolchain();
  console.log(`proof toolchain: tsx@${toolchain.version} (locked, offline)`);
} catch (err) {
  console.error(err.message);
  process.exit(1);
}

const cli = join(REPO_ROOT, 'lib/m55/commercialUx/premiumExperience/premiumExperienceVerifierCli.ts');
const result = runProofTs([cli], { stdio: 'inherit', encoding: undefined });
process.exit(result.status ?? 1);
