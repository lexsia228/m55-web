'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

type Portal = {
  application: null | { id: string; status: string; terms_version: string; submitted_at: string; rejected_reapply_after: string | null };
  profile: null | { creator_code: string; first_final_approved_at: string; status: string; terms_version: string };
};

export function CreatorPortalPanel() {
  const [portal, setPortal] = useState<Portal | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function load() {
    const response = await fetch('/api/creator/portal', { cache: 'no-store' });
    if (!response.ok) throw new Error('申請状況を取得できませんでした。');
    setPortal(await response.json());
  }
  useEffect(() => { load().catch(() => setError('申請状況を取得できませんでした。')); }, []);
  async function reaccept() {
    if (!portal?.application) return;
    setBusy(true); setError('');
    try {
      const response = await fetch('/api/creator/application', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'REACCEPT_TERMS', applicationId: portal.application.id,
          termsVersion: '2026-09-13-v1', termsAccepted: true }) });
      if (!response.ok) throw new Error('規約への再同意を記録できませんでした。');
      await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : '再同意できませんでした。'); }
    finally { setBusy(false); }
  }
  if (error) return <p role="alert">{error}</p>;
  if (!portal) return <p role="status">読み込み中…</p>;
  const app = portal.application;
  const profile = portal.profile;
  return <section>
    {!app && !profile && <p>申請はまだありません。<Link href="/creator/apply">申請する</Link></p>}
    {app && <>
      <p>申請状況：<strong>{app.status}</strong></p>
      <p>申請日：{new Date(app.submitted_at).toLocaleDateString('ja-JP')}</p>
      {app.status === 'NEED_MORE_INFO' && <p>確認が必要です。<Link href="/support">サポートに連絡</Link>してください。</p>}
      {app.status === 'TERMS_REACCEPT_REQUIRED' && <p>規約の再確認が必要です。<Link href="/legal/creator-affiliate-terms">現在の規約</Link>を確認してから<button type="button" disabled={busy} onClick={reaccept}>再同意する</button></p>}
      {app.status === 'REJECTED' && <p>今回は承認されませんでした。再申請可能日：{app.rejected_reapply_after ? new Date(app.rejected_reapply_after).toLocaleDateString('ja-JP') : '個別案内'}。<Link href="/creator/apply">再申請</Link></p>}
      {app.status === 'BLOCKED' && <p>再申請はできません。<Link href="/support">サポート</Link>へお問い合わせください。</p>}
    </>}
    {profile && <>
      <p>Creatorコード：<strong>{profile.creator_code}</strong></p>
      <p>初回最終承認日：{new Date(profile.first_final_approved_at).toLocaleDateString('ja-JP')}</p>
      <p>規約バージョン：{profile.terms_version}</p>
      <p>有効化状況：<strong>{profile.status}</strong></p>
    </>}
    <p>紹介計測・報酬レポート・支払機能はまだ有効ではありません。現在使えるアフィリエイトURLは表示していません。</p>
  </section>;
}
