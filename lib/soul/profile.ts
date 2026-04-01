/**
 * M55 PROFILE REPOSITORY (Local-first)
 * - Stores nickname + birthDate locally (no server DB)
 * - Works for both Clerk user and Guest (device id)
 * - No URL-based injection
 */
export type BirthProfile = {
  nickname: string;
  birthDate: string; // YYYY-MM-DD
};

const KEY_DEVICE_ID = 'm55_device_id_v1';
const KEY_PROFILE_PREFIX = 'm55_profile_v1_';
const KEY_DISMISS_PREFIX = 'm55_profile_dismissed_';

function isClient(): boolean {
  return typeof window !== 'undefined';
}

function getOrCreateDeviceId(): string {
  if (!isClient()) return 'server-guest';
  try {
    let id = localStorage.getItem(KEY_DEVICE_ID);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(KEY_DEVICE_ID, id);
    }
    return id;
  } catch {
    return 'fallback-guest-id';
  }
}

function resolveOwnerId(userId: string | null | undefined): string {
  return userId && userId.length > 0 ? userId : getOrCreateDeviceId();
}

function todayKey(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export const ProfileRepository = {
  getOwnerId: (userId?: string | null) => resolveOwnerId(userId),

  get: (userId?: string | null): BirthProfile | null => {
    if (!isClient()) return null;
    const ownerId = resolveOwnerId(userId);
    const key = KEY_PROFILE_PREFIX + ownerId;
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    try { return JSON.parse(raw) as BirthProfile; } catch { return null; }
  },

  save: (userId: string | null | undefined, profile: BirthProfile): void => {
    if (!isClient()) return;
    const ownerId = resolveOwnerId(userId);
    const key = KEY_PROFILE_PREFIX + ownerId;
    localStorage.setItem(key, JSON.stringify(profile));
    localStorage.removeItem(KEY_DISMISS_PREFIX + ownerId);
    if (!userId) {
      try {
        localStorage.setItem('m55_profile_v1', JSON.stringify({ nickname: profile.nickname, birthDateISO: profile.birthDate }));
      } catch {
        /* no-op */
      }
    }
  },

  exists: (userId?: string | null): boolean => {
    return !!ProfileRepository.get(userId);
  },

  dismissForToday: (userId?: string | null): void => {
    if (!isClient()) return;
    const ownerId = resolveOwnerId(userId);
    localStorage.setItem(KEY_DISMISS_PREFIX + ownerId, todayKey());
  },

  isDismissedToday: (userId?: string | null): boolean => {
    if (!isClient()) return false;
    const ownerId = resolveOwnerId(userId);
    return localStorage.getItem(KEY_DISMISS_PREFIX + ownerId) === todayKey();
  }
};