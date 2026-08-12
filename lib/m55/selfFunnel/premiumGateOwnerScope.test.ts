import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, it } from 'node:test';
import { ProfileRepository } from '../../soul/profile';
import {
  readSelfFunnelStage,
  writePersistedFunnel,
} from './selfFunnelClientStore';
import {
  commitFreeResult,
  emptyPersistedFunnel,
  resolveDtrLpGate,
} from './selfFunnelRuntimeState';

const DEVICE_ID = 'test-premium-gate-device';
const CLERK_ID = 'user_premium_gate_test';
const BASIC = {
  nickname: 'authenticated',
  birthDate: '1992-12-19',
};
const COMPLETE_ANSWERS = {
  'free.start_style': 'free.start_style.map_first',
  'free.decision_style': 'free.decision_style.deadline_first',
  'free.recovery_style': 'free.recovery_style.shrink_task',
  'free.distance_style': 'free.distance_style.solo_reset',
  'free.change_style': 'free.change_style.adjust_fast',
  'free.primary_theme': 'free.primary_theme.report_preview',
};
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
}

function writeCompletedFreeResult(): void {
  const committed = commitFreeResult(
    emptyPersistedFunnel(),
    BASIC,
    COMPLETE_ANSWERS,
  );
  assert.ok(committed);
  writePersistedFunnel(committed);
}

describe('/dtr/lp owner-scoped prerequisite gate', () => {
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

  it('recognizes an authenticated owner with a completed free result', () => {
    ProfileRepository.save(CLERK_ID, BASIC);
    writeCompletedFreeResult();

    assert.equal(ProfileRepository.get(null), null);
    assert.equal(
      resolveDtrLpGate(readSelfFunnelStage(CLERK_ID)),
      'paid_questions',
    );
    assert.equal(resolveDtrLpGate(readSelfFunnelStage(null)), 'need_free');

    const prep = readFileSync(
      join(process.cwd(), 'components/dtr/DtrPaidPurchasePrep.tsx'),
      'utf8',
    );
    assert.match(prep, /const \{ user, isLoaded \} = useUser\(\)/);
    assert.match(prep, /const ownerId = user\?\.id \?\? null/);
    assert.match(prep, /resolveInitialGate\(ownerId\)/);
    assert.match(prep, /readSelfFunnelStage\(ownerId\)/);
    assert.doesNotMatch(prep, /readSelfFunnelStage\(null\)/);
  });

  it('keeps an authenticated owner without the free prerequisite gated', () => {
    ProfileRepository.save(CLERK_ID, BASIC);

    assert.equal(
      resolveDtrLpGate(readSelfFunnelStage(CLERK_ID)),
      'need_free',
    );
  });

  it('preserves the guest null-owner prerequisite path', () => {
    ProfileRepository.save(null, {
      nickname: 'guest',
      birthDate: '1983-02-28',
    });
    const committed = commitFreeResult(
      emptyPersistedFunnel(),
      {
        nickname: 'guest',
        birthDate: '1983-02-28',
      },
      COMPLETE_ANSWERS,
    );
    assert.ok(committed);
    writePersistedFunnel(committed);

    assert.equal(
      resolveDtrLpGate(readSelfFunnelStage(null)),
      'paid_questions',
    );
    assert.equal(ProfileRepository.get(CLERK_ID), null);
  });
});
