import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, it } from 'node:test';
import {
  hasCompleteCanonicalProfile,
  ProfileRepository,
  promoteGuestProfileToClerkUser,
} from './profile';

const DEVICE_ID = 'test-device-uuid-promote';
const CLERK_ID = 'user_clerk_promote_test';

const storage = new Map<string, string>();

function installBrowserGlobals(): void {
  Object.defineProperty(globalThis, 'window', {
    value: { dispatchEvent: () => true },
    configurable: true,
    writable: true,
  });
  Object.defineProperty(globalThis, 'localStorage', {
    value: {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
      removeItem: (key: string) => storage.delete(key),
    },
    configurable: true,
    writable: true,
  });
  Object.defineProperty(globalThis, 'fetch', {
    value: async () => ({ ok: true }),
    configurable: true,
    writable: true,
  });
}

function resetStorage(): void {
  storage.clear();
  storage.set('m55_device_id_v1', DEVICE_ID);
}

function clerkKey(): string {
  return `m55_profile_v1_${CLERK_ID}`;
}

function guestKey(): string {
  return `m55_profile_v1_${DEVICE_ID}`;
}

function readBirthDate(key: string): string | null {
  const raw = storage.get(key);
  if (!raw) return null;
  return (JSON.parse(raw) as { birthDate?: string }).birthDate ?? null;
}

describe('promoteGuestProfileToClerkUser — fill-empty-only', () => {
  beforeEach(() => {
    installBrowserGlobals();
    resetStorage();
  });

  afterEach(() => {
    storage.clear();
  });

  it('Test A: complete clerk profile is not overwritten by stale guest profile', () => {
    ProfileRepository.save(CLERK_ID, { nickname: 'mi', birthDate: '1992-12-19' });
    ProfileRepository.save(null, { nickname: 'tt', birthDate: '1983-02-28' });

    const promoted = promoteGuestProfileToClerkUser(CLERK_ID);

    assert.equal(promoted, false);
    assert.equal(readBirthDate(clerkKey()), '1992-12-19');
    assert.equal(readBirthDate(guestKey()), '1983-02-28');
  });

  it('Test B: empty clerk profile receives guest promote', () => {
    ProfileRepository.save(null, { nickname: 'mi', birthDate: '1992-12-19' });

    const promoted = promoteGuestProfileToClerkUser(CLERK_ID);

    assert.equal(promoted, true);
    assert.equal(readBirthDate(clerkKey()), '1992-12-19');
  });

  it('Test C: stale legacy flat key does not overwrite complete clerk profile', () => {
    ProfileRepository.save(CLERK_ID, { nickname: 'mi', birthDate: '1992-12-19' });
    storage.delete(guestKey());
    storage.set(
      'm55_profile_v1',
      JSON.stringify({ nickname: 'tt', birthDateISO: '1983-02-28' }),
    );

    const promoted = promoteGuestProfileToClerkUser(CLERK_ID);

    assert.equal(promoted, false);
    assert.equal(readBirthDate(clerkKey()), '1992-12-19');
  });

  it('hasCompleteCanonicalProfile is true when clerk birthDate exists', () => {
    ProfileRepository.save(CLERK_ID, { nickname: 'mi', birthDate: '1992-12-19' });
    assert.equal(hasCompleteCanonicalProfile(CLERK_ID), true);
    assert.equal(hasCompleteCanonicalProfile('user_missing'), false);
  });
});

describe('MyPanel profile save event', () => {
  it('Test D: handleSave dispatches m55:profile_updated', () => {
    const src = readFileSync(join(process.cwd(), 'components/my/MyPanel.tsx'), 'utf8');
    assert.match(src, /ProfileRepository\.save\(userId, p\)/);
    assert.match(src, /window\.dispatchEvent\(new Event\('m55:profile_updated'\)\)/);
  });
});
