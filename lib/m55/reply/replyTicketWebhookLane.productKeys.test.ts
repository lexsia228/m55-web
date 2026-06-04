import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('replyTicketWebhookLane — fulfillment product key routing', () => {
  const src = readFileSync(
    join(process.cwd(), 'lib/m55/reply/replyTicketWebhookLane.ts'),
    'utf8'
  );

  it('accepts legacy additional_reply_ticket and light-to-full upgrade keys', () => {
    assert.ok(src.includes('isReplyTicketFulfillmentProductKey'));
    assert.ok(src.includes('DTR_CORE_LIGHT_TO_FULL_UPGRADE_V1_PRODUCT_KEY'));
    assert.ok(src.includes('productKey: rpcProductKey'));
  });

  it('does not hardcode RPC productKey to legacy only', () => {
    assert.equal(
      src.includes('productKey: ADDITIONAL_REPLY_TICKET_PRODUCT_KEY,'),
      false
    );
  });
});
