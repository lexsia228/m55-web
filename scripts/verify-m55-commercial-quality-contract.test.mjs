import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import {
  COMMERCIAL_QUALITY_CONTRACT_HUMAN_LOCK_PHRASES,
  COMMERCIAL_QUALITY_CONTRACT_PRIVACY_PHRASES,
  COMMERCIAL_QUALITY_STATE_SEPARATION_PHRASES,
  validateCommercialQualityContractText,
  validateCurrentStateLifecycleText,
} from './verify-m55-commercial-ssot.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTRACT_REL = 'docs/ssot/M55_COMMERCIAL_QUALITY_CONTRACT.md';
const CURRENT_STATE_REL = 'docs/ssot/M55_CURRENT_STATE.md';
const VERIFIER_REL = 'scripts/verify-m55-commercial-ssot.mjs';

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

const PRIVACY_NEGATIVE_CASES = [
  { label: 'answer IDs', phrase: 'answer IDs / facet IDs / internal answer selectors' },
  { label: 'nickname', phrase: 'nickname' },
  { label: 'email', phrase: 'email address' },
  { label: 'user ID', phrase: 'user ID' },
  { label: 'arbitrary personal payload', phrase: 'arbitrary personal payloads' },
];

const HUMAN_LOCK_NEGATIVE_CASES = [
  {
    label: 'automated tests cannot replace Human approval',
    phrase: 'automated tests prove implementation properties only',
  },
  {
    label: 'generated screenshots cannot replace Human approval',
    phrase: 'generated screenshots without Human review',
  },
  {
    label: 'screenshots require Human review',
    phrase: 'screenshots are evidence only after a Human reviews them',
  },
  {
    label: 'build / typecheck cannot replace Human approval',
    phrase: 'build / typecheck success',
  },
  {
    label: 'visual-regression automation cannot replace Human approval',
    phrase: 'visual-regression automation',
  },
  {
    label: 'AI / model evaluation cannot replace Human approval',
    phrase: 'AI / model evaluation',
  },
  {
    label: 'automated scoring cannot replace Human approval',
    phrase: 'automated scoring',
  },
];

const STATE_SEPARATION_NEGATIVE_CASES = [
  {
    label: 'merged runtime is committed authority',
    phrase: 'merged_runtime_is_committed_authority = true',
  },
  {
    label: 'branch-local state is not merged runtime',
    phrase: 'branch_local_state_is_not_merged_runtime = true',
  },
  {
    label: 'normative target may precede runtime',
    phrase: 'normative_target_may_precede_runtime = true',
  },
  {
    label: 'global verifier must not require unmerged runtime',
    phrase: 'global_verifier_requires_unmerged_runtime = false',
  },
  {
    label: 'runtime-specific validation belongs to its lane',
    phrase: 'runtime_specific_validation_owned_by_lane = true',
  },
  {
    label: 'post-merge state transition is required',
    phrase: 'post_merge_state_transition_required = true',
  },
];

describe('M55 commercial quality contract SSOT references', () => {
  it('passes complete contract text validation', () => {
    const contract = read(CONTRACT_REL);
    const result = validateCommercialQualityContractText(contract);
    assert.equal(result.ok, true, result.failures.join('\n'));
  });

  it('detects each required privacy prohibition in the live contract', () => {
    const contract = read(CONTRACT_REL);
    for (const phrase of COMMERCIAL_QUALITY_CONTRACT_PRIVACY_PHRASES) {
      assert.match(
        contract,
        new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
        `live contract must include privacy prohibition: ${phrase}`,
      );
    }
  });

  it('detects Human non-substitution rules in the live contract', () => {
    const contract = read(CONTRACT_REL);
    for (const phrase of COMMERCIAL_QUALITY_CONTRACT_HUMAN_LOCK_PHRASES) {
      assert.match(
        contract,
        new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
        `live contract must include Human lock rule: ${phrase}`,
      );
    }
  });

  it('requires contract in AGENTS read order before lane contracts', () => {
    const agents = read('AGENTS.md');
    const qualityIdx = agents.indexOf('M55_COMMERCIAL_QUALITY_CONTRACT.md');
    const selfIdx = agents.indexOf('M55_SELF_FUNNEL_CONTRACT.md');
    assert.ok(qualityIdx > -1, 'AGENTS.md must list commercial quality contract');
    assert.ok(selfIdx > -1, 'AGENTS.md must list Self funnel contract');
    assert.ok(qualityIdx < selfIdx, 'commercial quality contract must precede lane contract');
  });

  it('records lifecycle-independent merged/target/branch-local separation', () => {
    const currentState = read(CURRENT_STATE_REL);
    const result = validateCurrentStateLifecycleText(currentState);
    assert.equal(result.ok, true, result.failures.join('\n'));
    assert.match(
      currentState,
      /INPUT_EXPERIENCE_COMMERCIAL_FINALIZATION_GREEN_READY_FOR_HUMAN_LOCK/,
    );
    assert.match(currentState, /selfResultAnalysisStatus.*frozen/i);
    assert.doesNotMatch(currentState, /PR\s*#\s*\d+\s+OPEN/i);
  });

  it('does not require PR-number or OPEN lifecycle in verifier acceptance', () => {
    const verifier = read(VERIFIER_REL);
    assert.doesNotMatch(verifier, /PR\s*#\s*78/);
    assert.doesNotMatch(verifier, /PR\s*#\s*\d+\s+OPEN/i);
    assert.match(verifier, /collectCurrentStateLifecycleFailures/);
    assert.match(verifier, /COMMERCIAL_QUALITY_STATE_SEPARATION_PHRASES/);
  });

  it('global verifier defers preResultThemeSelection runtime enforcement to Self funnel lane', () => {
    const verifier = read(VERIFIER_REL);
    assert.doesNotMatch(
      verifier,
      /current runtime must record preResultThemeSelection=/,
    );
    assert.match(verifier, /target contract must record preResultThemeSelection=false/);
  });
});

describe('M55 commercial quality contract negative validation (in-memory only)', () => {
  it('fails when each privacy prohibition is removed independently', () => {
    const contract = read(CONTRACT_REL);
    for (const { label, phrase } of PRIVACY_NEGATIVE_CASES) {
      const variant = contract.replaceAll(phrase, '');
      const result = validateCommercialQualityContractText(variant);
      assert.equal(result.ok, false, `expected failure when removing ${label}`);
      assert.ok(
        result.failures.some((failure) => failure.includes(phrase)),
        `expected missing-phrase failure for ${label}`,
      );
    }
  });

  it('fails when each Human non-substitution rule is removed independently', () => {
    const contract = read(CONTRACT_REL);
    for (const { label, phrase } of HUMAN_LOCK_NEGATIVE_CASES) {
      const variant = contract.replaceAll(phrase, '');
      const result = validateCommercialQualityContractText(variant);
      assert.equal(result.ok, false, `expected failure when removing ${label}`);
      assert.ok(
        result.failures.some((failure) => failure.includes(phrase)),
        `expected missing-phrase failure for ${label}`,
      );
    }
  });

  it('fails when each lifecycle state-separation requirement is removed independently', () => {
    const currentState = read(CURRENT_STATE_REL);
    for (const { label, phrase } of STATE_SEPARATION_NEGATIVE_CASES) {
      const variant = currentState.replaceAll(phrase, '');
      const result = validateCurrentStateLifecycleText(variant);
      assert.equal(result.ok, false, `expected failure when removing ${label}`);
      assert.ok(
        result.failures.some((failure) => failure.includes(phrase)),
        `expected missing-phrase failure for ${label}`,
      );
    }
  });
});
