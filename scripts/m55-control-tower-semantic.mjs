/**
 * Shared semantic authority parser for M55 Control Tower.
 * Sole NEXT SINGLE ACTION owner: M55_CURRENT_STATE.md CURRENT section.
 */

export const SEMANTIC_AUTHORITY_SECTION =
  '## PAIR LANE — SEMANTIC EXECUTION AUTHORITY (CURRENT)';

const COMPLETED_SUBGATES_HEADING = '### Completed sub-gates (CLOSED — do not replay)';

export function extractSemanticAuthorityBlock(src) {
  const start = src.indexOf(SEMANTIC_AUTHORITY_SECTION);
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

function normalizeGateToken(value) {
  return value
    .replace(/\*\*/g, '')
    .replace(/`/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
}

export function parseSemanticAuthority(src) {
  const block = extractSemanticAuthorityBlock(src);
  const completedSubGates = parseCompletedSubGates(block);

  return {
    block,
    macroLane: parseTableField(block, 'Macro lane'),
    macroRoadmapStage: parseTableField(block, 'Macro roadmap stage'),
    currentExecutionGate: parseTableField(block, 'CURRENT EXECUTION GATE'),
    nextSingleAction: parseTableField(block, 'NEXT SINGLE ACTION'),
    productWorkAfterControlTower: parseTableField(block, 'Product work after control tower'),
    localPreservedProductWork: parseTableField(block, 'Local preserved product work'),
    completedSubGates,
    worktree: parseTableField(block, 'worktree'),
    branch: parseTableField(block, 'branch'),
  };
}

export function validateSemanticAuthority(src, { checkRoadmap = null } = {}) {
  const errors = [];
  const authority = parseSemanticAuthority(src);

  if (!authority.block) {
    errors.push('missing semantic authority section in M55_CURRENT_STATE.md');
    return { authority, errors };
  }

  if (!authority.macroLane) errors.push('missing Macro lane in semantic authority section');
  if (!authority.currentExecutionGate) {
    errors.push('missing CURRENT EXECUTION GATE in semantic authority section');
  }
  if (!authority.nextSingleAction) {
    errors.push('missing NEXT SINGLE ACTION in semantic authority section');
  }
  if (authority.completedSubGates.length === 0) {
    errors.push('missing completed sub-gates list in semantic authority section');
  }

  const nextNorm = normalizeGateToken(authority.nextSingleAction ?? '');
  if (nextNorm.includes('READ-ONLY-MAPPING')) {
    errors.push('NEXT SINGLE ACTION still points to Wave 0 read-only mapping');
  }

  for (const completed of authority.completedSubGates) {
    const completedNorm = normalizeGateToken(completed);
    if (!nextNorm || !completedNorm) continue;
    if (completedNorm.includes(nextNorm) || nextNorm.includes(completedNorm.split('—')[0].trim())) {
      errors.push(`NEXT SINGLE ACTION conflicts with completed sub-gate: ${completed}`);
    }
    if (
      completedNorm.includes('READ-ONLY-MAPPING') &&
      (nextNorm.includes('READ-ONLY-MAPPING') || nextNorm.includes('WAVE0'))
    ) {
      errors.push('Wave 0 read-only mapping cannot be both completed and NEXT SINGLE ACTION');
    }
  }

  if (checkRoadmap) {
    const waveSectionStart = checkRoadmap.indexOf('## Pair lane entrance — Wave 0 Live paid DTR readability (CURRENT)');
    if (waveSectionStart !== -1) {
      const waveSectionEnd = checkRoadmap.indexOf('\n## ', waveSectionStart + 4);
      const waveSection =
        waveSectionEnd === -1 ? checkRoadmap.slice(waveSectionStart) : checkRoadmap.slice(waveSectionStart, waveSectionEnd);
      if (/NEXT SINGLE ACTION:\s*`CATEGORY-1-M55-PAIR-WAVE0/i.test(waveSection)) {
        errors.push('M55_ROADMAP Wave 0 section still owns an executable mapping NEXT SINGLE ACTION');
      }
    }
  }

  const nextActionRows = [...authority.block.matchAll(/\|\s*NEXT SINGLE ACTION\s*\|/g)];
  if (nextActionRows.length !== 1) {
    errors.push('semantic authority section must contain exactly one NEXT SINGLE ACTION table row');
  }

  const executionGateRows = [...authority.block.matchAll(/\|\s*CURRENT EXECUTION GATE\s*\|/g)];
  if (executionGateRows.length !== 1) {
    errors.push('semantic authority section must contain exactly one CURRENT EXECUTION GATE table row');
  }

  return { authority, errors };
}
