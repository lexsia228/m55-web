/**
 * M55 SOUL REPOSITORY (Local-First Memory)
 * - LocalStorage persistence (client only)
 * - Guest device id support
 * - Retention window by plan (SSOT-aligned default):
 * FREE: 7d / STANDARD: 30d / PREMIUM: 90d
 *
 * NOTE:
 * This module does NOT touch PurchaseCache and does NOT use URL-based context injection.
 */
import { HeartLog, UserPlan } from './types';

const KEY_HEART_LOG = 'm55_heart_log_v1';
const KEY_BOOST_BAL = 'm55_boost_balance_v1';
const KEY_DEVICE_ID = 'm55_device_id_v1';

function isClient(): boolean {
  return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
}

function getDeviceId(): string {
  if (!isClient()) return 'server-guest';
  try {
    let id = localStorage.getItem(KEY_DEVICE_ID);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(KEY_DEVICE_ID, id);
    }
    return id;
  } catch {
    return 'guest-fallback';
  }
}

function safeJsonParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try { return JSON.parse(raw) as T; } catch { return fallback; }
}

function retentionDays(plan: UserPlan): number {
  switch (plan) {
    case 'PREMIUM': return 90;
    case 'STANDARD': return 30;
    case 'FREE':
    default: return 7;
  }
}

function withinDays(iso: string, days: number): boolean {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return false;
  const now = Date.now();
  const windowMs = days * 24 * 60 * 60 * 1000;
  return (now - t) <= windowMs;
}

export const HeartLogRepository = {
  save: (userId: string | null | undefined, log: Omit<HeartLog, 'id' | 'user_id' | 'created_at'>): HeartLog => {
    const uid = userId || getDeviceId();
    const newLog: HeartLog = {
      ...log,
      id: crypto.randomUUID(),
      user_id: uid,
      created_at: new Date().toISOString(),
    };

    if (!isClient()) return newLog;

    const cur = HeartLogRepository.getAllRaw();
    const next = [newLog, ...cur];

    try {
      localStorage.setItem(KEY_HEART_LOG, JSON.stringify(next));
    } catch (e) {
      console.error('[M55] HeartLog save failed', e);
    }
    return newLog;
  },

  getAllRaw: (): HeartLog[] => {
    if (!isClient()) return [];
    return safeJsonParse<HeartLog[]>(localStorage.getItem(KEY_HEART_LOG), []);
  },

  getAuthorizedLogs: (userId: string | null | undefined, plan: UserPlan): HeartLog[] => {
    const uid = userId || getDeviceId();
    const days = retentionDays(plan);
    const all = HeartLogRepository.getAllRaw();
    const mine = all.filter(l => l.user_id === uid);
    return mine.filter(l => withinDays(l.created_at, days));
  }
};

export const BoostRepository = {
  getBalance: (userId: string | null | undefined): number => {
    if (!isClient()) return 0;
    const uid = userId || getDeviceId();
    const raw = localStorage.getItem(`${KEY_BOOST_BAL}_${uid}`);
    const n = raw ? parseInt(raw, 10) : 0;
    return Number.isFinite(n) ? n : 0;
  },

  add: (userId: string | null | undefined, amount: number): number => {
    if (!isClient()) return 0;
    const uid = userId || getDeviceId();
    const cur = BoostRepository.getBalance(uid);
    const next = Math.max(0, cur + amount);
    try {
      localStorage.setItem(`${KEY_BOOST_BAL}_${uid}`, String(next));
    } catch (e) {
      console.error('[M55] Boost save failed', e);
    }
    return next;
  }
};
