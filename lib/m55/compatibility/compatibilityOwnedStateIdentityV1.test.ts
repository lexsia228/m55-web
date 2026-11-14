import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

const ROOT = join(import.meta.dirname, '../../..');

function read(rel: string): string {
  return readFileSync(join(ROOT, rel), 'utf8');
}

describe('pair owned-state identity v1 migration artifact', () => {
  const sql = read('supabase/migrations/20261009000000_m55_pair_owned_state_identity_v1.sql');

  it('26 old rows remain valid with nullable identity columns', () => {
    assert.match(sql, /pair_identity_id uuid NULL/);
    assert.match(sql, /paid_context_id uuid NULL/);
    assert.match(sql, /pair_identity_id IS NULL AND paid_context_id IS NULL/);
  });

  it('28 purchase identity columns are immutable after insert', () => {
    assert.match(sql, /NEW\.pair_identity_id IS DISTINCT FROM OLD\.pair_identity_id/);
    assert.match(sql, /NEW\.paid_context_id IS DISTINCT FROM OLD\.paid_context_id/);
  });

  it('29-31 fulfillment creates identity link and preserves legacy null paths', () => {
    assert.match(sql, /IF v_context\.pair_identity_id IS NOT NULL AND v_context\.paid_context_id IS NOT NULL/);
    assert.match(sql, /INSERT INTO public\.compatibility_owned_report_identity_links/);
    assert.match(sql, /ON CONFLICT \(report_id\) DO NOTHING/);
  });

  it('link table keeps paid_context_id nullable per frozen identity contract', () => {
    const linkTable = sql.slice(
      sql.indexOf('CREATE TABLE IF NOT EXISTS public.compatibility_owned_report_identity_links'),
      sql.indexOf('CREATE UNIQUE INDEX IF NOT EXISTS compatibility_owned_report_identity_exact_ctx_idx'),
    );
    assert.match(linkTable, /paid_context_id uuid NULL/);
    assert.doesNotMatch(linkTable, /paid_context_id uuid NOT NULL/);
  });

  it('32-34 link uniqueness and update rejection', () => {
    assert.match(sql, /compatibility_owned_report_identity_exact_ctx_idx/);
    assert.match(sql, /compatibility_owned_report_identity_immutable/);
    assert.match(sql, /identity link is immutable/);
  });

  it('35-37 cascade, RLS, and service_role-only grants', () => {
    assert.match(sql, /ON DELETE CASCADE/);
    assert.match(sql, /ENABLE ROW LEVEL SECURITY/);
    assert.match(sql, /REVOKE ALL ON TABLE public\.compatibility_owned_report_identity_links/);
    assert.match(sql, /GRANT SELECT, INSERT, DELETE/);
  });
});

describe('checkout reservation migration artifact', () => {
  const sql = read('supabase/migrations/20261010000000_m55_pair_checkout_reservation_v1.sql');

  it('nullable reservation columns and pending tuple partial unique', () => {
    assert.match(sql, /checkout_origin_frozen text NULL/);
    assert.match(sql, /stripe_create_first_attempt_at timestamptz NULL/);
    assert.match(sql, /compatibility_purchase_contexts_pending_tuple_uidx/);
    assert.match(sql, /WHERE status = 'pending'/);
  });

  it('service_role-only SECURITY DEFINER reserve and CAS RPCs', () => {
    assert.match(sql, /m55_reserve_compatibility_checkout_v1/);
    assert.match(sql, /m55_acquire_compatibility_checkout_create_slot_v1/);
    assert.match(sql, /m55_cas_attach_compatibility_checkout_session_v1/);
    assert.match(sql, /SECURITY DEFINER/);
    assert.match(sql, /SET search_path = public, pg_temp/);
    assert.match(sql, /GRANT EXECUTE ON FUNCTION public\.m55_reserve_compatibility_checkout_v1/);
    assert.match(sql, /REVOKE ALL ON FUNCTION public\.m55_reserve_compatibility_checkout_v1/);
  });

  it('marks execution readiness gap for status CHECK rename', () => {
    assert.match(sql, /NOT_EXECUTION_READY/);
  });
});

describe('checkout duplicate guard source contract', () => {
  const checkout = read('app/api/compatibility/checkout/route.ts');

  it('21-23 requires identity ids and returns already_owned before Stripe', () => {
    assert.match(checkout, /findOwnedCompatibilityReportIdByIdentity/);
    assert.match(checkout, /kind: 'already_owned'/);
    assert.match(checkout, /isStrictUuidV4\(pairIdentityId\)/);
    assert.match(checkout, /pairIdentityId,\s*paidContextId/);
    const stripeIdx = checkout.indexOf('stripe.checkout.sessions.create');
    const ownedIdx = checkout.indexOf("kind: 'already_owned'");
    assert.ok(ownedIdx > 0 && ownedIdx < stripeIdx);
  });

  it('reserves before Stripe and uses single idempotent create with no SDK retries', () => {
    assert.match(checkout, /reserveCompatibilityCheckoutContext/);
    assert.match(checkout, /acquireCompatibilityCheckoutCreateSlot/);
    assert.match(checkout, /casAttachCompatibilityCheckoutSession/);
    assert.match(checkout, /idempotencyKey: compatibilityStripeCheckoutIdempotencyKey/);
    assert.match(checkout, /maxNetworkRetries: 0/);
    assert.doesNotMatch(checkout, /createCompatibilityPurchaseContext/);
  });

  it('resumes in_progress via provider retrieve and fails closed without second create', () => {
    assert.match(checkout, /kind: 'checkout_unknown'/);
    assert.match(checkout, /attemptCheckoutInProgressResume/);
    assert.match(checkout, /stripe\.checkout\.sessions\.retrieve/);
    assert.match(checkout, /releaseExpiredCompatibilityCheckoutContext/);
    const createCount = checkout.match(/stripe\.checkout\.sessions\.create/g)?.length ?? 0;
    assert.equal(createCount, 1);
  });

  it('resolves Clerk email before create-slot acquisition', () => {
    const acquireIdx = checkout.lastIndexOf('await acquireCompatibilityCheckoutCreateSlot');
    const clerkIdx = checkout.indexOf('clerkUser = await currentUser()');
    assert.ok(clerkIdx > 0 && clerkIdx < acquireIdx);
    assert.match(checkout, /try \{[\s\S]*clerkUser = await currentUser\(\)[\s\S]*\} catch/);
  });

  it('open unpaid resume returns checkout url without a second sessions.create in branch', () => {
    assert.match(checkout, /resume\.kind === 'resume_url'/);
    assert.match(checkout, /kind: 'checkout', url: resume\.url/);
    const createCount = checkout.match(/stripe\.checkout\.sessions\.create/g)?.length ?? 0;
    assert.equal(createCount, 1);
  });

  it('delegates behavioral resume proof to actual-source POST matrix tests', () => {
    const purchase = read('lib/m55/compatibility/compatibilityPurchaseDeliveryV1.test.ts');
    assert.match(purchase, /actual checkout POST resume matrix \(production route source\)/);
    assert.match(purchase, /invokeCheckoutPost/);
    assert.doesNotMatch(purchase, /evaluateExpiredReleaseBindingProof/);
  });

  it('24-25 Stripe metadata remains two opaque keys only', () => {
    const metadata = checkout.slice(
      checkout.indexOf('metadata: {'),
      checkout.indexOf('success_url:'),
    );
    assert.match(metadata, /product_key/);
    assert.match(metadata, /purchase_context_id/);
    assert.doesNotMatch(metadata, /pairIdentityId|paidContextId|personA|personB/);
  });
});
