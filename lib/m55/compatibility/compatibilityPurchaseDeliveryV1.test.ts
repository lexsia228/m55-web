import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';
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
  type CompatibilityPurchaseContextRow,
} from './compatibilityCommerceDb';
import type { CompatibilityCurrentContextAnswers } from './currentContextContract.v1';
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
  decisionPace: 'decide_later',
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

function canonicalSnapshot(
  currentContext: CompatibilityCurrentContextAnswers = CONTEXT_A,
) {
  const result = buildCanonicalCompatibilityPurchaseSnapshot({
    personA: '1990-01-01',
    personB: '1992-02-02',
  }, currentContext);
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
    assert.equal(first.currentContext?.questionnaireContractVersion, 'compatibility_current_context_v1');
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
    const legacy = {
      ...canonicalSnapshot(),
      currentContext: undefined,
    };
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

describe('checkout source contract', () => {
  const source = read('app/api/compatibility/checkout/route.ts');

  it('requires auth, feature activation, and server-side price authority', () => {
    assert.match(source, /await auth\(\)/);
    assert.match(source, /isCompatibilityCommerceEnabled\(\)/);
    assert.match(source, /getCompatibilityStripePriceId\(\)/);
    assert.match(source, /mode: 'payment'/);
    assert.match(source, /quantity: COMPATIBILITY_REPORT_QUANTITY/);
    assert.match(source, /client_reference_id: contextId/);
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

  it('accepts only DOB and current-context answers and rejects client authority overrides', () => {
    const parseBlock = source.slice(
      source.indexOf('const body ='),
      source.indexOf('const built ='),
    );
    assert.match(parseBlock, /body\.personA/);
    assert.match(parseBlock, /body\.personB/);
    assert.match(parseBlock, /body\.currentContext/);
    assert.match(parseBlock, /isCompleteCompatibilityCurrentContext/);
    assert.match(parseBlock, /Object\.keys\(body\)/);
    assert.doesNotMatch(parseBlock, /body\.price|body\.amount|body\.chapter|body\.snapshot/);
  });

  it('sends the complete same-tab journey and never sends a client-built snapshot', () => {
    const client = read(
      'components/compatibility/CompatibilityPurchaseExperience.tsx',
    );
    assert.match(client, /parsed\.input\?\.personA/);
    assert.match(client, /isCompleteCompatibilityCurrentContext\(parsed\.answers\)/);
    assert.match(client, /currentContext: journey\.currentContext/);
    const requestBody = client.slice(
      client.indexOf('body: JSON.stringify'),
      client.indexOf('const data ='),
    );
    assert.doesNotMatch(requestBody, /snapshot|chapter|price|amount/);
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
    assert.match(
      source,
      /COMPATIBILITY_REPORT_PRODUCT_AUTHORITY\.publicName/,
    );
    assert.match(
      source,
      /COMPATIBILITY_REPORT_PRODUCT_AUTHORITY\.reportCount/,
    );
    assert.match(
      source,
      /COMPATIBILITY_REPORT_PRODUCT_AUTHORITY\.priceLabel/,
    );
    assert.match(source, /COMPATIBILITY_REPORT_INCLUDED\.map/);
    assert.match(source, /このレポートで読めること/);
    assert.match(source, /現在の二人に合わせた読み/);
    assert.doesNotMatch(source, /6章/);
    for (const term of [
      '一回払い',
      '自動更新',
      '支払い確認後にマイページへ表示',
      '決済前は内容を見直せます',
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
    assert.match(checkout, /success_url: `\$\{origin\}\/synastry\/purchase\/success`/);
  });

  it('keeps owned delivery independent from the purchase activation flag', () => {
    const source = read('app/api/compatibility/reports/route.ts');
    const db = read('lib/m55/compatibility/compatibilityCommerceDb.ts');
    assert.match(source, /listOwnedCompatibilityReports\(userId\)/);
    assert.doesNotMatch(source, /isCompatibilityCommerceEnabled/);
    assert.match(db, /return \{ available: false, reports: \[\] \}/);
  });
});
