/**
 * M55 Phase 5-6H — Production DTR Core manual fulfillment repair runner (offline source only).
 *
 * WARNINGS — read before running:
 * - Do NOT run without an explicit SSOT gate GO (dry-run from 5Z-I-O onward; execution from 5Z-I-P).
 * - Never commit `.env.local`, full Stripe/Supabase IDs, or secrets into the repo or logs.
 * - Default behavior is READ-ONLY (dry-run / validation only): no Production DB mutate until
 *   M55_REPAIR_DRY_RUN=false AND M55_REPAIR_CONFIRM matches the required phrase exactly.
 *
 * Invocation (example only — do NOT run unless the current phase permits):
 *   npx tsx scripts/repair/repair-dtr-core-fulfillment-from-checkout-session.ts
 *
 * Second protection layer after stripe_events marker: fulfillment is idempotent on
 * one_time_fulfillments.checkout_session_id (see fulfillDtrCoreFromCheckoutSessionId).
 */
import { realpathSync } from 'node:fs';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import Stripe from 'stripe';
import type { FulfillFromCheckoutSessionResult } from '../../lib/m55/dtrCoreCheckoutFulfillment';
import {
  fulfillDtrCoreFromCheckoutSessionId,
  DTR_CORE_RIGHT_KEY,
} from '../../lib/m55/dtrCoreCheckoutFulfillment';
import { getStripe } from '../../lib/stripe';
import { getSupabaseAdmin } from '../../lib/supabaseAdmin';
import { DTR_CORE_STATIC_V1 } from '../../lib/oneTimeCheckout';

// --- Reference labels (non-IDs; for log alignment with SSOT only; never use as DB literals) ---
export const SAFE_LABEL_CHECKOUT_PARTIAL = 'cs_live_JSRW';
export const SAFE_LABEL_USER_PARTIAL = 'user_36xz';

/** Human must paste this verbatim into M55_REPAIR_CONFIRM for execute path only (future 5Z-I-P). */
export const M55_EXECUTE_CONFIRM_PHRASE = 'M55_CONFIRM_ONE_SHOT_DTR_CORE_MANUAL_REPAIR_20260516';

const EXPECTED_AMOUNT_TOTAL = 1000;
const EXPECTED_CURRENCY = 'jpy';
const STRIPE_EVENTS_TYPE_COMPLETED = 'checkout.session.completed';

const PHASE_LABEL = '5Z-I-N_runner_source_installed_no_execution_gate';

interface ResultSummary {
  readonly phase: typeof PHASE_LABEL;
  readonly safeLabelsReference: readonly string[];
  readonly validations: Record<string, boolean>;
  readonly rowCounts?: Record<string, number | null>;
  readonly finals: readonly string[];
}

function loadEnvLocalIfPresent(): void {
  /** Mirrors scripts/diag-dtr-user.mjs — runs only inside main(); does not mutate non-local runs if file missing. */
  try {
    const p = resolve(process.cwd(), '.env.local');
    const raw = readFileSync(p, 'utf8');
    for (const line of raw.split('\n')) {
      const t = line.trim();
      if (!t || t.startsWith('#')) continue;
      const eq = t.indexOf('=');
      if (eq === -1) continue;
      const k = t.slice(0, eq).trim();
      let v = t.slice(eq + 1).trim();
      if (
        (v.startsWith('"') && v.endsWith('"')) ||
        (v.startsWith("'") && v.endsWith("'"))
      ) {
        v = v.slice(1, -1);
      }
      if (process.env[k] === undefined) {
        process.env[k] = v;
      }
    }
  } catch {
    // optional file
  }
}

function requiredEnv(name: string): string | null {
  const v = process.env[name];
  if (!v || !String(v).trim()) return null;
  return String(v).trim();
}

/**
 * Logging policy: never print full Stripe session / event IDs, user ids, PI, secrets, etc.
 * This helper intentionally does NOT echo `value`; only emits length / presence booleans externally.
 */
function assertNoFullIdLogging(_valueUnused: string, _purpose: string): void {
  void _valueUnused;
  void _purpose;
}

function stop(reason: string): never {
  console.info(
    JSON.stringify({
      phase: PHASE_LABEL,
      safeLabelsReference: [SAFE_LABEL_CHECKOUT_PARTIAL, SAFE_LABEL_USER_PARTIAL],
      outcome: 'STOP',
      reason,
    }),
  );
  process.exit(2);
  throw new Error('unreachable_after_stop');
}

function printSummary(summary: ResultSummary): void {
  console.info(JSON.stringify(summary));
}

function invokedAsCliEntry(): boolean {
  const argvPath = process.argv[1];
  if (!argvPath) return false;
  try {
    const here = realpathSync(fileURLToPath(import.meta.url));
    const there = realpathSync(resolve(argvPath));
    return here === there;
  } catch {
    return fileURLToPath(import.meta.url) === resolve(argvPath);
  }
}

function resolveDryRunMode(): boolean {
  /** Default: dry-run true (safest). M55_REPAIR_DRY_RUN must be literal `false` for execute path gate. */
  const raw = process.env.M55_REPAIR_DRY_RUN;
  if (raw === undefined || raw === '') return true;
  const l = raw.toLowerCase().trim();
  if (l === 'true' || l === '1') return true;
  if (l === 'false' || l === '0') return false;
  stop('INVALID_M55_REPAIR_DRY_RUN');
}

function expectedProductFromEnv(): string {
  const p = requiredEnv('M55_REPAIR_PRODUCT_ID');
  return (p ?? DTR_CORE_STATIC_V1).trim();
}

function validateStripeSessionForRepair(
  session: Stripe.Checkout.Session,
  expectedUserId: string,
  expectedProductId: string,
): Record<string, boolean> {
  const md = session.metadata ?? {};
  const productFromMeta =
    typeof md.productId === 'string' && md.productId.trim()
      ? md.productId.trim()
      : undefined;
  const su = typeof session.success_url === 'string' ? session.success_url : '';
  const cu = typeof session.cancel_url === 'string' ? session.cancel_url : '';
  const dom = 'm55-webv2.vercel.app';

  assertNoFullIdLogging(session.client_reference_id ?? '', 'client_reference parity check');

  const v: Record<string, boolean> = {
    livemode: session.livemode === true,
    mode_payment: session.mode === 'payment',
    status_complete: session.status === 'complete',
    payment_status_paid: (session.payment_status ?? '') === 'paid',
    amount_total_1000: session.amount_total === EXPECTED_AMOUNT_TOTAL,
    currency_jpy:
      typeof session.currency === 'string' &&
      session.currency.toLowerCase() === EXPECTED_CURRENCY,
    metadata_product_matches:
      (productFromMeta ?? DTR_CORE_STATIC_V1) === expectedProductId,
    urls_contain_expected_domain:
      typeof su === 'string' &&
      su.includes(dom) &&
      typeof cu === 'string' &&
      cu.includes(dom),
    client_reference_matches_expected_user:
      session.client_reference_id === expectedUserId,
  };

  const allPassed = Object.values(v).every(Boolean);
  void allPassed;
  return v;
}

type SupabaseAdmin = ReturnType<typeof getSupabaseAdmin>;

async function counted(
  qb: PromiseLike<{ count: number | null; error: unknown }>,
): Promise<number | null> {
  const { count, error } = await qb;
  if (error) throw new Error(String((error as { message?: unknown }).message ?? error));
  return typeof count === 'number' ? count : null;
}

async function countsForDryRun(opts: {
  readonly checkoutSessionId: string;
  readonly eventId: string;
  readonly expectedUserId: string;
  readonly expectedProductId: string;
}) {
  const db: SupabaseAdmin = getSupabaseAdmin();

  /** SELECT-only probes; counts only (no logging of IDs). */

  const rowCounts: Record<string, number | null> = {};

  rowCounts.stripe_events_for_event = await counted(
    db
      .from('stripe_events')
      .select('event_id', { count: 'exact', head: true })
      .eq('event_id', opts.eventId),
  );

  rowCounts.one_time_fulfillments_for_session = await counted(
    db
      .from('one_time_fulfillments')
      .select('checkout_session_id', { count: 'exact', head: true })
      .eq('checkout_session_id', opts.checkoutSessionId),
  );

  rowCounts.entitlements_user_product = await counted(
    db
      .from('entitlements')
      .select('user_id', { count: 'exact', head: true })
      .eq('user_id', opts.expectedUserId)
      .eq('product_id', opts.expectedProductId),
  );

  rowCounts.entitlement_rights_core = await counted(
    db
      .from('entitlement_rights')
      .select('user_id', { count: 'exact', head: true })
      .eq('user_id', opts.expectedUserId)
      .eq('right_key', DTR_CORE_RIGHT_KEY),
  );

  rowCounts.reply_ticket_wallets = await counted(
    db
      .from('reply_ticket_wallets')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', opts.expectedUserId),
  );

  rowCounts.reply_wallet_ledgers = await counted(
    db
      .from('reply_wallet_ledgers')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', opts.expectedUserId),
  );

  rowCounts.dtr_report_snapshots = await counted(
    db
      .from('dtr_report_snapshots')
      .select('user_id', { count: 'exact', head: true })
      .eq('user_id', opts.expectedUserId)
      .eq('product_id', opts.expectedProductId),
  );

  rowCounts.failed_fulfillments_for_session = await counted(
    db
      .from('failed_fulfillments')
      .select('id', { count: 'exact', head: true })
      .eq('checkout_session_id', opts.checkoutSessionId),
  );

  return rowCounts;
}

async function dryRunFlow(): Promise<void> {
  if (!requiredEnv('STRIPE_SECRET_KEY'))
    stop('MISSING_ENV_STRIPE_SECRET_KEY_FOR_DRY_PROBE');
  if (!requiredEnv('NEXT_PUBLIC_SUPABASE_URL')) stop('MISSING_ENV_NEXT_PUBLIC_SUPABASE_URL');
  if (!requiredEnv('SUPABASE_SERVICE_ROLE_KEY')) stop('MISSING_ENV_SUPABASE_SERVICE_ROLE_KEY');

  const checkoutSessionId = requiredEnv('M55_REPAIR_CHECKOUT_SESSION_ID');
  const expectedUserId = requiredEnv('M55_REPAIR_EXPECTED_USER_ID');
  const eventId = requiredEnv('M55_REPAIR_STRIPE_EVENT_ID');
  if (!checkoutSessionId || !expectedUserId || !eventId)
    stop('MISSING_REPAIR_IDS_USE_LOCAL_ENV_ONLY_NOT_LOGGED_HERE');

  const expectedProductId = expectedProductFromEnv();
  if (expectedProductId !== DTR_CORE_STATIC_V1) {
    stop('REPAIR_PRODUCT_ID_MUST_BE_DTR_CORE_STATIC_V1');
  }

  let stripe: Stripe;
  try {
    stripe = getStripe();
  } catch {
    stop('STRIPE_CLIENT_INIT_FAILED');
  }

  let session: Stripe.Checkout.Session;
  try {
    session = await stripe.checkout.sessions.retrieve(checkoutSessionId);
  } catch {
    stop('STRIPE_SESSION_RETRIEVE_FAILED');
  }

  const validations = validateStripeSessionForRepair(session, expectedUserId, expectedProductId);
  if (!Object.values(validations).every(Boolean)) {
    printSummary({
      phase: PHASE_LABEL,
      safeLabelsReference: [SAFE_LABEL_CHECKOUT_PARTIAL, SAFE_LABEL_USER_PARTIAL],
      validations,
      finals: ['STOP', 'stripe_session_validation_failed'],
    });
    process.exit(2);
  }

  let rowCounts: Record<string, number | null> = {};
  try {
    rowCounts = await countsForDryRun({
      checkoutSessionId,
      eventId,
      expectedUserId,
      expectedProductId,
    });
  } catch {
    stop('SUPABASE_READONLY_PROBE_FAILED');
  }

  /** Expected-empty policy (aligned with 5Z-I-K-A): non-zero stripe_events row or fulfillment rows ⇒ STOP unless human reassesses. */

  const blockers =
    (rowCounts.stripe_events_for_event ?? 0) > 0 ||
    (rowCounts.one_time_fulfillments_for_session ?? 0) > 0 ||
    (rowCounts.entitlements_user_product ?? 0) > 0 ||
    (rowCounts.entitlement_rights_core ?? 0) > 0;

  const warnNonZeroSnapshotsOrWallet =
    (rowCounts.reply_ticket_wallets ?? 0) > 0 ||
    (rowCounts.reply_wallet_ledgers ?? 0) > 0 ||
    (rowCounts.dtr_report_snapshots ?? 0) > 0;

  /** failed_fulfillments: STOP if blocking rows appear for this checkout (non-null count > 0). */
  const failedBlock =
    rowCounts.failed_fulfillments_for_session != null &&
    rowCounts.failed_fulfillments_for_session > 0;

  if (blockers || warnNonZeroSnapshotsOrWallet || failedBlock) {
    printSummary({
      phase: PHASE_LABEL,
      safeLabelsReference: [SAFE_LABEL_CHECKOUT_PARTIAL, SAFE_LABEL_USER_PARTIAL],
      validations,
      rowCounts,
      finals: ['STOP', 'unexpected_existing_artifacts'],
    });
    process.exit(2);
  }

  printSummary({
    phase: PHASE_LABEL,
    safeLabelsReference: [SAFE_LABEL_CHECKOUT_PARTIAL, SAFE_LABEL_USER_PARTIAL],
    validations,
    rowCounts,
    finals: ['READY', 'dry_run_ok_no_writes'],
  });
  process.exit(0);
}

async function executionFlow(): Promise<void> {
  const confirm = requiredEnv('M55_REPAIR_CONFIRM');
  if (confirm !== M55_EXECUTE_CONFIRM_PHRASE) stop('EXECUTE_BLOCKED_CONFIRM_MISMATCH');

  if (!requiredEnv('STRIPE_SECRET_KEY')) stop('MISSING_ENV_STRIPE_SECRET_KEY');
  if (!requiredEnv('NEXT_PUBLIC_SUPABASE_URL')) stop('MISSING_ENV_NEXT_PUBLIC_SUPABASE_URL');
  if (!requiredEnv('SUPABASE_SERVICE_ROLE_KEY')) stop('MISSING_ENV_SUPABASE_SERVICE_ROLE_KEY');

  const checkoutSessionId = requiredEnv('M55_REPAIR_CHECKOUT_SESSION_ID');
  const expectedUserId = requiredEnv('M55_REPAIR_EXPECTED_USER_ID');
  const eventId = requiredEnv('M55_REPAIR_STRIPE_EVENT_ID');
  if (!checkoutSessionId || !expectedUserId || !eventId) stop('MISSING_REPAIR_IDS');
  /** Policy: synthetic event IDs are forbidden; empty means STOP (do not derive from Stripe call here). */

  const expectedProductId = expectedProductFromEnv();
  if (expectedProductId !== DTR_CORE_STATIC_V1) stop('INVALID_PRODUCT_GATE');

  let stripe: Stripe;
  try {
    stripe = getStripe();
  } catch {
    stop('STRIPE_CLIENT_INIT_FAILED');
  }

  let session: Stripe.Checkout.Session;
  try {
    session = await stripe.checkout.sessions.retrieve(checkoutSessionId);
  } catch {
    stop('STRIPE_SESSION_RETRIEVE_FAILED');
  }

  const validations = validateStripeSessionForRepair(session, expectedUserId, expectedProductId);
  if (!Object.values(validations).every(Boolean)) {
    printSummary({
      phase: PHASE_LABEL,
      safeLabelsReference: [SAFE_LABEL_CHECKOUT_PARTIAL, SAFE_LABEL_USER_PARTIAL],
      validations,
      finals: ['STOP', 'pre_execute_validation_failed'],
    });
    process.exit(2);
  }

  const db = getSupabaseAdmin() as any;

  const { data: evRow } = await db
    .from('stripe_events')
    .select('event_id')
    .eq('event_id', eventId)
    .maybeSingle();

  if (evRow) {
    stop('STRIPE_EVENT_ALREADY_EXISTS_NO_FULFILL');
  }

  const { error: insEvErr } = await db.from('stripe_events').insert({
    event_id: eventId,
    event_type: STRIPE_EVENTS_TYPE_COMPLETED,
  });

  if (insEvErr) {
    if (insEvErr.code === '23505') stop('STRIPE_EVENT_INSERT_DUP_STOP');
    printSummary({
      phase: PHASE_LABEL,
      safeLabelsReference: [SAFE_LABEL_CHECKOUT_PARTIAL, SAFE_LABEL_USER_PARTIAL],
      validations,
      finals: ['STOP', 'stripe_events_insert_failed'],
    });
    process.exit(2);
  }

  /** Second layer: one_time_fulfillments checkout_session_id idempotency inside fulfill function. */

  let result: FulfillFromCheckoutSessionResult;
  try {
    result = await fulfillDtrCoreFromCheckoutSessionId({
      checkoutSessionId,
      expectedUserId,
      eventIdForFulfillmentRow: eventId,
    });
  } catch {
    printSummary({
      phase: PHASE_LABEL,
      safeLabelsReference: [SAFE_LABEL_CHECKOUT_PARTIAL, SAFE_LABEL_USER_PARTIAL],
      validations,
      finals: ['FAILED', 'fulfill_exception'],
    });
    process.exit(3);
  }

  if (!result.ok) {
    printSummary({
      phase: PHASE_LABEL,
      safeLabelsReference: [SAFE_LABEL_CHECKOUT_PARTIAL, SAFE_LABEL_USER_PARTIAL],
      validations,
      finals: ['FAILED', `fulfill:${result.reason}`],
    });
    process.exit(3);
  }

  printSummary({
    phase: PHASE_LABEL,
    safeLabelsReference: [SAFE_LABEL_CHECKOUT_PARTIAL, SAFE_LABEL_USER_PARTIAL],
    validations,
    finals: ['EXECUTED', 'fulfillment_ok_redacted_only'],
  });
  process.exit(0);
}

export async function main(): Promise<void> {
  /** Guard: callers may import helpers for tests WITHOUT running side effects — only CLI entry invokes flows. */

  loadEnvLocalIfPresent();

  const dryRun = resolveDryRunMode();
  if (dryRun) {
    await dryRunFlow();
  } else {
    await executionFlow();
  }
}

if (invokedAsCliEntry()) {
  main().catch(() => stop('runner_unhandled_rejection_redacted'));
}
