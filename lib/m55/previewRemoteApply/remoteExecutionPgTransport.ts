import type { ExpectedAuthorizationBinding } from './remoteConnectionAuthority.ts';
import { TIMEOUT_POLICY } from './timeoutPolicy.ts';
import {
  sanitizePreviewRemoteApplyHoldCode,
  type PreviewRemoteApplyHoldCode,
} from './types.ts';
import type { ParsedConnectionSecrets } from './remoteExecutionCredentialAcquirer.ts';
import {
  COMMIT_RESPONSE_CLASSES,
  type CommitResponseClass,
} from './remoteExecutionLifecycleAuthority.ts';

export type ExecutionConnectionState = 'open' | 'closed' | 'unusable';

export type ExecutionPgClientConfig = {
  readonly host: string;
  readonly port: number;
  readonly database: string;
  readonly user: string;
  readonly password: string;
  readonly sslmode: 'require';
  readonly connectionTimeoutMillis: number;
};

export type ExecutionPgQueryResult = {
  readonly rows: readonly Record<string, unknown>[];
  readonly rowCount: number | null;
};

export type ExecutionPgClient = {
  connect(): Promise<void>;
  query(sql: string, values?: readonly unknown[]): Promise<ExecutionPgQueryResult>;
  begin(): Promise<void>;
  commit(): Promise<{ readonly responseClass: CommitResponseClass }>;
  rollback(): Promise<{ readonly acknowledged: boolean }>;
  close(): Promise<void>;
  getConnectionState(): ExecutionConnectionState;
  markUnusable(): void;
};

export type ExecutionPgTransport = {
  createClient(config: ExecutionPgClientConfig): ExecutionPgClient;
};

export type ExecutionPgTransportFactoryDeps = {
  readonly createClient?: (config: ExecutionPgClientConfig) => ExecutionPgClient;
};

type PgQueryError = Error & {
  readonly code?: string;
};

const CONTROLLED_COMMIT_REJECTION_SQLSTATES = new Set([
  '25P02',
  '40001',
  '23505',
  '23503',
  '23514',
  '23502',
  '42P01',
  '42703',
]);

function getPgErrorCode(error: unknown): string | null {
  if (error !== null && typeof error === 'object' && 'code' in error) {
    const code = (error as PgQueryError).code;
    return typeof code === 'string' && code.length > 0 ? code : null;
  }
  return null;
}

function isConnectionLossPgError(error: unknown): boolean {
  const code = getPgErrorCode(error);
  if (code === '57P01' || code === '57P02' || code === '57P03' || code === '08000' || code === '08003' || code === '08006') {
    return true;
  }
  if (error instanceof Error) {
    const name = error.name.toLowerCase();
    return name.includes('timeout') || name.includes('connection');
  }
  return false;
}

type PgModuleClient = {
  connect(): Promise<void>;
  query(text: string, values?: unknown[]): Promise<{ rows: Record<string, unknown>[]; rowCount: number | null }>;
  end(): Promise<void>;
};

type PgModule = {
  Client: new (config: Record<string, unknown>) => PgModuleClient;
};

export function buildClientConfig(
  binding: ExpectedAuthorizationBinding,
  secrets: ParsedConnectionSecrets,
): ExecutionPgClientConfig | PreviewRemoteApplyHoldCode {
  if (
    secrets.host !== binding.host ||
    secrets.port !== binding.port ||
    secrets.database !== binding.databaseName ||
    secrets.user !== binding.connectionUser ||
    secrets.sslmode !== binding.sslmode
  ) {
    return 'HOLD_CREDENTIAL_METHOD_INVALID';
  }
  if (secrets.sslmode !== 'require') {
    return 'HOLD_CREDENTIAL_METHOD_INVALID';
  }
  return {
    host: secrets.host,
    port: secrets.port,
    database: secrets.database,
    user: secrets.user,
    password: secrets.password,
    sslmode: 'require',
    connectionTimeoutMillis: TIMEOUT_POLICY.values.connectMs,
  };
}

class LazyExecutionPgClient implements ExecutionPgClient {
  private state: ExecutionConnectionState = 'open';
  private connected = false;
  private inTransaction = false;
  private readonly inner: ExecutionPgClient;

  constructor(inner: ExecutionPgClient) {
    this.inner = inner;
  }

  async connect(): Promise<void> {
    if (this.state !== 'open') {
      throw new Error('HOLD_UNEXPECTED_INTERNAL');
    }
    await this.inner.connect();
    this.connected = true;
  }

  async query(sql: string, values?: readonly unknown[]): Promise<ExecutionPgQueryResult> {
    if (this.state === 'unusable') {
      throw new Error('HOLD_UNEXPECTED_INTERNAL');
    }
    if (!this.connected) {
      throw new Error('HOLD_UNEXPECTED_INTERNAL');
    }
    return this.inner.query(sql, values);
  }

  async begin(): Promise<void> {
    if (this.state !== 'open' || !this.connected) {
      throw new Error('HOLD_UNEXPECTED_INTERNAL');
    }
    await this.inner.begin();
    this.inTransaction = true;
  }

  async commit(): Promise<{ readonly responseClass: CommitResponseClass }> {
    if (this.state !== 'open' || !this.inTransaction) {
      throw new Error('HOLD_UNEXPECTED_INTERNAL');
    }
    try {
      const result = await this.inner.commit();
      this.inTransaction = false;
      return result;
    } catch (error) {
      this.markUnusable();
      throw error;
    }
  }

  async rollback(): Promise<{ readonly acknowledged: boolean }> {
    if (this.state === 'unusable') {
      throw new Error('HOLD_UNEXPECTED_INTERNAL');
    }
    const result = await this.inner.rollback();
    this.inTransaction = false;
    return result;
  }

  async close(): Promise<void> {
    if (this.state === 'closed') {
      return;
    }
    await this.inner.close();
    this.state = 'closed';
    this.connected = false;
    this.inTransaction = false;
  }

  getConnectionState(): ExecutionConnectionState {
    return this.state;
  }

  markUnusable(): void {
    this.state = 'unusable';
    this.connected = false;
    this.inTransaction = false;
    this.inner.markUnusable();
  }
}

class RealLazyPgExecutionClient implements ExecutionPgClient {
  private state: ExecutionConnectionState = 'open';
  private connected = false;
  private inTransaction = false;
  private pgClient: PgModuleClient | null = null;
  private readonly connectionTimeoutMillis: number;
  private readonly connectHost: string;
  private readonly connectPort: number;
  private readonly connectDatabase: string;
  private readonly connectUser: string;
  private connectPassword: string;

  constructor(config: ExecutionPgClientConfig) {
    this.connectionTimeoutMillis = config.connectionTimeoutMillis;
    this.connectHost = config.host;
    this.connectPort = config.port;
    this.connectDatabase = config.database;
    this.connectUser = config.user;
    this.connectPassword = config.password;
  }

  async connect(): Promise<void> {
    if (this.state !== 'open') {
      throw new Error('HOLD_UNEXPECTED_INTERNAL');
    }
    assertNoProcessEnvPgFallback();
    const pg = (await import('pg')) as PgModule;
    this.pgClient = new pg.Client({
      host: this.connectHost,
      port: this.connectPort,
      database: this.connectDatabase,
      user: this.connectUser,
      password: this.connectPassword,
      connectionTimeoutMillis: this.connectionTimeoutMillis,
      ssl: { rejectUnauthorized: true },
    });
    await this.pgClient.connect();
    this.connectPassword = '';
    this.connected = true;
  }

  async query(sql: string, values?: readonly unknown[]): Promise<ExecutionPgQueryResult> {
    if (this.state === 'unusable' || !this.connected || !this.pgClient) {
      throw new Error('HOLD_UNEXPECTED_INTERNAL');
    }
    const result = await this.pgClient.query(sql, values ? [...values] : undefined);
    return { rows: result.rows, rowCount: result.rowCount };
  }

  async begin(): Promise<void> {
    if (this.state !== 'open' || !this.connected || !this.pgClient) {
      throw new Error('HOLD_UNEXPECTED_INTERNAL');
    }
    await this.pgClient.query('BEGIN');
    this.inTransaction = true;
  }

  async commit(): Promise<{ readonly responseClass: CommitResponseClass }> {
    if (this.state !== 'open' || !this.inTransaction || !this.pgClient) {
      throw new Error('HOLD_UNEXPECTED_INTERNAL');
    }
    try {
      await this.pgClient.query('COMMIT');
      this.inTransaction = false;
      return { responseClass: 'DEFINITIVE_COMMIT_ACK' };
    } catch (error) {
      this.inTransaction = false;
      const code = getPgErrorCode(error);
      if (this.state === 'unusable' || isConnectionLossPgError(error) || !code) {
        this.markUnusable();
        return { responseClass: 'ACK_UNCERTAIN_OR_MISSING' };
      }
      if (CONTROLLED_COMMIT_REJECTION_SQLSTATES.has(code)) {
        return { responseClass: 'DEFINITIVE_TRANSACTION_REJECTION' };
      }
      this.markUnusable();
      return { responseClass: 'ACK_UNCERTAIN_OR_MISSING' };
    }
  }

  async rollback(): Promise<{ readonly acknowledged: boolean }> {
    if (this.state === 'unusable' || !this.pgClient) {
      return { acknowledged: false };
    }
    try {
      await this.pgClient.query('ROLLBACK');
      this.inTransaction = false;
      return { acknowledged: true };
    } catch {
      this.markUnusable();
      return { acknowledged: false };
    }
  }

  async close(): Promise<void> {
    if (this.state === 'closed') {
      return;
    }
    if (this.pgClient) {
      try {
        await this.pgClient.end();
      } catch {
        // best-effort close
      }
      this.pgClient = null;
    }
    this.state = 'closed';
    this.connected = false;
    this.inTransaction = false;
  }

  getConnectionState(): ExecutionConnectionState {
    return this.state;
  }

  markUnusable(): void {
    this.state = 'unusable';
    this.connected = false;
    this.inTransaction = false;
    this.pgClient = null;
  }
}

export function createDefaultExecutionPgClient(config: ExecutionPgClientConfig): ExecutionPgClient {
  return new RealLazyPgExecutionClient(config);
}

export function createExecutionPgTransport(deps: ExecutionPgTransportFactoryDeps = {}): ExecutionPgTransport {
  return {
    createClient(config: ExecutionPgClientConfig): ExecutionPgClient {
      const factory = deps.createClient ?? createDefaultExecutionPgClient;
      const inner = factory(config);
      return new LazyExecutionPgClient(inner);
    },
  };
}

export type FakeExecutionPgClientOptions = {
  readonly commitResponseClass?: CommitResponseClass;
  readonly rollbackAcknowledged?: boolean;
  readonly postConnectRows?: readonly Record<string, unknown>[];
  readonly queryHandler?: (
    sql: string,
    values?: readonly unknown[],
  ) => ExecutionPgQueryResult | Promise<ExecutionPgQueryResult>;
  readonly failConnect?: boolean;
  readonly failBegin?: boolean;
  readonly failCommit?: boolean;
  readonly failRollback?: boolean;
  readonly failQuery?: boolean;
  readonly transportLossOnCommit?: boolean;
};

export type FakeExecutionPgClientFactory = {
  readonly clients: FakeExecutionPgClient[];
  createClient(config: ExecutionPgClientConfig): FakeExecutionPgClient;
};

export class FakeExecutionPgClient implements ExecutionPgClient {
  readonly calls: string[] = [];
  readonly queries: Array<{ sql: string; values?: readonly unknown[] }> = [];
  readonly config: ExecutionPgClientConfig;
  private state: ExecutionConnectionState = 'open';
  private connected = false;
  private inTransaction = false;
  private readonly options: FakeExecutionPgClientOptions;

  constructor(config: ExecutionPgClientConfig, options: FakeExecutionPgClientOptions = {}) {
    this.config = config;
    this.options = options;
  }

  async connect(): Promise<void> {
    this.calls.push('connect');
    if (this.options.failConnect) {
      throw new Error('HOLD_UNEXPECTED_INTERNAL');
    }
    this.connected = true;
  }

  async query(sql: string, values?: readonly unknown[]): Promise<ExecutionPgQueryResult> {
    this.calls.push('query');
    this.queries.push({ sql, values });
    if (this.options.failQuery) {
      throw new Error('HOLD_UNEXPECTED_INTERNAL');
    }
    if (this.options.queryHandler) {
      return Promise.resolve(this.options.queryHandler(sql, values));
    }
    if (this.options.postConnectRows) {
      return { rows: [...this.options.postConnectRows], rowCount: this.options.postConnectRows.length };
    }
    return { rows: [], rowCount: 0 };
  }

  async begin(): Promise<void> {
    this.calls.push('begin');
    if (this.options.failBegin) {
      throw new Error('HOLD_UNEXPECTED_INTERNAL');
    }
    this.inTransaction = true;
  }

  async commit(): Promise<{ readonly responseClass: CommitResponseClass }> {
    this.calls.push('commit');
    if (this.options.transportLossOnCommit) {
      this.markUnusable();
      throw new Error('HOLD_UNEXPECTED_INTERNAL');
    }
    if (this.options.failCommit) {
      throw new Error('HOLD_UNEXPECTED_INTERNAL');
    }
    this.inTransaction = false;
    const responseClass = this.options.commitResponseClass ?? 'DEFINITIVE_COMMIT_ACK';
    if (!COMMIT_RESPONSE_CLASSES.includes(responseClass)) {
      return { responseClass: 'DEFINITIVE_COMMIT_ACK' };
    }
    return { responseClass };
  }

  async rollback(): Promise<{ readonly acknowledged: boolean }> {
    this.calls.push('rollback');
    if (this.options.failRollback) {
      throw new Error('HOLD_UNEXPECTED_INTERNAL');
    }
    this.inTransaction = false;
    return { acknowledged: this.options.rollbackAcknowledged ?? true };
  }

  async close(): Promise<void> {
    this.calls.push('close');
    this.state = 'closed';
    this.connected = false;
    this.inTransaction = false;
  }

  getConnectionState(): ExecutionConnectionState {
    return this.state;
  }

  markUnusable(): void {
    this.state = 'unusable';
    this.connected = false;
    this.inTransaction = false;
  }
}

export function createFakeExecutionPgClientFactory(
  options: FakeExecutionPgClientOptions = {},
): FakeExecutionPgClientFactory {
  const clients: FakeExecutionPgClient[] = [];
  return {
    clients,
    createClient(config: ExecutionPgClientConfig): FakeExecutionPgClient {
      const client = new FakeExecutionPgClient(config, options);
      clients.push(client);
      return client;
    },
  };
}

export function normalizeExecutionTransportError(error: unknown): PreviewRemoteApplyHoldCode {
  if (error instanceof Error) {
    return sanitizePreviewRemoteApplyHoldCode(error.message);
  }
  return 'HOLD_UNEXPECTED_INTERNAL';
}

export function assertNoProcessEnvPgFallback(): void {
  const forbidden = ['PGHOST', 'PGPORT', 'PGUSER', 'PGPASSWORD', 'PGDATABASE', 'DATABASE_URL'];
  for (const key of forbidden) {
    if (Object.prototype.hasOwnProperty.call(process.env, key)) {
      throw new Error('HOLD_CREDENTIAL_METHOD_INVALID');
    }
  }
}
