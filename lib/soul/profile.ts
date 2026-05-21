/**
 * M55 PROFILE REPOSITORY (Local-first cache)
 * - Primary UX still reads/writes localStorage for instant UI
 * - Same values are synced to server draft via queueDtrDraftSync (DB SSOT for carry-over)
 */
import { queueDtrDraftSync } from '../m55/dtrDraftClientSync';
import { DEFAULT_COUNTRY, enrichBirthProfileForSave } from './birthProfileV2';
export type BirthProfile = {
  nickname: string;
  birthDate: string; // YYYY-MM-DD
  /** HH:mm or HH:mm:ss — optional when birthTimeUnknown */
  birthTime?: string | null;
  birthTimeUnknown?: boolean;
  /** ISO-3166 alpha-2; default JP on save */
  country?: string;
  birthplace?: string | null;
  timezone?: string | null;
  profileFormat?: 'legacy' | 'v2';
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
    const normalized = enrichBirthProfileForSave(profile);
    const ownerId = resolveOwnerId(userId);
    const key = KEY_PROFILE_PREFIX + ownerId;
    localStorage.setItem(key, JSON.stringify(normalized));
    localStorage.removeItem(KEY_DISMISS_PREFIX + ownerId);
    if (!userId) {
      try {
        localStorage.setItem(
          'm55_profile_v1',
          JSON.stringify({ nickname: normalized.nickname, birthDateISO: normalized.birthDate }),
        );
      } catch {
        /* no-op */
      }
    }
    queueDtrDraftSync(userId ?? null, {
      nickname: normalized.nickname,
      birthDate: normalized.birthDate,
      extraJson: {
        birthTime: normalized.birthTime ?? null,
        birthTimeUnknown: normalized.birthTimeUnknown ?? false,
        country: normalized.country ?? DEFAULT_COUNTRY,
        birthplace: normalized.birthplace ?? null,
        timezone: normalized.timezone ?? null,
        profileFormat: normalized.profileFormat ?? 'v2',
      },
    });
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
  },
};

/**
 * Post-purchase: copy device-local profile (free /core guest key) to Clerk user key.
 * Checkout leaves Clerk signed-in while localStorage still holds profile under device id.
 */
export function promoteGuestProfileToClerkUser(userId: string): boolean {
  if (!isClient() || !userId?.trim()) return false;
  const guestOwnerId = getOrCreateDeviceId();
  const clerkOwnerId = resolveOwnerId(userId);
  if (guestOwnerId === clerkOwnerId) return false;

  const guestKey = KEY_PROFILE_PREFIX + guestOwnerId;
  const raw = localStorage.getItem(guestKey);
  let guest: BirthProfile | null = null;
  if (raw) {
    try {
      guest = JSON.parse(raw) as BirthProfile;
    } catch {
      guest = null;
    }
  }
  if (!guest?.birthDate || !guest?.nickname?.trim()) {
    try {
      const leg = localStorage.getItem('m55_profile_v1');
      if (leg) {
        const j = JSON.parse(leg) as { nickname?: string; birthDateISO?: string };
        if (j.birthDateISO && j.nickname?.trim()) {
          guest = { nickname: j.nickname.trim(), birthDate: j.birthDateISO };
        }
      }
    } catch {
      /* no-op */
    }
  }
  if (!guest?.birthDate || !guest?.nickname?.trim()) return false;

  ProfileRepository.save(userId, {
    nickname: guest.nickname.trim(),
    birthDate: guest.birthDate,
  });
  return true;
}