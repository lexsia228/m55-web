import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();

function read(rel: string): string {
  return readFileSync(join(ROOT, rel), 'utf8');
}

describe('reply-ticket RPC v2 migration contract', () => {
  const migration = read(
    'supabase/migrations/20260813000000_m55_reply_ticket_fulfillment_rpc_v2_upgrade.sql',
  );
  const staging = read(
    'scripts/sql/staging/m55_reply_ticket_fulfillment_rpc_v2_pricing_architecture_candidate.sql',
  );

  it('migration promotes staging upgrade lane without recreating from scratch', () => {
    assert.ok(migration.includes('dtr_core_light_to_full_upgrade_v1'));
    assert.ok(migration.includes('additional_reply_ticket'));
    assert.ok(migration.includes('v_purchased_delta := GREATEST(0, v_full_max_purchased - r_wallet.purchased_count)'));
    assert.ok(migration.includes('v_full_max_purchased CONSTANT int := 4'));
    assert.ok(migration.includes('v_total_cap CONSTANT int := 5'));
    assert.ok(migration.includes('product_key_mismatch'));
    assert.ok(migration.includes('GRANT EXECUTE'));
    assert.ok(migration.includes('TO service_role'));
    assert.ok(migration.includes("NOTIFY pgrst, 'reload schema'"));
    assert.equal(migration.includes('CREATE TABLE'), false);
  });

  it('staging candidate body matches migration RPC core (semantic parity)', () => {
    const extractBody = (sql: string) => {
      const start = sql.indexOf('DECLARE');
      const end = sql.indexOf('END;\n$$');
      assert.ok(start > 0 && end > start);
      return sql.slice(start, end);
    };
    assert.equal(extractBody(migration), extractBody(staging));
  });
});

describe('light-to-full upgrade repair runner contract', () => {
  const src = read('scripts/repair/repair-light-to-full-upgrade-fulfillment.ts');

  it('pins upgrade product key and forbids webhook replay', () => {
    assert.ok(src.includes('DTR_CORE_LIGHT_TO_FULL_UPGRADE_V1_PRODUCT_KEY'));
    assert.ok(src.includes('callM55ReplyTicketFulfillCheckoutEvent'));
    assert.ok(src.includes('webhook_replay: false'));
    assert.equal(src.includes('stripe.webhooks'), false);
    assert.equal(src.includes('constructEvent'), false);
  });

  it('requires pre-upgrade wallet total=1 and blocks duplicate grant', () => {
    assert.ok(src.includes('WALLET_NOT_PRE_UPGRADE_STATE'));
    assert.ok(src.includes('UPGRADE_GRANT_ALREADY_EXISTS'));
    assert.ok(src.includes('amount_total_600'));
  });

  it('defaults to dry-run', () => {
    assert.ok(src.includes('M55_REPAIR_DRY_RUN'));
    assert.ok(src.includes('DRY_RUN_GREEN'));
  });
});
