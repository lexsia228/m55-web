/**
 * M55 LIVE Light→Full upgrade — same-transaction fulfillment repair (source only).
 *
 * Does NOT replay Stripe webhooks. Invokes m55_reply_ticket_fulfill_checkout_event directly.
 *
 * Default: dry-run (READ-ONLY validation). Execute requires:
 *   M55_REPAIR_DRY_RUN=false
 *   M55_REPAIR_CONFIRM=M55_CONFIRM_ONE_SHOT_LIGHT_TO_FULL_UPGRADE_REPAIR_20260813
 *
 * Required env (local only — never commit):
 *   M55_REPAIR_CHECKOUT_SESSION_ID
 *   M55_REPAIR_STRIPE_EVENT_ID
 *   M55_REPAIR_REPORT_INSTANCE_ID
 *   M55_REPAIR_WALLET_SCOPE_USER_ID
 *   STRIPE_SECRET_KEY
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */
import { readFileSync } from 'node:fs';
import { realpathSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type Stripe from 'stripe';
import { DTR_CORE_LIGHT_TO_FULL_UPGRADE_V1_PRODUCT_KEY } from '../../lib/m55/reply/replyTicketCheckoutConstants';
import { callM55ReplyTicketFulfillCheckoutEvent } from '../../lib/m55/reply/replyTicketFulfillmentRpc';
import { hashUserIdForLedgerLog } from '../../lib/m55/reply/readReplyWalletProbe';
import { getStripe } from '../../lib/stripe';
import { getSupabaseAdmin } from '../../lib/supabaseAdmin';

export const M55_EXECUTE_CONFIRM_PHRASE =
  'M55_CONFIRM_ONE_SHOT_LIGHT_TO_FULL_UPGRADE_REPAIR_20260813';

const EXPECTED_AMOUNT_TOTAL = 600;
const EXPECTED_CURRENCY = 'jpy';
const EXPECTED_PRODUCT_KEY = DTR_CORE_LIGHT_TO_FULL_UPGRADE_V1_PRODUCT_KEY;
const PHASE_LABEL = 'm55_light_to_full_upgrade_repair_v1';

export type UpgradeRepairValidation = Record<string, boolean>;

function loadEnvLocalIfPresent(): void {
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
    // optional
  }
}

function requiredEnv(name: string): string | null {
  const v = process.env[name];
  if (!v || !String(v).trim()) return null;
  return String(v).trim();
}

function stop(reason: string): never {
  console.info(JSON.stringify({ phase: PHASE_LABEL, outcome: 'STOP', reason }));
  process.exit(2);
  throw new Error('unreachable');
}

export function validateUpgradeStripeSession(
  session: Stripe.Checkout.Session,
  expectedUserId: string,
  expectedReportInstanceId: string,
): UpgradeRepairValidation {
  const md = session.metadata ?? {};
  const productKey =
    typeof md.product_key === 'string' ? md.product_key.trim() : '';
  const reportInstanceId =
    typeof md.report_instance_id === 'string' ? md.report_instance_id.trim() : '';
  const priceEnv = process.env.STRIPE_PRICE_DTR_CORE_LIGHT_TO_FULL_UPGRADE_V1?.trim();

  return {
    livemode: session.livemode === true,
    mode_payment: session.mode === 'payment',
    status_complete: session.status === 'complete',
    payment_status_paid: session.payment_status === 'paid',
    amount_total_600: session.amount_total === EXPECTED_AMOUNT_TOTAL,
    currency_jpy:
      typeof session.currency === 'string' &&
      session.currency.toLowerCase() === EXPECTED_CURRENCY,
    metadata_product_key_upgrade: productKey === EXPECTED_PRODUCT_KEY,
    metadata_report_instance_matches: reportInstanceId === expectedReportInstanceId,
    client_reference_matches_user: session.client_reference_id === expectedUserId,
    price_env_configured: Boolean(priceEnv),
  };
}

export async function probePreUpgradeWalletState(opts: {
  userId: string;
  reportInstanceId: string;
}): Promise<{
  walletExists: boolean;
  purchasedCount: number | null;
  availableCount: number | null;
  totalCapability: number | null;
  upgradeLedgerForEventExists: boolean;
}> {
  const db = getSupabaseAdmin() as any;
  const { data: wallet } = await db
    .from('reply_ticket_wallets')
    .select('initial_included_count, purchased_count, available_count, status')
    .eq('user_id', opts.userId)
    .eq('report_instance_id', opts.reportInstanceId)
    .maybeSingle();

  if (!wallet || wallet.status !== 'active') {
    return {
      walletExists: false,
      purchasedCount: null,
      availableCount: null,
      totalCapability: null,
      upgradeLedgerForEventExists: false,
    };
  }

  const pic = Number(wallet.initial_included_count);
  const pc = Number(wallet.purchased_count);
  const ac = Number(wallet.available_count);

  return {
    walletExists: true,
    purchasedCount: Number.isFinite(pc) ? pc : null,
    availableCount: Number.isFinite(ac) ? ac : null,
    totalCapability:
      Number.isFinite(pic) && Number.isFinite(pc) ? Math.trunc(pic) + Math.trunc(pc) : null,
    upgradeLedgerForEventExists: false,
  };
}

export async function probeUpgradeLedgerForEvent(
  stripeEventId: string,
): Promise<boolean> {
  const db = getSupabaseAdmin() as any;
  const { count } = await db
    .from('reply_wallet_ledgers')
    .select('id', { count: 'exact', head: true })
    .eq('stripe_event_id', stripeEventId)
    .eq('product_key', EXPECTED_PRODUCT_KEY);
  return (count ?? 0) > 0;
}

function resolveDryRunMode(): boolean {
  const raw = process.env.M55_REPAIR_DRY_RUN;
  if (raw === undefined || raw === '') return true;
  const l = raw.toLowerCase().trim();
  if (l === 'true' || l === '1') return true;
  if (l === 'false' || l === '0') return false;
  stop('INVALID_M55_REPAIR_DRY_RUN');
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

export async function runLightToFullUpgradeRepairFlow(): Promise<void> {
  loadEnvLocalIfPresent();
  const dryRun = resolveDryRunMode();

  if (!requiredEnv('STRIPE_SECRET_KEY')) stop('MISSING_ENV_STRIPE_SECRET_KEY');
  if (!requiredEnv('NEXT_PUBLIC_SUPABASE_URL')) stop('MISSING_ENV_NEXT_PUBLIC_SUPABASE_URL');
  if (!requiredEnv('SUPABASE_SERVICE_ROLE_KEY')) stop('MISSING_ENV_SUPABASE_SERVICE_ROLE_KEY');

  const checkoutSessionId = requiredEnv('M55_REPAIR_CHECKOUT_SESSION_ID');
  const stripeEventId = requiredEnv('M55_REPAIR_STRIPE_EVENT_ID');
  const reportInstanceId = requiredEnv('M55_REPAIR_REPORT_INSTANCE_ID');
  const walletScopeUserId = requiredEnv('M55_REPAIR_WALLET_SCOPE_USER_ID');
  if (!checkoutSessionId || !stripeEventId || !reportInstanceId || !walletScopeUserId) {
    stop('MISSING_REPAIR_IDENTITY_ENV');
  }

  const stripe = getStripe();
  let session: Stripe.Checkout.Session;
  try {
    session = await stripe.checkout.sessions.retrieve(checkoutSessionId);
  } catch {
    stop('STRIPE_SESSION_RETRIEVE_FAILED');
  }

  const validations = validateUpgradeStripeSession(
    session,
    walletScopeUserId,
    reportInstanceId,
  );
  if (!Object.values(validations).every(Boolean)) {
    console.info(
      JSON.stringify({
        phase: PHASE_LABEL,
        outcome: 'STOP',
        reason: 'stripe_session_validation_failed',
        validations,
      }),
    );
    process.exit(2);
  }

  const walletProbe = await probePreUpgradeWalletState({
    userId: walletScopeUserId,
    reportInstanceId,
  });
  const upgradeLedgerExists = await probeUpgradeLedgerForEvent(stripeEventId);

  if (!walletProbe.walletExists) stop('WALLET_NOT_FOUND_FOR_REPORT');
  if (upgradeLedgerExists) stop('UPGRADE_GRANT_ALREADY_EXISTS');
  if (walletProbe.totalCapability !== 1 || walletProbe.purchasedCount !== 0) {
    stop('WALLET_NOT_PRE_UPGRADE_STATE');
  }

  if (dryRun) {
    console.info(
      JSON.stringify({
        phase: PHASE_LABEL,
        outcome: 'DRY_RUN_GREEN',
        validations,
        walletProbe,
        upgradeLedgerExists,
        webhook_replay: false,
      }),
    );
    return;
  }

  const confirm = requiredEnv('M55_REPAIR_CONFIRM');
  if (confirm !== M55_EXECUTE_CONFIRM_PHRASE) stop('M55_REPAIR_CONFIRM_MISMATCH');

  const paymentIntentId =
    typeof session.payment_intent === 'string' ? session.payment_intent : null;
  const userRefHash = hashUserIdForLedgerLog(walletScopeUserId);

  const result = await callM55ReplyTicketFulfillCheckoutEvent({
    stripeEventId,
    checkoutSessionId,
    paymentIntentId,
    productKey: EXPECTED_PRODUCT_KEY,
    reportInstanceId,
    walletScopeUserId,
    userRefHash,
    quantity: 1,
  });

  if (result.status !== 'processed') {
    console.info(
      JSON.stringify({
        phase: PHASE_LABEL,
        outcome: 'STOP',
        reason: 'rpc_not_processed',
        rpc_status: result.status,
      }),
    );
    process.exit(2);
  }

  const postWallet = await probePreUpgradeWalletState({
    userId: walletScopeUserId,
    reportInstanceId,
  });

  console.info(
    JSON.stringify({
      phase: PHASE_LABEL,
      outcome: 'EXECUTED',
      rpc_status: result.status,
      purchased_count: result.purchased_count,
      available_count: result.available_count,
      post_total_capability: postWallet.totalCapability,
      webhook_replay: false,
    }),
  );
}

if (invokedAsCliEntry()) {
  runLightToFullUpgradeRepairFlow().catch(() => stop('UNHANDLED_REPAIR_ERROR'));
}
