import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  PAIR_SHARE_ENTRY_PATH,
  PAIR_SHARE_PAYLOAD_TEXT_JA,
  PAIR_SHARE_UI_COPY,
  buildPrivacySafePairSharePayload,
} from './privacySafePairShare';
import {
  compactExistingPhrase,
  PAIR_SIGNATURE_LABELS,
} from './pairResultSignatureCopy';
import {
  sharePayloadContainsSensitive,
} from '../freeResult/privacySafeShareCardV1';

const ROOT = join(import.meta.dirname, '../../..');
const read = (rel: string) => readFileSync(join(ROOT, rel), 'utf8');

describe('privacy-safe pair share', () => {
  it('shares only the canonical /synastry entry', () => {
    const payload = buildPrivacySafePairSharePayload('https://m-55.jp');
    assert.equal(payload.title, 'M55');
    assert.equal(payload.text, PAIR_SHARE_PAYLOAD_TEXT_JA);
    assert.equal(payload.url, 'https://m-55.jp/synastry');
    assert.equal(PAIR_SHARE_ENTRY_PATH, '/synastry');
    assert.equal(sharePayloadContainsSensitive(`${payload.title}\n${payload.text}\n${payload.url}`), false);
  });

  it('rejects query-bearing origins by constructing a clean path', () => {
    const payload = buildPrivacySafePairSharePayload('https://example.test');
    assert.equal(new URL(payload.url).pathname, '/synastry');
    assert.equal(new URL(payload.url).search, '');
    assert.equal(new URL(payload.url).hash, '');
  });

  it('copy never includes private result fields', () => {
    const blob = `${PAIR_SHARE_UI_COPY.titleJa}\n${PAIR_SHARE_UI_COPY.bodyJa}\n${PAIR_SHARE_PAYLOAD_TEXT_JA}`;
    assert.doesNotMatch(blob, /生年月日|1983|questionnaire|relationshipLoop|相手側は/);
    assert.match(blob, /二人読み解き/);
  });
});

describe('pair signature copy compression', () => {
  it('keeps the first existing sentence and does not invent copy', () => {
    const source = '二人とも、意見が違うときも、まず受け取られたと分かると、話を続けやすいところが重なります。続きの文。';
    assert.equal(
      compactExistingPhrase(source),
      '二人とも、意見が違うときも、まず受け取られたと分かると、話を続けやすいところが重なります。',
    );
    assert.equal(PAIR_SIGNATURE_LABELS.you, 'あなた');
    assert.equal(PAIR_SIGNATURE_LABELS.partner, '相手');
  });
});

describe('pair free surface wiring', () => {
  it('mounts the signature and privacy-safe share on the guest result', () => {
    const guest = read('components/compatibility/CompatibilityGuestExperience.tsx');
    assert.match(guest, /PairResultSignature/);
    assert.match(guest, /PairFreeShareCTA/);
    const insightSpec = read('lib/m55/compatibility/pairFreeInsightSpecV2.ts');
    assert.doesNotMatch(insightSpec, /pairReadingFingerprint/);
    assert.match(guest, /result\.free\.overlap/);
    assert.match(guest, /context\.immediateAction/);
    const shareAt = guest.indexOf('<PairFreeShareCTA');
    const actionAt = guest.indexOf('styles.actionCard');
    const bridgeAt = guest.indexOf('この二人の続きとして読めること');
    assert.ok(actionAt > 0 && shareAt > actionAt, 'share must follow the action block');
    assert.ok(shareAt > bridgeAt, 'narrative overlay places sanitized share after the paid teaser');
  });

  it('does not add scores, charts, or partner-mind claims', () => {
    const sig = read('components/compatibility/PairResultSignature.tsx');
    const share = read('lib/m55/compatibility/privacySafePairShare.ts');
    const blob = sig + share;
    assert.doesNotMatch(blob, /%|相性点数|zodiac|dashboard|node map|heart|ハート|運命/);
    assert.doesNotMatch(share, /personA|personB|overlap|difference|immediateAction/);
  });
});

describe('pair premium ownership grammar', () => {
  it('applies night tone, visual roles, and A/B labels without commerce activation', () => {
    const reader = read('components/compatibility/PaidCompatibilityReportReader.tsx');
    const css = read('components/compatibility/PaidCompatibilityReportReader.module.css');
    assert.match(reader, /data-m55-pair-premium-tone="night"/);
    assert.match(reader, /data-visual-role="thesis"/);
    assert.match(reader, /data-visual-role="primaryRecognition"/);
    assert.match(reader, /data-visual-role="action"/);
    assert.match(reader, /data-visual-role="takeaway"/);
    assert.match(reader, /data-pair-side="you"/);
    assert.match(reader, /data-pair-side="partner"/);
    assert.match(reader, /aria-label="あなた側"/);
    assert.match(reader, /aria-label="相手側"/);
    assert.match(reader, /tone="night"/);
    assert.match(css, /#1a1628/);
    assert.match(css, /\.reader \[data-pair-side='partner'\][\s\S]*border-left: 2px dashed/);
    assert.doesNotMatch(reader, /M55_COMPATIBILITY_COMMERCE_ENABLED/);
    assert.doesNotMatch(reader, /checkout|webhook|stripe/i);
  });
});
