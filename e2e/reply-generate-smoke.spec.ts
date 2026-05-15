import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

const endpoint = '/api/reply/generate';
const authHeaders = {
  'x-m55-test-user-id': 'smoke_user_reply_generate',
};

const basePayload = {
  theme: '仕事',
  input_mode: 'guided',
  selected_subquestions: [
    '今いちばん重い場面はどこですか。',
    '急な変更は最近増えていますか。',
  ],
  free_text: '最近、判断の切り替えが重くなっています。',
  schema_version: '1.1',
};

test.describe('/api/reply/generate smoke', () => {
  test('consume + idempotency runtime smoke', async ({ request }) => {
    // Case 1: 未認証
    const case1 = await request.post(endpoint, {
      headers: { 'content-type': 'application/json' },
      data: basePayload,
    });
    const case1Json = await case1.json();
    expect(case1.status(), 'case1 status').toBe(401);
    expect(case1Json?.error?.code, 'case1 error code').toBe('UNAUTHORIZED');

    // Case 2: Idempotency ヘッダなし
    const case2 = await request.post(endpoint, {
      headers: { ...authHeaders, 'content-type': 'application/json' },
      data: basePayload,
    });
    const case2Json = await case2.json();
    expect(case2.status(), 'case2 status').toBe(400);
    expect(case2Json?.error?.code, 'case2 error code').toBe('INVALID_REQUEST');

    const idemKey = `idem_smoke_${Date.now()}`;

    // Case 3: first successful consume
    const case3 = await request.post(endpoint, {
      headers: {
        ...authHeaders,
        'content-type': 'application/json',
        'x-idempotency-key': idemKey,
      },
      data: basePayload,
    });
    const case3Json = await case3.json();
    expect(case3.status(), 'case3 status').toBe(200);
    expect(case3Json.ok, 'case3 ok').toBe(true);
    expect(case3Json.stub_mode, 'case3 stub_mode').toBe(false);
    expect(case3Json.consumption_applied, 'case3 consumption_applied').toBe(true);
    expect(typeof case3Json.wallet_before, 'case3 wallet_before type').toBe('number');
    expect(typeof case3Json.wallet_after, 'case3 wallet_after type').toBe('number');
    expect(case3Json.wallet_before, 'case3 wallet_before > wallet_after').toBeGreaterThan(
      case3Json.wallet_after,
    );
    expect(case3Json.reply_document?.version, 'case3 reply_document.version').toBe('1.1');
    expect(typeof case3Json.reply_session_id, 'case3 reply_session_id type').toBe('string');

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (url && key) {
      const sb = createClient(url, key);
      const { data: ledgerRows, error: ledgerErr } = await sb
        .from('reply_wallet_ledgers')
        .select('id')
        .eq('reply_session_id', case3Json.reply_session_id)
        .eq('event_type', 'reply_consume');
      expect(ledgerErr, 'case3 ledger query').toBeNull();
      expect(ledgerRows?.length, 'case3 single reply_consume row').toBe(1);
    }

    // Case 4: idempotent replay (no second consume)
    const case4 = await request.post(endpoint, {
      headers: {
        ...authHeaders,
        'content-type': 'application/json',
        'x-idempotency-key': idemKey,
      },
      data: basePayload,
    });
    const case4Json = await case4.json();
    expect(case4.status(), 'case4 status').toBe(200);
    expect(case4Json.stub_mode, 'case4 stub_mode').toBe(false);
    expect(case4Json.consumption_applied, 'case4 consumption_applied').toBe(false);
    expect(case4Json.reply_session_id, 'case4 same reply_session_id').toBe(case3Json.reply_session_id);
    expect(case4Json.wallet_before, 'case4 wallet_before').toBe(case4Json.wallet_after);

    if (url && key) {
      const sb = createClient(url, key);
      const { data: ledgerRows, error: ledgerErr } = await sb
        .from('reply_wallet_ledgers')
        .select('id')
        .eq('reply_session_id', case3Json.reply_session_id)
        .eq('event_type', 'reply_consume');
      expect(ledgerErr, 'case4 ledger query').toBeNull();
      expect(ledgerRows?.length, 'case4 still single reply_consume row').toBe(1);
    }

    // Case 5: conflict
    const case5 = await request.post(endpoint, {
      headers: {
        ...authHeaders,
        'content-type': 'application/json',
        'x-idempotency-key': idemKey,
      },
      data: {
        ...basePayload,
        free_text: '同一キーで payload を変更した競合テスト',
      },
    });
    const case5Json = await case5.json();
    expect(case5.status(), 'case5 status').toBe(409);
    expect(case5Json?.error?.code, 'case5 error code').toBe('IDEMPOTENCY_CONFLICT');

    // Case 6: wallet なしユーザー → 403
    const case6Idem = `idem_smoke_nowallet_${Date.now()}`;
    const case6 = await request.post(endpoint, {
      headers: {
        'x-m55-test-user-id': 'smoke_user_reply_no_wallet',
        'content-type': 'application/json',
        'x-idempotency-key': case6Idem,
      },
      data: basePayload,
    });
    const case6Json = await case6.json();
    expect(case6.status(), 'case6 status').toBe(403);
    expect(case6Json?.error?.code, 'case6 error code').toBe('FORBIDDEN');

    console.log('[reply-generate-smoke] case results', {
      case1: { status: case1.status(), errorCode: case1Json?.error?.code },
      case2: { status: case2.status(), errorCode: case2Json?.error?.code },
      case3: {
        status: case3.status(),
        ok: case3Json?.ok,
        stub_mode: case3Json?.stub_mode,
        consumption_applied: case3Json?.consumption_applied,
        wallet_before: case3Json?.wallet_before,
        wallet_after: case3Json?.wallet_after,
        reply_session_id: case3Json?.reply_session_id,
        reply_document_version: case3Json?.reply_document?.version,
      },
      case4: {
        status: case4.status(),
        stub_mode: case4Json?.stub_mode,
        consumption_applied: case4Json?.consumption_applied,
        reply_session_id: case4Json?.reply_session_id,
      },
      case5: { status: case5.status(), errorCode: case5Json?.error?.code },
      case6: { status: case6.status(), errorCode: case6Json?.error?.code },
      replay_same_reply_session_id:
        case3Json?.reply_session_id === case4Json?.reply_session_id,
    });
  });
});
