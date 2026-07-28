#!/usr/bin/env node
/**
 * Static Premium proof-record verifier launcher — validates the committed
 * execution records against the current source tree using the locked toolchain.
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

const cli = join(REPO_ROOT, 'lib/m55/commercialUx/premiumExperience/premiumProofRecordsCli.ts');
const result = runProofTs([cli], { stdio: 'inherit', encoding: undefined });
process.exit(result.status ?? 1);
