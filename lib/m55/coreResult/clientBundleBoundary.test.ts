import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import { runM55CompositeStemPipeline } from '../compositeStem/pipeline';
import { runM55CompositeStemPipelineClient } from '../compositeStem/pipeline.client';
import { toCompositeCanonicalInput } from '../compositeStem/parseFulfillmentMetadata';
import { resolveCoreStemAuthority } from './resolveCoreStemAuthority';
import { resetCalendarBundleCacheForTests } from '../calendar/loadCalendarBundle';

const DM_GX_01_INPUT = {
  nickname: 'gx01',
  birthDate: '1983-02-28',
  birthTime: '12:00:00.000',
  birthTimeUnknown: false,
  country: 'JP',
  birthplace: 'Tokyo',
  timezone: 'Asia/Tokyo' as const,
  locale: 'ja-JP',
  contextScope: 'core' as const,
};

function readSrc(rel: string): string {
  return readFileSync(join(process.cwd(), rel), 'utf8');
}

describe('clientBundleBoundary', () => {
  it('resolveCoreStemAuthority.ts does not import server-only modules', () => {
    const src = readSrc('lib/m55/coreResult/resolveCoreStemAuthority.ts');
    assert.doesNotMatch(src, /loadCalendarBundle/);
    assert.doesNotMatch(src, /deriveLockedShelfStemPreviewCore/);
    assert.doesNotMatch(src, /from ['\"].*\/pipeline['\"]/);
    assert.doesNotMatch(src, /runM55CompositeStemPipeline[^C]/);
    assert.match(src, /runM55CompositeStemPipelineClient/);
    assert.match(src, /fulfillmentProfileFields/);
  });

  it('pipeline.client.ts does not import node builtins', () => {
    const src = readSrc('lib/m55/compositeStem/pipeline.client.ts');
    assert.doesNotMatch(src, /from ['\"]node:(crypto|fs|path)['\"]/);
    assert.doesNotMatch(src, /from ['\"]fs['\"]/);
    assert.doesNotMatch(src, /from ['\"]path['\"]/);
    assert.doesNotMatch(src, /from ['\"]crypto['\"]/);
    assert.doesNotMatch(src, /loadCalendarBundle['\"]/);
    assert.doesNotMatch(src, /from ['\"].*\/pipeline['\"]/);
  });

  it('loadCalendarBundleClient.ts does not import node builtins or server loader', () => {
    const src = readSrc('lib/m55/calendar/loadCalendarBundleClient.ts');
    assert.doesNotMatch(src, /node:crypto/);
    assert.doesNotMatch(src, /node:fs/);
    assert.doesNotMatch(src, /node:path/);
    assert.doesNotMatch(src, /loadCalendarBundle\.ts/);
    assert.doesNotMatch(src, /from ['\"]\.\/loadCalendarBundle['\"]/);
  });

  it('DM-GX-01 client pipeline matches server pipeline', () => {
    resetCalendarBundleCacheForTests();
    const input = toCompositeCanonicalInput(DM_GX_01_INPUT);
    const server = runM55CompositeStemPipeline(input);
    const client = runM55CompositeStemPipelineClient(input);
    assert.equal(client.stemLaneIndex, server.stemLaneIndex);
    assert.equal(client.stemChar, server.stemChar);
    assert.equal(client.paid.publicTitle, server.paid.publicTitle);
    assert.equal(client.stemLaneIndex, 9);
    assert.equal(client.paid.publicTitle, 'アナリスト');
  });

  it('DM-GX-01 resolveCoreStemAuthority lane 9 / アナリスト', () => {
    resetCalendarBundleCacheForTests();
    const authority = resolveCoreStemAuthority({
      nickname: 'gx01',
      birthDate: '1983-02-28',
      birthTime: '12:00:00.000',
      birthTimeUnknown: false,
      country: 'JP',
      birthplace: 'Tokyo',
    });
    assert.ok(authority);
    assert.equal(authority.stemLaneIndex, 9);
    assert.equal(authority.stemChar, '癸');
    assert.equal(authority.publicTitle, 'アナリスト');
  });
});
