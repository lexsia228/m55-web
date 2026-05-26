import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { resetCalendarBundleCacheForTests } from '../calendar/loadCalendarBundle';
import { runM55CompositeStemPipeline } from './pipeline';
import { runM55CompositeStemPipelineClient } from './pipeline.client';
import { toCompositeCanonicalInput } from './parseFulfillmentMetadata';

const DM_GX_01 = {
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

describe('pipeline.client parity', () => {
  it('DM-GX-01 matches server stem authority', () => {
    resetCalendarBundleCacheForTests();
    const input = toCompositeCanonicalInput(DM_GX_01);
    const server = runM55CompositeStemPipeline(input);
    const client = runM55CompositeStemPipelineClient(input);
    assert.equal(client.stemLaneIndex, server.stemLaneIndex);
    assert.equal(client.stemChar, server.stemChar);
    assert.equal(client.paid.publicTitle, server.paid.publicTitle);
    assert.equal(client.normalizedBirthContext.effectiveLocalDate, server.normalizedBirthContext.effectiveLocalDate);
    assert.equal(client.stemLaneIndex, 9);
  });
});
