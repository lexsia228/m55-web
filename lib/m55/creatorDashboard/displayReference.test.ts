import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { deriveDisplayReferenceV1 } from './displayReference';

describe('displayReference', () => {
  it('derives stable prefixed references without exposing raw uuid', () => {
    const id = '11111111-2222-4333-8444-555555555555';
    const ref = deriveDisplayReferenceV1(id);
    assert.match(ref, /^m55dr1\.[0-9a-f]{24}$/);
    assert.equal(deriveDisplayReferenceV1(id), ref);
    assert.notEqual(ref, id);
  });
});
