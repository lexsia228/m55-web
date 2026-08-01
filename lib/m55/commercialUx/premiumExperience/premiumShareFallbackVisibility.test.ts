/**
 * Share fallback visibility contract.
 *
 * The real privacy-safe action URL must stay inside the copy/share/href actions,
 * while the visible fallback UI must never render an absolute URL, the `/r/`
 * entry path or the `s1-N` share token.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

import {
  buildPrivacySafeShareCardV1,
  resolveShareAbsoluteUrl,
  assertSharePayloadPrivacySafe,
} from '../../freeResult/privacySafeShareCardV1.ts';
import { sanitizeVisibleShareFallbackText } from '../../../../components/core/useCoreShareActions.ts';

const ROOT = join(import.meta.dirname, '../../../..');
const HOOK_FILE = 'components/core/useCoreShareActions.ts';
const BODY_FILE = 'components/core/CoreShareResultBody.tsx';

function forbiddenVisiblePatterns(text: string): string[] {
  const hits: string[] = [];
  if (/https?:\/\//.test(text)) hits.push('absolute URL');
  if (text.includes('/r/')) hits.push('/r/ entry path');
  if (/\bs1-\d\b/.test(text)) hits.push('share token');
  if (text.includes('m-55.jp')) hits.push('canonical host');
  return hits;
}

describe('share fallback never displays the raw share URL or token', () => {
  const card = buildPrivacySafeShareCardV1({ stemLaneIndex: 1 })!;

  it('card fixture exposes a real action URL and token internally', () => {
    assert.equal(card.token, 's1-1');
    assert.equal(card.sharePath, '/r/s1-1');
    assert.equal(resolveShareAbsoluteUrl(card.sharePath, 'http://localhost:3000'), 'http://localhost:3000/r/s1-1');
  });

  it('sanitizer strips URL, entry path and token from the visible text', () => {
    const raw = `${card.shareTextJa}\n${resolveShareAbsoluteUrl(card.sharePath, 'http://localhost:3000')}`;
    assert.deepEqual(forbiddenVisiblePatterns(raw), ['absolute URL', '/r/ entry path', 'share token']);

    const visible = sanitizeVisibleShareFallbackText(raw);
    assert.deepEqual(forbiddenVisiblePatterns(visible), []);
    assert.ok(visible.includes('プランナー'), 'trait sentence must survive sanitization');
  });

  it('sanitizer is idempotent and keeps non-empty guidance text', () => {
    const once = sanitizeVisibleShareFallbackText(card.shareTextJa);
    assert.equal(sanitizeVisibleShareFallbackText(once), once);
    assert.ok(once.trim().length > 0);
  });

  it('sanitizer strips a bare token line and the production host', () => {
    const raw = 'テキスト\nhttps://m-55.jp/r/s1-4\ns1-4';
    const visible = sanitizeVisibleShareFallbackText(raw);
    assert.deepEqual(forbiddenVisiblePatterns(visible), []);
    assert.equal(visible, 'テキスト');
  });

  it('success path still shares the real privacy-safe URL', () => {
    const url = resolveShareAbsoluteUrl(card.sharePath, 'http://localhost:3000');
    assertSharePayloadPrivacySafe({ title: 'M55', text: card.shareTextJa, url });
    assert.ok(url.endsWith('/r/s1-1'));
  });

  it('hook builds the visible fallback from the sanitizer, never from the payload URL', () => {
    const src = readFileSync(join(ROOT, HOOK_FILE), 'utf8');
    assert.match(src, /function buildVisibleFallbackText/);
    assert.match(src, /sanitizeVisibleShareFallbackText/);
    assert.doesNotMatch(src, /setFallbackText\([^)]*payload\.url/);
    assert.doesNotMatch(src, /setFallbackText\(line\)/);
    // The action URL must still reach the clipboard and the native share sheet.
    assert.match(src, /navigator\.clipboard\.writeText\(line\)/);
    assert.match(src, /await navigator\.share\(payload\)/);
  });

  it('render boundary sanitizes before writing the fallback into the DOM', () => {
    const src = readFileSync(join(ROOT, BODY_FILE), 'utf8');
    assert.match(src, /const visibleFallbackText = fallbackText \? sanitizeVisibleShareFallbackText\(fallbackText\)/);
    assert.match(src, /value=\{visibleFallbackText\}/);
    assert.doesNotMatch(src, /value=\{fallbackText\}/);
    assert.doesNotMatch(src, /shareAbsoluteUrl/);
  });

  it('no share surface renders the action URL as visible text', () => {
    for (const rel of [
      'components/core/CoreFreeResultShareCTA.tsx',
      'components/core/CorePremiumResultShareCTA.tsx',
      BODY_FILE,
    ]) {
      const src = readFileSync(join(ROOT, rel), 'utf8');
      assert.doesNotMatch(src, /\{\s*shareAbsoluteUrl\s*\}/, `${rel} must not render the action URL`);
    }
  });
});
