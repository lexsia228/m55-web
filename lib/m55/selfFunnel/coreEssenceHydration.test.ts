import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, it } from 'node:test';
import { ProfileRepository } from '../../soul/profile';
import { hydrateCoreEssenceFromStore } from './coreEssenceHydration';

const DEVICE_ID = 'test-core-hydration-device';
const CLERK_ID = 'user_core_hydration_test';
const local = new Map<string, string>();
const session = new Map<string, string>();

function storageAdapter(values: Map<string, string>) {
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  };
}

function installBrowserGlobals(): void {
  Object.defineProperty(globalThis, 'window', {
    value: {},
    configurable: true,
    writable: true,
  });
  Object.defineProperty(globalThis, 'localStorage', {
    value: storageAdapter(local),
    configurable: true,
    writable: true,
  });
  Object.defineProperty(globalThis, 'sessionStorage', {
    value: storageAdapter(session),
    configurable: true,
    writable: true,
  });
  Object.defineProperty(globalThis, 'fetch', {
    value: async () => ({
      ok: true,
      json: async () => ({ ok: true }),
    }),
    configurable: true,
    writable: true,
  });
}

describe('/core owner-scoped hydration', () => {
  beforeEach(() => {
    local.clear();
    session.clear();
    local.set('m55_device_id_v1', DEVICE_ID);
    installBrowserGlobals();
  });

  afterEach(() => {
    local.clear();
    session.clear();
  });

  it('loads an authenticated profile from the same Clerk owner used by intake', () => {
    ProfileRepository.save(CLERK_ID, {
      nickname: 'authenticated',
      birthDate: '1992-12-19',
    });

    assert.equal(ProfileRepository.get(null), null);
    assert.equal(ProfileRepository.get(CLERK_ID)?.birthDate, '1992-12-19');
    assert.equal(hydrateCoreEssenceFromStore(CLERK_ID).uxPhase, 'QUESTIONNAIRE');

    const panel = readFileSync(
      join(process.cwd(), 'components/core/CoreEssencePanel.tsx'),
      'utf8',
    );
    assert.match(panel, /hydrateCoreEssenceFromStore\(ownerId\)/);
  });

  it('keeps the guest profile on the null-owner device path', () => {
    ProfileRepository.save(null, {
      nickname: 'guest',
      birthDate: '1983-02-28',
    });

    assert.equal(ProfileRepository.get(null)?.birthDate, '1983-02-28');
    assert.equal(hydrateCoreEssenceFromStore(null).uxPhase, 'QUESTIONNAIRE');
    assert.equal(ProfileRepository.get(CLERK_ID), null);
  });
});
