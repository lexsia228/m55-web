import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

const ROOT = process.cwd();
const read = (rel: string) => readFileSync(join(ROOT, rel), 'utf8');

const CORE_PAGE = 'app/dtr/core/page.tsx';
const PROCESSING_PAGE = 'app/dtr/processing/page.tsx';

describe('G3-02 — /dtr/core owned report deep return source contract', () => {
  const src = read(CORE_PAGE);

  it('sends anonymous users to sign-in with /dtr/core return, not directly to the sales LP', () => {
    const authBlock =
      src.split('const { userId } = await auth();')[1]?.split('resolveEntryReportOwnership')[0] ?? '';
    assert.match(
      authBlock,
      /redirect\(`\/sign-in\?redirect_url=\$\{encodeURIComponent\("\/dtr\/core"\)\}`\)/,
    );
    assert.doesNotMatch(authBlock, /redirect\("\/dtr\/lp"\)/);
    assert.doesNotMatch(authBlock, /redirect\('\/dtr\/lp'\)/);
  });

  it('matches the processing route signed-out redirect_url encoding pattern', () => {
    const processing = read(PROCESSING_PAGE);
    assert.match(processing, /redirect\(`\/sign-in\?redirect_url=\$\{encodeURIComponent\(back\)\}`\)/);
    assert.match(
      src,
      /redirect\(`\/sign-in\?redirect_url=\$\{encodeURIComponent\("\/dtr\/core"\)\}`\)/,
    );
  });

  it('still resolves ownership after authentication and does not bypass the gate', () => {
    const ownershipAt = src.indexOf('resolveEntryReportOwnership(userId)');
    const authAt = src.indexOf('const { userId } = await auth();');
    assert.ok(authAt >= 0);
    assert.ok(ownershipAt > authAt, 'ownership must be checked only after auth');
    assert.match(src, /if \(ownership\.unlockState === "locked"\) redirect\("\/dtr\/lp"\)/);
    assert.match(src, /if \(ownership\.unlockState === "expired"\) redirect\("\/dtr\/lp\?state=expired"\)/);
  });

  it('keeps non-owner and locked paths on the sales LP', () => {
    const afterOwnership = src.split('resolveEntryReportOwnership(userId)')[1] ?? '';
    assert.match(afterOwnership, /unlockState === "locked".*redirect\("\/dtr\/lp"\)/s);
    assert.match(afterOwnership, /unlockState === "expired".*redirect\("\/dtr\/lp\?state=expired"\)/s);
    assert.match(afterOwnership, /DTR_HIDDEN_ONLY_REPURCHASE_LP_PATH/);
  });

  it('keeps owned-ready buyers on the report surface instead of the sales LP', () => {
    const snapBlock = src.split('if (snap) {')[1]?.split('}\n\n  // owned + hidden-only')[0] ?? '';
    assert.match(snapBlock, /<DtrFullReader/);
    assert.doesNotMatch(snapBlock, /redirect\("\/dtr\/lp"\)/);
    assert.doesNotMatch(snapBlock, /redirect\('\/dtr\/lp'\)/);
  });

  it('uses a fixed internal return path so redirect_url cannot become an external open redirect', () => {
    const authBlock =
      src.split('const { userId } = await auth();')[1]?.split('resolveEntryReportOwnership')[0] ?? '';
    assert.match(authBlock, /encodeURIComponent\("\/dtr\/core"\)/);
    assert.doesNotMatch(authBlock, /encodeURIComponent\([^'"]/);
    assert.doesNotMatch(authBlock, /https?:\/\//);
    assert.doesNotMatch(authBlock, /searchParams|params\.|req\.|request\./);
  });
});
