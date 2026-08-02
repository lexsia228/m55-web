import { canonicalStringify } from './canonical-json.mjs';
import {
  DIAGNOSTICS_SOURCE_KIND,
  DIAGNOSTICS_SOURCE_REFERENCE,
  OBSERVATION_CLASSIFICATION_OBSERVED,
  PRODUCTION_BRANCH_LITERAL,
  PRODUCTION_ENVIRONMENT_LITERAL,
  PRODUCTION_LEAF_KEYS,
  PRODUCTION_STATUS_OBSERVED,
} from './production-observation-contract.mjs';

export class ProductionObservationProgrammerError extends Error {
  /** @param {string} message */
  constructor(message) {
    super(message);
    this.name = 'ProductionObservationProgrammerError';
  }
}

/**
 * @param {unknown} value
 * @returns {unknown}
 */
function cloneValue(value) {
  return JSON.parse(JSON.stringify(value));
}

/**
 * @param {string} timestamp
 * @param {unknown} value
 */
function buildObservedLeaf(timestamp, value) {
  return {
    value,
    classification: OBSERVATION_CLASSIFICATION_OBSERVED,
    source: {
      kind: DIAGNOSTICS_SOURCE_KIND,
      reference: DIAGNOSTICS_SOURCE_REFERENCE,
    },
    updatedAt: timestamp,
    evidenceRefs: [],
  };
}

/**
 * @param {string} timestamp
 * @param {string} diagnosticsIdentity
 */
function buildExactProductionObject(timestamp, diagnosticsIdentity) {
  return {
    status: buildObservedLeaf(timestamp, PRODUCTION_STATUS_OBSERVED),
    lastObservedSha: buildObservedLeaf(timestamp, diagnosticsIdentity),
    environment: buildObservedLeaf(timestamp, PRODUCTION_ENVIRONMENT_LITERAL),
    branch: buildObservedLeaf(timestamp, PRODUCTION_BRANCH_LITERAL),
    observedAt: buildObservedLeaf(timestamp, timestamp),
  };
}

/**
 * @param {Record<string, unknown>} observations
 */
function readObservedAtValue(observations) {
  const production = /** @type {Record<string, unknown>} */ (observations.production ?? {});
  const observedAtLeaf = /** @type {{ value?: unknown } | undefined} */ (production.observedAt);
  return typeof observedAtLeaf?.value === 'string' ? observedAtLeaf.value : null;
}

/**
 * @param {Record<string, unknown>} observations
 */
function readCurrentObservedIdentity(observations) {
  const production = /** @type {Record<string, unknown>} */ (observations.production ?? {});
  const statusLeaf = /** @type {{ value?: unknown } | undefined} */ (production.status);
  const shaLeaf = /** @type {{ value?: unknown } | undefined} */ (production.lastObservedSha);
  const environmentLeaf = /** @type {{ value?: unknown } | undefined} */ (production.environment);
  const branchLeaf = /** @type {{ value?: unknown } | undefined} */ (production.branch);
  const observedAt = readObservedAtValue(observations);
  if (statusLeaf?.value !== PRODUCTION_STATUS_OBSERVED) {
    return null;
  }
  if (
    typeof shaLeaf?.value !== 'string' ||
    environmentLeaf?.value !== PRODUCTION_ENVIRONMENT_LITERAL ||
    branchLeaf?.value !== PRODUCTION_BRANCH_LITERAL ||
    typeof observedAt !== 'string'
  ) {
    return null;
  }
  return {
    diagnosticsIdentity: shaLeaf.value,
    environment: environmentLeaf.value,
    branch: branchLeaf.value,
    observedAt,
  };
}

/**
 * @param {{
 *   observedAt: string;
 *   diagnosticsIdentity: string;
 *   environment: string;
 *   branch: string;
 * }} normalizedEvent
 * @param {ReturnType<typeof readCurrentObservedIdentity>} currentObserved
 */
function isIdenticalObservedEvent(normalizedEvent, currentObserved) {
  if (!currentObserved) return false;
  return (
    normalizedEvent.observedAt === currentObserved.observedAt &&
    normalizedEvent.diagnosticsIdentity === currentObserved.diagnosticsIdentity &&
    normalizedEvent.environment === currentObserved.environment &&
    normalizedEvent.branch === currentObserved.branch
  );
}

/**
 * @param {Record<string, unknown>} production
 */
export function assertExactProductionLeaves(production) {
  const keys = Object.keys(production);
  if (keys.length !== PRODUCTION_LEAF_KEYS.length) {
    throw new ProductionObservationProgrammerError('production must contain exactly five leaves');
  }
  for (let index = 0; index < PRODUCTION_LEAF_KEYS.length; index += 1) {
    if (keys[index] !== PRODUCTION_LEAF_KEYS[index]) {
      throw new ProductionObservationProgrammerError('production leaf order is invalid');
    }
  }
}

/**
 * @param {Record<string, unknown>} currentObservations
 * @param {{
 *   observedAt: string;
 *   diagnosticsIdentity: string;
 *   environment: string;
 *   branch: string;
 * }} normalizedEvent
 */
export function buildRollingProductionObservation(currentObservations, normalizedEvent) {
  if (!currentObservations || typeof currentObservations !== 'object' || Array.isArray(currentObservations)) {
    throw new ProductionObservationProgrammerError('currentObservations must be an object');
  }
  if (!normalizedEvent || typeof normalizedEvent !== 'object') {
    throw new ProductionObservationProgrammerError('normalizedEvent must be an object');
  }
  const { observedAt, diagnosticsIdentity, environment, branch } = normalizedEvent;
  if (typeof observedAt !== 'string' || observedAt.length === 0) {
    throw new ProductionObservationProgrammerError('normalizedEvent.observedAt is required');
  }
  if (typeof diagnosticsIdentity !== 'string' || diagnosticsIdentity.length === 0) {
    throw new ProductionObservationProgrammerError('normalizedEvent.diagnosticsIdentity is required');
  }
  if (environment !== PRODUCTION_ENVIRONMENT_LITERAL || branch !== PRODUCTION_BRANCH_LITERAL) {
    throw new ProductionObservationProgrammerError('normalizedEvent environment/branch invalid');
  }

  const inputSnapshot = canonicalStringify(currentObservations);
  const currentObserved = readCurrentObservedIdentity(currentObservations);
  if (isIdenticalObservedEvent(normalizedEvent, currentObserved)) {
    return {
      result: 'no_change',
      observations: currentObservations,
      changedPaths: [],
      observedAtUtc: observedAt,
      diagnosticsIdentity,
      generatedAt: observedAt,
    };
  }

  const nextObservations = cloneValue(currentObservations);
  nextObservations.production = buildExactProductionObject(observedAt, diagnosticsIdentity);
  assertExactProductionLeaves(/** @type {Record<string, unknown>} */ (nextObservations.production));

  const observationMeta = /** @type {Record<string, unknown>} */ (nextObservations.observationMeta ?? {});
  nextObservations.observationMeta = observationMeta;
  observationMeta.lastObservedAt = {
    value: observedAt,
    classification: OBSERVATION_CLASSIFICATION_OBSERVED,
    source: {
      kind: DIAGNOSTICS_SOURCE_KIND,
      reference: DIAGNOSTICS_SOURCE_REFERENCE,
    },
    updatedAt: observedAt,
    evidenceRefs: [],
  };

  if (canonicalStringify(currentObservations) !== inputSnapshot) {
    throw new ProductionObservationProgrammerError('input observations were mutated');
  }

  return {
    result: 'applied',
    observations: /** @type {Record<string, unknown>} */ (nextObservations),
    changedPaths: [
      'observationMeta.lastObservedAt',
      'production.status',
      'production.lastObservedSha',
      'production.environment',
      'production.branch',
      'production.observedAt',
    ],
    observedAtUtc: observedAt,
    diagnosticsIdentity,
    generatedAt: observedAt,
  };
}

/**
 * @param {Record<string, unknown>} observations
 */
export function assertNoNodeEnvPersistence(observations) {
  const production = /** @type {Record<string, unknown>} */ (observations.production ?? {});
  if ('node_env' in production || 'nodeEnvironment' in production) {
    throw new ProductionObservationProgrammerError('node_env must not be persisted on production');
  }
}
