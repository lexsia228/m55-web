import fs from 'node:fs';
import path from 'node:path';
import { canonicalStringify } from './canonical-json.mjs';
import { sha256RecordExcluding } from './hash.mjs';
import { readHistory, historySha256FromEvents, writeBootstrapHistory, copyAuthorityPackSources } from './history.mjs';
import { readObservations, getGeneratedAt, observationsSha256FromObject } from './observations.mjs';
import {
  readAuthority,
  buildArtifactRecord,
  appendMetadataBlock,
  SOURCE_PATHS,
  GENERATED_ARTIFACT_PATHS,
  LOCK_PATH,
} from './validate.mjs';
import {
  GENERATOR_VERSION,
  HANDOFF_SCHEMA_VERSION,
  LOCK_SCHEMA_VERSION,
} from './product-authority-versions.mjs';

/**
 * @param {Record<string, string>} hashes
 * @param {string} generatedAt
 * @param {string} generatedBundleSha256
 * @param {string} artifactSha256
 * @returns {Record<string, string>}
 */
function metadataFields(hashes, generatedAt, generatedBundleSha256, artifactSha256) {
  return {
    authoritySha256: hashes.authoritySha256,
    observationsSha256: hashes.observationsSha256,
    historySha256: hashes.historySha256,
    generatedBundleSha256,
    artifactSha256,
    generatorVersion: GENERATOR_VERSION,
    generatedAt,
  };
}

/**
 * @param {string} root
 * @param {Record<string, unknown>} authority
 * @param {Record<string, unknown>} observations
 * @returns {Record<string, string>}
 */
function buildHashes(root, authority, observations) {
  const events = readHistory(root);
  return {
    authoritySha256: sha256RecordExcluding(authority, []),
    observationsSha256: observationsSha256FromObject(observations),
    historySha256: historySha256FromEvents(events),
  };
}

function readLaneStatuses(observations) {
  return {
    authorityPack: /** @type {{ value: string }} */ (observations.lanes.authorityPack.status).value,
    selfFunnel: /** @type {{ value: string }} */ (observations.lanes.selfFunnel.status).value,
    buildWeek: /** @type {{ value: string }} */ (observations.lanes.buildWeek.status).value,
    growthShare: /** @type {{ value: string }} */ (observations.lanes.growthShare.status).value,
  };
}

function readGrowthShareMergeStatus(observations) {
  return /** @type {{ value: string }} */ (observations.lanes.growthShare.mergeStatus).value;
}

function mergeStatusFromObservations(observations) {
  return readGrowthShareMergeStatus(observations);
}

function renderLaneStatusLines(lanes) {
  return [
    `- Product Authority Pack: ${lanes.authorityPack}`,
    `- Self funnel operational baseline: ${lanes.selfFunnel}`,
    `- Growth Share (WT-011): ${lanes.growthShare}`,
    `- Build Week: ${lanes.buildWeek}`,
  ].join('\n');
}

function renderAuthorityHeaderBody(authority, observations, hashes, generatedAt) {
  const productId = /** @type {{ value: string }} */ (authority.product.id).value;
  const productName = /** @type {{ value: string }} */ (authority.product.name).value;
  const canonicalOrigin = /** @type {{ value: string }} */ (authority.production.canonicalOrigin).value;
  const canonicalHost = /** @type {{ value: string }} */ (authority.production.canonicalHost).value;
  const nonAuthHost = /** @type {{ value: string }} */ (authority.production.nonAuthoritativeHost).value;
  const repo = /** @type {{ value: string }} */ (authority.repository.github).value;
  const defaultBranch = /** @type {{ value: string }} */ (authority.repository.defaultBranch).value;
  const originMainSha = /** @type {{ value: string }} */ (
    observations.repository.lastObservedOriginMainSha
  ).value;
  const prodStatus = /** @type {{ value: string }} */ (observations.production.status).value;
  const lanes = readLaneStatuses(observations);
  const mergeStatus = readGrowthShareMergeStatus(observations);

  return `# M55 Product Authority Header

schemaVersion: 1.0.0
generatorVersion: ${GENERATOR_VERSION}
generatedAt: ${generatedAt}

## Pack hashes

- authoritySha256: ${hashes.authoritySha256}
- observationsSha256: ${hashes.observationsSha256}
- historySha256: ${hashes.historySha256}

## Product identity

- PRODUCT_ID: ${productId}
- PRODUCT_NAME: ${productName}
- canonical Production origin: ${canonicalOrigin}
- canonical host: ${canonicalHost}
- non-authoritative host: ${nonAuthHost}

## Repository

- repository: ${repo}
- default branch: ${defaultBranch}
- last observed origin/main SHA: ${originMainSha}
- last observed at: ${generatedAt}

## Production observed state

- production.lastObservedSha: null
- production.status: ${prodStatus}

## Lanes

${renderLaneStatusLines(lanes)}

## Growth Share delivery state

- PR #81: ${mergeStatus}
- Growth code is not Production

## STOP conditions

- hash drift between sources and lockfile
- authority conflict with generated header
- branch-local treated as merged runtime
- pending Production evidence promoted without verification
- protected worktree mutation during completed lanes
- secret-like values in authority or observations

## Unresolved evidence

- Production SHA on ${canonicalHost}
- provider Production/Preview identities (Supabase, Clerk, Stripe)

Human-approved durable authority and verified observations supersede generated artifacts.
Generated outputs must not synthesize operational workflow gates.
`;
}

function renderAdapterBody(adapterName, hashes, generatedAt, observations) {
  const lanes = readLaneStatuses(observations);
  return `# ${adapterName} Product Authority Adapter

Before analysis or mutation:

1. Read \`.product-authority/generated/authority-header.md\`
2. Run \`npm run verify:product-authority\` (steady-state) or bootstrap verifier on Authority Pack branch
3. Confirm lane statuses, protected worktrees, and Production observed state
4. STOP on hash drift, authority conflict, or pending evidence promoted without verification

Current lane statuses (from observations):

${renderLaneStatusLines(lanes)}

Pack anchors:

- authoritySha256: ${hashes.authoritySha256}
- observationsSha256: ${hashes.observationsSha256}
- historySha256: ${hashes.historySha256}
- generatedAt: ${generatedAt}

Memory and conversation history are not authority.
Human-approved durable authority supersedes generated adapter guidance.
Generated adapters must not prescribe push, commit, merge, or deploy sequencing.

## M55 Experience Control Plane v2 (enforcement)

- Active Growth lane work must obey ECP v2 (\`m55-ecp-v2\`).
- Constitution: \`lib/m55/commercialUx/experience/experienceConstitution.ts\`
- Route registry: \`lib/m55/commercialUx/experience/experienceRouteRegistry.ts\`
- Copy domains: \`lib/m55/commercialUx/experience/copyAuthorityDomains.ts\`
- Do not create a second shell/header/CTA/trait/plan/print authority.
- Required local verification:
  - \`npm run verify:m55-experience-control-plane\`
  - \`npm run verify:m55-ssot\`
  - \`npm run verify:product-authority\`
- Product Truth prices/plans remain machine-contract owned; UI must use \`PLAN_COMPARISON\`.
- No LLM-as-a-Judge is a required merge gate. Human commercial/visual approval remains mandatory.
`;
}

function renderHandoffMdBody(authority, observations, hashes, generatedAt) {
  const productId = /** @type {{ value: string }} */ (authority.product.id).value;
  const lanes = readLaneStatuses(observations);
  const mergeStatus = readGrowthShareMergeStatus(observations);
  return `# M55 Product Authority Handoff

generatedAt: ${generatedAt}

Product: ${productId}
Authority Pack lane: ${lanes.authorityPack}
Self funnel lane: ${lanes.selfFunnel}
Growth Share lane: ${lanes.growthShare}
Build Week lane: ${lanes.buildWeek}
PR #81: ${mergeStatus}
Growth code is not Production

Documentation note: generatedBundleSha256 appears only in the generator-owned metadata block below.

Verify before mutation:

\`\`\`bash
npm run verify:product-authority:bootstrap
npm run verify:product-authority
npm run test:product-authority
\`\`\`

Hashes:

- authoritySha256: ${hashes.authoritySha256}
- observationsSha256: ${hashes.observationsSha256}
- historySha256: ${hashes.historySha256}
`;
}

function renderHandoffJsonBody(authority, observations, hashes, generatedAt) {
  const lanes = readLaneStatuses(observations);
  const handoff = {
    authoritySha256: hashes.authoritySha256,
    generatedAt,
    generatorVersion: GENERATOR_VERSION,
    growthShareDelivery: {
      pr81: mergeStatusFromObservations(observations),
    },
    historySha256: hashes.historySha256,
    lanes: {
      authorityPack: lanes.authorityPack,
      selfFunnel: lanes.selfFunnel,
      growthShare: lanes.growthShare,
      buildWeek: lanes.buildWeek,
    },
    observationsSha256: hashes.observationsSha256,
    productId: /** @type {{ value: string }} */ (authority.product.id).value,
    schemaVersion: HANDOFF_SCHEMA_VERSION,
    sourcePaths: [...SOURCE_PATHS],
  };
  return `${canonicalStringify(handoff)}\n`;
}

/**
 * @param {string} root
 * @returns {{ generatedBundleSha256: string, artifacts: Record<string, unknown>[] }}
 */
export function generateProductAuthority(root) {
  const authority = readAuthority(root);
  const observations = readObservations(root);
  const hashes = buildHashes(root, authority, observations);
  const generatedAt = getGeneratedAt(observations);

  const bodyRenderers = {
    '.product-authority/generated/authority-header.md': () =>
      renderAuthorityHeaderBody(authority, observations, hashes, generatedAt),
    '.product-authority/generated/handoff.md': () =>
      renderHandoffMdBody(authority, observations, hashes, generatedAt),
    '.product-authority/generated/handoff.json': () =>
      renderHandoffJsonBody(authority, observations, hashes, generatedAt),
    '.product-authority/generated/adapters/codex.md': () =>
      renderAdapterBody('Codex', hashes, generatedAt, observations),
    '.product-authority/generated/adapters/cursor.md': () =>
      renderAdapterBody('Cursor', hashes, generatedAt, observations),
    '.product-authority/generated/adapters/generic-agent.md': () =>
      renderAdapterBody('Generic Agent', hashes, generatedAt, observations),
  };

  const provisionalRecords = GENERATED_ARTIFACT_PATHS.map((relPath) => {
    const body = bodyRenderers[relPath]();
    return buildArtifactRecord(body, relPath, hashes, generatedAt);
  });

  const manifest = {
    generatorVersion: GENERATOR_VERSION,
    authoritySha256: hashes.authoritySha256,
    observationsSha256: hashes.observationsSha256,
    historySha256: hashes.historySha256,
    sourcePaths: [...SOURCE_PATHS],
    artifacts: provisionalRecords.map(({ path: artifactPath, artifactSha256 }) => ({
      path: artifactPath,
      artifactSha256,
    })),
  };

  const generatedBundleSha256 = sha256RecordExcluding(manifest, ['generatedBundleSha256']);

  const finalRecords = GENERATED_ARTIFACT_PATHS.map((relPath, index) => {
    const body = bodyRenderers[relPath]();
    const artifactSha256 = /** @type {string} */ (provisionalRecords[index].artifactSha256);
    const displayPayload = relPath.endsWith('.json')
      ? `${canonicalStringify({
          ...JSON.parse(body.trim()),
          generatedBundleSha256,
          artifactSha256,
        })}\n`
      : appendMetadataBlock(
          body,
          metadataFields(hashes, generatedAt, generatedBundleSha256, artifactSha256),
        );
    return { path: relPath, artifactSha256, displayPayload };
  });

  for (const record of finalRecords) {
    const abs = path.join(root, record.path);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, record.displayPayload, 'utf8');
  }

  const lock = {
    schemaVersion: LOCK_SCHEMA_VERSION,
    generatorVersion: GENERATOR_VERSION,
    generatedAt,
    authoritySha256: hashes.authoritySha256,
    observationsSha256: hashes.observationsSha256,
    historySha256: hashes.historySha256,
    generatedBundleSha256,
    sourcePaths: [...SOURCE_PATHS],
    artifacts: finalRecords.map(({ path: artifactPath, artifactSha256 }) => ({
      path: artifactPath,
      artifactSha256,
    })),
  };

  fs.mkdirSync(path.join(root, '.product-authority'), { recursive: true });
  fs.writeFileSync(path.join(root, LOCK_PATH), `${canonicalStringify(lock)}\n`, 'utf8');

  return { generatedBundleSha256, artifacts: finalRecords };
}

/** @param {string} tempRoot */
export function bootstrapFixture(tempRoot) {
  copyAuthorityPackSources(tempRoot);
  writeBootstrapHistory(tempRoot);
  generateProductAuthority(tempRoot);
}
