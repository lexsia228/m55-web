/**
 * Start local `next dev` under the fail-closed clean-capture environment.
 *
 * Usage:
 *   M55_E2E_CLEAN_CAPTURE=1 node scripts/run-m55-e2e-clean-dev.mjs -p 3000
 *
 * Starts `next dev` under the clean-capture env so next.config.mjs applies
 * `devIndicators: false` and Clerk keyless UI is never created.
 * Never prints secret values.
 */
import { spawn } from 'node:child_process';
import { buildCleanCaptureServerEnv } from './m55-e2e-clean-capture-env.mjs';

// Accept either `... clean-dev.mjs -p 3023` or `... clean-dev.mjs -- -p 3023`.
const rawArgs = process.argv.slice(2);
const passthrough = rawArgs[0] === '--' ? rawArgs.slice(1) : rawArgs;
const env = buildCleanCaptureServerEnv({
  ...process.env,
  M55_E2E_CLEAN_CAPTURE: '1',
});

console.log(
  JSON.stringify({
    ok: true,
    cleanCapture: true,
    keylessDisabled: env.NEXT_PUBLIC_CLERK_KEYLESS_DISABLED === '1',
    nextDevIndicatorDisabled: env.NEXT_DISABLE_DEV_INDICATOR === '1',
    publishableKeyLen: String(env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || '').length,
    secretKeyLen: String(env.CLERK_SECRET_KEY || '').length,
    args: passthrough,
  }),
);

const child = spawn('npm', ['run', 'dev', '--', ...passthrough], {
  env,
  stdio: 'inherit',
  shell: process.platform === 'win32',
});

child.on('exit', (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  process.exit(code ?? 1);
});
