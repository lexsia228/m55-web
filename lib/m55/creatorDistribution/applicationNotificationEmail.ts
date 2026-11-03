export type CreatorApplicationNotifyResult = 'sent' | 'skipped' | 'disabled' | 'failed';

export const CREATOR_APPLICATION_NOTIFY_SUBJECT = '【M55】新しいCreator応募が届きました';

export const CREATOR_APPLICATION_NOTIFY_BODY =
  '新しいCreator Affiliateの申請を受け付けました。審査画面: https://m-55.jp/internal/creator-review';

const RESEND_EMAILS_URL = 'https://api.resend.com/emails';
const NOTIFY_TIMEOUT_MS = 10_000;

/** Best-effort in-process success cache (serverless instance scope; not durable exactly-once). */
export const CREATOR_APPLICATION_NOTIFY_SUCCESS_CACHE_TTL_MS = 5 * 60 * 1000;
export const CREATOR_APPLICATION_NOTIFY_SUCCESS_CACHE_MAX = 256;

const APPLICATION_ID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type InFlightMap = Map<string, Promise<CreatorApplicationNotifyResult>>;
type SuccessExpiryMap = Map<string, number>;

const inFlightAttempts: InFlightMap = new Map();
const successExpiresAt: SuccessExpiryMap = new Map();

let successCacheMaxOverride: number | null = null;

export type CreatorApplicationNotifyEnv = {
  enabled?: string;
  notifyTo?: string;
  notifyFrom?: string;
  resendApiKey?: string;
};

export type CreatorApplicationNotifyDeps = {
  fetchImpl?: typeof fetch;
  env?: CreatorApplicationNotifyEnv;
  nowMs?: () => number;
};

export type AfterRegistrar = (fn: () => void | Promise<void>) => void;

function readEnv(overrides?: CreatorApplicationNotifyEnv): CreatorApplicationNotifyEnv {
  return {
    enabled: overrides?.enabled ?? process.env.M55_CREATOR_NOTIFY_ENABLED,
    notifyTo: overrides?.notifyTo ?? process.env.M55_CREATOR_NOTIFY_TO,
    notifyFrom: overrides?.notifyFrom ?? process.env.M55_CREATOR_NOTIFY_FROM,
    resendApiKey: overrides?.resendApiKey ?? process.env.RESEND_API_KEY,
  };
}

function nowMs(deps: CreatorApplicationNotifyDeps): number {
  return deps.nowMs?.() ?? Date.now();
}

function successCacheMax(): number {
  return successCacheMaxOverride ?? CREATOR_APPLICATION_NOTIFY_SUCCESS_CACHE_MAX;
}

function isNotifyEnabled(env: CreatorApplicationNotifyEnv): boolean {
  return env.enabled?.trim() === 'true';
}

function resolveRecipient(env: CreatorApplicationNotifyEnv): string | null {
  const to = env.notifyTo?.trim() ?? '';
  if (!to || !EMAIL_RE.test(to)) return null;
  return to;
}

function resolveSender(env: CreatorApplicationNotifyEnv): string | null {
  const from = env.notifyFrom?.trim() ?? '';
  if (!from || !EMAIL_RE.test(from)) return null;
  return from;
}

function resolveApiKey(env: CreatorApplicationNotifyEnv): string | null {
  const key = env.resendApiKey?.trim() ?? '';
  return key ? key : null;
}

function pruneSuccessCache(now: number): void {
  for (const [applicationId, expiresAt] of successExpiresAt) {
    if (expiresAt <= now) {
      successExpiresAt.delete(applicationId);
    }
  }
}

function recordSuccessfulSend(applicationId: string, now: number): void {
  pruneSuccessCache(now);
  successExpiresAt.set(applicationId, now + CREATOR_APPLICATION_NOTIFY_SUCCESS_CACHE_TTL_MS);
  while (successExpiresAt.size > successCacheMax()) {
    let deleted = false;
    for (const id of successExpiresAt.keys()) {
      if (id !== applicationId) {
        successExpiresAt.delete(id);
        deleted = true;
        break;
      }
    }
    if (!deleted) break;
  }
}

function hasActiveSuccess(applicationId: string, now: number): boolean {
  pruneSuccessCache(now);
  const expiresAt = successExpiresAt.get(applicationId);
  return expiresAt !== undefined && expiresAt > now;
}

export function creatorApplicationIdempotencyKey(applicationId: string): string {
  return `m55-creator-new-application/${applicationId}`;
}

export function buildCreatorApplicationResendPayload(from: string, to: string): {
  from: string;
  to: string[];
  subject: string;
  text: string;
} {
  return {
    from,
    to: [to],
    subject: CREATOR_APPLICATION_NOTIFY_SUBJECT,
    text: CREATOR_APPLICATION_NOTIFY_BODY,
  };
}

export function resetCreatorApplicationNotifyDedupeForTests(): void {
  inFlightAttempts.clear();
  successExpiresAt.clear();
  successCacheMaxOverride = null;
}

export function setCreatorApplicationNotifySuccessCacheMaxForTests(max: number | null): void {
  successCacheMaxOverride = max;
}

async function deliverCreatorApplicationNotification(
  applicationId: string,
  deps: CreatorApplicationNotifyDeps,
): Promise<CreatorApplicationNotifyResult> {
  if (!APPLICATION_ID_RE.test(applicationId)) {
    return 'skipped';
  }

  const env = readEnv(deps.env);
  if (!isNotifyEnabled(env)) {
    return 'disabled';
  }

  const to = resolveRecipient(env);
  const from = resolveSender(env);
  const apiKey = resolveApiKey(env);
  if (!to || !from || !apiKey) {
    return 'disabled';
  }

  const fetchImpl = deps.fetchImpl ?? fetch;
  if (typeof fetchImpl !== 'function') {
    return 'failed';
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), NOTIFY_TIMEOUT_MS);

  try {
    const res = await fetchImpl(RESEND_EMAILS_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': creatorApplicationIdempotencyKey(applicationId),
      },
      body: JSON.stringify(buildCreatorApplicationResendPayload(from, to)),
      signal: controller.signal,
    });
    if (!res.ok) {
      return 'failed';
    }
    return 'sent';
  } catch {
    return 'failed';
  } finally {
    clearTimeout(timer);
  }
}

export async function sendCreatorApplicationNotification(
  applicationId: string,
  deps: CreatorApplicationNotifyDeps = {},
): Promise<CreatorApplicationNotifyResult> {
  try {
    const now = nowMs(deps);
    if (hasActiveSuccess(applicationId, now)) {
      return 'skipped';
    }

    const existing = inFlightAttempts.get(applicationId);
    if (existing) {
      return existing;
    }

    const attempt = (async () => {
      const result = await deliverCreatorApplicationNotification(applicationId, deps);
      if (result === 'sent') {
        recordSuccessfulSend(applicationId, nowMs(deps));
      }
      return result;
    })();

    inFlightAttempts.set(applicationId, attempt);
    try {
      return await attempt;
    } finally {
      inFlightAttempts.delete(applicationId);
    }
  } catch {
    return 'failed';
  }
}

/**
 * Synchronously registers post-response delivery with Next.js after().
 * Caller must pass request-bound `after` from next/server (Route Handler active).
 */
export function registerCreatorApplicationNotificationAfterSuccess(
  applicationId: string,
  registerAfter: AfterRegistrar,
): void {
  try {
    registerAfter(async () => {
      await sendCreatorApplicationNotification(applicationId);
    });
  } catch {
    // Scheduling registration failed — applicant flow already succeeded; suppress only.
  }
}
