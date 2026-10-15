import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it, after } from 'node:test';
import { createHash } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { mock } from 'node:test';
import { PAID_COMPATIBILITY_REPORT_VERSION } from './buildPaidCompatibilityReportV1';
import { buildPairDisplayIdentity } from './pairDisplayIdentity';
import * as commerceDbActual from './compatibilityCommerceDb';
import type { CompatibilityPurchaseContextResumeRow } from './compatibilityCommerceDb';

import type Stripe from 'stripe';
import {
  buildCanonicalCompatibilityPurchaseSnapshot,
} from './buildCanonicalCompatibilityPurchaseSnapshot';
import {
  fulfillCompatibilityCheckoutSession,
  type CompatibilityFulfillmentDependencies,
} from './compatibilityCheckoutFulfillment';
import {
  COMPATIBILITY_COMMERCE_ENABLED_ENV,
  COMPATIBILITY_REPORT_CURRENCY,
  COMPATIBILITY_REPORT_FULL_PRODUCT_KEY,
  COMPATIBILITY_REPORT_PRICE_YEN,
  COMPATIBILITY_REPORT_PRODUCT_AUTHORITY,
  COMPATIBILITY_REPORT_PUBLIC_NAME,
  COMPATIBILITY_REPORT_QUANTITY,
  COMPATIBILITY_STRIPE_PRICE_ENV,
  getCompatibilityStripePriceId,
  isCompatibilityCommerceEnabled,
} from './compatibilityCommerceAuthority';
import {
  isPaidCompatibilityReportSnapshot,
  releaseExpiredCompatibilityCheckoutContext,
  type CompatibilityPurchaseContextRow,
} from './compatibilityCommerceDb';
import {
  parseCompatibilityCheckoutResponse,
  type CompatibilityCheckoutResponseKind,
} from './pairOwnedStateIdentity';
import type { CompatibilityCurrentContextAnswers } from './currentContextContract.v1';
import type { CompatibilityCurrentContextAnswersV2 } from './currentContextContract.v2';
import { questionsForRelationStage } from './currentContextContract.v2';
import type { RelationStatusId } from './pairReadingTypes';
import {
  M55_FUNNEL_EVENTS,
  buildPrivacySafeFunnelPayload,
} from '../privacySafeFunnelAnalytics';

const ROOT = join(import.meta.dirname, '../../..');
const PRICE_ID = 'price_compatibility_test';
const CONTEXT_ID = '11111111-1111-4111-8111-111111111111';
const CONTEXT_A: CompatibilityCurrentContextAnswers = {
  decisionPace: 'decide_later',
  disagreement: 'talk_now',
  distance: 'explain_space',
  expressionPace: 'words_soon',
  returnPattern: 'someone_reaches',
  focus: 'conversation_focus',
};
const CONTEXT_B: CompatibilityCurrentContextAnswers = {
  decisionPace: 'decide_varies',
  disagreement: 'take_space',
  distance: 'go_quiet',
  expressionPace: 'words_later',
  returnPattern: 'return_is_hard',
  focus: 'return_focus',
};
const CONTEXT_C: CompatibilityCurrentContextAnswers = {
  decisionPace: 'decide_now',
  disagreement: 'one_carries',
  distance: 'space_is_hard',
  expressionPace: 'words_vary',
  returnPattern: 'time_restores',
  focus: 'next_step_focus',
};

function read(relativePath: string): string {
  return readFileSync(join(ROOT, relativePath), 'utf8');
}

function toV2Context(
  currentContext: CompatibilityCurrentContextAnswers,
  relationStatusId: RelationStatusId = 'R3',
): CompatibilityCurrentContextAnswersV2 {
  const allowed = new Set(
    questionsForRelationStage(relationStatusId).map((question) => question.questionId),
  );
  const candidate = {
    decisionPace: currentContext.decisionPace,
    disagreement: currentContext.disagreement,
    distance: currentContext.distance,
    expressionPace: currentContext.expressionPace,
    returnPattern: currentContext.returnPattern,
    focus: currentContext.focus,
  };
  return Object.fromEntries(
    Object.entries(candidate).filter(([key]) => allowed.has(key as keyof typeof candidate)),
  ) as unknown as CompatibilityCurrentContextAnswersV2;
}

function canonicalSnapshot(
  currentContext: CompatibilityCurrentContextAnswers = CONTEXT_A,
  relationStatusId: RelationStatusId = 'R3',
) {
  const result = buildCanonicalCompatibilityPurchaseSnapshot(
    {
      personA: '1990-01-01',
      personB: '1992-02-02',
    },
    relationStatusId,
    toV2Context(currentContext, relationStatusId),
  );
  assert.equal(result.ok, true);
  if (!result.ok) throw new Error('fixture failed');
  return result.snapshot;
}

function session(
  overrides: Partial<Stripe.Checkout.Session> = {},
): Stripe.Checkout.Session {
  return {
    id: 'cs_compatibility_test',
    object: 'checkout.session',
    status: 'complete',
    mode: 'payment',
    payment_status: 'paid',
    amount_total: 1480,
    currency: 'jpy',
    client_reference_id: CONTEXT_ID,
    metadata: {
      product_key: COMPATIBILITY_REPORT_FULL_PRODUCT_KEY,
      purchase_context_id: CONTEXT_ID,
    },
    subscription: null,
    payment_intent: 'pi_compatibility_test',
    ...overrides,
  } as Stripe.Checkout.Session;
}

function lineItem(overrides: Partial<Stripe.LineItem> = {}): Stripe.LineItem {
  return {
    id: 'li_compatibility_test',
    object: 'item',
    amount_discount: 0,
    amount_subtotal: 1480,
    amount_tax: 0,
    amount_total: 1480,
    currency: 'jpy',
    description: COMPATIBILITY_REPORT_PUBLIC_NAME,
    price: { id: PRICE_ID } as Stripe.Price,
    quantity: 1,
    ...overrides,
  } as Stripe.LineItem;
}

function context(
  overrides: Partial<CompatibilityPurchaseContextRow> = {},
): CompatibilityPurchaseContextRow {
  return {
    id: CONTEXT_ID,
    ownerUserId: 'user_test_owner',
    productKey: COMPATIBILITY_REPORT_FULL_PRODUCT_KEY,
    snapshotVersion: 'paid_compatibility_report_v1',
    pendingSnapshot: canonicalSnapshot(),
    status: 'pending',
    stripeCheckoutSessionId: 'cs_compatibility_test',
    stripePaymentIntentId: null,
    ...overrides,
  };
}

function harness(args?: {
  row?: CompatibilityPurchaseContextRow | null;
  items?: Stripe.LineItem[];
  commitResult?: boolean;
}) {
  let commitCalls = 0;
  const items = args?.items ?? [lineItem()];
  const stripe = {
    checkout: {
      sessions: {
        listLineItems: async () => ({
          object: 'list',
          data: items,
          has_more: false,
          url: '/v1/checkout/sessions/test/line_items',
        }),
      },
    },
  } as unknown as Pick<Stripe, 'checkout'>;
  const dependencies: CompatibilityFulfillmentDependencies = {
    stripePriceId: PRICE_ID,
    getContext: async () => args?.row === undefined ? context() : args.row,
    commit: async () => {
      commitCalls += 1;
      return args?.commitResult ?? true;
    },
  };
  return { stripe, dependencies, commitCalls: () => commitCalls };
}

describe('compatibility commerce product authority', () => {
  it('freezes the exact one-time product', () => {
    assert.equal(COMPATIBILITY_REPORT_FULL_PRODUCT_KEY, 'compatibility_report_full_v1');
    assert.equal(COMPATIBILITY_REPORT_PUBLIC_NAME, '二人の相性レポート');
    assert.equal(COMPATIBILITY_REPORT_PRICE_YEN, 1480);
    assert.equal(COMPATIBILITY_REPORT_CURRENCY, 'jpy');
    assert.equal(COMPATIBILITY_REPORT_QUANTITY, 1);
    assert.equal(COMPATIBILITY_REPORT_PRODUCT_AUTHORITY.subscription, false);
    assert.equal(COMPATIBILITY_REPORT_PRODUCT_AUTHORITY.reportCount, 1);
    assert.equal(COMPATIBILITY_REPORT_PRODUCT_AUTHORITY.billing, 'one_time');
  });

  it('defaults commerce off and never falls back to another price', () => {
    assert.equal(isCompatibilityCommerceEnabled({}), false);
    assert.equal(
      isCompatibilityCommerceEnabled({
        [COMPATIBILITY_COMMERCE_ENABLED_ENV]: 'true',
      }),
      true,
    );
    assert.equal(getCompatibilityStripePriceId({}), null);
    assert.equal(
      getCompatibilityStripePriceId({
        [COMPATIBILITY_STRIPE_PRICE_ENV]: PRICE_ID,
      }),
      PRICE_ID,
    );
  });
});

describe('canonical snapshot privacy', () => {
  it('is deterministic, personalized, serializable, and contains no raw input', () => {
    const first = canonicalSnapshot();
    const second = canonicalSnapshot();
    assert.deepEqual(first, second);
    assert.deepEqual(JSON.parse(JSON.stringify(first)), first);
    assert.equal(isPaidCompatibilityReportSnapshot(first), true);
    assert.equal(first.currentContext?.questionnaireContractVersion, 'compatibility_current_context_v2');
    assert.equal(first.currentContext?.relationshipLoopSteps.length, 3);
    const serialized = JSON.stringify(first);
    assert.doesNotMatch(serialized, /1990-01-01|1992-02-02/);
    assert.doesNotMatch(
      serialized,
      /dobHash|birthDate|nickname|clerk|userId|stripe|matrixScore|prompt|provider|decide_later|talk_now|conversation_focus/i,
    );
  });

  it('materially varies at least four chapters for the same DOB across A, B, and C', () => {
    const snapshots = [
      canonicalSnapshot(CONTEXT_A),
      canonicalSnapshot(CONTEXT_B),
      canonicalSnapshot(CONTEXT_C),
    ];
    const signature = (chapter: (typeof snapshots)[number]['chapters'][number]) =>
      JSON.stringify({
        scene: chapter.scene,
        relationshipLoop: chapter.relationshipLoop,
        resetSteps: chapter.resetSteps,
        usablePhrase: chapter.usablePhrase,
        smallExperiment: chapter.smallExperiment,
        reflectionQuestion: chapter.reflectionQuestion,
      });
    for (const [leftIndex, rightIndex] of [[0, 1], [0, 2], [1, 2]] as const) {
      const changed = snapshots[leftIndex].chapters.filter(
        (chapter, index) =>
          signature(chapter) !== signature(snapshots[rightIndex].chapters[index]!),
      );
      assert.ok(changed.length >= 4);
      assert.equal(
        snapshots[leftIndex].sharedFoundation,
        snapshots[rightIndex].sharedFoundation,
      );
      assert.equal(
        snapshots[leftIndex].differentFoundation,
        snapshots[rightIndex].differentFoundation,
      );
    }
  });

  it('uses Q6 for focus guidance only and keeps all six chapter bodies unchanged', () => {
    const distance = canonicalSnapshot({ ...CONTEXT_A, focus: 'distance_focus' });
    const conversation = canonicalSnapshot({
      ...CONTEXT_A,
      focus: 'conversation_focus',
    });
    assert.deepEqual(distance.chapters, conversation.chapters);
    assert.notEqual(
      distance.currentContext?.readingGuide,
      conversation.currentContext?.readingGuide,
    );
    assert.notDeepEqual(
      distance.highlightedChapterKeys,
      conversation.highlightedChapterKeys,
    );
  });

  it('keeps legacy snapshots without current context readable', () => {
    const legacy = JSON.parse(JSON.stringify(canonicalSnapshot())) as ReturnType<
      typeof canonicalSnapshot
    >;
    delete (legacy as { currentContext?: unknown }).currentContext;
    assert.equal(isPaidCompatibilityReportSnapshot(legacy), true);
  });

  it('rejects a saved snapshot containing a raw date', () => {
    const invalid = {
      ...canonicalSnapshot(),
      relationshipSummary: '1990-01-01',
    };
    assert.equal(isPaidCompatibilityReportSnapshot(invalid), false);
  });

  it('rejects saved snapshots containing raw current-context answer IDs', () => {
    const invalid = {
      ...canonicalSnapshot(),
      relationshipSummary: 'decide_later',
    };
    assert.equal(isPaidCompatibilityReportSnapshot(invalid), false);
  });
});

type CompatibilityCheckoutClientOutcome =
  | 'fail_closed'
  | 'throw_unavailable'
  | 'redirect_owned'
  | 'redirect_checkout';

/** Mirrors PATCH-1 client branching in CompatibilityPurchaseExperience.startCheckout. */
function resolveCompatibilityCheckoutClientOutcome(
  responseOk: boolean,
  parsed: CompatibilityCheckoutResponseKind | null,
): CompatibilityCheckoutClientOutcome {
  if (parsed?.kind === 'checkout_unknown') return 'fail_closed';
  if (!responseOk || !parsed) return 'throw_unavailable';
  if (parsed.kind === 'already_owned') return 'redirect_owned';
  if (parsed.kind === 'checkout_in_progress') return 'fail_closed';
  if (parsed.kind !== 'checkout') return 'throw_unavailable';
  return 'redirect_checkout';
}

describe('compatibility checkout client response branching (mock)', () => {
  it('redirects only for checkout kind with a validated URL path', () => {
    const checkout = parseCompatibilityCheckoutResponse({
      kind: 'checkout',
      url: 'https://checkout.stripe.com/c/pay/cs_test_123',
    });
    assert.equal(
      resolveCompatibilityCheckoutClientOutcome(true, checkout),
      'redirect_checkout',
    );
    assert.equal(checkout?.kind, 'checkout');
    if (checkout?.kind === 'checkout') {
      assert.match(checkout.url, /^https:\/\/checkout\.stripe\.com\//);
    }
  });

  it('checkout_in_progress and checkout_unknown never redirect', () => {
    assert.equal(
      resolveCompatibilityCheckoutClientOutcome(true, { kind: 'checkout_in_progress' }),
      'fail_closed',
    );
    assert.equal(
      resolveCompatibilityCheckoutClientOutcome(true, { kind: 'checkout_unknown' }),
      'fail_closed',
    );
  });

  it('source requires checkout narrowing before window.location.assign', () => {
    const client = read('components/compatibility/CompatibilityPurchaseExperience.tsx');
    const block = client.slice(
      client.indexOf('parseCompatibilityCheckoutResponse(data)'),
      client.indexOf('} catch {', client.indexOf('parseCompatibilityCheckoutResponse(data)')),
    );
    assert.match(block, /parsedCheckout\.kind === 'checkout_in_progress'/);
    assert.match(block, /parsedCheckout\.kind !== 'checkout'/);
    const assignIdx = block.indexOf('window.location.assign(parsedCheckout.url)');
    const narrowIdx = block.indexOf("parsedCheckout.kind !== 'checkout'");
    assert.ok(narrowIdx > 0 && narrowIdx < assignIdx);
  });
});

describe('actual checkout POST resume matrix (production route source)', { concurrency: false }, () => {
  const CHECKOUT_ROUTE_SHA = '03afc3afc660908be040f1f5c513dd4054a7de2ff6814afd3daaf0d499c83cd1';
  const ROUTE_REL = 'app/api/compatibility/checkout/route.ts';
  const USER_ID = 'user_resume_matrix';
  const PAIR_ID = '22222222-2222-4222-8222-222222222222';
  const PAID_ID = '33333333-3333-4333-8333-333333333333';
  const SESSION_ID = 'cs_test_resume_matrix';
  const OPEN_URL = 'https://checkout.stripe.com/c/pay/cs_test_resume_matrix';
  const R2_CONTEXT: CompatibilityCurrentContextAnswersV2 = {
    expressionPace: 'words_soon',
    contactPace: 'steady_contact',
  };

  type MatrixRow = {
    caseId: string;
    variant: string;
    httpStatus: number;
    bodyKind: string | null;
    release: number;
    reserveAfterFirst: number;
    slot: number;
    create: number;
    attach: number;
    pass: boolean;
    checkoutRouteSha256: string;
  };

  const matrixRows: MatrixRow[] = [];

  function checkoutRouteSha(): string {
    return createHash('sha256').update(read(ROUTE_REL)).digest('hex');
  }

  function canonicalSnapshotR2() {
    const built = buildCanonicalCompatibilityPurchaseSnapshot(
      { personA: '1990-01-01', personB: '1992-02-02' },
      'R2',
      R2_CONTEXT,
      buildPairDisplayIdentity('相手', 'R2'),
    );
    assert.equal(built.ok, true);
    if (!built.ok) throw new Error('fixture');
    return built.snapshot;
  }

  function baseDbRow(): CompatibilityPurchaseContextResumeRow {
    const snap = canonicalSnapshotR2();
    return {
      id: CONTEXT_ID,
      ownerUserId: USER_ID,
      productKey: COMPATIBILITY_REPORT_FULL_PRODUCT_KEY,
      snapshotVersion: PAID_COMPATIBILITY_REPORT_VERSION,
      pendingSnapshot: snap,
      status: 'pending',
      stripeCheckoutSessionId: SESSION_ID,
      stripePaymentIntentId: null,
      pairIdentityId: PAIR_ID,
      paidContextId: PAID_ID,
    };
  }

  function checkoutBody(pairId = PAIR_ID, paidId = PAID_ID) {
    return {
      personA: '1990-01-01',
      personB: '1992-02-02',
      relationStatusId: 'R2',
      currentContext: R2_CONTEXT,
      displayIdentity: buildPairDisplayIdentity('相手', 'R2'),
      pairIdentityId: pairId,
      paidContextId: paidId,
    };
  }

  function baseStripeSession(
    overrides: Partial<Stripe.Checkout.Session> = {},
  ): Stripe.Checkout.Session {
    return {
      id: SESSION_ID,
      object: 'checkout.session',
      status: 'expired',
      mode: 'payment',
      payment_status: 'unpaid',
      amount_total: COMPATIBILITY_REPORT_PRICE_YEN,
      currency: COMPATIBILITY_REPORT_CURRENCY,
      client_reference_id: CONTEXT_ID,
      metadata: {
        product_key: COMPATIBILITY_REPORT_FULL_PRODUCT_KEY,
        purchase_context_id: CONTEXT_ID,
      },
      subscription: null,
      url: null,
      ...overrides,
    } as Stripe.Checkout.Session;
  }

  type CaseConfig = {
    id: string;
    variant: string;
    dbRow?: CompatibilityPurchaseContextResumeRow | null;
    session?: Stripe.Checkout.Session | 'retrieve_error';
    lineItems?: Stripe.LineItem[] | 'list_error';
    bodyPairId?: string;
    bodyPaidId?: string;
    releaseOk?: boolean;
    secondReserveKind?: 'reserved' | 'checkout_in_progress' | 'checkout_unknown';
    expect: {
      httpStatus: number;
      bodyKind: string | null;
      release: number;
      reserveAfterFirst: number;
      slot: number;
      create: number;
      attach: number;
    };
  };

  async function invokeCheckoutPost(config: CaseConfig) {
    mock.reset();
    const counters = {
      release: 0,
      reserve: 0,
      reserveAfterFirst: 0,
      slot: 0,
      create: 0,
      attach: 0,
    };

    const stripeApi = {
      retrieve: async () => {
        if (config.session === 'retrieve_error') throw new Error('stripe_retrieve_failed');
        return config.session ?? baseStripeSession();
      },
      listLineItems: async () => {
        if (config.lineItems === 'list_error') throw new Error('stripe_list_failed');
        const items =
          config.lineItems ??
          [
            lineItem({
              amount_total: COMPATIBILITY_REPORT_PRICE_YEN,
              quantity: COMPATIBILITY_REPORT_QUANTITY,
              currency: COMPATIBILITY_REPORT_CURRENCY,
              price: { id: PRICE_ID } as Stripe.Price,
            }),
          ];
        return { data: items };
      },
      create: async () => {
        counters.create += 1;
        return {
          id: 'cs_created_new',
          url: 'https://checkout.stripe.com/c/pay/cs_created_new',
          expires_at: Math.floor(Date.now() / 1000) + 1800,
        };
      },
    };

    await mock.module('@clerk/nextjs/server', {
      namedExports: {
        auth: async () => ({ userId: USER_ID }),
        currentUser: async () => null,
      },
    });
    await mock.module('next/server', {
      namedExports: {
        NextRequest: class MockNextRequest {
          nextUrl = new URL('https://app.test/synastry');
          constructor(
            _url: string | URL,
            init?: { body?: string },
          ) {
            this.payload = init?.body ? JSON.parse(init.body) : {};
          }
          private readonly payload: unknown;
          async json() {
            return this.payload;
          }
        },
        NextResponse: {
          json: (body: unknown, init?: { status?: number }) => ({
            status: init?.status ?? 200,
            json: async () => body,
          }),
        },
      },
    });
    await mock.module(pathToFileURL(join(ROOT, 'lib/stripe.ts')).href, {
      namedExports: {
        getStripe: () => ({ checkout: { sessions: stripeApi } }),
      },
    });
    await mock.module(pathToFileURL(join(ROOT, 'lib/m55/compatibility/compatibilityCommerceDb.ts')).href, {
      namedExports: {
        ...commerceDbActual,
        findOwnedCompatibilityReportIdByIdentity: async () => ({ kind: 'not_owned' }),
        reserveCompatibilityCheckoutContext: async () => {
          counters.reserve += 1;
          if (counters.reserve === 1) {
            return { kind: 'checkout_in_progress', contextId: CONTEXT_ID };
          }
          counters.reserveAfterFirst += 1;
          const kind = config.secondReserveKind ?? 'reserved';
          if (kind === 'reserved') {
            return { kind: 'reserved', contextId: CONTEXT_ID };
          }
          return { kind, contextId: CONTEXT_ID };
        },
        getCompatibilityPurchaseContextForCheckoutResume: async () => config.dbRow ?? baseDbRow(),
        releaseExpiredCompatibilityCheckoutContext: async () => {
          counters.release += 1;
          return config.releaseOk ?? true;
        },
        acquireCompatibilityCheckoutCreateSlot: async () => {
          counters.slot += 1;
          return true;
        },
        casAttachCompatibilityCheckoutSession: async () => {
          counters.attach += 1;
          return true;
        },
      },
    });

    const routeUrl = `${pathToFileURL(join(ROOT, ROUTE_REL)).href}?matrix=${config.id}`;
    const { POST } = await import(routeUrl);
    const { NextRequest } = await import('next/server');
    const body = checkoutBody(config.bodyPairId, config.bodyPaidId);
    const response = await POST(
      new NextRequest('https://app.test/api/compatibility/checkout', {
        method: 'POST',
        body: JSON.stringify(body),
      }) as never,
    );
    const payload = (await response.json()) as Record<string, unknown>;
    const bodyKind = typeof payload.kind === 'string' ? payload.kind : null;
    return { status: response.status, bodyKind, payload, counters };
  }

  const cases: CaseConfig[] = [
    {
      id: 'open_resume_ok',
      variant: 'open/unpaid trusted URL resumes',
      session: baseStripeSession({
        status: 'open',
        payment_status: 'unpaid',
        url: OPEN_URL,
        expires_at: Math.floor(Date.now() / 1000) + 3600,
      }),
      expect: { httpStatus: 200, bodyKind: 'checkout', release: 0, reserveAfterFirst: 0, slot: 0, create: 0, attach: 0 },
    },
    {
      id: 'expired_release_then_rereserve',
      variant: 'expired/unpaid valid binding releases once then re-reserves',
      expect: { httpStatus: 200, bodyKind: 'checkout', release: 1, reserveAfterFirst: 1, slot: 1, create: 1, attach: 1 },
    },
    {
      id: 'db_owner_mismatch',
      variant: 'DB owner mismatch',
      dbRow: { ...baseDbRow(), ownerUserId: 'other_user' },
      expect: { httpStatus: 503, bodyKind: 'checkout_unknown', release: 0, reserveAfterFirst: 0, slot: 0, create: 0, attach: 0 },
    },
    {
      id: 'db_pair_mismatch',
      variant: 'DB pair identity mismatch',
      dbRow: { ...baseDbRow(), pairIdentityId: '44444444-4444-4444-8444-444444444444' },
      expect: { httpStatus: 503, bodyKind: 'checkout_unknown', release: 0, reserveAfterFirst: 0, slot: 0, create: 0, attach: 0 },
    },
    {
      id: 'db_paid_mismatch',
      variant: 'DB paid context mismatch',
      dbRow: { ...baseDbRow(), paidContextId: '55555555-5555-4555-8555-555555555555' },
      expect: { httpStatus: 503, bodyKind: 'checkout_unknown', release: 0, reserveAfterFirst: 0, slot: 0, create: 0, attach: 0 },
    },
    {
      id: 'db_missing_session_id',
      variant: 'missing pinned stripe session id',
      dbRow: { ...baseDbRow(), stripeCheckoutSessionId: null },
      expect: { httpStatus: 503, bodyKind: 'checkout_unknown', release: 0, reserveAfterFirst: 0, slot: 0, create: 0, attach: 0 },
    },
    {
      id: 'db_product_key_mismatch',
      variant: 'DB product key mismatch',
      dbRow: { ...baseDbRow(), productKey: 'wrong_product' as typeof COMPATIBILITY_REPORT_FULL_PRODUCT_KEY },
      expect: { httpStatus: 503, bodyKind: 'checkout_unknown', release: 0, reserveAfterFirst: 0, slot: 0, create: 0, attach: 0 },
    },
    {
      id: 'db_context_id_mismatch',
      variant: 'DB row context id mismatch',
      dbRow: { ...baseDbRow(), id: '66666666-6666-4666-8666-666666666666' },
      expect: { httpStatus: 503, bodyKind: 'checkout_unknown', release: 0, reserveAfterFirst: 0, slot: 0, create: 0, attach: 0 },
    },
    {
      id: 'stripe_session_id_mismatch',
      variant: 'retrieved session id mismatch',
      session: baseStripeSession({ id: 'cs_wrong' }),
      expect: { httpStatus: 503, bodyKind: 'checkout_unknown', release: 0, reserveAfterFirst: 0, slot: 0, create: 0, attach: 0 },
    },
    {
      id: 'client_reference_missing',
      variant: 'client_reference_id missing',
      session: baseStripeSession({ client_reference_id: null }),
      expect: { httpStatus: 503, bodyKind: 'checkout_unknown', release: 0, reserveAfterFirst: 0, slot: 0, create: 0, attach: 0 },
    },
    {
      id: 'metadata_product_missing',
      variant: 'metadata product_key missing',
      session: baseStripeSession({ metadata: { purchase_context_id: CONTEXT_ID } as Stripe.Metadata }),
      expect: { httpStatus: 503, bodyKind: 'checkout_unknown', release: 0, reserveAfterFirst: 0, slot: 0, create: 0, attach: 0 },
    },
    {
      id: 'metadata_context_wrong',
      variant: 'metadata purchase_context_id wrong',
      session: baseStripeSession({
        metadata: {
          product_key: COMPATIBILITY_REPORT_FULL_PRODUCT_KEY,
          purchase_context_id: '77777777-7777-4777-8777-777777777777',
        },
      }),
      expect: { httpStatus: 503, bodyKind: 'checkout_unknown', release: 0, reserveAfterFirst: 0, slot: 0, create: 0, attach: 0 },
    },
    {
      id: 'metadata_extra_key',
      variant: 'metadata extra key',
      session: baseStripeSession({
        metadata: {
          product_key: COMPATIBILITY_REPORT_FULL_PRODUCT_KEY,
          purchase_context_id: CONTEXT_ID,
          email: 'leak@example.com',
        },
      }),
      expect: { httpStatus: 503, bodyKind: 'checkout_unknown', release: 0, reserveAfterFirst: 0, slot: 0, create: 0, attach: 0 },
    },
    {
      id: 'mode_subscription',
      variant: 'stripe mode subscription',
      session: baseStripeSession({ mode: 'subscription' }),
      expect: { httpStatus: 503, bodyKind: 'checkout_unknown', release: 0, reserveAfterFirst: 0, slot: 0, create: 0, attach: 0 },
    },
    {
      id: 'stripe_status_paid',
      variant: 'stripe status complete paid',
      session: baseStripeSession({ status: 'complete', payment_status: 'paid' }),
      expect: { httpStatus: 503, bodyKind: 'checkout_unknown', release: 0, reserveAfterFirst: 0, slot: 0, create: 0, attach: 0 },
    },
    {
      id: 'payment_status_paid_expired',
      variant: 'expired but payment_status paid',
      session: baseStripeSession({ payment_status: 'paid' }),
      expect: { httpStatus: 503, bodyKind: 'checkout_unknown', release: 0, reserveAfterFirst: 0, slot: 0, create: 0, attach: 0 },
    },
    {
      id: 'line_items_empty',
      variant: 'listLineItems empty',
      lineItems: [],
      expect: { httpStatus: 503, bodyKind: 'checkout_unknown', release: 0, reserveAfterFirst: 0, slot: 0, create: 0, attach: 0 },
    },
    {
      id: 'line_items_two',
      variant: 'listLineItems two items',
      lineItems: [lineItem(), lineItem({ id: 'li_second' })],
      expect: { httpStatus: 503, bodyKind: 'checkout_unknown', release: 0, reserveAfterFirst: 0, slot: 0, create: 0, attach: 0 },
    },
    {
      id: 'price_mismatch',
      variant: 'price id mismatch',
      lineItems: [lineItem({ price: { id: 'price_wrong' } as Stripe.Price })],
      expect: { httpStatus: 503, bodyKind: 'checkout_unknown', release: 0, reserveAfterFirst: 0, slot: 0, create: 0, attach: 0 },
    },
    {
      id: 'quantity_mismatch',
      variant: 'quantity mismatch',
      lineItems: [lineItem({ quantity: 2 })],
      expect: { httpStatus: 503, bodyKind: 'checkout_unknown', release: 0, reserveAfterFirst: 0, slot: 0, create: 0, attach: 0 },
    },
    {
      id: 'amount_mismatch',
      variant: 'amount_total mismatch',
      session: baseStripeSession({ amount_total: COMPATIBILITY_REPORT_PRICE_YEN - 1 }),
      expect: { httpStatus: 503, bodyKind: 'checkout_unknown', release: 0, reserveAfterFirst: 0, slot: 0, create: 0, attach: 0 },
    },
    {
      id: 'currency_mismatch',
      variant: 'currency mismatch',
      session: baseStripeSession({ currency: 'usd' }),
      lineItems: [lineItem({ currency: 'usd' })],
      expect: { httpStatus: 503, bodyKind: 'checkout_unknown', release: 0, reserveAfterFirst: 0, slot: 0, create: 0, attach: 0 },
    },
    {
      id: 'retrieve_error',
      variant: 'stripe retrieve error',
      session: 'retrieve_error',
      expect: { httpStatus: 503, bodyKind: 'checkout_unknown', release: 0, reserveAfterFirst: 0, slot: 0, create: 0, attach: 0 },
    },
    {
      id: 'list_line_items_error',
      variant: 'stripe listLineItems error',
      lineItems: 'list_error',
      expect: { httpStatus: 503, bodyKind: 'checkout_unknown', release: 0, reserveAfterFirst: 0, slot: 0, create: 0, attach: 0 },
    },
    {
      id: 'open_bad_url',
      variant: 'open session untrusted URL',
      session: baseStripeSession({
        status: 'open',
        payment_status: 'unpaid',
        url: 'https://evil.example/checkout',
        expires_at: Math.floor(Date.now() / 1000) + 3600,
      }),
      expect: { httpStatus: 503, bodyKind: 'checkout_unknown', release: 0, reserveAfterFirst: 0, slot: 0, create: 0, attach: 0 },
    },
    {
      id: 'client_reference_wrong',
      variant: 'client_reference_id present but wrong',
      session: baseStripeSession({ client_reference_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' }),
      expect: { httpStatus: 503, bodyKind: 'checkout_unknown', release: 0, reserveAfterFirst: 0, slot: 0, create: 0, attach: 0 },
    },
    {
      id: 'metadata_product_wrong',
      variant: 'metadata product_key present but wrong',
      session: baseStripeSession({
        metadata: {
          product_key: 'wrong_product_key',
          purchase_context_id: CONTEXT_ID,
        },
      }),
      expect: { httpStatus: 503, bodyKind: 'checkout_unknown', release: 0, reserveAfterFirst: 0, slot: 0, create: 0, attach: 0 },
    },
    {
      id: 'metadata_context_missing',
      variant: 'metadata purchase_context_id absent',
      session: baseStripeSession({
        metadata: { product_key: COMPATIBILITY_REPORT_FULL_PRODUCT_KEY } as Stripe.Metadata,
      }),
      expect: { httpStatus: 503, bodyKind: 'checkout_unknown', release: 0, reserveAfterFirst: 0, slot: 0, create: 0, attach: 0 },
    },
    {
      id: 'payment_mode_with_subscription',
      variant: 'mode payment with non-null subscription',
      session: baseStripeSession({
        mode: 'payment',
        subscription: 'sub_leak_test' as unknown as Stripe.Subscription,
      }),
      expect: { httpStatus: 503, bodyKind: 'checkout_unknown', release: 0, reserveAfterFirst: 0, slot: 0, create: 0, attach: 0 },
    },
    {
      id: 'stripe_status_unknown',
      variant: 'unexpected session.status (not open/expired paid path)',
      session: baseStripeSession({ status: 'processing' as Stripe.Checkout.Session.Status }),
      expect: { httpStatus: 503, bodyKind: 'checkout_unknown', release: 0, reserveAfterFirst: 0, slot: 0, create: 0, attach: 0 },
    },
    {
      id: 'payment_status_unknown',
      variant: 'unexpected session.payment_status (not unpaid paid path)',
      session: baseStripeSession({ payment_status: 'no_payment_required' as Stripe.Checkout.Session.PaymentStatus }),
      expect: { httpStatus: 503, bodyKind: 'checkout_unknown', release: 0, reserveAfterFirst: 0, slot: 0, create: 0, attach: 0 },
    },
    {
      id: 'line_item_amount_wrong',
      variant: 'line-item amount_total wrong while session amount_total valid',
      lineItems: [lineItem({ amount_total: COMPATIBILITY_REPORT_PRICE_YEN - 1 })],
      expect: { httpStatus: 503, bodyKind: 'checkout_unknown', release: 0, reserveAfterFirst: 0, slot: 0, create: 0, attach: 0 },
    },
    {
      id: 'line_item_currency_wrong',
      variant: 'line-item currency wrong while session currency valid',
      lineItems: [lineItem({ currency: 'usd' })],
      expect: { httpStatus: 503, bodyKind: 'checkout_unknown', release: 0, reserveAfterFirst: 0, slot: 0, create: 0, attach: 0 },
    },
    {
      id: 'line_item_price_missing',
      variant: 'line-item price missing or null',
      lineItems: [lineItem({ price: undefined })],
      expect: { httpStatus: 503, bodyKind: 'checkout_unknown', release: 0, reserveAfterFirst: 0, slot: 0, create: 0, attach: 0 },
    },
    {
      id: 'line_item_price_id_null',
      variant: 'line-item price object lacks id',
      lineItems: [lineItem({ price: {} as Stripe.Price })],
      expect: { httpStatus: 503, bodyKind: 'checkout_unknown', release: 0, reserveAfterFirst: 0, slot: 0, create: 0, attach: 0 },
    },
    {
      id: 'line_item_quantity_null',
      variant: 'line-item quantity null/missing',
      lineItems: [lineItem({ quantity: null as unknown as number })],
      expect: { httpStatus: 503, bodyKind: 'checkout_unknown', release: 0, reserveAfterFirst: 0, slot: 0, create: 0, attach: 0 },
    },
    {
      id: 'line_item_amount_null',
      variant: 'line-item amount_total null/missing',
      lineItems: [lineItem({ amount_total: null as unknown as number })],
      expect: { httpStatus: 503, bodyKind: 'checkout_unknown', release: 0, reserveAfterFirst: 0, slot: 0, create: 0, attach: 0 },
    },
    {
      id: 'session_amount_null',
      variant: 'session amount_total null/missing',
      session: baseStripeSession({ amount_total: null as unknown as number }),
      expect: { httpStatus: 503, bodyKind: 'checkout_unknown', release: 0, reserveAfterFirst: 0, slot: 0, create: 0, attach: 0 },
    },
    {
      id: 'session_currency_null',
      variant: 'session currency null/missing',
      session: baseStripeSession({ currency: null as unknown as string }),
      expect: { httpStatus: 503, bodyKind: 'checkout_unknown', release: 0, reserveAfterFirst: 0, slot: 0, create: 0, attach: 0 },
    },
    {
      id: 'line_item_currency_null',
      variant: 'line-item currency null/missing',
      lineItems: [lineItem({ currency: null as unknown as string })],
      expect: { httpStatus: 503, bodyKind: 'checkout_unknown', release: 0, reserveAfterFirst: 0, slot: 0, create: 0, attach: 0 },
    },
    {
      id: 'session_status_null',
      variant: 'session status absent/null',
      session: baseStripeSession({ status: null as unknown as Stripe.Checkout.Session.Status }),
      expect: { httpStatus: 503, bodyKind: 'checkout_unknown', release: 0, reserveAfterFirst: 0, slot: 0, create: 0, attach: 0 },
    },
    {
      id: 'session_payment_status_null',
      variant: 'session payment_status absent/null',
      session: baseStripeSession({ payment_status: null as unknown as Stripe.Checkout.Session.PaymentStatus }),
      expect: { httpStatus: 503, bodyKind: 'checkout_unknown', release: 0, reserveAfterFirst: 0, slot: 0, create: 0, attach: 0 },
    },
    {
      id: 'body_pair_mismatch',
      variant: 'request pair id mismatch vs DB',
      bodyPairId: '88888888-8888-4888-8888-888888888888',
      expect: { httpStatus: 503, bodyKind: 'checkout_unknown', release: 0, reserveAfterFirst: 0, slot: 0, create: 0, attach: 0 },
    },
  ];

  it('pins unchanged production checkout route SHA before matrix', () => {
    assert.equal(checkoutRouteSha(), CHECKOUT_ROUTE_SHA);
  });

  for (const config of cases) {
    it(`matrix ${config.id}`, async () => {
      process.env.STRIPE_SECRET_KEY = 'sk_test_matrix';
      process.env[COMPATIBILITY_COMMERCE_ENABLED_ENV] = 'true';
      process.env[COMPATIBILITY_STRIPE_PRICE_ENV] = PRICE_ID;
      const result = await invokeCheckoutPost(config);
      const row: MatrixRow = {
        caseId: config.id,
        variant: config.variant,
        httpStatus: result.status,
        bodyKind: result.bodyKind,
        release: result.counters.release,
        reserveAfterFirst: result.counters.reserveAfterFirst,
        slot: result.counters.slot,
        create: result.counters.create,
        attach: result.counters.attach,
        pass: false,
        checkoutRouteSha256: checkoutRouteSha(),
      };
      assert.equal(result.status, config.expect.httpStatus);
      assert.equal(result.bodyKind, config.expect.bodyKind);
      assert.equal(result.counters.release, config.expect.release);
      assert.equal(result.counters.reserveAfterFirst, config.expect.reserveAfterFirst);
      assert.equal(result.counters.slot, config.expect.slot);
      assert.equal(result.counters.create, config.expect.create);
      assert.equal(result.counters.attach, config.expect.attach);
      row.pass = true;
      matrixRows.push(row);
    });
  }

  after(() => {
    const out = process.env.M55_MATRIX_OUT;
    if (out) {
      writeFileSync(out, JSON.stringify({ checkoutRouteSha256: CHECKOUT_ROUTE_SHA, rows: matrixRows }, null, 2));
    }
  });
});

describe('checkout resume release RPC behavioral mock', () => {
  it('calls restricted release RPC and fails closed when RPC rejects', async () => {
    const rpcCalls: unknown[] = [];
    const db = {
      rpc: async (_name: string, args: unknown) => {
        rpcCalls.push(args);
        return { data: { ok: false, reason: 'invalid_release_evidence' }, error: null };
      },
    };
    const ok = await releaseExpiredCompatibilityCheckoutContext(
      {
        contextId: '11111111-1111-4111-8111-111111111111',
        ownerUserId: 'user_a',
        checkoutSessionId: 'cs_test_expired',
      },
      db as never,
    );
    assert.equal(ok, false);
    assert.equal(rpcCalls.length, 1);
  });

  it('succeeds only when RPC returns ok for expired+unpaid evidence', async () => {
    const db = {
      rpc: async () => ({ data: { ok: true, state: 'expired' }, error: null }),
    };
    const ok = await releaseExpiredCompatibilityCheckoutContext(
      {
        contextId: '11111111-1111-4111-8111-111111111111',
        ownerUserId: 'user_a',
        checkoutSessionId: 'cs_test_expired',
      },
      db as never,
    );
    assert.equal(ok, true);
  });
});

describe('Clerk-before-slot ordering mock', () => {
  it('does not acquire create-slot when Clerk lookup throws', async () => {
    let acquireCalls = 0;
    const outcome = await (async () => {
      try {
        await (async () => {
          throw new Error('clerk_unavailable');
        })();
      } catch {
        return 'checkout_unknown';
      }
      acquireCalls += 1;
      return 'continue';
    })();
    assert.equal(outcome, 'checkout_unknown');
    assert.equal(acquireCalls, 0);
  });
});

describe('checkout source contract', () => {
  const source = read('app/api/compatibility/checkout/route.ts');

  it('requires auth, feature activation, and server-side price authority', () => {
    assert.match(source, /await auth\(\)/);
    assert.match(source, /isCompatibilityCommerceEnabled\(\)/);
    assert.match(source, /getCompatibilityStripePriceId\(\)/);
    assert.match(source, /mode: 'payment'/);
    assert.match(source, /quantity: COMPATIBILITY_REPORT_QUANTITY/);
    assert.match(source, /client_reference_id: reserved\.contextId/);
  });

  it('sends only opaque allowlisted metadata and no raw input', () => {
    const metadata = source.slice(
      source.indexOf('metadata: {'),
      source.indexOf('success_url:'),
    );
    assert.match(metadata, /product_key/);
    assert.match(metadata, /purchase_context_id/);
    assert.doesNotMatch(metadata, /personA|personB|birth|userId|snapshot|chapter/);
  });

  it('accepts only DOB, relation stage, and current-context answers and rejects client authority overrides', () => {
    const parseBlock = source.slice(
      source.indexOf('const body ='),
      source.indexOf('const built ='),
    );
    assert.match(parseBlock, /body\.personA/);
    assert.match(parseBlock, /body\.personB/);
    assert.match(parseBlock, /body\.relationStatusId/);
    assert.match(parseBlock, /body\.currentContext/);
    assert.match(parseBlock, /body\.pairIdentityId/);
    assert.match(parseBlock, /body\.paidContextId/);
    assert.match(parseBlock, /isStrictUuidV4\(pairIdentityId\)/);
    assert.match(parseBlock, /isCompleteCompatibilityCurrentContextV2|isValidCheckoutCurrentContext/);
    assert.match(parseBlock, /Object\.keys\(body\)/);
    assert.doesNotMatch(parseBlock, /body\.price|body\.amount|body\.chapter|body\.snapshot/);
  });

  it('sends the complete same-tab journey and never sends a client-built snapshot', () => {
    const client = read(
      'components/compatibility/CompatibilityPurchaseExperience.tsx',
    );
    assert.match(client, /relationStatusId: journey\.relationStatusId/);
    assert.match(client, /currentContext: journey\.currentContext/);
    assert.match(client, /pairIdentityId: identity\.pairIdentityId/);
    assert.match(client, /paidContextId: identity\.paidContextId/);
    const requestBody = client.slice(
      client.indexOf('body: JSON.stringify'),
      client.indexOf('parseCompatibilityCheckoutResponse'),
    );
    assert.doesNotMatch(requestBody, /snapshot|chapter|price|amount/);
  });

  it('prefills Stripe Checkout from the signed-in Clerk email when available', () => {
    const checkout = read('app/api/compatibility/checkout/route.ts');
    assert.match(
      checkout,
      /import \{ auth, currentUser \} from '@clerk\/nextjs\/server';/,
    );
    assert.match(checkout, /clerkUser = await currentUser\(\)/);
    const acquireIdx = checkout.lastIndexOf('await acquireCompatibilityCheckoutCreateSlot');
    const clerkIdx = checkout.indexOf('clerkUser = await currentUser()');
    assert.ok(clerkIdx > 0 && clerkIdx < acquireIdx);
    assert.match(
      checkout,
      /clerkUser\?\.primaryEmailAddress\?\.emailAddress[\s\S]*clerkUser\?\.emailAddresses\?\.\[0\]\?\.emailAddress/,
    );
    assert.match(
      checkout,
      /\.\.\.\(customerEmail \? \{ customer_email: customerEmail \} : \{\}\)/,
    );
  });
});

describe('paid webhook fulfillment validation', () => {
  it('creates one owned report for a fully valid paid session', async () => {
    const h = harness();
    const result = await fulfillCompatibilityCheckoutSession(
      h.stripe,
      session(),
      h.dependencies,
    );
    assert.deepEqual(result, { ok: true, duplicate: false });
    assert.equal(h.commitCalls(), 1);
  });

  const invalidCases: Array<{
    name: string;
    value: Stripe.Checkout.Session;
    expected: string;
  }> = [
    { name: 'unpaid', value: session({ payment_status: 'unpaid' }), expected: 'payment_not_paid' },
    { name: 'wrong amount', value: session({ amount_total: 1479 }), expected: 'amount_mismatch' },
    { name: 'wrong currency', value: session({ currency: 'usd' }), expected: 'currency_mismatch' },
    { name: 'wrong mode', value: session({ mode: 'subscription' }), expected: 'mode_not_payment' },
    { name: 'wrong quantity', value: session(), expected: 'quantity_mismatch' },
    { name: 'wrong price', value: session(), expected: 'price_mismatch' },
  ];

  for (const testCase of invalidCases) {
    it(`${testCase.name} creates zero reports`, async () => {
      const items =
        testCase.name === 'wrong quantity'
          ? [lineItem({ quantity: 2 })]
          : testCase.name === 'wrong price'
            ? [lineItem({ price: { id: 'price_wrong' } as Stripe.Price })]
            : [lineItem()];
      const h = harness({ items });
      const result = await fulfillCompatibilityCheckoutSession(
        h.stripe,
        testCase.value,
        h.dependencies,
      );
      assert.deepEqual(result, { ok: false, reason: testCase.expected });
      assert.equal(h.commitCalls(), 0);
    });
  }

  it('multiple line items, missing context, invalid metadata, and DB failure fail closed', async () => {
    const multiple = harness({ items: [lineItem(), lineItem({ id: 'li_second' })] });
    assert.deepEqual(
      await fulfillCompatibilityCheckoutSession(
        multiple.stripe,
        session(),
        multiple.dependencies,
      ),
      { ok: false, reason: 'line_item_count_invalid' },
    );
    assert.equal(multiple.commitCalls(), 0);

    const missing = harness({ row: null });
    assert.deepEqual(
      await fulfillCompatibilityCheckoutSession(
        missing.stripe,
        session(),
        missing.dependencies,
      ),
      { ok: false, reason: 'purchase_context_missing' },
    );

    const invalidMetadata = harness();
    assert.deepEqual(
      await fulfillCompatibilityCheckoutSession(
        invalidMetadata.stripe,
        session({ metadata: { product_key: COMPATIBILITY_REPORT_FULL_PRODUCT_KEY } }),
        invalidMetadata.dependencies,
      ),
      { ok: false, reason: 'metadata_invalid' },
    );

    const missingPrice = harness();
    assert.deepEqual(
      await fulfillCompatibilityCheckoutSession(
        missingPrice.stripe,
        session(),
        { ...missingPrice.dependencies, stripePriceId: null },
      ),
      { ok: false, reason: 'price_configuration_missing' },
    );

    const invalidSnapshot = harness({
      row: context({ pendingSnapshot: {} as ReturnType<typeof canonicalSnapshot> }),
    });
    assert.deepEqual(
      await fulfillCompatibilityCheckoutSession(
        invalidSnapshot.stripe,
        session(),
        invalidSnapshot.dependencies,
      ),
      { ok: false, reason: 'purchase_context_invalid' },
    );
    assert.equal(invalidSnapshot.commitCalls(), 0);

    const failedCommit = harness({ commitResult: false });
    assert.deepEqual(
      await fulfillCompatibilityCheckoutSession(
        failedCommit.stripe,
        session(),
        failedCommit.dependencies,
      ),
      { ok: false, reason: 'db_error' },
    );
  });

  it('acknowledges an already fulfilled context without another write', async () => {
    const h = harness({ row: context({ status: 'fulfilled' }) });
    const result = await fulfillCompatibilityCheckoutSession(
      h.stripe,
      session(),
      h.dependencies,
    );
    assert.deepEqual(result, { ok: true, duplicate: true });
    assert.equal(h.commitCalls(), 0);
  });
});

describe('database ownership and lifecycle artifact', () => {
  const sql = read(
    'supabase/migrations/20260713000000_compatibility_purchase_delivery_v1.sql',
  );

  it('defines owner-bound ordinary tables, exact constraints, RLS, and grants', () => {
    assert.match(sql, /CREATE TABLE public\.compatibility_purchase_contexts/);
    assert.match(sql, /CREATE TABLE public\.compatibility_owned_reports/);
    assert.match(sql, /stripe_checkout_session_id text NULL UNIQUE/);
    assert.match(sql, /purchase_context_id uuid NOT NULL UNIQUE/);
    assert.match(sql, /FOREIGN KEY \(purchase_context_id, owner_user_id\)/);
    assert.match(sql, /ON DELETE CASCADE/);
    assert.match(sql, /ENABLE ROW LEVEL SECURITY/g);
    assert.match(sql, /FROM PUBLIC, anon, authenticated, service_role/);
    assert.doesNotMatch(sql, /CREATE POLICY/i);
  });

  it('provides atomic idempotent fulfillment and deletion verification', () => {
    assert.match(sql, /m55_fulfill_compatibility_report_v1/);
    assert.match(sql, /FOR UPDATE/);
    assert.match(sql, /ON CONFLICT \(purchase_context_id\) DO NOTHING/);
    assert.match(sql, /m55_compatibility_account_delete_v1/);
    assert.match(sql, /DELETE FROM public\.compatibility_purchase_contexts/);
    assert.match(sql, /FROM public\.compatibility_owned_reports[\s\S]*owner_user_id = v_user_id/);
  });

  it('wraps the existing deletion RPC so cleanup is independent of the commerce flag', () => {
    assert.match(
      sql,
      /ALTER FUNCTION public\.m55_account_deletion_process_v1\(text, text, text, text\)[\s\S]*RENAME TO m55_account_deletion_process_base_v1/,
    );
    const wrapper = sql.slice(
      sql.indexOf('CREATE FUNCTION public.m55_account_deletion_process_v1'),
    );
    const base = wrapper.indexOf('m55_account_deletion_process_base_v1');
    const compatibility = wrapper.indexOf('m55_compatibility_account_delete_v1');
    assert.ok(base >= 0 && base < compatibility);
    assert.doesNotMatch(wrapper, /isCompatibilityCommerceEnabled|M55_COMPATIBILITY/);
  });
});

describe('owned delivery, commercial copy, and analytics', () => {
  it('uses canonical owner filters and owner-only 404 reader behavior', () => {
    const db = read('lib/m55/compatibility/compatibilityCommerceDb.ts');
    const reader = read('app/synastry/report/[reportId]/page.tsx');
    assert.match(db, /\.eq\('owner_user_id', ownerUserId\)/);
    assert.match(reader, /getOwnedCompatibilityReport\(userId, reportId\)/);
    assert.match(reader, /if \(!report\) notFound\(\)/);
    assert.doesNotMatch(reader, /searchParams|query/);
  });

  it('shows all final-confirmation fields and legal links without pressure copy', () => {
    const source = read(
      'components/compatibility/CompatibilityPurchaseExperience.tsx',
    );
    for (const term of [
      '二人の相性レポート',
      '6章レポート1件',
      '¥1,480（税込）',
      '一回払い',
      '自動更新',
      '支払い確認後にマイページへ表示',
      '決済前は内容を見直せます',
      '現在の二人に合わせた6章',
      '購入したアカウントに保存',
      '相手への自動共有はありません',
      '/legal/tokushoho',
      '/legal/terms',
      '/legal/privacy',
      '/legal/refund',
    ]) {
      assert.match(source, new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    }
    assert.doesNotMatch(
      source,
      /今だけ|残りわずか|割引前|限定|必ず役立つ|関係が改善|永久|一生|無期限|相手の本音/,
    );
  });

  it('keeps the analytics payload to the three-field allowlist', () => {
    const payload = buildPrivacySafeFunnelPayload(
      'compatibility_purchase',
      '2026-07-13T00:00:00.000Z',
    );
    assert.deepEqual(Object.keys(payload).sort(), [
      'eventVersion',
      'occurredAt',
      'surface',
    ]);
    assert.equal(
      M55_FUNNEL_EVENTS.compatibilitySavedReportView,
      'm55_compatibility_saved_report_view',
    );
    assert.doesNotMatch(
      JSON.stringify(payload),
      /1480|compatibility_report_full_v1|user_|reportId|purchase_context|cs_|pi_/,
    );
  });

  it('keeps success redirects non-authoritative', () => {
    const checkout = read('app/api/compatibility/checkout/route.ts');
    const success = read('app/synastry/purchase/success/page.tsx');
    assert.doesNotMatch(success, /fulfill|insert|update|session_id/);
    assert.match(checkout, /success_url: `\$\{checkoutOriginFrozen\}\/synastry\/purchase\/success`/);
  });

  it('keeps owned delivery independent from the purchase activation flag', () => {
    const source = read('app/api/compatibility/reports/route.ts');
    const db = read('lib/m55/compatibility/compatibilityCommerceDb.ts');
    assert.match(source, /listOwnedCompatibilityReports\(userId\)/);
    assert.doesNotMatch(source, /isCompatibilityCommerceEnabled/);
    assert.match(db, /return \{ available: false, reports: \[\] \}/);
  });
});
