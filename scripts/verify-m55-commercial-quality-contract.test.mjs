import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import {
  COMMERCIAL_QUALITY_CONTRACT_HUMAN_LOCK_PHRASES,
  COMMERCIAL_QUALITY_CONTRACT_PRIVACY_PHRASES,
  validateCommercialQualityContractText,
} from './verify-m55-commercial-ssot.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTRACT_REL = 'docs/ssot/M55_COMMERCIAL_QUALITY_CONTRACT.md';

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

  it('records current Self input status and global gate in current state', () => {
    const currentState = read('docs/ssot/M55_CURRENT_STATE.md');
    assert.match(
      currentState,
      /INPUT_EXPERIENCE_COMMERCIAL_FINALIZATION_GREEN_READY_FOR_HUMAN_LOCK/,
    );
    assert.match(
      currentState,
      /GLOBAL_COMMERCIAL_QUALITY_CONTRACT_GREEN_READY_FOR_ACTUAL_DIFF_REVIEW/,
    );
    assert.match(currentState, /selfResultAnalysisStatus.*frozen/i);
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
});
