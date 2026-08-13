import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  evaluateReplyTicketCheckoutWalletCap,
  type ReplyTicketWalletGateRow,
} from './replyTicketCheckoutValidate';

function wallet(
  initial: number,
  purchased: number,
  available = initial + purchased
): ReplyTicketWalletGateRow {
  return {
    id: 'w-1',
    status: 'active',
    initial_included_count: initial,
    purchased_count: purchased,
    available_count: available,
  };
}

describe('evaluateReplyTicketCheckoutWalletCap', () => {
  it('rejects upgrade checkout when wallet is already FULL-equivalent', () => {
    assert.equal(
      evaluateReplyTicketCheckoutWalletCap(
        wallet(1, 4),
        'dtr_core_light_to_full_upgrade_v1'
      ),
      'cap_reached'
    );
    assert.equal(
      evaluateReplyTicketCheckoutWalletCap(
        wallet(5, 0),
        'dtr_core_light_to_full_upgrade_v1'
      ),
      'cap_reached'
    );
  });

  it('allows upgrade checkout when purchased_count below FULL cap', () => {
    assert.equal(
      evaluateReplyTicketCheckoutWalletCap(
        wallet(1, 2),
        'dtr_core_light_to_full_upgrade_v1'
      ),
      null
    );
  });

  it('rejects legacy additional_reply_ticket with sales_stopped', () => {
    assert.equal(
      evaluateReplyTicketCheckoutWalletCap(
        wallet(1, 4),
        'additional_reply_ticket'
      ),
      'sales_stopped'
    );
  });

  it('rejects legacy additional_reply_ticket below cap with sales_stopped', () => {
    assert.equal(
      evaluateReplyTicketCheckoutWalletCap(wallet(1, 2), 'additional_reply_ticket'),
      'sales_stopped'
    );
  });

  it('rejects unknown product key', () => {
    assert.equal(
      evaluateReplyTicketCheckoutWalletCap(wallet(1, 1), 'dtr_core_full_v1'),
      'invalid_product'
    );
  });
});
