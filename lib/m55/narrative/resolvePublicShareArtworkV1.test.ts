import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import {
  publicShareArtworkPathFromStemLane,
  resolvePublicShareArtworkFromToken,
} from './resolvePublicShareArtworkV1';
import { encodeShareToken } from '../freeResult/privacySafeShareCardV1';
import { encodePublicShareToken } from './publicShareTokenV1';

const ROOT = join(import.meta.dirname, '../../..');

function read(rel: string): string {
  return readFileSync(join(ROOT, rel), 'utf8');
}

describe('resolvePublicShareArtworkV1', () => {
  it('maps legacy s1 tokens to catalog artwork', () => {
    assert.equal(resolvePublicShareArtworkFromToken('s1-2'), '/ten-views/influencer.webp');
    assert.equal(resolvePublicShareArtworkFromToken(encodeShareToken(3)), '/ten-views/creator.webp');
    assert.equal(publicShareArtworkPathFromStemLane(9), '/ten-views/analyst.webp');
  });

  it('maps personal narrative tokens via public stem lane only', () => {
    const token = encodePublicShareToken({
      kind: 'personal',
      surface: 'personal_free',
      variant: 'manual',
      stemLaneIndex: 3,
      answerAxes: {
        start: 'map',
        decision: 'sort',
        recovery: 'pause',
        distance: 'close',
        change: 'observe',
      },
      birthAxes: {
        start: 'map',
        decision: 'sort',
        recovery: 'pause',
        distance: 'close',
        change: 'observe',
      },
      hingeAxisId: 'start',
    });
    assert.equal(resolvePublicShareArtworkFromToken(token), '/ten-views/creator.webp');
    assert.doesNotMatch(token, /1990|nickname|free\.start_style/);
  });

  it('does not invent artwork for pair tokens without a stem lane', () => {
    const token = encodePublicShareToken({
      kind: 'pair',
      surface: 'compatibility_free',
      variant: 'pair_manual',
      interactionId: 'tempo_mismatch',
    });
    assert.equal(resolvePublicShareArtworkFromToken(token), null);
  });

  it('public /r panel uses substantial artwork and stays privacy-safe', () => {
    const panel = read('components/share/SharedEntryPanel.tsx');
    const css = read('components/share/SharedEntry.module.css');
    assert.match(panel, /resolvePublicShareArtworkFromToken/);
    assert.match(panel, /imagePath=\{art\}/);
    assert.match(panel, /m55-shared-entry-art/);
    assert.match(css, /posterArt \{[\s\S]*aspect-ratio:\s*4\s*\/\s*5/);
    assert.doesNotMatch(css, /width: 7\.5rem/);
    assert.doesNotMatch(panel, /birthDate|nickname|raw answers/);
    const page = read('app/r/[token]/page.tsx');
    assert.doesNotMatch(page, /searchParams/);
  });
});
