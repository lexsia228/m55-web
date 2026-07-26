import assert from 'node:assert/strict';
import test from 'node:test';
import { scanForSecrets, scanObjectForSecrets } from '../secret-scan.mjs';
import { readAuthority } from '../validate.mjs';
import { readObservations } from '../observations.mjs';

test('authority json passes secret scan', () => {
  const findings = scanObjectForSecrets(readAuthority(process.cwd()), 'authority');
  assert.deepEqual(findings, []);
});

test('observations json passes secret scan', () => {
  const findings = scanObjectForSecrets(readObservations(process.cwd()), 'observations');
  assert.deepEqual(findings, []);
});

test('stripe secret key pattern is detected', () => {
  const stripeLiveKeyFixture = ["sk", "live", "abcdefghijklmnopqrstuvwxyz"].join("_");
  const result = scanForSecrets(stripeLiveKeyFixture);
  assert.equal(result.ok, false);
});

test('postgres url pattern is detected', () => {
  const result = scanForSecrets('postgresql://user:pass@host/db');
  assert.equal(result.ok, false);
});

test('jwt pattern is detected', () => {
  const result = scanForSecrets('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.signature');
  assert.equal(result.ok, false);
});

test('cookie header pattern is detected', () => {
  const result = scanForSecrets('Cookie: session=eyJhbGciOiJIUzI1NiJ9.payload.sig');
  assert.equal(result.ok, false);
});

test('set-cookie header pattern is detected', () => {
  const result = scanForSecrets('Set-Cookie: auth_session_token=abc123def456ghi789jkl012');
  assert.equal(result.ok, false);
});

test('session token json value is detected', () => {
  const result = scanForSecrets('{"session_token":"abc123def456ghi789jkl012mno345"}');
  assert.equal(result.ok, false);
});

test('bearer session value is detected', () => {
  const result = scanForSecrets('Authorization: bearer abc123def456ghi789jkl012mno345');
  assert.equal(result.ok, false);
});

test('benign cookie policy prose is accepted', () => {
  const result = scanForSecrets('Our cookie policy explains browser session description for session count tracking.');
  assert.equal(result.ok, true);
});
