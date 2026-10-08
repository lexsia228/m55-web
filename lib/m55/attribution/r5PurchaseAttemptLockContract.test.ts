import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  M55_R5_CLERK_LOOKUP_DIGEST_SQL_NAME,
  M55_R5_FINALIZE_LOCK_BIND_RPC_NAME,
  M55_R5_FINALIZE_LOCK_BIND_RPC_SEMANTIC_CODES,
  M55_R5_LOCK_DENIAL_REASON_CODES,
  M55_R5_PURCHASE_ATTEMPT_LOCK_MIGRATION_FILENAME,
  M55_R5_PURCHASE_ATTEMPT_SUCCESSOR_MINT_REASONS,
  M55_R5_PURCHASE_ATTEMPT_SUCCESSOR_RETRY_REASONS,
  M55_R5_RESOLVE_ATTEMPT_RPC_NAME,
  M55_R5_RESOLVE_ATTEMPT_RPC_SEMANTIC_CODES,
  classifyFinalizeLockBindRpcErrorV1,
  classifyResolvePurchaseAttemptRpcErrorV1,
} from './r5PurchaseAttemptLockContract';

describe('r5PurchaseAttemptLockContract', () => {
  it('pins migration filename and RPC names', () => {
    assert.equal(
      M55_R5_PURCHASE_ATTEMPT_LOCK_MIGRATION_FILENAME,
      '20260921000000_m55_r5_purchase_attempt_attribution_lock_v1.sql',
    );
    assert.equal(
      M55_R5_RESOLVE_ATTEMPT_RPC_NAME,
      'm55_r5_attribution_resolve_purchase_attempt_v1',
    );
    assert.equal(
      M55_R5_FINALIZE_LOCK_BIND_RPC_NAME,
      'm55_r5_attribution_finalize_lock_and_bind_checkout_session_v1',
    );
    assert.equal(
      M55_R5_CLERK_LOOKUP_DIGEST_SQL_NAME,
      'm55_r5_attribution_clerk_lookup_digest_v1',
    );
  });

  it('pins successor mint versus retry vocabulary', () => {
    assert.deepEqual(M55_R5_PURCHASE_ATTEMPT_SUCCESSOR_MINT_REASONS, [
      'CONFIRMED_EXPIRY',
      'CONFIRMED_CANCEL',
      'PURCHASE_SCOPE_CHANGE',
    ]);
    assert.deepEqual(M55_R5_PURCHASE_ATTEMPT_SUCCESSOR_RETRY_REASONS, [
      'SAME_ATTEMPT_RETRY',
      'NETWORK_RETRY',
      'UNKNOWN_STRIPE_CREATE_OUTCOME',
    ]);
  });

  it('classifies exact semantic RPC errors and otherwise transports', () => {
    assert.ok(M55_R5_RESOLVE_ATTEMPT_RPC_SEMANTIC_CODES.includes('BUYER_SUBJECT_DIGEST_MISMATCH'));
    assert.ok(M55_R5_FINALIZE_LOCK_BIND_RPC_SEMANTIC_CODES.includes('CONFLICTING_FINALIZATION'));
    assert.ok(M55_R5_FINALIZE_LOCK_BIND_RPC_SEMANTIC_CODES.includes('BUYER_SUBJECT_DELETED'));
    assert.ok(M55_R5_FINALIZE_LOCK_BIND_RPC_SEMANTIC_CODES.includes('LOCK_EXPIRY_NOT_AFTER_CUTOFF'));
    assert.deepEqual(M55_R5_LOCK_DENIAL_REASON_CODES, [
      'NO_QUALIFIED_TOUCH',
      'WINDOW_EXPIRED',
      'SELF_REFERRAL',
      'CIRCULAR_ABUSE',
      'CREATOR_NOT_ACTIVE',
    ]);
    assert.equal(
      classifyResolvePurchaseAttemptRpcErrorV1({ message: 'BUYER_SUBJECT_DIGEST_MISMATCH' }),
      'BUYER_SUBJECT_DIGEST_MISMATCH',
    );
    assert.equal(
      classifyResolvePurchaseAttemptRpcErrorV1({ message: 'network' }),
      'RESOLVE_ATTEMPT_RPC_TRANSPORT_ERROR',
    );
    assert.equal(
      classifyFinalizeLockBindRpcErrorV1({ message: 'CONFLICTING_FINALIZATION' }),
      'CONFLICTING_FINALIZATION',
    );
    assert.equal(
      classifyFinalizeLockBindRpcErrorV1({ message: 'BUYER_SUBJECT_DELETED' }),
      'BUYER_SUBJECT_DELETED',
    );
    assert.equal(
      classifyFinalizeLockBindRpcErrorV1({ message: 'LOCK_EXPIRY_NOT_AFTER_CUTOFF' }),
      'LOCK_EXPIRY_NOT_AFTER_CUTOFF',
    );
    assert.ok(
      M55_R5_FINALIZE_LOCK_BIND_RPC_SEMANTIC_CODES.includes('PENDING_ADMISSION_RETRY_HOLD'),
    );
    assert.equal(
      classifyFinalizeLockBindRpcErrorV1({ message: 'PENDING_ADMISSION_RETRY_HOLD' }),
      'PENDING_ADMISSION_RETRY_HOLD',
    );
    assert.equal(
      classifyFinalizeLockBindRpcErrorV1({ message: 'timeout' }),
      'FINALIZE_LOCK_BIND_RPC_TRANSPORT_ERROR',
    );
  });
});
