import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const WEBHOOK_ROUTE = join(process.cwd(), 'app/api/stripe/webhook/route.ts');
const REPAIR_SCRIPT = join(
  process.cwd(),
  'scripts/repair/repair-dtr-core-fulfillment-from-checkout-session.ts'
);
const MIGRATIONS_DIR = join(process.cwd(), 'supabase/migrations');

function readWebhook(): string {
  return readFileSync(WEBHOOK_ROUTE, 'utf8');
}

function readRepair(): string {
  return readFileSync(REPAIR_SCRIPT, 'utf8');
}

/** stripe_events query blocks: from('stripe_events') through next .from( or helper boundary. */
function extractStripeEventsBlocks(src: string): string[] {
  const blocks: string[] = [];
  const needle = ".from('stripe_events')";
  let pos = 0;
  while (pos < src.length) {
    const start = src.indexOf(needle, pos);
    if (start < 0) break;
    const nextFrom = src.indexOf(".from('", start + needle.length);
    const end = nextFrom >= 0 ? nextFrom : src.length;
    blocks.push(src.slice(start, end));
    pos = start + needle.length;
  }
  return blocks;
}

function webhookStripeEventsPrecheckBlock(src: string): string {
  const start = src.indexOf("const { data: existing } = await db");
  assert.ok(start >= 0, 'webhook stripe_events precheck missing');
  const end = src.indexOf('if (existing)', start);
  assert.ok(end > start, 'webhook existing early return missing');
  return src.slice(start, end);
}

function repairStripeEventsBlocks(src: string): string[] {
  return extractStripeEventsBlocks(src);
}

function webhookStripeEventsInsertBlocks(src: string): string {
  const blocks = extractStripeEventsBlocks(src);
  return blocks
    .filter((b) => b.includes('.insert('))
    .join('\n');
}

function migrationSqlFiles(): string[] {
  return readdirSync(MIGRATIONS_DIR)
    .filter((name) => name.endsWith('.sql'))
    .map((name) => join(MIGRATIONS_DIR, name));
}

describe('stripeEventsRuntimeIdDependency — stripe_events event_id contract', () => {
  it('webhook stripe_events precheck has no .select(\'id\')', () => {
    const block = webhookStripeEventsPrecheckBlock(readWebhook());
    assert.equal(block.includes(".select('id')"), false);
    assert.equal(block.includes('.select("id")'), false);
  });

  it('repair stripe_events queries have no .select(\'id\')', () => {
    const blocks = repairStripeEventsBlocks(readRepair());
    assert.ok(blocks.length >= 3, 'expected at least 3 stripe_events query blocks');
    for (const block of blocks) {
      assert.equal(block.includes(".select('id')"), false);
      assert.equal(block.includes('.select("id")'), false);
    }
  });

  it('target 3 locations use .select(\'event_id\')', () => {
    const webhookPrecheck = webhookStripeEventsPrecheckBlock(readWebhook());
    assert.ok(webhookPrecheck.includes(".select('event_id')"));

    const repairBlocks = repairStripeEventsBlocks(readRepair());
    const countBlock = repairBlocks.find((b) =>
      b.includes("{ count: 'exact', head: true }")
    );
    assert.ok(countBlock, 'repair stripe_events count query missing');
    assert.ok(countBlock!.includes(".select('event_id', { count: 'exact', head: true })"));

    const existenceBlock = repairBlocks.find(
      (b) => b.includes('.maybeSingle()') && !b.includes('count:')
    );
    assert.ok(existenceBlock, 'repair stripe_events existence query missing');
    assert.ok(existenceBlock!.includes(".select('event_id')"));
  });

  it('webhook stripe_events INSERT payload keeps event_id and event_type only', () => {
    const insertBlocks = webhookStripeEventsInsertBlocks(readWebhook());
    assert.ok(insertBlocks.includes("insert({ event_id: event.id, event_type: eventType })"));
    assert.equal(
      insertBlocks.includes("insert({ event_id: event.id, event_type: eventType,"),
      false
    );
  });

  it('webhook keeps 23505 handling on both insert paths', () => {
    const src = readWebhook();
    const nonKeyStart = src.indexOf('if (!ONE_TIME_KEY_EVENTS.has(event.type');
    assert.ok(nonKeyStart >= 0);
    const nonKeyBlock = src.slice(nonKeyStart, nonKeyStart + 500);
    assert.match(nonKeyBlock, /insErr\?\.code === '23505'/);

    const keyStart = src.indexOf('const { error: insertErr } = await db');
    assert.ok(keyStart >= 0);
    const keyBlock = src.slice(keyStart, keyStart + 400);
    assert.match(keyBlock, /insertErr\.code === '23505'/);
  });

  it('webhook keeps if (existing) early return', () => {
    const src = readWebhook();
    assert.match(src, /if \(existing\) \{[\s\S]*return NextResponse\.json\(\{ received: true \}, \{ status: 200 \}\)/);
  });

  it('webhook keeps one-time path markers', () => {
    const src = readWebhook();
    assert.ok(src.includes('handleCheckoutCompletedOneTime'));
    assert.ok(src.includes('fulfillDtrCoreFromCheckoutSessionId'));
  });

  it('webhook keeps legacy path markers', () => {
    const src = readWebhook();
    assert.ok(src.includes('legacy_subscription_checkout_ignored'));
    assert.ok(src.includes('legacy_invoice_paid_ignored'));
  });

  it('webhook keeps refund handler marker', () => {
    assert.ok(readWebhook().includes('handleChargeRefunded'));
  });

  it('webhook keeps stripe_events_insert_failed audit marker', () => {
    assert.ok(readWebhook().includes("'stripe_events_insert_failed'"));
  });

  it('tracked migrations do not add stripe_events.id column', () => {
    for (const path of migrationSqlFiles()) {
      const sql = readFileSync(path, 'utf8');
      const lower = sql.toLowerCase();
      if (!lower.includes('stripe_events')) continue;

      const createMatch = lower.match(
        /create\s+table[\s\S]*?stripe_events[\s\S]*?\([\s\S]*?\)/
      );
      if (createMatch) {
        assert.equal(
          /\bid\s+(uuid|bigint|integer|serial)/.test(createMatch[0]),
          false,
          `${path}: CREATE TABLE stripe_events must not define id column`
        );
      }

      const alterStatements = sql.match(/alter\s+table\s+stripe_events[^;]*;/gi) ?? [];
      for (const stmt of alterStatements) {
        assert.equal(
          /add\s+column\s+(?:if\s+not\s+exists\s+)?\bid\b/i.test(stmt),
          false,
          `${path}: ALTER TABLE stripe_events must not ADD id column`
        );
      }
    }
  });
});
