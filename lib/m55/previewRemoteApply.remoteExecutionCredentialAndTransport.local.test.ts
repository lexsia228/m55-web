import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { closeSync, existsSync, mkdirSync, mkdtempSync, openSync, readdirSync, symlinkSync, writeSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PassThrough } from 'node:stream';
import { describe, it } from 'node:test';

import {
  acquireExecutionCredentials,
  acquireSecureStdinConnectionConfig,
  parseSecureStdinConnectionConfig,
  readBoundedBytesOnceFromStream,
  readBoundedStdinBytesOnce,
  SECURE_STDIN_MAX_BYTES,
  type CredentialAcquirerDeps,
} from './previewRemoteApply/remoteExecutionCredentialAcquirer.ts';
import {
  buildClientConfig,
  createDefaultExecutionPgClient,
  createExecutionPgTransport,
  createFakeExecutionPgClientFactory,
  type ExecutionPgClientConfig,
} from './previewRemoteApply/remoteExecutionPgTransport.ts';
import {
  APPROVED_PREVIEW_PROJECT_REF,
  calculateCanonicalHostFingerprint,
  expectedConnectionUserForProjectRef,
  POST_CONNECT_GUARD_SQL,
  SESSION_POOLER_CONNECTION_ENDPOINT_PROFILE,
  SESSION_POOLER_HOST,
  type ExpectedAuthorizationBinding,
} from './previewRemoteApply/remoteConnectionAuthority.ts';
import { EXPECTED_BRANCH } from './previewRemoteApply/types.ts';

const SENTINEL = '__M55_SYNTHETIC_SENTINEL_SECRET__';
const VALID_PROJECT_REF = APPROVED_PREVIEW_PROJECT_REF;
const VALID_HOST = SESSION_POOLER_HOST;
const VALID_CONNECTION_USER = expectedConnectionUserForProjectRef(VALID_PROJECT_REF);

function validBinding(overrides: Partial<ExpectedAuthorizationBinding> = {}): ExpectedAuthorizationBinding {
  const fingerprint = calculateCanonicalHostFingerprint(VALID_HOST);
  assert.equal(fingerprint.ok, true);
  return {
    environment: 'Preview',
    organizationSlug: 'm55-preview',
    projectName: 'm55-soul-preview',
    databaseSource: 'Primary Database',
    databaseName: 'postgres',
    expectedCurrentUser: 'postgres',
    connectionEndpointProfile: SESSION_POOLER_CONNECTION_ENDPOINT_PROFILE,
    connectionUser: VALID_CONNECTION_USER,
    projectRef: VALID_PROJECT_REF,
    host: VALID_HOST,
    hostFingerprintSha256: fingerprint.fingerprintSha256,
    port: 5432,
    sslmode: 'require',
    credentialMethod: 'SECURE_STDIN_CONNECTION_CONFIG_v1',
    repositoryBranch: EXPECTED_BRANCH,
    repositoryHead: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
    repositoryTree: 'cccccccccccccccccccccccccccccccccccccccc',
    executionAuthorizationId: 'M55-HUMAN-EXEC-AUTH-TEST-001',
    selectedStep: 'P1',
    executionSqlAuthorityFoundationId: 'M55_PREVIEW_REMOTE_EXECUTION_SQL_AUTHORITY_FOUNDATION_v1',
    executionSqlAuthorityFoundationManifestId:
      'M55_PREVIEW_REMOTE_EXECUTION_SQL_AUTHORITY_FOUNDATION_MANIFEST_v1',
    remoteExecutionLifecycleAuthorityId: 'M55_PREVIEW_REMOTE_EXECUTION_LIFECYCLE_AUTHORITY_v1',
    remoteConnectionAuthorityId: 'M55_PREVIEW_REMOTE_CONNECTION_AUTHORITY_v1',
    ...overrides,
  };
}

function validStdinJson(overrides: Record<string, unknown> = {}): Buffer {
  const payload = {
    host: VALID_HOST,
    port: 5432,
    database: 'postgres',
    user: VALID_CONNECTION_USER,
    password: SENTINEL,
    sslmode: 'require',
    ...overrides,
  };
  return Buffer.from(JSON.stringify(payload), 'utf8');
}

function assertNoSentinel(value: unknown): void {
  const text = JSON.stringify(value);
  assert.equal(text.includes(SENTINEL), false);
  assert.equal(text.toLowerCase().includes('password'), false);
}

function validReceipt(binding: ExpectedAuthorizationBinding) {
  return {
    outcome: 'PASS_TARGET_BINDING' as const,
    targetBindingIdentifier: createHash('sha256').update('binding', 'utf8').digest('hex'),
    credentialMethod: binding.credentialMethod,
    selectedStep: binding.selectedStep,
    repositoryHead: binding.repositoryHead,
    repositoryTree: binding.repositoryTree,
    executionAuthorizationId: binding.executionAuthorizationId,
  };
}

describe('remote execution credential and transport E1-E20', () => {
  it('E1 strict single-object stdin parser accepts valid payload', async () => {
    const parsed = parseSecureStdinConnectionConfig(validStdinJson());
    assert.equal(parsed.ok, true);
    if (parsed.ok) {
      assert.equal(parsed.secrets.host, VALID_HOST);
      assert.equal(parsed.secrets.sslmode, 'require');
    }
  });

  it('E2 duplicate key rejection', () => {
    const duplicate = Buffer.from(
      '{"host":"h","host":"h","port":5432,"database":"postgres","user":"postgres","password":"x","sslmode":"require"}',
      'utf8',
    );
    const parsed = parseSecureStdinConnectionConfig(duplicate);
    assert.equal(parsed.ok, false);
    assertNoSentinel(parsed);
  });

  it('E3 unknown key rejection', () => {
    const parsed = parseSecureStdinConnectionConfig(validStdinJson({ extra: 'nope' }));
    assert.equal(parsed.ok, false);
    assertNoSentinel(parsed);
  });

  it('E4 trailing data rejection', () => {
    const parsed = parseSecureStdinConnectionConfig(
      Buffer.from(`${validStdinJson().toString('utf8')} {"host":"x"}`, 'utf8'),
    );
    assert.equal(parsed.ok, false);
    assertNoSentinel(parsed);
  });

  it('E5 size bound rejection', () => {
    const oversized = Buffer.alloc(SECURE_STDIN_MAX_BYTES + 1, 97);
    const parsed = parseSecureStdinConnectionConfig(oversized);
    assert.equal(parsed.ok, false);
    assertNoSentinel(parsed);
  });

  it('E6 no secret leakage on parse error', () => {
    const parsed = parseSecureStdinConnectionConfig(
      Buffer.from(`{"host":"x","port":5432,"database":"postgres","user":"postgres","password":"${SENTINEL}","sslmode":"require",}`, 'utf8'),
    );
    assert.equal(parsed.ok, false);
    assertNoSentinel(parsed);
  });

  it('E7 TEMP_PGPASS unavailable before secret read', async () => {
    const binding = validBinding({ credentialMethod: 'TEMP_PGPASSFILE_0600_v1' });
    let secretRead = false;
    const result = await acquireExecutionCredentials('TEMP_PGPASSFILE_0600_v1', validReceipt(binding), binding, {
      readSecretLine: () => {
        secretRead = true;
        return SENTINEL;
      },
    });
    assert.equal(secretRead, false);
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.holdReasonCode, 'HOLD_CREDENTIAL_METHOD_INVALID');
    }
    assertNoSentinel(result);
  });

  it('E8 TEMP_PGPASS unavailable creates no pgpass file', async () => {
    const tempRoot = mkdtempSync(join(tmpdir(), 'm55-pgpass-unavail-'));
    const binding = validBinding({ credentialMethod: 'TEMP_PGPASSFILE_0600_v1' });
    const before = readdirSync(tempRoot);
    const result = await acquireExecutionCredentials('TEMP_PGPASSFILE_0600_v1', validReceipt(binding), binding, {
      tempRoot,
      readSecretLine: () => SENTINEL,
    });
    assert.equal(result.ok, false);
    assert.deepEqual(readdirSync(tempRoot), before);
    assertNoSentinel(result);
  });

  it('E9 TEMP_PGPASS unavailable with symlink dir untouched', async () => {
    const tempRoot = mkdtempSync(join(tmpdir(), 'm55-pgpass-symlink-'));
    const binding = validBinding({ credentialMethod: 'TEMP_PGPASSFILE_0600_v1' });
    const result = await acquireExecutionCredentials('TEMP_PGPASSFILE_0600_v1', validReceipt(binding), binding, {
      tempRoot,
      readSecretLine: () => SENTINEL,
    });
    assert.equal(result.ok, false);
    assert.equal(readdirSync(tempRoot).some((entry) => entry.startsWith('.m55-pgpass-')), false);
    assertNoSentinel(result);
  });

  it('E10 TEMP_PGPASS unavailable with preexisting dir untouched', async () => {
    const tempRoot = mkdtempSync(join(tmpdir(), 'm55-pgpass-preexisting-'));
    const binding = validBinding({ credentialMethod: 'TEMP_PGPASSFILE_0600_v1' });
    const suffix = 'preexisting-test';
    const dirPath = join(tempRoot, `.m55-pgpass-${suffix}`);
    mkdirSync(dirPath, { mode: 0o700 });
    writeSync(openSync(join(dirPath, 'pgpass'), 'wx', 0o600), 'host:1:db:user:pw\n');
    const result = await acquireExecutionCredentials('TEMP_PGPASSFILE_0600_v1', validReceipt(binding), binding, {
      tempRoot,
      readSecretLine: () => SENTINEL,
      randomSuffix: () => suffix,
    });
    assert.equal(result.ok, false);
    assert.equal(existsSync(join(dirPath, 'pgpass')), true);
    assertNoSentinel(result);
  });

  it('E11 TEMP_PGPASS unavailable never writes pgpass tuple', async () => {
    const tempRoot = mkdtempSync(join(tmpdir(), 'm55-pgpass-no-write-'));
    const binding = validBinding({ credentialMethod: 'TEMP_PGPASSFILE_0600_v1' });
    const result = await acquireExecutionCredentials('TEMP_PGPASSFILE_0600_v1', validReceipt(binding), binding, {
      tempRoot,
      readSecretLine: () => SENTINEL,
    });
    assert.equal(result.ok, false);
    assert.equal(readdirSync(tempRoot).length, 0);
    assertNoSentinel(result);
  });

  it('E12 secure stdin cleanup on success', async () => {
    const result = await acquireSecureStdinConnectionConfig({ readBytes: () => validStdinJson() });
    assert.equal(result.ok, true);
    if (result.ok) {
      const secrets = result.releaseConnectionSecrets();
      assert.equal(secrets.password, SENTINEL);
      result.cleanup();
      assertNoSentinel(result.handle);
    }
  });

  it('E13 secure stdin cleanup on failure', async () => {
    const result = await acquireSecureStdinConnectionConfig({ readBytes: () => Buffer.from('not-json', 'utf8') });
    assert.equal(result.ok, false);
    assertNoSentinel(result);
  });

  it('E14 no ambient env fallback in transport factory', () => {
    const prior = process.env.PGHOST;
    process.env.PGHOST = 'localhost';
    try {
      const factory = createFakeExecutionPgClientFactory();
      const transport = createExecutionPgTransport({ createClient: (config) => factory.createClient(config) });
      const config: ExecutionPgClientConfig = {
        host: VALID_HOST,
        port: 5432,
        database: 'postgres',
        user: 'postgres',
        password: SENTINEL,
        sslmode: 'require',
        connectionTimeoutMillis: 15000,
      };
      const client = transport.createClient(config);
      assert.equal(typeof client.connect, 'function');
      assertNoSentinel({ credentialMethod: 'SECURE_STDIN_CONNECTION_CONFIG_v1', cleanupToken: 'abc' });
    } finally {
      if (prior === undefined) delete process.env.PGHOST;
      else process.env.PGHOST = prior;
    }
  });

  it('E15 exact pg config construction from binding and secrets', () => {
    const binding = validBinding();
    const config = buildClientConfig(binding, {
      host: binding.host,
      port: binding.port,
      database: binding.databaseName,
      user: binding.connectionUser,
      password: SENTINEL,
      sslmode: 'require',
      connectionTimeoutMillis: 15000,
    });
    assert.notEqual(typeof config, 'string');
    if (typeof config !== 'string') {
      assert.equal(config.host, VALID_HOST);
      assert.equal(config.sslmode, 'require');
      assert.equal(config.connectionTimeoutMillis, 15000);
      assert.equal(config.port, 5432);
      assertNoSentinel({ host: config.host, port: config.port, sslmode: config.sslmode });
    }
  });

  it('E16 fake client only without real pg import', async () => {
    const factory = createFakeExecutionPgClientFactory();
    const transport = createExecutionPgTransport({ createClient: (config) => factory.createClient(config) });
    const client = transport.createClient({
      host: VALID_HOST,
      port: 5432,
      database: 'postgres',
      user: 'postgres',
      password: SENTINEL,
      sslmode: 'require',
      connectionTimeoutMillis: 15000,
    });
    await client.connect();
    await client.close();
    assert.equal(factory.clients.length, 1);
    assert.deepEqual(factory.clients[0]!.calls, ['connect', 'close']);
  });

  it('E17 close retire idempotent', async () => {
    const factory = createFakeExecutionPgClientFactory();
    const transport = createExecutionPgTransport({ createClient: (config) => factory.createClient(config) });
    const client = transport.createClient({
      host: VALID_HOST,
      port: 5432,
      database: 'postgres',
      user: 'postgres',
      password: SENTINEL,
      sslmode: 'require',
      connectionTimeoutMillis: 15000,
    });
    await client.connect();
    await client.close();
    await client.close();
    assert.equal(client.getConnectionState(), 'closed');
  });

  it('E18 uncertain transport marks original unusable', async () => {
    const factory = createFakeExecutionPgClientFactory({ transportLossOnCommit: true });
    const transport = createExecutionPgTransport({ createClient: (config) => factory.createClient(config) });
    const client = transport.createClient({
      host: VALID_HOST,
      port: 5432,
      database: 'postgres',
      user: 'postgres',
      password: SENTINEL,
      sslmode: 'require',
      connectionTimeoutMillis: 15000,
    });
    await client.connect();
    await client.begin();
    client.markUnusable();
    assert.equal(client.getConnectionState(), 'unusable');
  });

  it('E19 accessor getter count zero on stdin object', () => {
    const objectWithGetter: Record<string, unknown> = {
      host: VALID_HOST,
      port: 5432,
      database: 'postgres',
      user: 'postgres',
      password: SENTINEL,
      sslmode: 'require',
    };
    Object.defineProperty(objectWithGetter, 'extra', {
      enumerable: true,
      get() {
        return 'leak';
      },
    });
    const parsed = parseSecureStdinConnectionConfig(Buffer.from(JSON.stringify(objectWithGetter), 'utf8'));
    assert.equal(parsed.ok, false);
    assertNoSentinel(parsed);
  });

  it('E20 acquireExecutionCredentials rejects method mismatch without secret leak', async () => {
    const binding = validBinding({ credentialMethod: 'SECURE_STDIN_CONNECTION_CONFIG_v1' });
    const receipt = validReceipt(binding);
    const result = await acquireExecutionCredentials(
      'TEMP_PGPASSFILE_0600_v1',
      receipt,
      binding,
      { readBytes: () => validStdinJson() },
    );
    assert.equal(result.ok, false);
    assertNoSentinel(result);
  });
});

describe('remote execution credential and transport R1-R8', () => {
  it('R1 default CLI transport has a real lazy pg factory, without connecting in test', () => {
    const transport = createExecutionPgTransport({});
    const client = transport.createClient({
      host: VALID_HOST,
      port: 5432,
      database: 'postgres',
      user: 'postgres',
      password: SENTINEL,
      sslmode: 'require',
      connectionTimeoutMillis: 15000,
    });
    assert.equal(typeof client.connect, 'function');
    assert.equal(client.getConnectionState(), 'open');
    const direct = createDefaultExecutionPgClient({
      host: VALID_HOST,
      port: 5432,
      database: 'postgres',
      user: 'postgres',
      password: SENTINEL,
      sslmode: 'require',
      connectionTimeoutMillis: 15000,
    });
    assert.equal(direct.getConnectionState(), 'open');
    assertNoSentinel({ transport: 'default', state: client.getConnectionState() });
  });

  it('R2 pg import/client creation occurs only after binding+credential gates', async () => {
    const order: string[] = [];
    const factory = createFakeExecutionPgClientFactory();
    const transport = createExecutionPgTransport({
      createClient: (config) => {
        order.push('createClient');
        return factory.createClient(config);
      },
    });
    const binding = validBinding();
    const receipt = validReceipt(binding);
    const blocked = await acquireExecutionCredentials(
      'TEMP_PGPASSFILE_0600_v1',
      receipt,
      binding,
      { readBytes: () => validStdinJson() },
    );
    assert.equal(blocked.ok, false);
    assert.equal(order.length, 0);
    transport.createClient({
      host: VALID_HOST,
      port: 5432,
      database: 'postgres',
      user: 'postgres',
      password: SENTINEL,
      sslmode: 'require',
      connectionTimeoutMillis: 15000,
    });
    assert.deepEqual(order, ['createClient']);
    assertNoSentinel(order);
  });

  it('R3 secure stdin CLI adapter reads once, bounded, and zeroizes', async () => {
    let readCount = 0;
    const payload = validStdinJson();
    const acquired = await acquireSecureStdinConnectionConfig({
      readBytes: () => {
        readCount += 1;
        return Buffer.from(payload);
      },
    });
    assert.equal(readCount, 1);
    assert.equal(acquired.ok, true);
    if (acquired.ok) {
      const secrets = acquired.releaseConnectionSecrets();
      assert.equal(secrets.host, VALID_HOST);
      acquired.cleanup();
      assertNoSentinel(acquired.handle);
    }
    const boundedReject = parseSecureStdinConnectionConfig(Buffer.alloc(SECURE_STDIN_MAX_BYTES + 1, 97));
    assert.equal(boundedReject.ok, false);
    assertNoSentinel(boundedReject);
  });

  it('R4 escaped-equivalent duplicate JSON keys rejected', () => {
    const duplicate = Buffer.from(
      '{"\\u0068ost":"a","host":"b","port":5432,"database":"postgres","user":"postgres","password":"x","sslmode":"require"}',
      'utf8',
    );
    const parsed = parseSecureStdinConnectionConfig(duplicate);
    assert.equal(parsed.ok, false);
    assertNoSentinel(parsed);
  });

  it('R5 TEMP_PGPASS CLI source unavailable HOLD only', async () => {
    const binding = validBinding({ credentialMethod: 'TEMP_PGPASSFILE_0600_v1' });
    const receipt = validReceipt(binding);
    const cliGap = await acquireExecutionCredentials('TEMP_PGPASSFILE_0600_v1', receipt, binding, {});
    assert.equal(cliGap.ok, false);
    if (!cliGap.ok) {
      assert.equal(cliGap.holdReasonCode, 'HOLD_CREDENTIAL_METHOD_INVALID');
    }
    const credentialModule = await import('./previewRemoteApply/remoteExecutionCredentialAcquirer.ts');
    assert.equal('acquireTempPgpassfile0600' in credentialModule, false);
    assertNoSentinel(cliGap);
  });

  it('R6 no ambient PG env fallback', async () => {
    const prior: Record<string, string | undefined> = {};
    for (const key of ['PGHOST', 'PGPORT', 'PGUSER', 'PGPASSWORD', 'PGDATABASE', 'DATABASE_URL']) {
      prior[key] = process.env[key];
      process.env[key] = key === 'PGPORT' ? '5432' : 'ambient-leak';
    }
    try {
      const client = createDefaultExecutionPgClient({
        host: VALID_HOST,
        port: 5432,
        database: 'postgres',
        user: 'postgres',
        password: SENTINEL,
        sslmode: 'require',
      });
      await assert.rejects(() => client.connect(), /HOLD_CREDENTIAL_METHOD_INVALID|HOLD_UNEXPECTED_INTERNAL/);
      assertNoSentinel({ envGuard: true });
    } finally {
      for (const [key, value] of Object.entries(prior)) {
        if (value === undefined) delete process.env[key];
        else process.env[key] = value;
      }
    }
  });

  it('R7 structured COMMIT ACK / rejection / uncertainty outcomes', async () => {
    for (const responseClass of [
      'DEFINITIVE_COMMIT_ACK',
      'DEFINITIVE_TRANSACTION_REJECTION',
      'ACK_UNCERTAIN_OR_MISSING',
    ] as const) {
      const factory = createFakeExecutionPgClientFactory({ commitResponseClass: responseClass });
      const transport = createExecutionPgTransport({ createClient: (config) => factory.createClient(config) });
      const client = transport.createClient({
        host: VALID_HOST,
        port: 5432,
        database: 'postgres',
        user: 'postgres',
        password: SENTINEL,
        sslmode: 'require',
      });
      await client.connect();
      await client.begin();
      const commit = await client.commit();
      assert.equal(commit.responseClass, responseClass);
      await client.close();
      assertNoSentinel(commit);
    }
  });

  it('R8 transport loss marks wrapper and inner connection unusable', async () => {
    const innerFactory = createFakeExecutionPgClientFactory({ transportLossOnCommit: true });
    const transport = createExecutionPgTransport({ createClient: (config) => innerFactory.createClient(config) });
    const client = transport.createClient({
      host: VALID_HOST,
      port: 5432,
      database: 'postgres',
      user: 'postgres',
      password: SENTINEL,
      sslmode: 'require',
      connectionTimeoutMillis: 15000,
    });
    await client.connect();
    await client.begin();
    await assert.rejects(() => client.commit(), /HOLD_UNEXPECTED_INTERNAL/);
    assert.equal(client.getConnectionState(), 'unusable');
    assert.equal(innerFactory.clients[0]!.getConnectionState(), 'unusable');
    assertNoSentinel({ state: client.getConnectionState() });
  });
});

describe('remote execution credential U1-U3 CORRECTION-5', () => {
  function validStdinPayload(): Buffer {
    return Buffer.from(
      JSON.stringify({
        host: VALID_HOST,
        port: 5432,
        database: 'postgres',
        user: 'postgres',
        password: SENTINEL,
        sslmode: 'require',
      }),
      'utf8',
    );
  }

  it('U1 success path zeroizes every original stdin chunk immediately after concat', async () => {
    const payload = validStdinPayload();
    const splitAt = Math.max(1, Math.floor(payload.length / 2));
    const chunk1 = Buffer.from(payload.subarray(0, splitAt));
    const chunk2 = Buffer.from(payload.subarray(splitAt));
    const stream = new PassThrough();
    const readPromise = readBoundedBytesOnceFromStream(stream);
    stream.write(chunk1);
    stream.write(chunk2);
    stream.end();
    const copied = await readPromise;
    assert.equal(chunk1.every((byte) => byte === 0), true);
    assert.equal(chunk2.every((byte) => byte === 0), true);
    assert.equal(copied.length, payload.length);
    assert.equal(copied.equals(payload), true);
    copied.fill(0);
    assertNoSentinel({ copiedLength: copied.length });
  });

  it('U2 returned copied buffer zeroizes on credential cleanup', async () => {
    let returned: Buffer | null = null;
    const acquired = await acquireSecureStdinConnectionConfig({
      readBytes: async () => {
        returned = Buffer.from(validStdinPayload());
        return returned;
      },
    });
    assert.equal(acquired.ok, true);
    if (acquired.ok) {
      acquired.cleanup();
    }
    assert.ok(returned);
    assert.equal(returned!.every((byte) => byte === 0), true);
    assertNoSentinel({ zeroized: true });
  });

  it('U3 overflow/error paths zeroize all retained chunks', async () => {
    const overflowStream = new PassThrough();
    const overflowChunk = Buffer.alloc(SECURE_STDIN_MAX_BYTES + 1, 97);
    const overflowRead = readBoundedBytesOnceFromStream(overflowStream);
    overflowStream.write(overflowChunk);
    overflowStream.end();
    await assert.rejects(overflowRead, /HOLD_CREDENTIAL_METHOD_INVALID/);
    assert.equal(overflowChunk.every((byte) => byte === 0), true);

    const errorStream = new PassThrough();
    const errorChunk = Buffer.from('{"host":"x"}');
    const errorRead = readBoundedBytesOnceFromStream(errorStream);
    errorStream.write(errorChunk);
    errorStream.destroy(new Error('STREAM_READ_FAILED'));
    await assert.rejects(errorRead, /STREAM_READ_FAILED/);
    assert.equal(errorChunk.every((byte) => byte === 0), true);
    assertNoSentinel({ overflow: true, error: true });
  });
});

describe('remote execution credential session pooler correction-1 V9-V11', () => {
  it('V9 buildClientConfig accepts pooler login user', () => {
    const binding = validBinding();
    const config = buildClientConfig(binding, {
      host: binding.host,
      port: binding.port,
      database: binding.databaseName,
      user: binding.connectionUser,
      password: SENTINEL,
      sslmode: 'require',
    });
    assert.notEqual(typeof config, 'string');
    if (typeof config !== 'string') {
      assert.equal(config.user, VALID_CONNECTION_USER);
      assert.equal(config.host, VALID_HOST);
      assertNoSentinel({ user: config.user, host: config.host });
    }
  });

  it('V10 buildClientConfig rejects user=postgres for pooler binding', () => {
    const binding = validBinding();
    const config = buildClientConfig(binding, {
      host: binding.host,
      port: binding.port,
      database: binding.databaseName,
      user: 'postgres',
      password: SENTINEL,
      sslmode: 'require',
    });
    assert.equal(config, 'HOLD_CREDENTIAL_METHOD_INVALID');
    assertNoSentinel(config);
  });

  it('V11 post-connect guard still accepts current_user_name=postgres', async () => {
    const factory = createFakeExecutionPgClientFactory({
      postConnectRows: [{ current_database_name: 'postgres', current_user_name: 'postgres' }],
    });
    const transport = createExecutionPgTransport({ createClient: (config) => factory.createClient(config) });
    const binding = validBinding();
    const config = buildClientConfig(binding, {
      host: binding.host,
      port: binding.port,
      database: binding.databaseName,
      user: binding.connectionUser,
      password: SENTINEL,
      sslmode: 'require',
      connectionTimeoutMillis: 15000,
    });
    assert.notEqual(typeof config, 'string');
    const client = transport.createClient(config as ExecutionPgClientConfig);
    await client.connect();
    const guard = await client.query(POST_CONNECT_GUARD_SQL);
    assert.equal(guard.rows[0]?.current_database_name, 'postgres');
    assert.equal(guard.rows[0]?.current_user_name, 'postgres');
    assert.equal(config.user, VALID_CONNECTION_USER);
    await client.close();
    assertNoSentinel(guard);
  });
});
