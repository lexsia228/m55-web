import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  registerCreatorApplicationNotificationAfterSuccess,
  resetCreatorApplicationNotifyDedupeForTests,
} from '../../../../lib/m55/creatorDistribution/applicationNotificationEmail.ts';

const ROUTE = join(process.cwd(), 'app/api/creator/application/route.ts');

/**
 * Mirrors the post-submit success branch in route.ts without Clerk/Supabase.
 */
function buildAcceptedApplicationResponse(
  applicationId: string,
  register: (id: string) => void,
): { status: number; body: { ok: boolean; applicationId: string } } {
  try {
    register(applicationId);
  } catch {
    // Notification scheduling must not affect an already-accepted application.
  }
  return { status: 201, body: { ok: true, applicationId } };
}

describe('creator application route — post-success isolation', () => {
  it('returns 201 when notification registration throws synchronously', () => {
    const id = 'a1b2c3d4-e5f6-4789-a012-3456789abcde';
    const res = buildAcceptedApplicationResponse(id, () => {
      throw new Error('after_registration_failed');
    });
    assert.equal(res.status, 201);
    assert.deepEqual(res.body, { ok: true, applicationId: id });
  });

  it('does not include notification registration inside APPLICATION_NOT_ACCEPTED catch', () => {
    const src = readFileSync(ROUTE, 'utf8');
    const submitCatchStart = src.indexOf("return NextResponse.json({ error: 'APPLICATION_NOT_ACCEPTED'");
    const submitTryStart = src.lastIndexOf('try {', submitCatchStart);
    const between = src.slice(submitTryStart, submitCatchStart);
    assert.doesNotMatch(between, /registerCreatorApplicationNotificationAfterSuccess/);
  });

  it('uses register helper with injected after registrar without throwing', () => {
    resetCreatorApplicationNotifyDedupeForTests();
    let registered = false;
    registerCreatorApplicationNotificationAfterSuccess('a1b2c3d4-e5f6-4789-a012-3456789abcde', () => {
      registered = true;
    });
    assert.equal(registered, true);
  });
});
