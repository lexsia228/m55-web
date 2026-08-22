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
const COLD_START_GATE = 'CONTROL-TOWER-COLD-START-ACCEPTANCE-RERUN';
const PAIR_MAPPING_GATE = 'PAIR-FREE-TO-PAID-MAPPING-FIRST';

export function normalizeGateToken(value) {
  return String(value ?? '')
    .replace(/\*\*/g, '')
    .replace(/`/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
}

export function parseExecutionState(src) {
  let state;
  try {
    state = JSON.parse(src);
  } catch (error) {
    return { state: null, errors: [`invalid M55_EXECUTION_STATE.json: ${error.message}`] };
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
  if (normalizeGateToken(state.currentExecutionGate) !== normalizeGateToken(state.nextSingleAction)) {
    errors.push('CURRENT EXECUTION GATE and NEXT SINGLE ACTION must match');
  }
  if (!Array.isArray(state.completedSubGates) || state.completedSubGates.length === 0) {
    errors.push('execution state missing completedSubGates');
  } else {
    const next = normalizeGateToken(state.nextSingleAction);
    for (const completed of state.completedSubGates) {
      if (normalizeGateToken(completed) === next) {
        errors.push(`NEXT SINGLE ACTION is already completed: ${completed}`);
      }
    }
  }

  const next = normalizeGateToken(state.nextSingleAction);
  const coldStart = normalizeGateToken(COLD_START_GATE);
  const pairMapping = normalizeGateToken(PAIR_MAPPING_GATE);

  if (next === coldStart) {
    if (state.pairFreeToPaidMappingAuthorizedNow !== false) {
      errors.push('Pair free→paid mapping must remain unauthorized during cold-start acceptance');
    }
  } else if (next === pairMapping) {
    if (state.pairFreeToPaidMappingAuthorizedNow !== true) {
      errors.push('Pair free→paid mapping gate requires pairFreeToPaidMappingAuthorizedNow=true');
    }
    if (state.acceptance?.latestResult !== 'HANDOFF_COLD_START_PASS') {
      errors.push('Pair mapping requires latest HANDOFF_COLD_START_PASS');
    }
    if (state.acceptance?.latestResultAcceptedByHuman !== true) {
      errors.push('Pair mapping requires Human acceptance of the cold-start PASS');
    }
    if (state.completedSubGates?.some((gate) => normalizeGateToken(gate) === coldStart) !== true) {
      errors.push('Pair mapping requires cold-start acceptance rerun in completedSubGates');
    }
  } else {
    errors.push(`unsupported executable gate for this Control Tower revision: ${state.nextSingleAction}`);
  }

  if (state.productWorkAfterControlTower !== PAIR_MAPPING_GATE) {
    errors.push(`productWorkAfterControlTower must remain ${PAIR_MAPPING_GATE}`);
  }
  if (state.pairImplementation !== 'NOT_STARTED') {
    errors.push('Pair implementation must remain NOT_STARTED before implementation authorization');
  }
  if (state.pairPremium !== 'NOT_ACTIVATED') {
    errors.push('Pair Premium must remain NOT_ACTIVATED');
  }
  if (state.acceptance?.requiredBeforePairMapping !== 'HANDOFF_COLD_START_PASS') {
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
