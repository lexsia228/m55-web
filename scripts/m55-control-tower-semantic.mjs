/**
 * Shared semantic authority parser for M55 Control Tower.
 * Sole executable NEXT owner: docs/ssot/M55_EXECUTION_STATE.json.
 * M55_CURRENT_STATE.md remains narrative/history while the execution-state file
 * explicitly supersedes its legacy executable fields.
 */

export const EXECUTION_STATE_PATH = 'docs/ssot/M55_EXECUTION_STATE.json';
export const LEGACY_SEMANTIC_AUTHORITY_SECTION =
  '## PAIR LANE — SEMANTIC EXECUTION AUTHORITY (CURRENT)';

const COMPLETED_SUBGATES_HEADING = '### Completed sub-gates (CLOSED — do not replay)';
export const COLD_START_GATE = 'CONTROL-TOWER-COLD-START-ACCEPTANCE-RERUN';
export const PAIR_MAPPING_GATE = 'PAIR-FREE-TO-PAID-MAPPING-FIRST';
export const PAIR_MINIMAL_IMPLEMENTATION_GATE = 'PAIR-MINIMAL-IMPLEMENTATION';
export const PAIR_PREMIUM_ACTIVATION_GATE = 'PAIR-PREMIUM-ACTIVATION-DECISION';

const PAIR_IMPLEMENTATION_VALUES = new Set(['NOT_STARTED', 'IN_PROGRESS', 'COMPLETE']);
const PAIR_PREMIUM_VALUES = new Set(['NOT_ACTIVATED', 'ACTIVATED', 'DEFERRED']);

export function normalizeGateToken(value) {
  return String(value ?? '')
    .replace(/\*\*/g, '')
    .replace(/`/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
}

function completedSubGatesNormalized(state) {
  return (state.completedSubGates ?? []).map((gate) => normalizeGateToken(gate));
}

function isGateCompleted(state, gateToken) {
  const normalized = normalizeGateToken(gateToken);
  return completedSubGatesNormalized(state).includes(normalized);
}

export function parseExecutionState(src) {
  let state;
  try {
    state = JSON.parse(src);
  } catch (error) {
    return { state: null, errors: [`invalid M55_EXECUTION_STATE.json: ${error.message}`] };
  }
  if (state === null || typeof state !== 'object' || Array.isArray(state)) {
    return {
      state: null,
      errors: ['M55_EXECUTION_STATE.json must contain a JSON object execution state'],
    };
  }
  return { state, errors: [] };
}

export function validateExecutionState(src) {
  const { state, errors } = parseExecutionState(src);
  if (!state) return { state, errors };

  const requiredStrings = [
    'schemaVersion',
    'status',
    'semanticAuthorityOwner',
    'macroLane',
    'currentExecutionGate',
    'nextSingleAction',
    'productWorkAfterControlTower',
    'pairImplementation',
    'pairPremium',
  ];
  for (const key of requiredStrings) {
    if (typeof state[key] !== 'string' || !state[key].trim()) {
      errors.push(`execution state missing non-empty string: ${key}`);
    }
  }

  if (state.semanticAuthorityOwner !== EXECUTION_STATE_PATH) {
    errors.push(`semanticAuthorityOwner must be ${EXECUTION_STATE_PATH}`);
  }

  const current = normalizeGateToken(state.currentExecutionGate);
  const next = normalizeGateToken(state.nextSingleAction);
  const productWork = normalizeGateToken(state.productWorkAfterControlTower);
  const coldStart = normalizeGateToken(COLD_START_GATE);
  const acceptance = state.acceptance ?? {};

  if (current !== next) {
    errors.push('CURRENT EXECUTION GATE and NEXT SINGLE ACTION must match');
  }

  if (!Array.isArray(state.completedSubGates) || state.completedSubGates.length === 0) {
    errors.push('execution state missing completedSubGates');
  } else {
    const seen = new Set();
    for (const completed of state.completedSubGates) {
      const token = normalizeGateToken(completed);
      if (seen.has(token)) {
        errors.push(`completedSubGates contains duplicate: ${completed}`);
      }
      seen.add(token);
      if (token === next) {
        errors.push(`NEXT SINGLE ACTION is already completed: ${completed}`);
      }
    }
  }

  if (isGateCompleted(state, productWork)) {
    errors.push(`productWorkAfterControlTower is already completed: ${state.productWorkAfterControlTower}`);
  }

  const revalidationRequired = acceptance.revalidationRequired === true;

  if (revalidationRequired) {
    if (next !== coldStart) {
      errors.push('pending handoff revalidation requires CURRENT/NEXT to be CONTROL-TOWER-COLD-START-ACCEPTANCE-RERUN');
    }
    if (acceptance.latestResult !== 'PENDING_REVALIDATION') {
      errors.push('handoff mechanism revalidation must keep latestResult=PENDING_REVALIDATION until a new acceptance run completes');
    }
    if (acceptance.latestResultAcceptedByHuman !== false) {
      errors.push('pending handoff revalidation must not be marked Human-accepted');
    }
    if (!acceptance.revalidationReason) {
      errors.push('pending handoff revalidation requires a revalidationReason');
    }
  } else {
    if (acceptance.latestResult !== 'HANDOFF_COLD_START_PASS') {
      errors.push('post-revalidation execution state requires latestResult=HANDOFF_COLD_START_PASS');
    }
    if (acceptance.latestResultAcceptedByHuman !== true) {
      errors.push('post-revalidation execution state requires Human acceptance of the latest cold-start PASS');
    }
    if (next !== productWork) {
      errors.push('CURRENT/NEXT must equal productWorkAfterControlTower when revalidationRequired=false');
    }
  }

  const mappingCompleted = isGateCompleted(state, PAIR_MAPPING_GATE);
  const mappingCurrent = next === normalizeGateToken(PAIR_MAPPING_GATE);
  const mappingAuthorized = state.pairFreeToPaidMappingAuthorizedNow === true;
  if (mappingCompleted || mappingCurrent) {
    if (!mappingAuthorized) {
      errors.push('pairFreeToPaidMappingAuthorizedNow must be true when PAIR-FREE-TO-PAID-MAPPING-FIRST is current or completed');
    }
  }

  if (!PAIR_IMPLEMENTATION_VALUES.has(state.pairImplementation)) {
    errors.push('pairImplementation must be NOT_STARTED, IN_PROGRESS, or COMPLETE');
  }
  if (
    state.pairImplementation === 'COMPLETE' &&
    !isGateCompleted(state, PAIR_MINIMAL_IMPLEMENTATION_GATE)
  ) {
    errors.push('pairImplementation=COMPLETE requires PAIR-MINIMAL-IMPLEMENTATION in completedSubGates');
  }

  if (!PAIR_PREMIUM_VALUES.has(state.pairPremium)) {
    errors.push('pairPremium must be NOT_ACTIVATED, ACTIVATED, or DEFERRED');
  }
  if (
    state.pairPremium === 'ACTIVATED' &&
    !isGateCompleted(state, PAIR_PREMIUM_ACTIVATION_GATE)
  ) {
    errors.push('pairPremium=ACTIVATED requires PAIR-PREMIUM-ACTIVATION-DECISION in completedSubGates');
  }

  if (acceptance.requiredBeforePairMapping !== 'HANDOFF_COLD_START_PASS') {
    errors.push('execution state must require HANDOFF_COLD_START_PASS before Pair mapping');
  }
  if (!state.postMergeTransition?.mergeCommit || !state.postMergeTransition?.featureHeadAtClosure) {
    errors.push('execution state missing Phase-B postMergeTransition identity');
  }
  if (state.postMergeTransition?.productionStateObserved !== 'READY') {
    errors.push('Phase-B Production observation must be READY');
  }
  if (state.postMergeTransition?.productionShaObserved !== state.postMergeTransition?.mergeCommit) {
    errors.push('Phase-B Production SHA observation must match mergeCommit');
  }
  if (!state.controlTowerHardeningTransition?.mergeCommit || !state.controlTowerHardeningTransition?.featureHeadAtClosure) {
    errors.push('execution state missing Control Tower hardening transition identity');
  }
  if (state.controlTowerHardeningTransition?.productionStateObserved !== 'READY') {
    errors.push('Control Tower hardening Production observation must be READY');
  }
  if (
    state.controlTowerHardeningTransition?.productionShaObserved !==
    state.controlTowerHardeningTransition?.mergeCommit
  ) {
    errors.push('Control Tower hardening Production SHA must match mergeCommit');
  }
  if (state.freshnessPolicy?.chatMemoryIsAuthority !== false) {
    errors.push('chat memory must never be authority');
  }
  if (state.freshnessPolicy?.newChatIsInvalidation !== false) {
    errors.push('new chat must never count as invalidation');
  }
  if (state.freshnessPolicy?.authorityConflictMustStop !== true) {
    errors.push('authority conflict must be fail-closed');
  }

  return { state, errors };
}

export function extractLegacySemanticAuthorityBlock(src) {
  const start = src.indexOf(LEGACY_SEMANTIC_AUTHORITY_SECTION);
  if (start === -1) return '';
  const next = src.indexOf('\n## ', start + 4);
  return next === -1 ? src.slice(start) : src.slice(start, next);
}

export function parseTableField(block, label) {
  const pattern = new RegExp(`\\|\\s*${label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\|\\s*([^|]+)\\|`, 'm');
  const match = block.match(pattern);
  return match ? match[1].trim() : null;
}

export function parseCompletedSubGates(block) {
  const start = block.indexOf(COMPLETED_SUBGATES_HEADING);
  if (start === -1) return [];
  const rest = block.slice(start + COMPLETED_SUBGATES_HEADING.length);
  const end = rest.search(/\n### |\n## /);
  const section = end === -1 ? rest : rest.slice(0, end);
  return section
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.startsWith('- '))
    .map((line) => line.slice(2).trim());
}

export function parseLegacySemanticAuthority(src) {
  const block = extractLegacySemanticAuthorityBlock(src);
  return {
    block,
    macroLane: parseTableField(block, 'Macro lane'),
    currentExecutionGate: parseTableField(block, 'CURRENT EXECUTION GATE'),
    nextSingleAction: parseTableField(block, 'NEXT SINGLE ACTION'),
    completedSubGates: parseCompletedSubGates(block),
    worktree: parseTableField(block, 'worktree'),
    branch: parseTableField(block, 'branch'),
  };
}

export function detectLegacyExecutionDrift(executionState, legacyCurrentStateSrc) {
  const legacy = parseLegacySemanticAuthority(legacyCurrentStateSrc);
  if (!legacy.block) {
    return { legacy, drift: true, reason: 'legacy CURRENT_STATE semantic section missing' };
  }
  const effectiveNext = normalizeGateToken(executionState?.nextSingleAction);
  const legacyNext = normalizeGateToken(legacy.nextSingleAction);
  const drift = effectiveNext !== legacyNext;
  return {
    legacy,
    drift,
    reason: drift
      ? `legacy CURRENT_STATE NEXT (${legacy.nextSingleAction ?? 'missing'}) differs from execution owner (${executionState?.nextSingleAction ?? 'missing'})`
      : null,
  };
}
