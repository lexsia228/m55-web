import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { canonicalStringify } from './canonical-json.mjs';
import { sha256Canonical, sha256RecordExcluding } from './hash.mjs';
import { readHistory, computeEventHash, historySha256FromEvents } from './history.mjs';
import { readObservations, getGeneratedAt, observationsSha256FromObject } from './observations.mjs';
import { scanObjectForSecrets } from './secret-scan.mjs';

export const AUTHORITY_PATH = '.product-authority/authority.json';
export const LOCK_PATH = '.product-authority/authority.lock.json';
export const GENERATOR_VERSION = '1.0.0';

export const SOURCE_PATHS = [
  '.product-authority/authority.json',
  '.product-authority/observations.json',
  '.product-authority/authority-history.jsonl',
  '.product-authority/schema/authority-pack.schema.json',
];

export const GENERATED_ARTIFACT_PATHS = [
  '.product-authority/generated/handoff.md',
  '.product-authority/generated/handoff.json',
  '.product-authority/generated/authority-header.md',
  '.product-authority/generated/adapters/codex.md',
  '.product-authority/generated/adapters/cursor.md',
  '.product-authority/generated/adapters/generic-agent.md',
];

/**
 * @param {string} payload
 * @param {string} relPath
 * @param {Record<string, string>} hashes
 * @param {string} generatedAt
 * @returns {Record<string, unknown>}
 */
export function buildArtifactRecord(payload, relPath, hashes, generatedAt) {
  const normalizedPayload = normalizeArtifactPayloadForHash(payload, relPath);
  const base = {
    path: relPath,
    payload: normalizedPayload,
    metadata: {
      authoritySha256: hashes.authoritySha256,
      observationsSha256: hashes.observationsSha256,
      historySha256: hashes.historySha256,
      generatorVersion: GENERATOR_VERSION,
      generatedAt,
      sourcePaths: [...SOURCE_PATHS],
    },
  };
  const artifactSha256 = sha256RecordExcluding(base, ['artifactSha256', 'generatedBundleSha256']);
  return { ...base, artifactSha256, displayPayload: payload };
}

export const METADATA_START = '<!-- PRODUCT_AUTHORITY_METADATA_START -->';
export const METADATA_END = '<!-- PRODUCT_AUTHORITY_METADATA_END -->';

/**
 * @param {Record<string, string>} fields
 * @returns {string}
 */
export function renderMetadataBlock(fields) {
  const lines = Object.entries(fields).map(([key, value]) => `${key}: ${value}`);
  return `${METADATA_START}\n${lines.join('\n')}\n${METADATA_END}`;
}

/**
 * @param {string} payload
 * @returns {string}
 */
export function stripMetadataBlock(payload) {
  return payload.replace(
    new RegExp(`\\n?${METADATA_START.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[\\s\\S]*?${METADATA_END.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\n?`, 'm'),
    '',
  );
}

/**
 * @param {string} payload
 * @returns {Record<string, string>}
 */
export function parseMetadataBlock(payload) {
  const match = payload.match(
    new RegExp(`${METADATA_START.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\n([\\s\\S]*?)${METADATA_END.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`),
  );
  if (!match) return {};
  const fields = {};
  for (const line of match[1].split('\n')) {
    const fieldMatch = line.match(/^([a-zA-Z0-9_]+):\s*(.+)$/);
    if (fieldMatch) fields[fieldMatch[1]] = fieldMatch[2].trim();
  }
  return fields;
}

/**
 * @param {string} body
 * @param {Record<string, string>} fields
 * @returns {string}
 */
export function appendMetadataBlock(body, fields) {
  const trimmed = body.endsWith('\n') ? body : `${body}\n`;
  return `${trimmed}\n${renderMetadataBlock(fields)}\n`;
}

/**
 * @param {string} payload
 * @param {string} relPath
 * @returns {string}
 */
export function normalizeArtifactPayloadForHash(payload, relPath) {
  if (relPath.endsWith('handoff.json')) {
    const parsed = JSON.parse(stripMetadataBlock(payload).trim());
    delete parsed.generatedBundleSha256;
    delete parsed.artifactSha256;
    return `${canonicalStringify(parsed)}\n`;
  }
  if (relPath.endsWith('.md')) {
    const normalized = stripMetadataBlock(payload);
    return normalized.endsWith('\n') ? normalized : `${normalized}\n`;
  }
  return payload;
}

const ALLOWED_CLASSIFICATIONS = new Set([
  'HUMAN_FROZEN',
  'NON_AUTHORITATIVE',
  'NORMATIVE_TARGET',
  'PROHIBITED',
]);

const ALLOWED_OBSERVATION_CLASSIFICATIONS = new Set([
  'OBSERVED_CURRENT',
  'BRANCH_LOCAL',
  'PENDING_EVIDENCE',
]);

const ALLOWED_OBSERVATION_SOURCE_KINDS = new Set([
  'GIT_OBSERVATION',
  'PROVIDER_OBSERVATION',
  'WORKTREE_OBSERVATION',
  'PENDING_EVIDENCE',
]);

const SEQUENCE2_FORBIDDEN_FIELDS = new Set([
  'finalHistorySha256',
  'finalGeneratedBundleSha256',
  'finalArtifactHash',
  'finalArtifactSha256',
  'futureCommit2Sha',
]);

const SEQUENCE2_ALLOWED_BOOTSTRAP_EVIDENCE_FIELDS = new Set([
  'bootstrapAuthoritySha256',
  'bootstrapObservationsSha256',
  'bootstrapHistorySha256',
  'bootstrapGeneratedBundleSha256',
  'sequence0EventHash',
  'commitOneArtifactEvidence',
]);

const BOOTSTRAP_EVIDENCE_SHA256_GRAMMAR = /^[a-f0-9]{64}$/;

/**
 * @param {unknown} value
 * @param {string} label
 */
function assertObservationLeafFact(value, label) {
  assertLeafFact(value, label);
  const source = /** @type {{ kind: string }} */ (/** @type {{ source: unknown }} */ (value).source);
  if (!ALLOWED_OBSERVATION_SOURCE_KINDS.has(source.kind)) {
    throw new Error(`${label}.source.kind invalid: ${source.kind}`);
  }
}

/**
 * @param {string} root
 * @returns {string}
 */
export function authorityFilePath(root) {
  return path.join(root, AUTHORITY_PATH);
}

/**
 * @param {string} root
 * @returns {Record<string, unknown>}
 */
export function readAuthority(root) {
  return JSON.parse(fs.readFileSync(authorityFilePath(root), 'utf8'));
}

/**
 * @param {string} root
 * @returns {string}
 */
export function authoritySha256(root) {
  return sha256Canonical(readAuthority(root));
}

/**
 * @param {unknown} value
 * @param {string} label
 */
export function assertLeafFact(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${label} must be a leaf-fact envelope object`);
  }
  const envelope = /** @type {Record<string, unknown>} */ (value);
  for (const key of ['value', 'classification', 'source', 'updatedAt', 'evidenceRefs']) {
    if (!(key in envelope)) throw new Error(`${label} missing ${key}`);
  }
  const source = envelope.source;
  if (!source || typeof source !== 'object') throw new Error(`${label}.source must be an object`);
  const sourceObj = /** @type {Record<string, unknown>} */ (source);
  if (typeof sourceObj.kind !== 'string' || typeof sourceObj.reference !== 'string') {
    throw new Error(`${label}.source requires kind and reference`);
  }
  if (!Array.isArray(envelope.evidenceRefs)) {
    throw new Error(`${label}.evidenceRefs must be an array`);
  }
}

/**
 * @param {Record<string, unknown>} authority
 */
export function validateAuthorityStructure(authority) {
  const requiredPaths = [
    ['product', 'id'],
    ['product', 'name'],
    ['repository', 'github'],
    ['repository', 'defaultBranch'],
    ['production', 'canonicalOrigin'],
    ['production', 'canonicalHost'],
    ['production', 'nonAuthoritativeHost'],
    ['production', 'nonAuthoritativeReason'],
    ['production', 'diagnosticsUrl'],
    ['deployment', 'vercelTeam'],
    ['deployment', 'vercelProject'],
    ['deployment', 'vercelProductionBranch'],
    ['runtimeAuthority', 'mergedRuntimePolicy'],
    ['runtimeAuthority', 'branchLocalNotMergedRuntime'],
    ['lanes', 'primaryActiveLanePolicy'],
    ['lanes', 'protectedWorktreePolicy'],
    ['policies', 'freshnessPolicy'],
    ['policies', 'secretValuesProhibited'],
  ];

  for (const pathParts of requiredPaths) {
    let cursor = authority;
    const labels = [];
    for (const part of pathParts) {
      labels.push(part);
      cursor = /** @type {Record<string, unknown>} */ (cursor)[part];
    }
    assertLeafFact(cursor, labels.join('.'));
    const classification = /** @type {{ classification: string }} */ (cursor).classification;
    if (!ALLOWED_CLASSIFICATIONS.has(classification)) {
      throw new Error(`${labels.join('.')}.classification invalid: ${classification}`);
    }
  }

  const productId = /** @type {{ value: string }} */ (authority.product.id).value;
  if (productId !== 'm55') throw new Error('product.id must be m55');

  const canonicalHost = /** @type {{ value: string }} */ (authority.production.canonicalHost).value;
  const nonAuthHost = /** @type {{ value: string }} */ (authority.production.nonAuthoritativeHost).value;
  const diagnosticsUrl = /** @type {{ value: string }} */ (authority.production.diagnosticsUrl).value;
  if (canonicalHost === nonAuthHost) {
    throw new Error('canonical and non-authoritative hosts must not overlap');
  }
  if (!diagnosticsUrl.includes(canonicalHost)) {
    throw new Error('diagnostics URL host must match canonical host');
  }

  if (/** @type {{ value: boolean }} */ (authority.runtimeAuthority.branchLocalNotMergedRuntime).value !== true) {
    throw new Error('branch-local state must not be treated as merged runtime');
  }

  const providers = ['supabase', 'clerk', 'stripe'];
  const envs = ['production', 'preview'];
  for (const provider of providers) {
    for (const env of envs) {
      const envObj = /** @type {Record<string, unknown>} */ (
        /** @type {Record<string, unknown>} */ (authority.providers)[provider]
      )[env];
      if (!envObj || typeof envObj !== 'object') {
        throw new Error(`providers.${provider}.${env} missing`);
      }
    }
  }

  const secretFindings = scanObjectForSecrets(authority, 'authority');
  if (secretFindings.length > 0) {
    throw new Error(`authority secret scan failed: ${secretFindings.join('; ')}`);
  }
}

/**
 * @param {Record<string, unknown>} observations
 */
export function validateObservationsStructure(observations) {
  const requiredPaths = [
    ['observationMeta', 'lastObservedAt'],
    ['repository', 'lastObservedOriginMainSha'],
    ['production', 'lastObservedSha'],
    ['production', 'status'],
    ['lanes', 'authorityPack', 'status'],
    ['lanes', 'authorityPack', 'worktree'],
    ['lanes', 'authorityPack', 'branch'],
    ['lanes', 'authorityPack', 'baseLastObservedOriginMainSha'],
    ['lanes', 'authorityPack', 'bootstrapStartHead'],
    ['lanes', 'authorityPack', 'expectedDirtyPolicy'],
    ['lanes', 'selfFunnel', 'status'],
    ['lanes', 'selfFunnel', 'worktree'],
    ['lanes', 'selfFunnel', 'branch'],
    ['lanes', 'selfFunnel', 'head'],
    ['lanes', 'selfFunnel', 'dirty'],
    ['lanes', 'selfFunnel', 'mutationPolicy'],
    ['lanes', 'buildWeek', 'status'],
    ['lanes', 'buildWeek', 'worktree'],
    ['lanes', 'buildWeek', 'branch'],
    ['lanes', 'buildWeek', 'head'],
    ['lanes', 'buildWeek', 'mutationPolicy'],
    ['lanes', 'growthShare', 'status'],
    ['lanes', 'growthShare', 'worktree'],
    ['lanes', 'growthShare', 'branch'],
    ['lanes', 'growthShare', 'implementationReviewedTip'],
    ['lanes', 'growthShare', 'mergeStatus'],
  ];

  for (const pathParts of requiredPaths) {
    let cursor = observations;
    const labels = [];
    for (const part of pathParts) {
      labels.push(part);
      cursor = /** @type {Record<string, unknown>} */ (cursor)[part];
    }
    assertObservationLeafFact(cursor, labels.join('.'));
    const classification = /** @type {{ classification: string }} */ (cursor).classification;
    if (!ALLOWED_OBSERVATION_CLASSIFICATIONS.has(classification)) {
      throw new Error(`${labels.join('.')}.classification invalid: ${classification}`);
    }
  }

  const prodSha = /** @type {{ value: unknown }} */ (observations.production.lastObservedSha).value;
  if (prodSha !== null) {
    throw new Error('production.lastObservedSha must remain null until independently verified');
  }

  const secretFindings = scanObjectForSecrets(observations, 'observations');
  if (secretFindings.length > 0) {
    throw new Error(`observations secret scan failed: ${secretFindings.join('; ')}`);
  }
}

/**
 * @param {Record<string, unknown>[]} events
 * @param {{ mode: 'bootstrap' | 'steady-state' }} options
 */
export function validateHistory(events, options) {
  if (events.length === 0) throw new Error('history must contain at least sequence 0');

  let previousHash = null;
  for (const event of events) {
    const sequence = event.sequence;
    if (typeof sequence !== 'number') throw new Error('history event missing sequence');
    const computed = computeEventHash(event);
    if (event.eventHash !== computed) {
      throw new Error(`history sequence ${sequence} eventHash mismatch`);
    }
    if (event.previousEventHash !== previousHash) {
      throw new Error(`history sequence ${sequence} previousEventHash mismatch`);
    }
    previousHash = /** @type {string} */ (event.eventHash);
  }

  const sequence0 = events[0];
  if (sequence0.sequence !== 0) throw new Error('history must begin with sequence 0');
  if (sequence0.kind !== 'INITIALIZATION') throw new Error('sequence 0 must be INITIALIZATION');
  if (sequence0.sourceCommit !== 'UNCOMMITTED_BOOTSTRAP') {
    throw new Error('sequence 0 sourceCommit must be UNCOMMITTED_BOOTSTRAP during bootstrap gate');
  }
  if (sequence0.bootstrap !== true) throw new Error('sequence 0 bootstrap must be true');
  if (typeof sequence0.approvalReference !== 'string' || sequence0.approvalReference.length === 0) {
    throw new Error('sequence 0 requires approvalReference');
  }

  if (options.mode === 'steady-state') {
    if (events.length !== 3) {
      throw new Error(`steady-state history requires sequences 0-2; found ${events.length}`);
    }
    const sequence1 = events[1];
    const sequence2 = events[2];
    if (sequence1.sequence !== 1 || sequence2.sequence !== 2) {
      throw new Error('steady-state history sequences must be 0, 1, 2');
    }
    if (sequence1.kind !== 'AUTHORITY_PROCESS_INCIDENT') {
      throw new Error('sequence 1 must be AUTHORITY_PROCESS_INCIDENT in steady-state');
    }
    if (sequence2.kind !== 'BOOTSTRAP_RECONCILIATION') {
      throw new Error('sequence 2 must be BOOTSTRAP_RECONCILIATION in steady-state');
    }
    if (typeof sequence1.sourceCommit !== 'string' || sequence1.sourceCommit.length !== 40) {
      throw new Error('sequence 1 requires exact Commit-1 SHA sourceCommit');
    }
    if (sequence2.sourceCommit !== sequence1.sourceCommit) {
      throw new Error('sequence 1 and sequence 2 must share the exact Commit-1 sourceCommit');
    }
    if (typeof sequence1.approvalReference !== 'string' || sequence1.approvalReference.length === 0) {
      throw new Error('sequence 1 requires approvalReference metadata');
    }
    for (const forbiddenField of SEQUENCE2_FORBIDDEN_FIELDS) {
      if (forbiddenField in sequence2) {
        throw new Error(`sequence 2 must not embed forbidden self-reference field: ${forbiddenField}`);
      }
    }
    for (const [field, value] of Object.entries(sequence2)) {
      if (!field.endsWith('Sha256') && field !== 'commitOneArtifactEvidence') continue;
      if (SEQUENCE2_ALLOWED_BOOTSTRAP_EVIDENCE_FIELDS.has(field)) {
        if (typeof value === 'string' && field !== 'commitOneArtifactEvidence') {
          if (!BOOTSTRAP_EVIDENCE_SHA256_GRAMMAR.test(value)) {
            throw new Error(`sequence 2 bootstrap evidence field ${field} must be lowercase sha256 hex`);
          }
        }
        continue;
      }
      if (field === 'historySha256' || field === 'generatedBundleSha256' || field === 'artifactSha256') {
        throw new Error(`sequence 2 must not embed forbidden final hash field: ${field}`);
      }
    }
    if ('historySha256' in sequence2 && typeof sequence2.historySha256 === 'string') {
      const currentHistoryHash = historySha256FromEvents(events);
      if (sequence2.historySha256 === currentHistoryHash) {
        throw new Error('sequence 2 must not embed final sequence-0-to-2 historySha256 self-reference');
      }
    }
    if ('generatedBundleSha256' in sequence2 && typeof sequence2.generatedBundleSha256 === 'string') {
      throw new Error('sequence 2 must not embed final generatedBundleSha256 self-reference');
    }
  }

  if (options.mode === 'bootstrap' && events.length !== 1) {
    throw new Error(`bootstrap history must contain only sequence 0; found ${events.length}`);
  }
}

/**
 * @param {string} root
 * @param {{ mode: 'bootstrap' | 'steady-state' }} options
 * @returns {{ ok: boolean, errors: string[] }}
 */
export function verifyProductAuthority(root, options) {
  const errors = [];
  try {
    const authority = readAuthority(root);
    validateAuthorityStructure(authority);
    const observations = readObservations(root);
    validateObservationsStructure(observations);
    const events = readHistory(root);
    validateHistory(events, options);

    const authorityHash = sha256Canonical(authority);
    const observationsHash = observationsSha256FromObject(observations);
    const historyHash = historySha256FromEvents(events);

    const lockPath = path.join(root, LOCK_PATH);
    if (!fs.existsSync(lockPath)) {
      errors.push('missing authority.lock.json — run generate first');
    } else {
      const lock = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
      if (lock.authoritySha256 !== authorityHash) errors.push('lock authoritySha256 mismatch');
      if (lock.observationsSha256 !== observationsHash) errors.push('lock observationsSha256 mismatch');
      if (lock.historySha256 !== historyHash) errors.push('lock historySha256 mismatch');
      if (lock.generatorVersion !== GENERATOR_VERSION) errors.push('lock generatorVersion mismatch');

      const generatedAt = getGeneratedAt(observations);
      const verifiedArtifacts = [];
      for (const artifact of lock.artifacts ?? []) {
        const rel = artifact.path;
        const abs = path.join(root, rel);
        if (!fs.existsSync(abs)) {
          errors.push(`missing generated artifact: ${rel}`);
          continue;
        }
        const payload = fs.readFileSync(abs, 'utf8');
        const record = buildArtifactRecord(payload, rel, {
          authoritySha256: authorityHash,
          observationsSha256: observationsHash,
          historySha256: historyHash,
        }, generatedAt);
        if (record.artifactSha256 !== artifact.artifactSha256) {
          errors.push(`artifact hash mismatch: ${rel}`);
        }
        verifiedArtifacts.push({ path: rel, artifactSha256: artifact.artifactSha256 });
      }

      const lockArtifactPaths = (lock.artifacts ?? []).map((artifact) => artifact.path);
      if (JSON.stringify(lockArtifactPaths) !== JSON.stringify(GENERATED_ARTIFACT_PATHS)) {
        errors.push('lock artifact ordering mismatch');
      }

      if (JSON.stringify(lock.sourcePaths) !== JSON.stringify(SOURCE_PATHS)) {
        errors.push('lock sourcePaths mismatch');
      }

      const manifest = {
        generatorVersion: GENERATOR_VERSION,
        authoritySha256: authorityHash,
        observationsSha256: observationsHash,
        historySha256: historyHash,
        sourcePaths: [...SOURCE_PATHS],
        artifacts: verifiedArtifacts,
      };
      const expectedBundleSha256 = sha256RecordExcluding(manifest, ['generatedBundleSha256']);
      if (lock.generatedBundleSha256 !== expectedBundleSha256) {
        errors.push('lock generatedBundleSha256 mismatch');
      }

      verifyRenderedMetadataAgainstLock(root, lock, errors);
    }

    for (const rel of GENERATED_ARTIFACT_PATHS) {
      const abs = path.join(root, rel);
      if (!fs.existsSync(abs)) errors.push(`missing generated artifact: ${rel}`);
    }
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error));
  }

  return { ok: errors.length === 0, errors };
}

/**
 * @param {string} payload
 * @param {string} relPath
 * @returns {Record<string, string>}
 */
function parseRenderedMetadata(payload, relPath) {
  if (relPath.endsWith('.json')) {
    const parsed = JSON.parse(stripMetadataBlock(payload).trim());
    return {
      generatedBundleSha256: typeof parsed.generatedBundleSha256 === 'string' ? parsed.generatedBundleSha256 : '',
      artifactSha256: typeof parsed.artifactSha256 === 'string' ? parsed.artifactSha256 : '',
    };
  }
  return parseMetadataBlock(payload);
}

/**
 * @param {string} root
 * @param {Record<string, unknown>} lock
 * @param {string[]} errors
 */
function verifyRenderedMetadataAgainstLock(root, lock, errors) {
  const artifactsByPath = new Map(
    (lock.artifacts ?? []).map((artifact) => [artifact.path, artifact.artifactSha256]),
  );

  for (const relPath of GENERATED_ARTIFACT_PATHS) {
    const abs = path.join(root, relPath);
    if (!fs.existsSync(abs)) continue;
    const payload = fs.readFileSync(abs, 'utf8');
    const metadata = parseRenderedMetadata(payload, relPath);

    if (metadata.generatedBundleSha256 !== lock.generatedBundleSha256) {
      errors.push(`rendered generatedBundleSha256 mismatch: ${relPath}`);
    }

    const expectedArtifactSha256 = artifactsByPath.get(relPath);
    if (expectedArtifactSha256 && metadata.artifactSha256 !== expectedArtifactSha256) {
      errors.push(`rendered artifactSha256 mismatch: ${relPath}`);
    }
  }
}

/**
 * @param {string} [root]
 */
export function runVerifyCli(root = process.cwd()) {
  const mode = process.argv.includes('--steady-state') ? 'steady-state' : 'bootstrap';
  const result = verifyProductAuthority(root, { mode });
  if (!result.ok) {
    console.error(`verify:product-authority:${mode} FAIL`);
    for (const error of result.errors) console.error(`- ${error}`);
    process.exit(1);
  }
  console.log(`verify:product-authority:${mode} PASS`);
}

const invokedDirectly =
  process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedDirectly) {
  runVerifyCli();
}
