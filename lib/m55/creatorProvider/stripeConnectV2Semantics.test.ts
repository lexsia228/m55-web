import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  classifyStripeConnectRuntime,
  mapV2CoreAccountToProviderSnapshotV1,
} from './stripeConnectV2Semantics.ts';

describe('Stripe Connect runtime classification — fail-closed', () => {
  it('defaults to absent secret without test enablement', () => {
    const env = { ...process.env };
    delete env.STRIPE_SECRET_KEY;
    delete env.M55_STRIPE_CONNECT_SECRET_KEY;
    delete env.M55_STRIPE_CONNECT_TESTMODE_ENABLED;
    delete env.M55_STRIPE_CONNECT_ADAPTER;
    const c = classifyStripeConnectRuntime(env);
    assert.equal(c.secretKeyMode, 'absent');
    assert.equal(c.testModeExplicitlyEnabled, false);
  });

  it('detects sk_test without treating as enabled until flag set', () => {
    const c = classifyStripeConnectRuntime({
      ...process.env,
      STRIPE_SECRET_KEY: 'sk_test_example',
      M55_STRIPE_CONNECT_TESTMODE_ENABLED: 'false',
    });
    assert.equal(c.secretKeyMode, 'test');
    assert.equal(c.testModeExplicitlyEnabled, false);
  });

  it('detects live keys distinctly from test', () => {
    const c = classifyStripeConnectRuntime({
      ...process.env,
      STRIPE_SECRET_KEY: 'sk_live_example',
    });
    assert.equal(c.secretKeyMode, 'live');
  });
});

describe('mapV2CoreAccountToProviderSnapshotV1', () => {
  it('maps recipient transfers and payouts capabilities', () => {
    const snapshot = mapV2CoreAccountToProviderSnapshotV1({
      id: 'acct_test',
      object: 'v2.core.account',
      applied_configurations: ['recipient'],
      livemode: false,
      configuration: {
        recipient: {
          applied: true,
          capabilities: {
            stripe_balance: {
              stripe_transfers: { status: 'active', status_details: [] },
              payouts: { status: 'active', status_details: [] },
            },
          },
        },
      },
      requirements: {
        entries: [{ minimum_deadline: { status: 'eventually_due' } } as any],
        summary: { minimum_deadline: { status: 'eventually_due' } },
      },
      created: '2026-01-01T00:00:00.000Z',
    } as any);
    assert.equal(snapshot.transfersCapability, 'active');
    assert.equal(snapshot.payoutsEnabled, true);
    assert.equal(snapshot.requirementsCurrentlyDueCount, 0);
  });

  it('does not treat requirements currently_due as payout-ready', () => {
    const snapshot = mapV2CoreAccountToProviderSnapshotV1({
      id: 'acct_test',
      object: 'v2.core.account',
      applied_configurations: ['recipient'],
      livemode: false,
      configuration: {
        recipient: {
          applied: true,
          capabilities: {
            stripe_balance: {
              stripe_transfers: { status: 'pending', status_details: [] },
              payouts: { status: 'pending', status_details: [] },
            },
          },
        },
      },
      requirements: {
        entries: [{ minimum_deadline: { status: 'currently_due' } } as any],
        summary: { minimum_deadline: { status: 'currently_due' } },
      },
      created: '2026-01-01T00:00:00.000Z',
    } as any);
    assert.equal(snapshot.payoutsEnabled, false);
    assert.equal(snapshot.detailsSubmitted, false);
    assert.ok(snapshot.requirementsCurrentlyDueCount >= 1);
  });

  it('fails closed when summary is eventually_due but entries include currently_due', () => {
    const snapshot = mapV2CoreAccountToProviderSnapshotV1({
      id: 'acct_test',
      object: 'v2.core.account',
      applied_configurations: ['recipient'],
      livemode: false,
      configuration: {
        recipient: {
          applied: true,
          capabilities: {
            stripe_balance: {
              stripe_transfers: { status: 'active', status_details: [] },
              payouts: { status: 'active', status_details: [] },
            },
          },
        },
      },
      requirements: {
        entries: [
          { minimum_deadline: { status: 'currently_due' } } as any,
          { minimum_deadline: { status: 'eventually_due' } } as any,
        ],
        summary: { minimum_deadline: { status: 'eventually_due' } },
      },
      created: '2026-01-01T00:00:00.000Z',
    } as any);
    assert.equal(snapshot.detailsSubmitted, false);
    assert.equal(snapshot.payoutsEnabled, false);
    assert.ok(snapshot.requirementsCurrentlyDueCount >= 1);
  });

  it('treats empty requirements entries with active capabilities as details submitted in TEST', () => {
    const snapshot = mapV2CoreAccountToProviderSnapshotV1({
      id: 'acct_test',
      object: 'v2.core.account',
      applied_configurations: ['recipient'],
      livemode: false,
      configuration: {
        recipient: {
          applied: true,
          capabilities: {
            stripe_balance: {
              stripe_transfers: { status: 'active', status_details: [] },
              payouts: { status: 'active', status_details: [] },
            },
          },
        },
      },
      requirements: { entries: [] },
      created: '2026-01-01T00:00:00.000Z',
    } as any);
    assert.equal(snapshot.detailsSubmitted, true);
    assert.equal(snapshot.requirementsCurrentlyDueCount, 0);
    assert.equal(snapshot.transfersCapability, 'active');
    assert.equal(snapshot.payoutsEnabled, true);
  });

  it('fails closed when recipient applied is false', () => {
    const snapshot = mapV2CoreAccountToProviderSnapshotV1({
      id: 'acct_test',
      object: 'v2.core.account',
      applied_configurations: ['recipient'],
      livemode: false,
      configuration: {
        recipient: {
          applied: false,
          capabilities: {
            stripe_balance: {
              stripe_transfers: { status: 'active', status_details: [] },
              payouts: { status: 'active', status_details: [] },
            },
          },
        },
      },
      requirements: { entries: [] },
      created: '2026-01-01T00:00:00.000Z',
    } as any);
    assert.equal(snapshot.detailsSubmitted, false);
    assert.equal(snapshot.chargesEnabled, false);
    assert.equal(snapshot.transfersCapability, 'unknown');
  });

  it('does not green pending or missing capabilities with empty requirements', () => {
    const pending = mapV2CoreAccountToProviderSnapshotV1({
      id: 'acct_test',
      object: 'v2.core.account',
      livemode: false,
      configuration: {
        recipient: {
          applied: true,
          capabilities: {
            stripe_balance: {
              stripe_transfers: { status: 'pending', status_details: [] },
              payouts: { status: 'active', status_details: [] },
            },
          },
        },
      },
      requirements: { entries: [] },
      created: '2026-01-01T00:00:00.000Z',
    } as any);
    assert.equal(pending.detailsSubmitted, false);

    const missingPayouts = mapV2CoreAccountToProviderSnapshotV1({
      id: 'acct_test',
      object: 'v2.core.account',
      livemode: false,
      configuration: {
        recipient: {
          applied: true,
          capabilities: {
            stripe_balance: {
              stripe_transfers: { status: 'active', status_details: [] },
            },
          },
        },
      },
      requirements: { entries: [] },
      created: '2026-01-01T00:00:00.000Z',
    } as any);
    assert.equal(missingPayouts.detailsSubmitted, false);
    assert.equal(missingPayouts.chargesEnabled, false);
  });

  it('does not green payouts pending or restricted transfers with empty entries and absent minimum_deadline', () => {
    const payoutsPending = mapV2CoreAccountToProviderSnapshotV1({
      id: 'acct_test',
      object: 'v2.core.account',
      livemode: false,
      configuration: {
        recipient: {
          applied: true,
          capabilities: {
            stripe_balance: {
              stripe_transfers: { status: 'active', status_details: [] },
              payouts: { status: 'pending', status_details: [] },
            },
          },
        },
      },
      requirements: { entries: [] },
      created: '2026-01-01T00:00:00.000Z',
    } as any);
    assert.equal(payoutsPending.detailsSubmitted, false);
    assert.equal(payoutsPending.payoutsEnabled, false);

    const transfersRestricted = mapV2CoreAccountToProviderSnapshotV1({
      id: 'acct_test',
      object: 'v2.core.account',
      livemode: false,
      configuration: {
        recipient: {
          applied: true,
          capabilities: {
            stripe_balance: {
              stripe_transfers: { status: 'restricted', status_details: [] },
              payouts: { status: 'active', status_details: [] },
            },
          },
        },
      },
      requirements: { entries: [] },
      created: '2026-01-01T00:00:00.000Z',
    } as any);
    assert.equal(transfersRestricted.detailsSubmitted, false);
    assert.equal(transfersRestricted.transfersCapability, 'inactive');
  });

  it('fails closed when empty entries have unknown minimum_deadline status', () => {
    const snapshot = mapV2CoreAccountToProviderSnapshotV1({
      id: 'acct_test',
      object: 'v2.core.account',
      livemode: false,
      configuration: {
        recipient: {
          applied: true,
          capabilities: {
            stripe_balance: {
              stripe_transfers: { status: 'active', status_details: [] },
              payouts: { status: 'active', status_details: [] },
            },
          },
        },
      },
      requirements: {
        entries: [],
        summary: { minimum_deadline: { status: 'unknown_future_stripe_value' } },
      },
      created: '2026-01-01T00:00:00.000Z',
    } as any);
    assert.equal(snapshot.detailsSubmitted, false);
    assert.equal(snapshot.chargesEnabled, false);
    assert.equal(snapshot.transfersCapability, 'unknown');
  });

  it('fails closed when summary is past_due with empty entries', () => {
    const snapshot = mapV2CoreAccountToProviderSnapshotV1({
      id: 'acct_test',
      object: 'v2.core.account',
      livemode: false,
      configuration: {
        recipient: {
          applied: true,
          capabilities: {
            stripe_balance: {
              stripe_transfers: { status: 'active', status_details: [] },
              payouts: { status: 'active', status_details: [] },
            },
          },
        },
      },
      requirements: {
        entries: [],
        summary: { minimum_deadline: { status: 'past_due' } },
      },
      created: '2026-01-01T00:00:00.000Z',
    } as any);
    assert.equal(snapshot.detailsSubmitted, false);
    assert.ok(snapshot.requirementsCurrentlyDueCount >= 1);
  });

  it('fails closed when summary is currently_due with empty entries', () => {
    const snapshot = mapV2CoreAccountToProviderSnapshotV1({
      id: 'acct_test',
      object: 'v2.core.account',
      livemode: false,
      configuration: {
        recipient: {
          applied: true,
          capabilities: {
            stripe_balance: {
              stripe_transfers: { status: 'active', status_details: [] },
              payouts: { status: 'active', status_details: [] },
            },
          },
        },
      },
      requirements: {
        entries: [],
        summary: { minimum_deadline: { status: 'currently_due' } },
      },
      created: '2026-01-01T00:00:00.000Z',
    } as any);
    assert.equal(snapshot.detailsSubmitted, false);
    assert.ok(snapshot.requirementsCurrentlyDueCount >= 1);
  });

  it('fails closed when requirements entries are absent', () => {
    const snapshot = mapV2CoreAccountToProviderSnapshotV1({
      id: 'acct_test',
      object: 'v2.core.account',
      livemode: false,
      configuration: {
        recipient: {
          applied: true,
          capabilities: {
            stripe_balance: {
              stripe_transfers: { status: 'active', status_details: [] },
              payouts: { status: 'active', status_details: [] },
            },
          },
        },
      },
      requirements: {},
      created: '2026-01-01T00:00:00.000Z',
    } as any);
    assert.equal(snapshot.detailsSubmitted, false);
    assert.equal(snapshot.transfersCapability, 'unknown');
  });

  it('fails closed when livemode is true', () => {
    const snapshot = mapV2CoreAccountToProviderSnapshotV1({
      id: 'acct_test',
      object: 'v2.core.account',
      livemode: true,
      configuration: {
        recipient: {
          applied: true,
          capabilities: {
            stripe_balance: {
              stripe_transfers: { status: 'active', status_details: [] },
              payouts: { status: 'active', status_details: [] },
            },
          },
        },
      },
      requirements: { entries: [] },
      created: '2026-01-01T00:00:00.000Z',
    } as any);
    assert.equal(snapshot.detailsSubmitted, false);
    assert.equal(snapshot.chargesEnabled, false);
  });
});
