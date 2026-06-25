import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import {
  LANE_B_CONSULT_REDIRECT_PATH,
  LANE_B_DISABLED_ERROR_CODE,
} from './laneBProductionFailClosed';

describe('laneBProductionFailClosed', () => {
  it('redirects Lane B pages to Lane A consult anchor', () => {
    assert.equal(LANE_B_CONSULT_REDIRECT_PATH, '/dtr/core#consultation-room');
  });

  it('generate route fail-closes when Lane B is disabled', () => {
    const helper = readFileSync(
      join(process.cwd(), 'lib/m55/reply/laneBProductionFailClosed.ts'),
      'utf8',
    );
    assert.match(helper, /return process\.env\.NODE_ENV !== 'production'/);
    const src = readFileSync(join(process.cwd(), 'app/api/reply/generate/route.ts'), 'utf8');
    assert.match(src, /isLaneBReplySurfaceEnabled/);
    assert.match(src, /LANE_B_DISABLED_ERROR_CODE/);
    assert.match(src, /status: 410/);
  });

  it('reply pages redirect to Lane A consult entry', () => {
    const replyPage = readFileSync(join(process.cwd(), 'app/reply/page.tsx'), 'utf8');
    const resultPage = readFileSync(join(process.cwd(), 'app/reply/result/page.tsx'), 'utf8');
    assert.match(replyPage, /redirect\(LANE_B_CONSULT_REDIRECT_PATH\)/);
    assert.match(resultPage, /redirect\(LANE_B_CONSULT_REDIRECT_PATH\)/);
  });
});
