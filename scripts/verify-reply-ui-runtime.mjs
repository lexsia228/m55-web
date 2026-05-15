const user = 'f_runtime_no_wallet_user';

const replyRes = await fetch('http://127.0.0.1:3000/reply', {
  headers: { 'x-m55-test-user-id': user },
});
const replyHtml = await replyRes.text();

const hasMessage = replyHtml.includes('現在ご利用いただける返書がありません');
const hasLpLink = replyHtml.includes('/dtr/lp');
const submitButtonHasDisabled =
  replyHtml.includes('type="button" disabled') ||
  replyHtml.includes('disabled type="button"');

const apiRes = await fetch('http://127.0.0.1:3000/api/reply/generate', {
  method: 'POST',
  headers: {
    'content-type': 'application/json',
    'x-idempotency-key': `idem_ui_runtime_${Date.now()}`,
    'x-m55-test-user-id': user,
  },
  body: JSON.stringify({
    theme: '仕事',
    input_mode: 'guided',
    selected_subquestions: ['今いちばん重い場面はどこですか。'],
    free_text: 'ui runtime check',
    schema_version: '1.1',
  }),
});
const apiJson = await apiRes.json();

const lpRes = await fetch('http://127.0.0.1:3000/dtr/lp');

console.log(
  JSON.stringify(
    {
      replyStatus: replyRes.status,
      hasMessage,
      hasLpLink,
      submitButtonHasDisabled,
      lpStatus: lpRes.status,
      apiStatus: apiRes.status,
      apiError: apiJson?.error ?? null,
    },
    null,
    2,
  ),
);
