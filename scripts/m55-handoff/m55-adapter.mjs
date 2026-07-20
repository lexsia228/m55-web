import { classifyChecks, safeRead } from './engine.mjs';

export const AUTHORITY_MANIFEST = [
  'AGENTS.md', 'docs/ssot/README.md', 'docs/ssot/M55_CURRENT_STATE.md',
  'docs/ssot/M55_WORKTREE_REGISTRY.md', 'docs/ssot/M55_COMMERCIAL_FUNNEL_SSOT.md',
  'docs/ssot/M55_SELF_FUNNEL_CONTRACT.md', 'docs/ssot/M55_DECISION_LOG.md',
  'docs/ssot/M55_ROADMAP.md', 'lib/m55/contracts/m55CommercialFunnelContract.ts',
];

const check = (id, level, message, details = {}) => ({ id, level, message, details });
const fail = (id, message, details) => check(id, 'FAIL', message, details);

function oneMatch(text, regex, code, label) {
  const values = [...text.matchAll(regex)].map((match) => match[1]?.trim());
  if (values.length !== 1 || !values[0]) throw new Error(`${code}:${label}`);
  return values[0];
}

function parseRegistry(text) {
  const blocks = text.split(/^### WT-\d+[^\n]*\n/gm).slice(1).map((block) => [null, block.split(/^---$/m)[0]]);
  if (!blocks.length) throw new Error('MALFORMED_WORKTREE_REGISTRY:no-worktree-blocks');
  const rows = blocks.map((block) => {
    const body = block[1];
    return {
      path: oneMatch(body, /^\| path \| `([^`]+)` \|$/gm, 'MALFORMED_WORKTREE_REGISTRY', 'path'),
      branch: oneMatch(body, /^\| branch \| `([^`]+)`/gm, 'MALFORMED_WORKTREE_REGISTRY', 'branch'),
      lifecycle: oneMatch(body, /^\| lifecycle \| \*\*([^*]+)\*\*/gm, 'MALFORMED_WORKTREE_REGISTRY', 'lifecycle'),
    };
  });
  const paths = rows.map((row) => row.path);
  if (new Set(paths).size !== paths.length) throw new Error('MALFORMED_WORKTREE_REGISTRY:duplicate-path');
  return rows;
}

function parseAuthority(files) {
  const current = files['docs/ssot/M55_CURRENT_STATE.md'];
  const registry = files['docs/ssot/M55_WORKTREE_REGISTRY.md'];
  const self = files['docs/ssot/M55_SELF_FUNNEL_CONTRACT.md'];
  const contract = files['lib/m55/contracts/m55CommercialFunnelContract.ts'];
  const roadmap = files['docs/ssot/M55_ROADMAP.md'];
  if (!current || !registry || !self || !contract || !roadmap) throw new Error('MISSING_AUTHORITY_CONTENT');
  const activeLane = oneMatch(contract, /ACTIVE_LANE:\s*'([^']+)'/g, 'MALFORMED_AUTHORITY', 'active-lane');
  const nextSingleAction = oneMatch(current, /^\| \*\*postMergeNextSingleAction\*\* \| ([^|]+) \|$/gm, 'MALFORMED_AUTHORITY', 'next-single-action');
  if (!/^個人無料→個人Premiumファネル/.test(activeLane)) throw new Error('CONFLICTING_ACTIVE_LANE');
  if (!/Human selection of Self Funnel visual direction, result length, and ten-asset presentation\./.test(nextSingleAction)) throw new Error('MALFORMED_AUTHORITY:next-single-action-value');
  if (!/^## Target flow$/m.test(self) || !/^## Current runtime \(NOT target\)$/m.test(self)) throw new Error('TARGET_PRESENTED_AS_LIVE');
  if (!self.includes('NOT_YET_IMPLEMENTED') || !self.includes('no cross-device persistence guarantee') || !self.includes('no new Pair link')) throw new Error('MALFORMED_AUTHORITY:self-v2-boundary');
  const currentBlock = contract.slice(contract.indexOf('M55_CURRENT_RUNTIME_STATE'), contract.indexOf('M55_TARGET_COMMERCIAL_CONTRACT'));
  const targetBlock = contract.slice(contract.indexOf('M55_TARGET_COMMERCIAL_CONTRACT'), contract.indexOf('M55_DEFERRED_RUNTIME_ASSERTIONS'));
  const currentFlag = oneMatch(currentBlock, /preResultThemeSelection:\s*(true|false)/g, 'MALFORMED_AUTHORITY', 'current-runtime-flag');
  const targetFlag = oneMatch(targetBlock, /preResultThemeSelection:\s*(true|false)/g, 'MALFORMED_AUTHORITY', 'target-flag');
  if (currentFlag !== 'true' || targetFlag !== 'false') throw new Error('CURRENT_TARGET_CONTRADICTION');
  if (!/^1\. Commercial Funnel SSOT/m.test(roadmap)) throw new Error('MALFORMED_AUTHORITY:roadmap');
  return { activeLane, nextSingleAction, registry: parseRegistry(registry), documentedTransition: registry.includes('Documented post-merge transition'), completedGreen: current.includes('CLOSED_GREEN') };
}

export function inspectM55(repo, identity) {
  const checks = [];
  const files = {};
  for (const rel of AUTHORITY_MANIFEST) {
    try { files[rel] = safeRead(repo, rel); checks.push(check(`authority:${rel}`, 'PASS', 'Authority file is readable.')); }
    catch (error) { checks.push(fail('missing:authority', 'Required authority file is unreadable.', { file: rel, error: error.message })); }
  }
  let authority = { activeLane: null, nextSingleAction: null, documentedTransition: false, completedGreen: false, currentRuntimeDebt: false, targetState: false, readOrder: AUTHORITY_MANIFEST, runtimeDebts: [], prohibitedLanes: [], humanDecisionsRequired: [], doNotUseWorktrees: [] };
  let rows = [];
  if (!checks.some((item) => item.level === 'FAIL')) {
    try {
      const parsed = parseAuthority(files);
      authority = { ...authority, ...parsed, currentRuntimeDebt: true, targetState: true,
        runtimeDebts: ['pre-result theme selection exists', 'legacy public terms remain', 'some free-result paths include action suggestions'],
        prohibitedLanes: ['Self Funnel runtime', 'HOME', 'Pair', 'Stripe', 'checkout', 'DB', 'migration', 'Clerk', 'Production deploy'],
        humanDecisionsRequired: ['visual direction', 'result length', 'ten-asset presentation'],
        doNotUseWorktrees: parsed.registry.filter((row) => row.lifecycle === 'DO_NOT_USE').map((row) => row.path),
      };
      rows = parsed.registry;
      checks.push(check('m55:authority-format', 'PASS', 'Required M55 authority is unambiguous.'));
    } catch (error) { checks.push(fail(error.message.split(':')[0].toLowerCase().replaceAll('_', ':'), 'Required M55 authority is malformed, ambiguous, or contradictory.', { error: error.message })); }
  }
  const rowByPath = new Map(rows.map((row) => [row.path, row]));
  for (const worktree of identity.worktrees) {
    const row = rowByPath.get(worktree.path);
    if (!row) { checks.push(fail('worktree:unregistered', 'Live worktree is absent from the registry.', { path: worktree.path })); continue; }
    if (worktree.branch && row.branch !== worktree.branch) {
      if (authority.documentedTransition && worktree.path.endsWith('M55_WORKTREE-home-final-ia-v1') && worktree.branch === 'main') checks.push(check('worktree:documented-transition', 'WARN', 'Documented post-merge transition has a stale snapshot.', { path: worktree.path }));
      else checks.push(fail('worktree:branch-mismatch', 'Live worktree branch differs from the registry without a documented transition.', { path: worktree.path, documented: row.branch, live: worktree.branch }));
    }
  }
  if (!identity.worktrees.some((worktree) => !rowByPath.has(worktree.path))) checks.push(check('worktree:inventory', 'PASS', 'Every live worktree is registered.'));
  if (rows.some((row) => row.lifecycle === 'DO_NOT_USE')) checks.push(check('worktree:prohibited', 'PASS', 'Prohibited DO_NOT_USE worktree remains documented.'));
  else checks.push(fail('worktree:prohibited', 'No DO_NOT_USE worktree is documented.'));
  if (!identity.clean) checks.push(fail('git:dirty', 'Working tree has tracked, staged, or untracked changes.', { dirtyFiles: identity.dirtyFiles }));
  else checks.push(check('git:clean', 'PASS', 'Working tree is clean.'));
  if (identity.gitOperation !== 'none') checks.push(fail('git:operation', 'Git operation is active.', { operation: identity.gitOperation }));
  else checks.push(check('git:operation', 'PASS', 'No Git operation is active.'));
  const status = classifyChecks(checks);
  const reasonCodes = checks.filter((item) => item.level !== 'PASS').map((item) => item.id.toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/_$/, '')).sort();
  return { status, reasonCodes, checks: checks.sort((a, b) => a.id.localeCompare(b.id)), authority };
}
