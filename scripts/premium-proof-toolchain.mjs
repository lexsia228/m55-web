/**
 * Locked proof toolchain resolution.
 *
 * Proof commands must run from the repository's locked install: the `tsx` binary
 * is resolved inside node_modules and never through `npx`, which would reach the
 * registry when the package is absent.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const REPO_ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));

export const TSX_BIN = join(REPO_ROOT, 'node_modules', '.bin', process.platform === 'win32' ? 'tsx.cmd' : 'tsx');

/**
 * Declared-and-locked check. Fails closed so a missing lock entry surfaces as a
 * proof failure instead of a silent network install.
 */
export function assertLockedProofToolchain() {
  const pkg = JSON.parse(readFileSync(join(REPO_ROOT, 'package.json'), 'utf8'));
  const declared = pkg.devDependencies?.tsx ?? pkg.dependencies?.tsx;
  if (!declared) {
    throw new Error('PROOF_TOOLCHAIN_UNLOCKED: tsx is not declared in package.json');
  }
  if (!/^\d+\.\d+\.\d+$/.test(declared)) {
    throw new Error(`PROOF_TOOLCHAIN_UNPINNED: tsx must be pinned exactly, found "${declared}"`);
  }

  const lock = JSON.parse(readFileSync(join(REPO_ROOT, 'package-lock.json'), 'utf8'));
  const locked = lock.packages?.['node_modules/tsx'];
  if (!locked) {
    throw new Error('PROOF_TOOLCHAIN_UNLOCKED: tsx is not present in package-lock.json');
  }
  if (locked.version !== declared) {
    throw new Error(
      `PROOF_TOOLCHAIN_DRIFT: package.json tsx ${declared} vs package-lock.json ${locked.version}`,
    );
  }
  if (!locked.integrity) {
    throw new Error('PROOF_TOOLCHAIN_UNLOCKED: tsx lock entry has no integrity hash');
  }
  if (!existsSync(TSX_BIN)) {
    throw new Error(
      `PROOF_TOOLCHAIN_NOT_INSTALLED: ${TSX_BIN} missing — run "npm ci" before proof commands`,
    );
  }

  return { version: locked.version, integrity: locked.integrity, bin: TSX_BIN };
}

/**
 * Run a TypeScript proof entry point with the locked toolchain.
 * `npm_config_offline` blocks any implicit dependency download from the child.
 */
export function runProofTs(args, options = {}) {
  assertLockedProofToolchain();
  return spawnSync(TSX_BIN, args, {
    cwd: REPO_ROOT,
    encoding: 'utf8',
    ...options,
    env: {
      ...process.env,
      npm_config_offline: 'true',
      npm_config_audit: 'false',
      npm_config_fund: 'false',
      ...(options.env ?? {}),
    },
  });
}
