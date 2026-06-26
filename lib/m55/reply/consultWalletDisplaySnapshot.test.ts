import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  walletRowToConsultDisplaySnapshot,
  isConsultWalletDisplaySnapshotUsable,
  hasValidConsultWalletDenominator,
} from './consultWalletDisplaySnapshot';

const CONSULT_ROOM = join(process.cwd(), 'components/dtr/ConsultRoom.tsx');
const DTR_FULL_READER = join(process.cwd(), 'components/dtr/DtrFullReader.tsx');

describe('walletRowToConsultDisplaySnapshot', () => {
  it('maps valid wallet row to snapshot', () => {
    const snap = walletRowToConsultDisplaySnapshot({
      initial_included_count: 1,
      purchased_count: 4,
      consumed_count: 2,
      available_count: 3,
      status: 'active',
    });
    assert.ok(snap !== null);
    assert.equal(snap!.availableCount, 3);
    assert.equal(snap!.consumedCount, 2);
    assert.equal(snap!.totalGrantedCount, 5);
    assert.equal(snap!.status, 'active');
  });

  it('returns null for negative counts', () => {
    const snap = walletRowToConsultDisplaySnapshot({
      initial_included_count: 1,
      purchased_count: 4,
      consumed_count: -1,
      available_count: 3,
      status: 'active',
    });
    assert.equal(snap, null);
  });

  it('returned snapshot passes isConsultWalletDisplaySnapshotUsable when valid', () => {
    const snap = walletRowToConsultDisplaySnapshot({
      initial_included_count: 1,
      purchased_count: 4,
      consumed_count: 1,
      available_count: 4,
      status: 'active',
    });
    assert.ok(isConsultWalletDisplaySnapshotUsable(snap));
  });

  it('returned snapshot has valid denominator when totalGrantedCount > 0', () => {
    const snap = walletRowToConsultDisplaySnapshot({
      initial_included_count: 1,
      purchased_count: 4,
      consumed_count: 2,
      available_count: 3,
      status: 'active',
    });
    assert.ok(snap !== null);
    assert.ok(hasValidConsultWalletDenominator(snap!));
  });

  it('optimistic post-send decrement produces correct snapshot', () => {
    // Pre-send: available=4, consumed=1 → Post-send: available=3, consumed=2
    const preSendWallet = {
      initial_included_count: 1,
      purchased_count: 4,
      consumed_count: 1,
      available_count: 4,
      status: 'active',
    };
    const postSendWallet = {
      ...preSendWallet,
      consumed_count: preSendWallet.consumed_count + 1,
      available_count: Math.max(0, preSendWallet.available_count - 1),
    };
    const snap = walletRowToConsultDisplaySnapshot(postSendWallet);
    assert.ok(snap !== null);
    assert.equal(snap!.availableCount, 3);
    assert.equal(snap!.consumedCount, 2);
    assert.equal(snap!.totalGrantedCount, 5);
  });

  it('ConsultRoom accepts onWalletSnapshotChange prop and calls walletRowToConsultDisplaySnapshot', () => {
    const src = readFileSync(CONSULT_ROOM, 'utf8');
    assert.ok(src.includes('onWalletSnapshotChange'));
    assert.ok(src.includes('walletRowToConsultDisplaySnapshot'));
    assert.ok(src.includes('ConsultWalletDisplaySnapshot'));
    // Send success calls callback only when wallet is present
    assert.ok(src.includes('if (onWalletSnapshotChange && updatedWallet)'));
  });

  it('DtrFullReader stores footerWalletSnapshot in state and passes callback to ConsultRoom', () => {
    const src = readFileSync(DTR_FULL_READER, 'utf8');
    assert.ok(src.includes('footerWalletSnapshot'));
    assert.ok(src.includes('setFooterWalletSnapshot'));
    assert.ok(src.includes('onWalletSnapshotChange={setFooterWalletSnapshot}'));
    assert.ok(src.includes('consultWalletSnapshot={footerWalletSnapshot}'));
  });

  it('send failure path does not update footerWalletSnapshot', () => {
    // The callback is only invoked in the try-success branch, not in the error/catch branch.
    const src = readFileSync(CONSULT_ROOM, 'utf8');
    assert.ok(src.includes('onWalletSnapshotChange(snap)'), 'callback call must exist');
    // The handleSend catch block contains setSendError and setInputText(snapshot.free).
    // Extract it and confirm onWalletSnapshotChange(snap) is absent from that block.
    const catchMatch = src.match(/\} catch \{([\s\S]*?)setInputText\(snapshot\.free\)/);
    assert.ok(catchMatch !== null, 'handleSend catch block must exist');
    assert.ok(
      !catchMatch![0].includes('onWalletSnapshotChange(snap)'),
      'catch block must not call wallet snapshot callback',
    );
  });
});
