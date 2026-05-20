/**
 * M55 ops notification helper (AS-B4).
 * Stateless: no DB, Stripe, Clerk, or payment calls.
 * Sends only when M55_OPS_NOTIFY_ENABLED and M55_OPS_SLACK_WEBHOOK_URL are set.
 */
export type M55OpsSeverity = 'SEV-1' | 'SEV-2' | 'SEV-3' | 'SEV-4';

export type M55OpsNotifyResult = 'sent' | 'skipped' | 'disabled' | 'failed';

export type M55OpsNotifyEvent = {
  phase: string;
  environmentSafeLabel: string;
  severity: M55OpsSeverity;
  triggerCategory: string;
  countsOnlySummary: string;
  nextRecommendedGate: string;
  timestampSafeLabel: string;
  sourceSafeLabel: string;
  dedupeSafeKey?: string;
};

const ALLOWED_TOP_KEYS = new Set([
  'phase',
  'environmentSafeLabel',
  'severity',
  'triggerCategory',
  'countsOnlySummary',
  'nextRecommendedGate',
  'timestampSafeLabel',
  'sourceSafeLabel',
  'dedupeSafeKey',
]);

const PROHIBITED_KEY_NAMES = new Set([
  'user_id',
  'userid',
  'email',
  'session',
  'checkout_session_id',
  'payment_intent',
  'paymentintent',
  'event_id',
  'eventid',
  'stripe_event_id',
  'raw_metadata',
  'metadata',
  'raw_metadata_json',
  'secret',
  'token',
  'api_key',
  'webhook_secret',
  'stack',
  'stacktrace',
  'stack_trace',
]);

const PROHIBITED_VALUE_PATTERNS: RegExp[] = [
  /@/, // email-like
  /\bwhsec_/i,
  /\bsk_(live|test)_/i,
  /\bpk_(live|test)_/i,
  /\bcs_(live|test)_/i,
  /\bpi_(live|test)_/i,
  /\bevt_/i,
  /\bch_/i,
  /\buser_[a-z0-9]{8,}/i,
];

const SEVERITIES: ReadonlySet<string> = new Set(['SEV-1', 'SEV-2', 'SEV-3', 'SEV-4']);

const NOTIFY_TIMEOUT_MS = 3000;
const DEDUPE_COOLDOWN_MS = 5 * 60 * 1000;

const OPS_PHASE = '5Z-I-V-AS-B4';
const ENV_SAFE_LABEL = 'm55-soul-core';

/** Best-effort in-memory dedupe (serverless instance scope). */
const recentDedupe = new Map<string, number>();

export type M55OpsValidateResult =
  | { ok: true; event: M55OpsNotifyEvent }
  | { ok: false; reason: string };

function normalizeKey(key: string): string {
  return key.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase();
}

function isProhibitedKeyName(key: string): boolean {
  const n = normalizeKey(key);
  if (PROHIBITED_KEY_NAMES.has(n)) return true;
  if (n.includes('user_id') || n.includes('checkout') || n.includes('payment_intent')) return true;
  if (n.includes('secret') || n.includes('token')) return true;
  return false;
}

function stringHasProhibitedPattern(value: string): boolean {
  for (const re of PROHIBITED_VALUE_PATTERNS) {
    if (re.test(value)) return true;
  }
  return false;
}

function scanValue(value: unknown, depth: number): string | null {
  if (depth > 4) return 'nested_too_deep';
  if (value === null || value === undefined) return null;
  if (typeof value === 'string') {
    if (stringHasProhibitedPattern(value)) return 'prohibited_pattern_in_value';
    if (value.length > 2000) return 'value_too_long';
    return null;
  }
  if (typeof value === 'number' || typeof value === 'boolean') return null;
  if (Array.isArray(value)) {
    for (const item of value) {
      const err = scanValue(item, depth + 1);
      if (err) return err;
    }
    return null;
  }
  if (typeof value === 'object') {
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (isProhibitedKeyName(k)) return `prohibited_key:${k}`;
      const err = scanValue(v, depth + 1);
      if (err) return err;
    }
    return null;
  }
  return 'unsupported_value_type';
}

function isNotifyEnabled(): boolean {
  const raw = process.env.M55_OPS_NOTIFY_ENABLED?.trim().toLowerCase() ?? '';
  return raw === '1' || raw === 'true' || raw === 'yes';
}

function slackWebhookUrl(): string | null {
  const url = process.env.M55_OPS_SLACK_WEBHOOK_URL?.trim() ?? '';
  if (!url) return null;
  if (!url.startsWith('https://hooks.slack.com/')) return null;
  return url;
}

function utcDateBucket(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Safe enum fragment for counts-only summaries (no raw IDs). */
export function sanitizeM55OpsReasonFragment(input: string): string {
  const s = String(input ?? '')
    .slice(0, 120)
    .replace(/[^a-zA-Z0-9_.-]/g, '_');
  return s || 'unknown';
}

export function validateM55OpsNotifyEvent(input: unknown): M55OpsValidateResult {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return { ok: false, reason: 'not_object' };
  }

  const obj = input as Record<string, unknown>;
  for (const key of Object.keys(obj)) {
    if (!ALLOWED_TOP_KEYS.has(key)) {
      return { ok: false, reason: `unknown_key:${key}` };
    }
    if (isProhibitedKeyName(key)) {
      return { ok: false, reason: `prohibited_key:${key}` };
    }
  }

  const scanErr = scanValue(obj, 0);
  if (scanErr) return { ok: false, reason: scanErr };

  const severity = obj.severity;
  if (typeof severity !== 'string' || !SEVERITIES.has(severity)) {
    return { ok: false, reason: 'invalid_severity' };
  }

  const requiredStrings = [
    'phase',
    'environmentSafeLabel',
    'triggerCategory',
    'countsOnlySummary',
    'nextRecommendedGate',
    'timestampSafeLabel',
    'sourceSafeLabel',
  ] as const;

  for (const field of requiredStrings) {
    const v = obj[field];
    if (typeof v !== 'string' || !v.trim()) {
      return { ok: false, reason: `missing_${field}` };
    }
  }

  if (obj.dedupeSafeKey !== undefined) {
    if (typeof obj.dedupeSafeKey !== 'string' || !obj.dedupeSafeKey.trim()) {
      return { ok: false, reason: 'invalid_dedupeSafeKey' };
    }
    if (stringHasProhibitedPattern(obj.dedupeSafeKey)) {
      return { ok: false, reason: 'prohibited_pattern_in_dedupe' };
    }
  }

  const event: M55OpsNotifyEvent = {
    phase: String(obj.phase).trim(),
    environmentSafeLabel: String(obj.environmentSafeLabel).trim(),
    severity: severity as M55OpsSeverity,
    triggerCategory: String(obj.triggerCategory).trim(),
    countsOnlySummary: String(obj.countsOnlySummary).trim(),
    nextRecommendedGate: String(obj.nextRecommendedGate).trim(),
    timestampSafeLabel: String(obj.timestampSafeLabel).trim(),
    sourceSafeLabel: String(obj.sourceSafeLabel).trim(),
    ...(obj.dedupeSafeKey ? { dedupeSafeKey: String(obj.dedupeSafeKey).trim() } : {}),
  };

  return { ok: true, event };
}

export function buildM55OpsSlackPayload(event: M55OpsNotifyEvent): { text: string } {
  const lines = [
    `[M55 Ops] ${event.severity}`,
    `phase: ${event.phase}`,
    `environment: ${event.environmentSafeLabel}`,
    `trigger: ${event.triggerCategory}`,
    `source: ${event.sourceSafeLabel}`,
    `summary: ${event.countsOnlySummary}`,
    `next: ${event.nextRecommendedGate}`,
    `at: ${event.timestampSafeLabel}`,
  ];
  if (event.dedupeSafeKey) {
    lines.push(`dedupe: ${event.dedupeSafeKey}`);
  }
  return { text: lines.join('\n') };
}

function shouldSkipDedupe(dedupeSafeKey: string | undefined): boolean {
  if (!dedupeSafeKey) return false;
  const now = Date.now();
  const last = recentDedupe.get(dedupeSafeKey);
  if (last !== undefined && now - last < DEDUPE_COOLDOWN_MS) {
    return true;
  }
  recentDedupe.set(dedupeSafeKey, now);
  return false;
}

export async function notifyM55Ops(event: M55OpsNotifyEvent): Promise<M55OpsNotifyResult> {
  try {
    if (!isNotifyEnabled()) {
      return 'disabled';
    }

    const webhook = slackWebhookUrl();
    if (!webhook) {
      return 'disabled';
    }

    const validated = validateM55OpsNotifyEvent(event);
    if (!validated.ok) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('[m55OpsNotify] skipped=unsafe_payload', validated.reason);
      }
      return 'skipped';
    }

    const safeEvent = validated.event;
    if (shouldSkipDedupe(safeEvent.dedupeSafeKey)) {
      return 'skipped';
    }

    if (typeof fetch !== 'function') {
      return 'failed';
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), NOTIFY_TIMEOUT_MS);

    try {
      const res = await fetch(webhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildM55OpsSlackPayload(safeEvent)),
        signal: controller.signal,
      });
      if (!res.ok) {
        return 'failed';
      }
      return 'sent';
    } finally {
      clearTimeout(timer);
    }
  } catch {
    return 'failed';
  }
}

/** Never throws; safe for Stripe webhook / fulfillment paths. */
export function notifyM55OpsFireAndForget(event: M55OpsNotifyEvent): void {
  void notifyM55Ops(event);
}

export function m55OpsEventMissingClientReferenceId(): M55OpsNotifyEvent {
  return {
    phase: OPS_PHASE,
    environmentSafeLabel: ENV_SAFE_LABEL,
    severity: 'SEV-2',
    triggerCategory: 'missing_client_reference_id',
    countsOnlySummary: 'trigger=missing_client_reference_id',
    nextRecommendedGate: 'AS-B1-MONITOR',
    timestampSafeLabel: new Date().toISOString(),
    sourceSafeLabel: 'stripe-webhook',
    dedupeSafeKey: `webhook:missing_client_reference_id:${utcDateBucket()}`,
  };
}

export function m55OpsEventInternalProcessingFailed(reason: string): M55OpsNotifyEvent {
  const safeReason = sanitizeM55OpsReasonFragment(reason);
  return {
    phase: OPS_PHASE,
    environmentSafeLabel: ENV_SAFE_LABEL,
    severity: 'SEV-1',
    triggerCategory: 'internal_processing_failed',
    countsOnlySummary: `trigger=internal_processing_failed reason=${safeReason}`,
    nextRecommendedGate: 'AS-B1-MONITOR',
    timestampSafeLabel: new Date().toISOString(),
    sourceSafeLabel: 'stripe-webhook',
    dedupeSafeKey: `webhook:internal_processing_failed:${utcDateBucket()}:${safeReason}`,
  };
}

export function m55OpsEventSnapshotSkip(reason: string): M55OpsNotifyEvent {
  const safeReason = sanitizeM55OpsReasonFragment(reason);
  return {
    phase: OPS_PHASE,
    environmentSafeLabel: ENV_SAFE_LABEL,
    severity: 'SEV-1',
    triggerCategory: 'snapshot_skip',
    countsOnlySummary: `trigger=snapshot_skip reason=${safeReason}`,
    nextRecommendedGate: 'AS-B1-MONITOR',
    timestampSafeLabel: new Date().toISOString(),
    sourceSafeLabel: 'fulfill-dtr-core',
    dedupeSafeKey: `fulfill:snapshot_skip:${utcDateBucket()}:${safeReason}`,
  };
}
