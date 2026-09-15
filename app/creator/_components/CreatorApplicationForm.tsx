'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';

export function CreatorApplicationForm({ inviteToken }: { inviteToken?: string }) {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(''); setBusy(true);
    const data = new FormData(event.currentTarget);
    const optionalNumber = (name: string) => {
      const value = String(data.get(name) || '').trim();
      return value ? Number(value) : null;
    };
    try {
      const response = await fetch('/api/creator/application', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inviteToken, age18Plus: data.get('age18Plus') === 'on',
          japanResident: data.get('japanResident') === 'on',
          termsAccepted: data.get('termsAccepted') === 'on', termsVersion: '2026-09-13-v1',
          contentFocus: data.get('contentFocus'), promotionExperience: data.get('promotionExperience'),
          platform: data.get('platform'), mediaUrl: data.get('mediaUrl'), handle: data.get('handle'),
          audienceSize: optionalNumber('audienceSize'), recentAvgViews: optionalNumber('recentAvgViews'),
        }),
      });
      if (!response.ok) throw new Error('申請を受け付けられませんでした。入力内容や申請状況をご確認ください。');
      setDone(true);
    } catch (cause) { setError(cause instanceof Error ? cause.message : '申請できませんでした。'); }
    finally { setBusy(false); }
  }

  if (done) return <p role="status">申請を受け付けました。<Link href="/creator/portal">申請状況を確認する</Link></p>;
  return <form onSubmit={submit} style={{ display: 'grid', gap: 14 }}>
    {inviteToken && <p>スカウト招待からの申請です。招待は承認を保証しません。</p>}
    <label>主な発信メディアの種類<input name="platform" required maxLength={80} placeholder="例：Instagram、ブログ" style={{ display: 'block', width: '100%' }} /></label>
    <label>ご自身が運営する公開メディアのURL<input name="mediaUrl" required type="url" placeholder="https://" maxLength={500} style={{ display: 'block', width: '100%' }} /></label>
    <label>ハンドル名（任意）<input name="handle" maxLength={120} style={{ display: 'block', width: '100%' }} /></label>
    <label>発信内容について<textarea name="contentFocus" required maxLength={1000} rows={4} style={{ display: 'block', width: '100%' }} /></label>
    <label>紹介・広告の経験（任意）<textarea name="promotionExperience" maxLength={1000} rows={3} style={{ display: 'block', width: '100%' }} /></label>
    <label>フォロワー等の概数（任意・これだけで審査しません）<input name="audienceSize" type="number" min={0} step={1} style={{ display: 'block', width: '100%' }} /></label>
    <label>最近の平均閲覧概数（任意）<input name="recentAvgViews" type="number" min={0} step={1} style={{ display: 'block', width: '100%' }} /></label>
    <label><input name="age18Plus" type="checkbox" required /> 満18歳以上です</label>
    <label><input name="japanResident" type="checkbox" required /> 日本国内に居住しています</label>
    <label><input name="termsAccepted" type="checkbox" required /> <Link href="/legal/creator-affiliate-terms" target="_blank">Creator Affiliate 規約（2026-09-13-v1）</Link>を確認し同意します</label>
    <button type="submit" disabled={busy}>{busy ? '送信中…' : '審査を申し込む'}</button>
    {error && <p role="alert">{error}</p>}
  </form>;
}
