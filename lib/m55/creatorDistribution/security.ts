import 'server-only';
import { auth } from '@clerk/nextjs/server';

export async function requireCreatorUserId(): Promise<string | null> {
  const { userId } = await auth();
  return userId || null;
}

export function reviewerAllowed(userId: string | null, raw = process.env.M55_CREATOR_REVIEWER_USER_IDS): boolean {
  if (!userId || !raw?.trim()) return false;
  return raw.split(',').map((value) => value.trim()).filter(Boolean).includes(userId);
}

export async function requireReviewerId(): Promise<string | null> {
  const userId = await requireCreatorUserId();
  return reviewerAllowed(userId) ? userId : null;
}

export function canonicalPublicMediaUrl(value: string): string | null {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password || url.port) return null;
    const host = url.hostname.toLowerCase();
    if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local') ||
        /^\d+\.\d+\.\d+\.\d+$/.test(host) || host.includes(':') || !host.includes('.')) return null;
    url.hash = '';
    return url.toString();
  } catch { return null; }
}

export const PRIVATE_RESPONSE_HEADERS = { 'Cache-Control': 'private, no-store, max-age=0' };
