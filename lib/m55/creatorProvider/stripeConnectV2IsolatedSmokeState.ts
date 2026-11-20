import { mkdirSync, readFileSync, writeFileSync, chmodSync, existsSync } from 'node:fs';
import { join } from 'node:path';

export type IsolatedSmokePersistedStateV1 = {
  economicIdentityId: string;
  stripeAccountId: string;
  createIdempotencyKey: string;
  updatedAtUtc: string;
};

export function isolatedSmokeStateDirV1(cwd: string = process.cwd()): string {
  return join(cwd, '.m55_r8_stripe_connect_isolated');
}

export function isolatedSmokeStatePathV1(cwd: string = process.cwd()): string {
  return join(isolatedSmokeStateDirV1(cwd), 'state.json');
}

export function isolatedSmokeOnboardingUrlPathV1(cwd: string = process.cwd()): string {
  return join(isolatedSmokeStateDirV1(cwd), 'onboarding.url');
}

export function loadIsolatedSmokeStateV1(cwd: string = process.cwd()): IsolatedSmokePersistedStateV1 | null {
  const path = isolatedSmokeStatePathV1(cwd);
  if (!existsSync(path)) return null;
  try {
    const parsed = JSON.parse(readFileSync(path, 'utf8')) as IsolatedSmokePersistedStateV1;
    if (!parsed?.stripeAccountId || !parsed?.economicIdentityId) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveIsolatedSmokeStateV1(
  state: IsolatedSmokePersistedStateV1,
  cwd: string = process.cwd(),
): void {
  const dir = isolatedSmokeStateDirV1(cwd);
  mkdirSync(dir, { recursive: true, mode: 0o700 });
  const path = isolatedSmokeStatePathV1(cwd);
  writeFileSync(path, `${JSON.stringify(state, null, 2)}\n`, { mode: 0o600 });
  chmodSync(path, 0o600);
}

export function writeIsolatedSmokeOnboardingUrlForHumanV1(url: string, cwd: string = process.cwd()): string {
  const dir = isolatedSmokeStateDirV1(cwd);
  mkdirSync(dir, { recursive: true, mode: 0o700 });
  const path = isolatedSmokeOnboardingUrlPathV1(cwd);
  writeFileSync(path, `${url.trim()}\n`, { mode: 0o600 });
  chmodSync(path, 0o600);
  return path;
}
