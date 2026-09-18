'use client';

import { useEffect, useState } from 'react';
import { REVIEW_DIMENSIONS, REVIEW_RATINGS } from '../../../../lib/m55/creatorDistribution/contract';
import styles from '../review.module.css';

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

const DIMENSION_LABELS: Record<ReviewDimension, string> = {
  ACTIVITY_CONTINUITY: '活動の継続性',
  CREATOR_TRACK_RECORD: '発信実績',
  ENGAGEMENT_QUALITY: '反応の質',
  AUDIENCE_AUTHENTICITY: 'オーディエンスの真正性',
  CONTENT_FIT: 'M55との適合性',
  DISCLOSURE_READINESS: 'PR表示への対応',
};

const ACTION_LABELS = {
  MEDIA_CHALLENGE: '運営確認を開始', MEDIA_VERIFIED: '確認済みにする', MEDIA_FAILED: '確認失敗を記録',
  START_REVIEW: '審査を開始', NEED_MORE_INFO: '追加情報を依頼', REJECT: '申請を却下', BLOCK: '申請をブロック',
  APPROVE: '6項目を確認して承認',
} as const;

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('ja-JP', {
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Tokyo',
  }).format(date);
}

function formatMetric(value: number | null) {
  return value == null ? '—' : new Intl.NumberFormat('ja-JP').format(value);
}

export function CreatorReviewQueue() {
  const [items, setItems] = useState<Application[]>([]);
  const [message, setMessage] = useState('');
  const [inviteUrl, setInviteUrl] = useState('');
  const [campaign, setCampaign] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [approvalEvidence, setApprovalEvidence] = useState<Record<string, ApprovalEvidence>>({});
  async function load() {
    try {
      const response = await fetch('/api/internal/creator-review', { cache: 'no-store' });
      if (!response.ok) throw new Error('審査キューを取得できません。権限または設定を確認してください。');
      const body = await response.json(); setItems(body.applications || []);
      setLoadError(false);
    } catch (cause) {
      setLoadError(true);
      throw cause;
    }
  }
  useEffect(() => {
    load().catch((cause) => setMessage(String(cause))).finally(() => setLoading(false));
  }, []);
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
      setMessage(body.challenge
        ? `安全な連絡経路でCreatorへ共有してください。このチャレンジは今回のみ表示されます。\nチャレンジ（今回のみ表示）：${body.challenge}`
        : `操作を記録しました：${body.status}`);
      await load();
    } catch (cause) { setMessage(String(cause)); } finally { setBusy(false); }
  }
  return <div className={styles.console} aria-busy={busy || loading}>
    <section className={styles.inviteCard} aria-labelledby="invite-heading">
      <div className={styles.sectionHeading}>
        <div><p className={styles.sectionKicker}>Invite workflow</p><h2 id="invite-heading">スカウト招待</h2>
          <p>候補者専用の申請URLを1件発行します。招待は審査承認を意味しません。</p></div>
        <span className={styles.stepBadge}>01</span>
      </div>
      <div className={styles.inviteForm}>
        <label htmlFor="campaign">キャンペーン名 <span>任意</span></label>
        <div className={styles.inputRow}>
          <input id="campaign" value={campaign} maxLength={120} disabled={busy}
            placeholder="例：Founding Creator outreach" onChange={(e) => setCampaign(e.target.value)} />
          <button className={styles.primaryButton} type="button" disabled={busy} onClick={issue}>招待URLを発行</button>
        </div>
        <p className={styles.fieldHelp}>候補者や施策を識別できる内部向けの名称です。最大120文字。</p>
      </div>
      {inviteUrl && <div className={styles.secureResult}>
        <div><strong>発行済みURL</strong><span>今回のみ表示</span></div>
        <code>{inviteUrl}</code>
        <p>安全な連絡経路で共有してください。再表示はできません。</p>
      </div>}
    </section>

    {message && <div className={message.startsWith('Error') ? styles.messageError : styles.message} role="status" aria-live="polite">{message}</div>}

    <section className={styles.queueSection} aria-labelledby="queue-heading">
      <div className={styles.queueHeader}>
        <div><p className={styles.sectionKicker}>Review queue</p><h2 id="queue-heading">審査対象</h2>
          <p>公開メディアの運営確認と、6項目の根拠評価を人が実施します。</p></div>
        <div className={styles.queueStats}>
          <div><strong>{loading || loadError ? '—' : items.length}</strong><span>Queue · 最大100件</span></div>
          <div><strong>Human</strong><span>Review model</span></div>
        </div>
      </div>

      {loading ? <div className={styles.loadingState} role="status"><span /><div><strong>審査キューを読み込んでいます</strong><p>申請情報を安全に取得しています。</p></div></div> :
        loadError ? <div className={styles.loadErrorState} role="alert"><h3>審査キューを確認できません</h3><p>申請件数と現在の状態を取得できませんでした。権限・設定や接続状況を確認してから、ページを再読み込みしてください。</p></div> :
        items.length === 0 ? <div className={styles.emptyState}><span aria-hidden="true">✓</span><h3>現在、審査待ちの申請はありません</h3><p>新しい申請が届くと、このキューに表示されます。</p></div> :
        <div className={styles.applicationList}>{items.map((app) => {
          const evidence = approvalEvidence[app.id] || {};
          const passCount = REVIEW_DIMENSIONS.filter((dimension) => evidence[dimension] === 'PASS').length;
          const approvable = REVIEW_DIMENSIONS.every((dimension) => evidence[dimension] === 'PASS');
          return <article key={app.id} className={styles.applicationCard}>
            <header className={styles.applicationHeader}>
              <div className={styles.identityBlock}>
                <div className={styles.chipRow}><span className={styles.statusChip} data-status={app.status}>{app.status}</span><span className={styles.sourceChip}>{app.application_source}</span></div>
                <h3>Creator application</h3>
                <p className={styles.applicationId} title={app.id}>ID&nbsp; {app.id}</p>
              </div>
              <div className={styles.submittedMeta}><span>申請日時</span><strong>{formatDate(app.submitted_at)} JST</strong></div>
            </header>

            <div className={styles.applicationDetails}>
              <div><span>発信内容</span><p>{app.content_focus_safe}</p></div>
              <div><span>紹介・発信経験</span><p>{app.promotion_experience_safe || '記載なし'}</p></div>
              <dl><div><dt>キャンペーン</dt><dd>{app.source_campaign || '—'}</dd></div><div><dt>同意規約</dt><dd>{app.terms_version}</dd></div></dl>
            </div>

            <section className={styles.mediaSection} aria-label="メディア運営確認">
              <div className={styles.subsectionHeader}><div><p className={styles.sectionKicker}>Media verification</p><h4>公開メディアの運営確認</h4></div><span>{app.m55_creator_application_media.length} media</span></div>
              <div className={styles.mediaList}>{app.m55_creator_application_media.map((media) => <article key={media.id} className={styles.mediaCard}>
                <div className={styles.mediaTopline}><div><strong>{media.platform}</strong>{media.is_primary && <span>Primary</span>}</div>
                  <span className={media.control_verification_status === 'VERIFIED' ? styles.verifiedChip : media.control_verification_status === 'FAILED' ? styles.failedChip : styles.pendingChip}>{media.control_verification_status}</span></div>
                <a className={styles.mediaLink} href={media.canonical_url} target="_blank" rel="noreferrer">公開メディアを確認 <span aria-hidden="true">↗</span></a>
                <div className={styles.metricGrid}><div><span>申告オーディエンス</span><strong>{formatMetric(media.self_reported_audience_size)}</strong></div><div><span>最近の平均閲覧</span><strong>{formatMetric(media.self_reported_recent_avg_views)}</strong></div></div>
                <p className={styles.metricNote}>数値は補助情報です。規模や閲覧数だけで承認しません。</p>
                <div className={styles.verificationMeta}><span>確認方法</span><strong>{media.control_verification_method || '未選択'}</strong></div>
                <div className={styles.mediaActions}>{(['MEDIA_CHALLENGE','MEDIA_VERIFIED','MEDIA_FAILED'] as const).map((action) =>
                  <button className={action === 'MEDIA_FAILED' ? styles.dangerTextButton : action === 'MEDIA_VERIFIED' ? styles.confirmButton : styles.secondaryButton} key={action} type="button" disabled={busy} onClick={() => act(app.id, action, media.id)}>{ACTION_LABELS[action]}</button>)}</div>
              </article>)}</div>
            </section>

            <fieldset className={styles.evidenceSection}>
              <legend className={styles.visuallyHidden}>Human審査の根拠評価</legend>
              <div className={styles.evidenceHeader}><div><p className={styles.sectionKicker}>Human evidence</p><h4>6項目の根拠評価</h4><p>すべての項目を明示的にPASSと評価した場合のみ承認できます。</p></div>
                <div className={approvable ? styles.passProgress : styles.reviewProgress}><strong>{passCount} / 6</strong><span>PASS</span></div></div>
              <div className={styles.evidenceGrid}>{REVIEW_DIMENSIONS.map((dimension, index) => {
                const rating = evidence[dimension] || '';
                return <label className={`${styles.evidenceItem} ${rating ? styles[`rating${rating}`] : ''}`} key={dimension}>
                  <span className={styles.dimensionNumber}>{String(index + 1).padStart(2, '0')}</span><span className={styles.dimensionLabel}>{DIMENSION_LABELS[dimension]}<small>{dimension}</small></span>
                  <select value={rating} disabled={busy} aria-label={`${DIMENSION_LABELS[dimension]}の評価`}
                    onChange={(event) => setApprovalEvidence((current) => ({ ...current,
                      [app.id]: { ...current[app.id], [dimension]: event.target.value as ReviewRating },
                    }))}>
                    <option value="">未評価</option>{REVIEW_RATINGS.map((ratingOption) => <option key={ratingOption} value={ratingOption}>{ratingOption}</option>)}
                  </select>
                </label>;
              })}</div>
            </fieldset>

            <footer className={styles.reviewActions}>
              <div className={styles.workflowActions}>{(['START_REVIEW','NEED_MORE_INFO'] as const).map((action) =>
                <button className={styles.secondaryButton} key={action} type="button" disabled={busy} onClick={() => act(app.id, action)}>{ACTION_LABELS[action]}</button>)}</div>
              <div className={styles.terminalActions}>{(['REJECT','BLOCK'] as const).map((action) =>
                <button className={styles.dangerButton} key={action} type="button" disabled={busy} onClick={() => act(app.id, action)}>{ACTION_LABELS[action]}</button>)}
                <button className={styles.approveButton} type="button" disabled={busy || !approvable} onClick={() => act(app.id, 'APPROVE')}>{ACTION_LABELS.APPROVE}</button></div>
            </footer>
          </article>;
        })}</div>}
    </section>
  </div>;
}
