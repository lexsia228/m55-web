import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

const root = process.cwd();

describe('referral landing surface', () => {
  it('scrubs hash before posting to creator-touch', () => {
    const client = readFileSync(join(root, 'app/m55/r/ReferralEntryClient.tsx'), 'utf8');
    assert.match(client, /window\.location\.hash/);
    assert.match(client, /replaceState/);
    assert.match(client, /fetch\('\/api\/m55\/attribution\/creator-touch'/);
    const page = readFileSync(join(root, 'app/m55/r/page.tsx'), 'utf8');
    assert.match(page, /no-referrer/);
  });

  it('continues to fixed /home after successful touch continuation', () => {
    const continuePage = readFileSync(
      join(root, 'app/m55/attribution/creator-touch/continue/page.tsx'),
      'utf8',
    );
    assert.match(continuePage, /router\.replace\('\/home'\)/);
  });
});
