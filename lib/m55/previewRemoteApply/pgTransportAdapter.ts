import type { QueryResult } from 'pg';

import { sanitizePreviewRemoteApplyHoldCode } from './types.ts';

export type PgClientConfigRequest = {
  readonly hostFingerprintSha256: string | null;
  readonly databaseName: 'postgres';
  readonly role: 'postgres';
};

export type PgTransportClient = {
  query(sql: string, values?: readonly unknown[]): Promise<QueryResult>;
  begin(): Promise<void>;
  commit(): Promise<void>;
  rollback(): Promise<void>;
  close(): Promise<void>;
};

export type PgTransport = {
  createClient(config: PgClientConfigRequest): PgTransportClient;
};

let transportCallCount = 0;

export function getPlanOnlyTransportCallCount(): number {
  return transportCallCount;
}

export function resetPlanOnlyTransportCallCountForTests(): void {
  transportCallCount = 0;
}

function recordTransportCall(): never {
  transportCallCount += 1;
  throw new Error('HOLD_EXECUTION_NOT_AUTHORIZED');
}

class PlanOnlyPgTransportClient implements PgTransportClient {
  async query(): Promise<QueryResult> {
    return recordTransportCall();
  }

  async begin(): Promise<void> {
    recordTransportCall();
  }

  async commit(): Promise<void> {
    recordTransportCall();
  }

  async rollback(): Promise<void> {
    recordTransportCall();
  }

  async close(): Promise<void> {
    recordTransportCall();
  }
}

class PlanOnlyPgTransport implements PgTransport {
  createClient(): PgTransportClient {
    transportCallCount += 1;
    throw new Error('HOLD_EXECUTION_NOT_AUTHORIZED');
  }
}

export function createPlanOnlyPgTransport(): PgTransport {
  return new PlanOnlyPgTransport();
}

export function normalizePlanOnlyTransportError(error: unknown): string {
  if (error instanceof Error && error.message === 'HOLD_EXECUTION_NOT_AUTHORIZED') {
    return sanitizePreviewRemoteApplyHoldCode(error.message);
  }
  return sanitizePreviewRemoteApplyHoldCode('HOLD_UNEXPECTED_INTERNAL');
}
