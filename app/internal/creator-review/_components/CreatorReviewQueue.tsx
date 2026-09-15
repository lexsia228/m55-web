'use client';

import { useEffect, useState } from 'react';
import { REVIEW_DIMENSIONS, REVIEW_RATINGS } from '../../../../lib/m55/creatorDistribution/contract';

type ReviewDimension = typeof REVIEW_DIMENSIONS[number];
type ReviewRating = typeof REVIEW_RATINGS[number];
type ApprovalEvidence = Partial<Record<ReviewDimension, ReviewRating>>;

type Media = { id: string; platform: string; canonical_url: string; is_primary: boolean;
  control_verification_status: string; control_verification_method: string | null;
  self_reported_audience_size: number | null; self_reported_recent_avg_views: number | null };
type Application = { id: string; clerk_user_id: string; status: string; application_source: string;
  source_campaign: string | null; terms_version: string; content_focus_safe: string;
  promotion_experience_safe: string | null;
  submitted_at: string; m55_creator_application_media: Media[] };

export function CreatorReviewQueue() {
  const [items, setItems] = useState<Application[]>([]);
  const [message, setMessage] = useState('');
  const [inviteUrl, setInviteUrl] = useState('');
  const [campaign, setCampaign] = useState('');
  const [busy, setBusy] = useState(false);
  const [approvalEvidence, setApprovalEvidence] = useState<Record<string, ApprovalEvidence>>({});
  async function load() {
    const response = await fetch('/api/internal/creator-review', { cache: 'no-store' });
    if (!response.ok) throw new Error('審査キューを取得できません。権限または設定を確認してください。');
    const body = await response.json(); setItems(body.applications || []);
  }
  useEffect(() => { load().catch((cause) => setMessage(String(cause))); }, []);
  async function issue() {
    setBusy(true); setMessage('');
    try {
      const response = await fetch('/api/internal/creator-review', { method: 'POST',
        headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'ISSUE_INVITE', campaign }) });
      if (!response.ok) throw new Error('招待を発行できませんでした。');
      const body = await response.json(); setInviteUrl(body.url);
      setMessage('招待URLを発行しました。表示は今回のみです。安全な連絡経路で共有してください。');
    } catch (cause) { setMessage(String(cause)); } finally { setBusy(false); }
  }
  async function act(appId: string, action: string, mediaId?: string) {
    const evidence = approvalEvidence[appId] || {};
    if (action === 'APPROVE' && !REVIEW_DIMENSIONS.every((dimension) => evidence[dimension] === 'PASS')) {
      setMessage('承認には6項目すべての明示的なPASS評価が必要です。');
      return;
    }
    const reasonCode = action === 'APPROVE' ? 'QUALIFIED' : window.prompt('理由コードを入力してください（例：NEED_MORE_INFO / MEDIA_CONTROL_UNVERIFIED / OTHER）');
    if (!reasonCode) return;
    const method = action.startsWith('MEDIA_') ? window.prompt('確認方法：DM_CHALLENGE / BIO_CHALLENGE / EXISTING_SCOUT_THREAD / MANUAL_OTHER') : undefined;
    if (action.startsWith('MEDIA_') && !method) return;
    const notes = window.prompt('内部メモ（任意・機微情報は記入しないでください）') || '';
    setBusy(true); setMessage('');
    try {
      const response = await fetch(`/api/internal/creator-review/${encodeURIComponent(appId)}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, reasonCode, method, mediaId, notes,
          approvalEvidence: action === 'APPROVE' ? evidence : undefined }),
      });
      if (!response.ok) throw new Error('審査操作は適用されませんでした。');
      const body = await response.json();
      setMessage(body.challenge ? `チャレンジ（今回のみ表示）：${body.challenge}` : `操作を記録しました：${body.status}`);
      await load();
    } catch (cause) { setMessage(String(cause)); } finally { setBusy(false); }
  }
  return <div style={{ display: 'grid', gap: 24 }}>
    <section><h2>スカウト招待</h2>
      <label>キャンペーン名（任意）<input value={campaign} maxLength={120} onChange={(e) => setCampaign(e.target.value)} /></label>
      <button type="button" disabled={busy} onClick={issue}>招待URLを発行</button>
      {inviteUrl && <p>一度だけ表示：<code style={{ overflowWrap: 'anywhere' }}>{inviteUrl}</code></p>}
    </section>
    {message && <p role="status">{message}</p>}
    <h2>審査待ち（最大100件）</h2>
    {items.map((app) => <article key={app.id} style={{ border: '1px solid #aaa', padding: 16 }}>
      <h3>{app.id}</h3>
      <p>状態：{app.status} · ソース：{app.application_source} · キャンペーン：{app.source_campaign || '—'}</p>
      <p>規約：{app.terms_version} · 申請日：{app.submitted_at} · 発信内容：{app.content_focus_safe}</p>
      <p>申告された紹介・発信経験：{app.promotion_experience_safe || '記載なし'}</p>
      {app.m55_creator_application_media.map((media) => <div key={media.id}>
        <p>主メディア：{media.is_primary ? 'はい' : 'いいえ'} · {media.platform} · <a href={media.canonical_url} target="_blank" rel="noreferrer">公開メディアを確認</a></p>
        <p>自己申告：規模 {media.self_reported_audience_size ?? '—'} · 最近の閲覧 {media.self_reported_recent_avg_views ?? '—'}（数値だけで承認しない）</p>
        <p>運営確認：{media.control_verification_status} / {media.control_verification_method || '未選択'}</p>
        {(['MEDIA_CHALLENGE','MEDIA_VERIFIED','MEDIA_FAILED'] as const).map((action) =>
          <button key={action} type="button" disabled={busy} onClick={() => act(app.id, action, media.id)}>{action}</button>)}
      </div>)}
      <fieldset><legend>Human審査の根拠評価（各項目を明示的に選択。全項目PASSのみ承認可）</legend>
        {REVIEW_DIMENSIONS.map((dimension) => <label key={dimension} style={{ display: 'block' }}>
          {dimension}：<select value={approvalEvidence[app.id]?.[dimension] || ''}
            onChange={(event) => setApprovalEvidence((current) => ({ ...current,
              [app.id]: { ...current[app.id], [dimension]: event.target.value as ReviewRating },
            }))}>
            <option value="">未評価</option>
            {REVIEW_RATINGS.map((rating) => <option key={rating} value={rating}>{rating}</option>)}
          </select>
        </label>)}
      </fieldset>
      {(['START_REVIEW','NEED_MORE_INFO','REJECT','BLOCK','APPROVE'] as const).map((action) =>
        <button key={action} type="button" disabled={busy || (action === 'APPROVE' &&
          !REVIEW_DIMENSIONS.every((dimension) => approvalEvidence[app.id]?.[dimension] === 'PASS'))}
          onClick={() => act(app.id, action)}>{action}</button>)}
    </article>)}
  </div>;
}
