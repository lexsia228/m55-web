#!/usr/bin/env node
/**
 * Premium Experience SSOT verifier launcher — delegates to typed TS core (no eval/regex mounts).
 */
import { spawnSync } from 'node:child_process';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const cli = join(ROOT, 'lib/m55/commercialUx/premiumExperience/premiumExperienceVerifierCli.ts');
const result = spawnSync('npx', ['tsx', cli], { cwd: ROOT, stdio: 'inherit', env: process.env });
process.exit(result.status ?? 1);
