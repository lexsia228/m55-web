'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import styles from '../creator.module.css';

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

  if (done) {
    return (
      <div className={styles.successCard} role="status">
        <h2 className={styles.successTitle}>申請を受け付けました</h2>
        <p className={styles.successBody}>
          審査結果は申請状況ページでご確認いただけます。
          <Link href="/creator/portal" className={styles.tertiaryLink}>申請状況を確認する</Link>
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className={styles.form}>
      {inviteToken && (
        <p className={styles.inviteNote}>
          スカウト招待からの申請です。招待は承認を保証しません。
        </p>
      )}

      <section className={styles.formSection}>
        <h2 className={styles.formSectionTitle}>公開メディア</h2>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="platform">主な発信メディアの種類</label>
          <input id="platform" name="platform" required maxLength={80} placeholder="例：Instagram、ブログ" className={styles.input} />
        </div>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="mediaUrl">ご自身が運営する公開メディアのURL</label>
          <input id="mediaUrl" name="mediaUrl" required type="url" placeholder="https://" maxLength={500} className={styles.input} />
        </div>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="handle">ハンドル名（任意）</label>
          <input id="handle" name="handle" maxLength={120} className={styles.input} />
        </div>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="audienceSize">フォロワー等の概数（任意）</label>
          <input id="audienceSize" name="audienceSize" type="number" min={0} step={1} className={styles.input} />
          <p className={styles.helper}>これだけで審査しません。</p>
        </div>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="recentAvgViews">最近の平均閲覧概数（任意）</label>
          <input id="recentAvgViews" name="recentAvgViews" type="number" min={0} step={1} className={styles.input} />
        </div>
      </section>

      <section className={styles.formSection}>
        <h2 className={styles.formSectionTitle}>発信内容</h2>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="contentFocus">発信内容について</label>
          <textarea id="contentFocus" name="contentFocus" required maxLength={1000} rows={4} className={styles.textarea} />
        </div>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="promotionExperience">紹介・広告の経験（任意）</label>
          <textarea id="promotionExperience" name="promotionExperience" maxLength={1000} rows={3} className={styles.textarea} />
        </div>
      </section>

      <section className={styles.formSection}>
        <h2 className={styles.formSectionTitle}>申請条件の確認</h2>
        <label className={styles.checkboxRow}>
          <input name="age18Plus" type="checkbox" required />
          <span>満18歳以上です</span>
        </label>
        <label className={styles.checkboxRow}>
          <input name="japanResident" type="checkbox" required />
          <span>日本国内に居住しています</span>
        </label>
        <label className={styles.checkboxRow}>
          <input name="termsAccepted" type="checkbox" required />
          <span>
            <Link href="/legal/creator-affiliate-terms" target="_blank" className={styles.tertiaryLink}>
              Creator Affiliate 規約
            </Link>
            を確認し、同意します
          </span>
        </label>
      </section>

      <p className={styles.submitNote}>
        申請または招待は参加承認を保証するものではありません。
      </p>
      <button type="submit" disabled={busy} className={styles.buttonPrimary}>
        {busy ? '送信中…' : '審査を申し込む'}
      </button>
      {error && <p role="alert" className={styles.error}>{error}</p>}
    </form>
  );
}
