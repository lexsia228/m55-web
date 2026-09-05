import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(import.meta.dirname, '../..');
const read = (rel: string) => readFileSync(join(ROOT, rel), 'utf8');

describe('BirthProfileIntakeLayer segmented DOB gate', () => {
  it('requires complete segment lengths before validateSegmentedDob', () => {
    const source = read('components/profile/BirthProfileIntakeLayer.tsx');
    const block = source.match(/function syncValidDate\(parts: SegmentedDobParts\) \{([\s\S]*?)\n  \}/)?.[1] ?? '';
    assert.match(block, /parts\.year\.length !== 4/);
    assert.match(block, /parts\.month\.length !== 2/);
    assert.match(block, /parts\.day\.length !== 2/);
    assert.match(block, /onBirthDateChange\(''\)/);
    assert.match(block, /return;/);
    assert.doesNotMatch(block, /type=\"date\"/);
  });

  it('preserves paste path and auto-focus wiring', () => {
    const source = read('components/profile/BirthProfileIntakeLayer.tsx');
    assert.match(source, /handlePaste/);
    assert.match(source, /parseFlexibleDobInput/);
    assert.match(source, /digits\.length === 4\) monthRef/);
    assert.match(source, /digits\.length === 2\) dayRef/);
  });
});
