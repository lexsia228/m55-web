import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

const ROOT = process.cwd();
const MARKDOWN_PATH = join(ROOT, 'docs/ssot/M55_CANONICAL_REFERENCE_MAP_v1.md');
const MACHINE_PATH = join(ROOT, 'docs/ssot/M55_CANONICAL_REFERENCE_MAP_MACHINE_v1.json');

const BASELINE_COMMIT = '7986ba74fe3ed80d2735e4363a46f2c42dab3ec3';
const MAP_VERSION = 'm55-canonical-reference-map-v1';

type MachineMap = {
  version: string;
  baseline_commit: string;
  branch: string;
  logic_owner_files: string[];
  display_copy_owner_files: string[];
  product_copy_ssot_files: string[];
  prior_language_model_files: string[];
  obsolete_sources: string[];
  surfaces: Record<string, unknown>;
  forbidden_imports_or_direct_uses: unknown[];
  forbidden_mutation_paths: string[];
  allowed_future_copy_gate_files: string[];
  required_tests: string[];
  ai_handoff_rule: string;
};

function readSrc(relPath: string): string {
  return readFileSync(join(ROOT, relPath), 'utf8');
}

function loadMachineMap(): MachineMap {
  const raw = readFileSync(MACHINE_PATH, 'utf8');
  return JSON.parse(raw) as MachineMap;
}

describe('canonicalReferenceMap — artifact presence', () => {
  it('markdown reference map exists', () => {
    assert.ok(existsSync(MARKDOWN_PATH));
  });

  it('machine JSON reference map exists', () => {
    assert.ok(existsSync(MACHINE_PATH));
  });

  it('machine JSON parses as valid JSON', () => {
    assert.doesNotThrow(() => loadMachineMap());
  });
});

describe('canonicalReferenceMap — machine schema', () => {
  const map = loadMachineMap();

  it('version matches m55-canonical-reference-map-v1', () => {
    assert.equal(map.version, MAP_VERSION);
  });

  it('baseline_commit matches frozen baseline', () => {
    assert.equal(map.baseline_commit, BASELINE_COMMIT);
  });

  it('required key arrays are non-empty', () => {
    assert.ok(map.logic_owner_files.length > 0);
    assert.ok(map.display_copy_owner_files.length > 0);
    assert.ok(map.product_copy_ssot_files.length > 0);
    assert.ok(map.prior_language_model_files.length > 0);
    assert.ok(map.obsolete_sources.length > 0);
    assert.ok(Object.keys(map.surfaces).length > 0);
    assert.ok(map.forbidden_imports_or_direct_uses.length > 0);
    assert.ok(map.forbidden_mutation_paths.length > 0);
    assert.ok(map.allowed_future_copy_gate_files.length > 0);
    assert.ok(map.required_tests.length > 0);
    assert.ok(map.ai_handoff_rule.trim().length > 0);
  });

  it('required owner paths exist on disk', () => {
    const paths = [
      ...map.logic_owner_files,
      ...map.display_copy_owner_files,
      ...map.product_copy_ssot_files,
      ...map.prior_language_model_files,
      ...map.obsolete_sources,
    ];
    for (const rel of paths) {
      assert.ok(existsSync(join(ROOT, rel)), `missing owner path: ${rel}`);
    }
  });

  it('obsolete professional mapping SSOT path is registered', () => {
    assert.ok(
      map.obsolete_sources.some((p) =>
        p.includes('M55_TEN_STEM_PROFESSIONAL_MAPPING_SSOT_20260324_v1.md'),
      ),
    );
  });

  it('forbidden_mutation_paths cover HOME, NOTE, and reply count concerns', () => {
    const joined = map.forbidden_mutation_paths.join('\n');
    assert.match(joined, /home/i);
    assert.match(joined, /note/i);
    assert.match(joined, /replyTicketCheckoutConstants/);
  });
});

describe('canonicalReferenceMap — markdown content', () => {
  const md = readFileSync(MARKDOWN_PATH, 'utf8');

  const requiredPhrases = [
    'runM55CompositeStemPipeline',
    'resolveDisplayedDtrEnvelope',
    'resolveStoredEnvelopeRead',
    'essenceStemLaneIndex',
    'jdn_offset_provisional_v1',
    'T1',
    'T1b',
    'T2',
    'T3',
    'DB envelope body',
    'purchase artifact',
    'user-facing',
    'AI handoff',
  ];

  for (const phrase of requiredPhrases) {
    it(`markdown includes: ${phrase}`, () => {
      assert.ok(md.includes(phrase), `missing phrase: ${phrase}`);
    });
  }
});

describe('canonicalReferenceMap — runtime source guards', () => {
  it('send route uses resolveDisplayedDtrEnvelope and not resolveStoredEnvelopeRead', () => {
    const src = readSrc('app/api/room/core/send/route.ts');
    assert.ok(src.includes('resolveDisplayedDtrEnvelope'));
    assert.equal(src.includes('resolveStoredEnvelopeRead'), false);
  });

  it('/dtr/core page uses resolveDisplayedDtrEnvelope and not resolveStoredEnvelopeRead', () => {
    const src = readSrc('app/dtr/core/page.tsx');
    assert.ok(src.includes('resolveDisplayedDtrEnvelope'));
    assert.equal(src.includes('resolveStoredEnvelopeRead'), false);
  });

  it('fulfillment write path does not use essenceStemLaneIndex or jdn_offset_provisional_v1', () => {
    const src = readSrc('lib/m55/dtrDraftDb.ts');
    const upsertBlock = src.slice(src.indexOf('upsertDtrReportSnapshotAtFulfillment'));
    assert.doesNotMatch(upsertBlock, /essenceStemLaneIndex/);
    assert.doesNotMatch(upsertBlock, /jdn_offset_provisional_v1/);
    assert.ok(upsertBlock.includes('buildV2FulfillmentSnapshot'));
  });

  it('owned shelf access uses displayed resolver path and not legacy JDN shelf helper', () => {
    const src = readSrc('lib/m55/dtrShelfAccess.ts');
    assert.ok(src.includes('deriveDtrShelfStemDisplayFromSnapshot'));
    assert.doesNotMatch(src, /deriveDtrShelfStemDisplay[^F]/);
  });

  it('displayed shelf stem helper uses resolveDisplayedDtrEnvelope', () => {
    const src = readSrc('lib/m55/compositeStem/deriveDisplayedDtrShelfStem.ts');
    assert.ok(src.includes('resolveDisplayedDtrEnvelope'));
  });
});

describe('canonicalReferenceMap — self registration', () => {
  it('required_tests includes this static test file', () => {
    const map = loadMachineMap();
    assert.ok(
      map.required_tests.includes('lib/m55/canonicalReferenceMap.static.test.ts'),
    );
  });

  it('machine JSON is referenced from markdown', () => {
    const md = readFileSync(MARKDOWN_PATH, 'utf8');
    assert.ok(md.includes('M55_CANONICAL_REFERENCE_MAP_MACHINE_v1.json'));
  });
});

/** Stable digest helper for gate reports. */
export function referenceMapArtifactSha256(relPath: string): string {
  const buf = readFileSync(join(ROOT, relPath));
  return createHash('sha256').update(buf).digest('hex');
}
