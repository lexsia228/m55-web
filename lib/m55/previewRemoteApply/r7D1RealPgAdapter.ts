import {
  POST_CONNECT_GUARD_BINDING,
  POST_CONNECT_GUARD_SQL,
} from './remoteConnectionAuthority.ts';
import {
  createExecutionPgTransport,
  type ExecutionPgClient,
  type ExecutionPgClientConfig,
  type ExecutionPgPhysicalEvidenceV1,
  type ExecutionPgQueryResult,
  type ExecutionPgTransport,
  type ExecutionPgTransportFactoryDeps,
} from './remoteExecutionPgTransport.ts';
import type { CommitResponseClass } from './remoteExecutionLifecycleAuthority.ts';

export const R7_D1_SET_TRANSACTION_READ_ONLY_SQL = 'SET TRANSACTION READ ONLY' as const;

export const R7_D1_TRANSACTION_READ_ONLY_ASSERT_SQL = 'SHOW transaction_read_only' as const;

export type R7LiveBridgePgQueryResult = {
  readonly rows: readonly Record<string, unknown>[];
  readonly rowCount: number;
};

export type R7LiveBridgePgSessionShape = {
  connect(): Promise<void>;
  query(sql: string, params?: readonly unknown[]): Promise<R7LiveBridgePgQueryResult>;
  begin(): Promise<void>;
  beginReadOnly(): Promise<void>;
  commit(): Promise<{ readonly responseClass: CommitResponseClass }>;
  rollback(): Promise<{ readonly acknowledged: boolean }>;
  close(): Promise<void>;
};

/** Local code-only gate: ambient `pg` network open is forbidden until a separate live-execution Human GO. */
export const R7_D1_REAL_PG_NETWORK_FORBIDDEN_IN_LOCAL_CODE_GATE = true as const;

export const R7_D1_PHYSICAL_BACKEND_DISTINCTNESS_UNVERIFIED_IN_LOCAL_CODE_GATE = true as const;

export type R7RealPgAdapterHoldCode =
  | 'HOLD_LIVE_NETWORK_CONNECT_FORBIDDEN'
  | 'HOLD_FRESH_READONLY_SESSION_NOT_ESTABLISHED'
  | 'HOLD_POST_CONNECT_GUARD_FAILED'
  | 'HOLD_SESSION_CLOSE_FAILED'
  | 'HOLD_TRANSACTION_CLEANUP_UNCERTAIN'
  | 'HOLD_UNEXPECTED_INTERNAL'
  | 'HOLD_PHYSICAL_BACKEND_DISTINCTNESS_UNVERIFIED';

export type R7SessionUnderlyingTransportRelation = 'known_same' | 'known_not_same' | 'unknown';

const sessionToUnderlyingTransport = new WeakMap<object, string>();
const sessionToExecutionPgClient = new WeakMap<object, ExecutionPgClient>();

let harnessSessionInstanceCounter = 0;

export function registerR7LiveBridgeHarnessSessionInstance(session: object): string {
  const instanceId = `r7-harness-instance-${harnessSessionInstanceCounter += 1}`;
  sessionToUnderlyingTransport.set(session, instanceId);
  return instanceId;
}

export function isR7LiveBridgeHarnessSessionInstance(session: object): boolean {
  const transportId = sessionToUnderlyingTransport.get(session);
  return typeof transportId === 'string' && transportId.startsWith('r7-harness-instance-');
}

function registerR7LiveBridgeWrappedPgClientSession(session: object, client: object): void {
  sessionToUnderlyingTransport.set(session, `r7-wrapped-pg-${String(client)}`);
}

function assertLocalCodeOnlyPgIoForbidden(): void {
  if (R7_D1_REAL_PG_NETWORK_FORBIDDEN_IN_LOCAL_CODE_GATE) {
    throw new Error('HOLD_LIVE_NETWORK_CONNECT_FORBIDDEN');
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object') {
    return false;
  }
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function normalizeWireCell(value: unknown): string | number | boolean | null {
  if (value === null) {
    return null;
  }
  if (typeof value === 'string' || typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw new Error('HOLD_UNEXPECTED_INTERNAL');
    }
    return value;
  }
  if (typeof value === 'bigint') {
    return value.toString();
  }
  throw new Error('HOLD_UNEXPECTED_INTERNAL');
}

export function normalizePgQueryResult(result: ExecutionPgQueryResult): R7LiveBridgePgQueryResult {
  const rows = result.rows;
  if (!Array.isArray(rows)) {
    throw new Error('HOLD_UNEXPECTED_INTERNAL');
  }
  if (rows.length === 0) {
    if (result.rowCount === null || result.rowCount === 0) {
      return { rows: [], rowCount: 0 };
    }
    if (typeof result.rowCount === 'number' && Number.isInteger(result.rowCount) && result.rowCount >= 0) {
      return { rows: [], rowCount: result.rowCount };
    }
    throw new Error('HOLD_UNEXPECTED_INTERNAL');
  }
  if (result.rowCount === null) {
    throw new Error('HOLD_UNEXPECTED_INTERNAL');
  }
  if (!Number.isInteger(result.rowCount) || result.rowCount < 0) {
    throw new Error('HOLD_UNEXPECTED_INTERNAL');
  }
  if (result.rowCount !== rows.length) {
    throw new Error('HOLD_UNEXPECTED_INTERNAL');
  }
  const normalized: Record<string, unknown>[] = [];
  for (const row of rows) {
    if (!isPlainObject(row)) {
      throw new Error('HOLD_UNEXPECTED_INTERNAL');
    }
    const copy: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(row)) {
      copy[key] = normalizeWireCell(value);
    }
    normalized.push(copy);
  }
  return { rows: normalized, rowCount: result.rowCount };
}

/** DDL-style empty row sets with rowCount null normalize to zero rows / count 0. */
export function normalizePgDdlEmptyResult(result: ExecutionPgQueryResult): R7LiveBridgePgQueryResult {
  if (!Array.isArray(result.rows) || result.rows.length !== 0) {
    throw new Error('HOLD_UNEXPECTED_INTERNAL');
  }
  if (result.rowCount === null || result.rowCount === 0) {
    return { rows: [], rowCount: 0 };
  }
  if (Number.isInteger(result.rowCount) && result.rowCount >= 0) {
    return { rows: [], rowCount: result.rowCount };
  }
  throw new Error('HOLD_UNEXPECTED_INTERNAL');
}

function assertTransactionReadOnlyShowResult(result: ExecutionPgQueryResult): void {
  const normalized = normalizePgQueryResult(result);
  if (normalized.rowCount !== 1 || normalized.rows.length !== 1) {
    throw new Error('HOLD_FRESH_READONLY_SESSION_NOT_ESTABLISHED');
  }
  const row = normalized.rows[0];
  const keys = Object.keys(row);
  if (keys.length !== 1 || keys[0] !== 'transaction_read_only') {
    throw new Error('HOLD_FRESH_READONLY_SESSION_NOT_ESTABLISHED');
  }
  const flag = row.transaction_read_only;
  if (flag !== 'on') {
    throw new Error('HOLD_FRESH_READONLY_SESSION_NOT_ESTABLISHED');
  }
}

export function validatePostConnectGuardQueryResult(result: R7LiveBridgePgQueryResult): boolean {
  if (result.rowCount !== POST_CONNECT_GUARD_BINDING.expected.row_count) {
    return false;
  }
  if (result.rows.length !== 1) {
    return false;
  }
  const row = result.rows[0];
  if (!isPlainObject(row)) {
    return false;
  }
  const keys = Object.keys(row);
  if (keys.length !== 2) {
    return false;
  }
  const db = row.current_database_name;
  const user = row.current_user_name;
  if (typeof db !== 'string' || typeof user !== 'string') {
    return false;
  }
  if (db !== POST_CONNECT_GUARD_BINDING.expected.current_database_name) {
    return false;
  }
  if (user !== POST_CONNECT_GUARD_BINDING.expected.current_user_name) {
    return false;
  }
  return true;
}

async function safeCloseAfterFailure(
  session: R7LiveBridgePgSessionShape,
  options: { readonly transactionOpen: boolean },
): Promise<R7RealPgAdapterHoldCode | null> {
  if (options.transactionOpen) {
    try {
      const rollback = await session.rollback();
      if (!rollback.acknowledged) {
        try {
          await session.close();
        } catch {
          return 'HOLD_SESSION_CLOSE_FAILED';
        }
        return 'HOLD_TRANSACTION_CLEANUP_UNCERTAIN';
      }
    } catch {
      try {
        await session.close();
      } catch {
        return 'HOLD_SESSION_CLOSE_FAILED';
      }
      return 'HOLD_TRANSACTION_CLEANUP_UNCERTAIN';
    }
  }
  try {
    await session.close();
    return null;
  } catch {
    return 'HOLD_SESSION_CLOSE_FAILED';
  }
}

export function compareR7LiveBridgeSessionUnderlyingTransport(
  a: R7LiveBridgePgSessionShape,
  b: R7LiveBridgePgSessionShape,
): R7SessionUnderlyingTransportRelation {
  if (R7_D1_PHYSICAL_BACKEND_DISTINCTNESS_UNVERIFIED_IN_LOCAL_CODE_GATE) {
    const harnessA = isR7LiveBridgeHarnessSessionInstance(a as object);
    const harnessB = isR7LiveBridgeHarnessSessionInstance(b as object);
    if (!harnessA || !harnessB) {
      return 'unknown';
    }
  }
  const underlyingA = sessionToUnderlyingTransport.get(a as object);
  const underlyingB = sessionToUnderlyingTransport.get(b as object);
  if (underlyingA === undefined || underlyingB === undefined) {
    return 'unknown';
  }
  if (underlyingA === underlyingB) {
    return 'known_same';
  }
  return 'known_not_same';
}

export function readR7LiveBridgeSessionPhysicalEvidence(
  session: R7LiveBridgePgSessionShape,
): ExecutionPgPhysicalEvidenceV1 {
  const client = sessionToExecutionPgClient.get(session as object);
  if (!client) {
    return { kind: 'UNAVAILABLE_CODE_ONLY_GATE' };
  }
  return client.getExecutionPgPhysicalEvidenceV1();
}

/** Affirmative physical proof requires trusted transport evidence — not available in code-only gate. */
export function compareR7LiveBridgePhysicalBackendProof(
  a: R7LiveBridgePgSessionShape,
  b: R7LiveBridgePgSessionShape,
): R7SessionUnderlyingTransportRelation {
  if (R7_D1_PHYSICAL_BACKEND_DISTINCTNESS_UNVERIFIED_IN_LOCAL_CODE_GATE) {
    return 'unknown';
  }
  const evidenceA = readR7LiveBridgeSessionPhysicalEvidence(a);
  const evidenceB = readR7LiveBridgeSessionPhysicalEvidence(b);
  if (evidenceA.kind !== 'TRUSTED_BACKEND_LOCATOR' || evidenceB.kind !== 'TRUSTED_BACKEND_LOCATOR') {
    return 'unknown';
  }
  if (evidenceA.locatorSha256 === evidenceB.locatorSha256) {
    return 'known_same';
  }
  return 'known_not_same';
}

/** Wrapped real-pg client sessions are not available in local code-only gate. */
export function wrapExecutionPgClientAsR7LiveBridgeSession(
  client: ExecutionPgClient,
): R7LiveBridgePgSessionShape {
  const session: R7LiveBridgePgSessionShape = {
    async connect(): Promise<void> {
      assertLocalCodeOnlyPgIoForbidden();
      await client.connect();
    },
    async query(sql: string, params?: readonly unknown[]): Promise<R7LiveBridgePgQueryResult> {
      assertLocalCodeOnlyPgIoForbidden();
      return normalizePgQueryResult(await client.query(sql, params));
    },
    async begin(): Promise<void> {
      assertLocalCodeOnlyPgIoForbidden();
      await client.begin();
    },
    async beginReadOnly(): Promise<void> {
      assertLocalCodeOnlyPgIoForbidden();
      await client.begin();
      await client.query(R7_D1_SET_TRANSACTION_READ_ONLY_SQL);
      const readOnly = await client.query(R7_D1_TRANSACTION_READ_ONLY_ASSERT_SQL);
      assertTransactionReadOnlyShowResult(readOnly);
    },
    async commit(): Promise<{ readonly responseClass: CommitResponseClass }> {
      assertLocalCodeOnlyPgIoForbidden();
      return await client.commit();
    },
    async rollback(): Promise<{ readonly acknowledged: boolean }> {
      assertLocalCodeOnlyPgIoForbidden();
      return await client.rollback();
    },
    async close(): Promise<void> {
      assertLocalCodeOnlyPgIoForbidden();
      await client.close();
    },
  };
  registerR7LiveBridgeWrappedPgClientSession(session as object, client as object);
  sessionToExecutionPgClient.set(session as object, client);
  return session;
}

export function createR7D1InjectedExecutionPgTransport(
  deps: ExecutionPgTransportFactoryDeps = {},
): ExecutionPgTransport {
  if (R7_D1_REAL_PG_NETWORK_FORBIDDEN_IN_LOCAL_CODE_GATE) {
    throw new Error('HOLD_LIVE_NETWORK_CONNECT_FORBIDDEN');
  }
  return createExecutionPgTransport(deps);
}

export function assertR7D1RealPgNetworkAccessAllowed():
  | { readonly ok: true }
  | { readonly ok: false; readonly holdReasonCode: R7RealPgAdapterHoldCode } {
  if (R7_D1_REAL_PG_NETWORK_FORBIDDEN_IN_LOCAL_CODE_GATE) {
    return { ok: false, holdReasonCode: 'HOLD_LIVE_NETWORK_CONNECT_FORBIDDEN' };
  }
  return { ok: true };
}

export function createR7LiveBridgeSessionFactoryFromPgTransport(
  transport: ExecutionPgTransport,
  config: ExecutionPgClientConfig,
):
  | { readonly ok: true; readonly createSession: () => R7LiveBridgePgSessionShape }
  | { readonly ok: false; readonly holdReasonCode: R7RealPgAdapterHoldCode } {
  const network = assertR7D1RealPgNetworkAccessAllowed();
  if (!network.ok) {
    return network;
  }
  return {
    ok: true,
    createSession: () => {
      const client = transport.createClient(config);
      return wrapExecutionPgClientAsR7LiveBridgeSession(client);
    },
  };
}

export function assertR7D1PhysicalBackendDistinctnessAvailable():
  | { readonly ok: true }
  | { readonly ok: false; readonly holdReasonCode: R7RealPgAdapterHoldCode } {
  if (R7_D1_PHYSICAL_BACKEND_DISTINCTNESS_UNVERIFIED_IN_LOCAL_CODE_GATE) {
    return { ok: false, holdReasonCode: 'HOLD_PHYSICAL_BACKEND_DISTINCTNESS_UNVERIFIED' };
  }
  return { ok: true };
}

export async function establishFreshReadOnlyPgSession(
  session: R7LiveBridgePgSessionShape,
): Promise<{ readonly ok: true } | { readonly ok: false; readonly holdReasonCode: R7RealPgAdapterHoldCode }> {
  if (R7_D1_REAL_PG_NETWORK_FORBIDDEN_IN_LOCAL_CODE_GATE) {
    return { ok: false, holdReasonCode: 'HOLD_LIVE_NETWORK_CONNECT_FORBIDDEN' };
  }
  let transactionOpen = false;
  try {
    await session.connect();
  } catch {
    const closeHold = await safeCloseAfterFailure(session, { transactionOpen: false });
    if (closeHold) {
      return { ok: false, holdReasonCode: closeHold };
    }
    return { ok: false, holdReasonCode: 'HOLD_LIVE_NETWORK_CONNECT_FORBIDDEN' };
  }
  let guardResult: R7LiveBridgePgQueryResult;
  try {
    guardResult = await session.query(POST_CONNECT_GUARD_SQL);
  } catch {
    const closeHold = await safeCloseAfterFailure(session, { transactionOpen: false });
    if (closeHold) {
      return { ok: false, holdReasonCode: closeHold };
    }
    return { ok: false, holdReasonCode: 'HOLD_POST_CONNECT_GUARD_FAILED' };
  }
  if (!validatePostConnectGuardQueryResult(guardResult)) {
    const closeHold = await safeCloseAfterFailure(session, { transactionOpen: false });
    if (closeHold) {
      return { ok: false, holdReasonCode: closeHold };
    }
    return { ok: false, holdReasonCode: 'HOLD_POST_CONNECT_GUARD_FAILED' };
  }
  try {
    await session.beginReadOnly();
    transactionOpen = true;
  } catch {
    const closeHold = await safeCloseAfterFailure(session, { transactionOpen: true });
    if (closeHold) {
      return { ok: false, holdReasonCode: closeHold };
    }
    return { ok: false, holdReasonCode: 'HOLD_FRESH_READONLY_SESSION_NOT_ESTABLISHED' };
  }
  return { ok: true };
}
