import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  isAuthorizedCleanCaptureLoopbackHost,
  normalizeRequestHostname,
} from './isAuthorizedCleanCaptureLoopbackHost';

describe('isAuthorizedCleanCaptureLoopbackHost', () => {
  it('accepts exact loopback hostnames (positive)', () => {
    assert.equal(isAuthorizedCleanCaptureLoopbackHost('localhost'), true);
    assert.equal(isAuthorizedCleanCaptureLoopbackHost('127.0.0.1'), true);
    assert.equal(isAuthorizedCleanCaptureLoopbackHost('::1'), true);
    assert.equal(isAuthorizedCleanCaptureLoopbackHost('LOCALHOST'), true);
    assert.equal(isAuthorizedCleanCaptureLoopbackHost('localhost:3000'), true);
    assert.equal(isAuthorizedCleanCaptureLoopbackHost('127.0.0.1:3023'), true);
    assert.equal(isAuthorizedCleanCaptureLoopbackHost('[::1]'), true);
    assert.equal(isAuthorizedCleanCaptureLoopbackHost('[::1]:3000'), true);
  });

  it('rejects suffix, substring, and non-loopback hosts (negative)', () => {
    assert.equal(isAuthorizedCleanCaptureLoopbackHost('localhost.example.com'), false);
    assert.equal(isAuthorizedCleanCaptureLoopbackHost('127.0.0.1.example.com'), false);
    assert.equal(isAuthorizedCleanCaptureLoopbackHost('evil-localhost'), false);
    assert.equal(isAuthorizedCleanCaptureLoopbackHost('localhost.localdomain'), false);
    assert.equal(isAuthorizedCleanCaptureLoopbackHost('m55-webv2.vercel.app'), false);
    assert.equal(isAuthorizedCleanCaptureLoopbackHost('preview.example.com'), false);
    assert.equal(isAuthorizedCleanCaptureLoopbackHost('example.com'), false);
    assert.equal(isAuthorizedCleanCaptureLoopbackHost(''), false);
    assert.equal(isAuthorizedCleanCaptureLoopbackHost(null), false);
    assert.equal(isAuthorizedCleanCaptureLoopbackHost(undefined), false);
    assert.equal(isAuthorizedCleanCaptureLoopbackHost('[::ffff:127.0.0.1]'), false);
  });

  it('normalizes brackets and ports without substring matching', () => {
    assert.equal(normalizeRequestHostname('localhost:3000'), 'localhost');
    assert.equal(normalizeRequestHostname('[::1]:3023'), '::1');
    assert.equal(normalizeRequestHostname('localhost.example.com:443'), 'localhost.example.com');
    assert.equal(isAuthorizedCleanCaptureLoopbackHost('localhost.example.com:443'), false);
  });
});
