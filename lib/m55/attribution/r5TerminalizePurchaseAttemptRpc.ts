import 'server-only';
import { getSupabaseAdmin } from '../../supabaseAdmin';
import {
  M55_R5_TERMINALIZE_PURCHASE_ATTEMPT_RPC_NAME,
  classifyTerminalizePurchaseAttemptRpcErrorV1,
  type R5bTerminalizeOutcomeV1,
} from './r5PurchaseAttemptContract';

export type TerminalizePurchaseAttemptStateV1 = 'EXPIRED' | 'CANCELLED';

export type TerminalizePurchaseAttemptRpcParamsV1 = {
  p_purchase_attempt_id: string;
  p_terminal_state: TerminalizePurchaseAttemptStateV1;
};

export function buildTerminalizePurchaseAttemptRpcParamsV1(args: {
  purchaseAttemptId: string;
  terminalState: TerminalizePurchaseAttemptStateV1;
}): TerminalizePurchaseAttemptRpcParamsV1 {
  return {
    p_purchase_attempt_id: args.purchaseAttemptId,
    p_terminal_state: args.terminalState,
  };
}

export type TerminalizePurchaseAttemptRpcResultV1 = {
  outcome: R5bTerminalizeOutcomeV1;
};

function parseTerminalizeRpcResult(raw: unknown): TerminalizePurchaseAttemptRpcResultV1 {
  if (!raw || typeof raw !== 'object') {
    throw new Error('TERMINALIZE_RPC_INVALID_RESPONSE');
  }
  const row = raw as Record<string, unknown>;
  if (row.ok !== true || row.status !== 'succeeded') {
    throw new Error('TERMINALIZE_RPC_FAILED');
  }
  const outcome = row.outcome;
  if (outcome !== 'TERMINALIZED' && outcome !== 'CONVERGED') {
    throw new Error('TERMINALIZE_RPC_UNEXPECTED_SHAPE');
  }
  return { outcome };
}

export async function callTerminalizePurchaseAttemptRpcV1(args: {
  purchaseAttemptId: string;
  terminalState: TerminalizePurchaseAttemptStateV1;
}): Promise<TerminalizePurchaseAttemptRpcResultV1> {
  const db = getSupabaseAdmin() as any;
  const params = buildTerminalizePurchaseAttemptRpcParamsV1(args);
  const { data, error } = await db.rpc(M55_R5_TERMINALIZE_PURCHASE_ATTEMPT_RPC_NAME, params);
  if (error) {
    throw new Error(classifyTerminalizePurchaseAttemptRpcErrorV1(error));
  }
  return parseTerminalizeRpcResult(data);
}
