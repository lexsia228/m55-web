'use client';

import Link from 'next/link';
import { SignedIn, SignedOut, SignInButton, useUser } from '@clerk/nextjs';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ProfileRepository, BirthProfile } from '../../lib/soul/profile';
import {
  DEFAULT_COUNTRY,
  SUPPORTED_COUNTRIES,
  enrichBirthProfileForSave,
  profileFormatLabel,
} from '../../lib/soul/birthProfileV2';
import {
  displayLabelForDtrRightKey,
  isEntryReportCoreRight,
} from '../../lib/m55/myEntitlementLabels';
import DtrCatalogStrip from '../dtr/DtrCatalogStrip';
import SavedReportDeleteDialog from './SavedReportDeleteDialog';
import {
  DTR_SAVED_REPORT_DELETE_ERROR_GENERIC,
  DTR_SAVED_REPORT_DELETE_TOAST_PRIMARY,
  DTR_SAVED_REPORT_DELETE_TOAST_SECONDARY,
  DTR_SAVED_REPORT_DELETE_TRIGGER_LABEL,
} from '../../lib/m55/dtrSavedReportDeleteCopy';
import styles from './MyPanel.module.css';

type EntitlementsResponse = {
  tier?: string;
  retention_days?: number;
  dtr_rights?: string[];
};

type SnapshotReadyResponse = {
  ready: boolean;
  hasOwnership: boolean;
  hasPurchaseSnapshot: boolean;
};

type ProfileState = 'no_profile' | 'ready' | 'editing';

type CoreVisualStatus = 'ready' | 'pending' | 'unknown';

function computeRows(ent: EntitlementsResponse, snap: SnapshotReadyResponse | null): string[] {
  const rights = ent.dtr_rights ?? [];
  const hasCoreInList = rights.some((k) => isEntryReportCoreRight(k));
  if (rights.length > 0) return rights;
  if (snap?.hasOwnership && !hasCoreInList) return ['m55_p:core_origin'];
  return [];
}

function coreVisualStatus(
  snapError: boolean,
  snap: SnapshotReadyResponse | null
): CoreVisualStatus {
  if (snapError) return 'unknown';
  if (snap?.ready) return 'ready';
  return 'pending';
}

export default function MyPanel() {
  const { user, isLoaded } = useUser();
  const [ent, setEnt] = useState<EntitlementsResponse | null>(null);
  const [entError, setEntError] = useState(false);
  const [snap, setSnap] = useState<SnapshotReadyResponse | null>(null);
  const [snapError, setSnapError] = useState(false);
  const [deleteToastVisible, setDeleteToastVisible] = useState(false);

  const load = useCallback(async () => {
    try {
      const [entRes, snapRes] = await Promise.all([
        fetch('/api/me/entitlements', { credentials: 'include', cache: 'no-store' }),
        fetch('/api/dtr/report-snapshot-ready', { credentials: 'include', cache: 'no-store' }),
      ]);
      if (!entRes.ok) {
        setEntError(true);
        setEnt(null);
      } else {
        const data = (await entRes.json()) as EntitlementsResponse;
        setEnt(data);
        setEntError(false);
      }
      if (!snapRes.ok) {
        setSnapError(true);
        setSnap(null);
      } else {
        const s = (await snapRes.json()) as SnapshotReadyResponse;
        setSnap(s);
        setSnapError(false);
      }
    } catch {
      setEntError(true);
      setEnt(null);
      setSnapError(true);
      setSnap(null);
    }
  }, []);

  useEffect(() => {
    if (user) void load();
  }, [user, load]);

  useEffect(() => {
    if (!deleteToastVisible) return;
    const t = window.setTimeout(() => setDeleteToastVisible(false), 6000);
    return () => window.clearTimeout(t);
  }, [deleteToastVisible]);

  const handleDeleteSuccess = useCallback(() => {
    setDeleteToastVisible(true);
    void load();
  }, [load]);

  if (!isLoaded) {
    return (
      <div className={styles.wrap}>
        <p className={styles.muted}>読み込み中…</p>
      </div>
    );
  }

  return (
    <div className={styles.wrap}>
      <header style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 12, color: '#6b667a' }}>マイページ</div>
        <h1 className={styles.h1}>マイハブ</h1>
        <p className={styles.lead}>レポートを再開し、次の一歩を選べます。</p>
      </header>

      <SignedOut>
        <section className={styles.card} aria-label="サインイン">
          <p className={styles.body}>購入済みの Report や利用状況を確認するには、サインインが必要です。</p>
          <div className={styles.links}>
            <SignInButton mode="modal">
              <button type="button" className={styles.badge} style={{ cursor: 'pointer', border: 'none' }}>
                サインイン
              </button>
            </SignInButton>
          </div>
        </section>
      </SignedOut>

      <SignedIn>
        <nav className={styles.quickNav} aria-label="よく使う導線">
          <Link href="/dtr">レポート一覧</Link>
          <span className={styles.quickNavSep} aria-hidden>·</span>
          <Link href="/dtr/lp">商品の説明</Link>
        </nav>

        {user && <ProfileIntakeCard userId={user.id} />}

        <section className={styles.card} aria-label="あなたのレポート">
          <div className={`${styles.blockLabel} ${styles.blockLabelFirst}`}>あなたのレポート</div>
          <p className={styles.sectionIntro}>
            保存版はここから開きます。生成が終わると「開く」が使えます。
          </p>

          {entError && (
            <p className={styles.muted}>利用状況を読み取れませんでした。時間をおいて再度お試しください。</p>
          )}
          {snapError && !entError && (
            <p className={styles.muted}>レポートの再開状態を確認できませんでした。時間をおいて再度お試しください。</p>
          )}

          {!entError && ent && (
            <>
              <OwnedReportsBlock
                ent={ent}
                snap={snap}
                snapError={snapError}
                onDeleteSuccess={handleDeleteSuccess}
              />
              {deleteToastVisible && (
                <div
                  className={styles.deleteToast}
                  role="status"
                  aria-live="polite"
                  data-testid="m55-saved-report-delete-toast"
                >
                  <p className={styles.deleteToastPrimary}>{DTR_SAVED_REPORT_DELETE_TOAST_PRIMARY}</p>
                  <p className={styles.deleteToastSecondary}>{DTR_SAVED_REPORT_DELETE_TOAST_SECONDARY}</p>
                </div>
              )}
            </>
          )}
        </section>

        {!entError && ent && (
          <section className={styles.card} aria-label="レポートとサービス">
            <div className={`${styles.blockLabel} ${styles.blockLabelFirst}`}>レポートとサービス</div>
            <p className={styles.sectionIntro}>
              所有・未購入・近日公開を一覧で確認できます。
            </p>
            <DtrCatalogStrip
              variant="my"
              externalData
              ent={ent}
              snap={snap}
              snapError={snapError}
            />
          </section>
        )}

        {!entError && ent && (
          <section className={styles.card} aria-label="相談と保存の目安">
            <div className={`${styles.blockLabel} ${styles.blockLabelFirst}`}>相談（Report 付帯）</div>
            <p className={styles.muted} style={{ margin: '0 0 12px' }}>
              相談は購入済み Report に紐づく範囲です。汎用チャットではありません。
            </p>
            <div className={styles.blockLabel}>参考</div>
            <div className={styles.row}>
              <span>保存の目安（日）</span>
              <span>{ent.retention_days ?? 0}</span>
            </div>
          </section>
        )}

        <section className={styles.card} aria-label="ヘルプとお問い合わせ">
          <div className={`${styles.blockLabel} ${styles.blockLabelFirst}`}>ヘルプ・お問い合わせ</div>
          <nav className={styles.hubLinks} aria-label="サポートと規約">
            <Link href="/support">よくある質問・サポート</Link>
            <Link href="/legal/refund">返金・キャンセル</Link>
            <Link href="/legal/tokushoho">事業者情報・お問い合わせ先（特商法）</Link>
          </nav>
          <p className={styles.hubLinksMuted}>
            購入の明細・領収は、決済メールまたは上記からご確認ください。
          </p>
        </section>
      </SignedIn>
    </div>
  );
}

function OwnedReportsBlock({
  ent,
  snap,
  snapError,
  onDeleteSuccess,
}: {
  ent: EntitlementsResponse;
  snap: SnapshotReadyResponse | null;
  snapError: boolean;
  onDeleteSuccess: () => void;
}) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteConfirming, setDeleteConfirming] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const rows = computeRows(ent, snap);
  const ownsAny = rows.length > 0 || snap?.hasOwnership === true;
  const canOpenCore = !snapError && snap?.ready === true;
  const coreVs = coreVisualStatus(snapError, snap);

  const handleDeleteConfirm = async () => {
    setDeleteConfirming(true);
    setDeleteError(null);
    try {
      const res = await fetch('/api/dtr/report-snapshot/hide', {
        method: 'POST',
        credentials: 'include',
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      });
      if (res.ok) {
        setDeleteDialogOpen(false);
        onDeleteSuccess();
        return;
      }
      if (res.status === 409) {
        setDeleteDialogOpen(false);
        onDeleteSuccess();
        return;
      }
      setDeleteError(DTR_SAVED_REPORT_DELETE_ERROR_GENERIC);
    } catch {
      setDeleteError(DTR_SAVED_REPORT_DELETE_ERROR_GENERIC);
    } finally {
      setDeleteConfirming(false);
    }
  };

  if (!ownsAny) {
    return (
      <>
        <p className={styles.emptyOwned}>まだレポートはありません。下の一覧から購入できます。</p>
      </>
    );
  }

  return (
    <>
      <SavedReportDeleteDialog
        open={deleteDialogOpen}
        confirming={deleteConfirming}
        onClose={() => {
          if (!deleteConfirming) {
            setDeleteDialogOpen(false);
            setDeleteError(null);
          }
        }}
        onConfirm={() => void handleDeleteConfirm()}
      />
      <ul className={styles.reportList} aria-label="購入済みレポート一覧">
      {rows.map((key, i) => {
        const isCore = isEntryReportCoreRight(key);
        if (isCore) {
          const badgeClass =
            coreVs === 'ready'
              ? styles.statusPurchased
              : coreVs === 'pending'
              ? styles.statusPending
              : styles.statusPending;
          const badgeText =
            coreVs === 'ready' ? '購入済み' : coreVs === 'pending' ? '準備中' : '準備中';
          return (
            <li key={`${key}-${i}`} className={styles.reportItem}>
              <div className={styles.reportItemTop}>
                <span className={styles.reportTitle}>{displayLabelForDtrRightKey(key)}</span>
                <span className={`${styles.statusBadge} ${badgeClass}`}>{badgeText}</span>
              </div>
              <div className={styles.reportItemCta}>
                {canOpenCore && (
                  <>
                    <button
                      type="button"
                      className={styles.deleteReportBtn}
                      onClick={() => {
                        setDeleteError(null);
                        setDeleteDialogOpen(true);
                      }}
                      disabled={deleteConfirming}
                      aria-haspopup="dialog"
                    >
                      {DTR_SAVED_REPORT_DELETE_TRIGGER_LABEL}
                    </button>
                    <Link href="/dtr/core" className={styles.ctaOpen}>
                      開く
                    </Link>
                  </>
                )}
                {!canOpenCore && (
                  <span className={styles.muted} style={{ fontSize: 12, textAlign: 'right' as const }}>
                    本文が整い次第、「開く」が表示されます
                  </span>
                )}
              </div>
              {deleteError && canOpenCore && (
                <p className={styles.deleteError} role="alert">
                  {deleteError}
                </p>
              )}
            </li>
          );
        }

        return (
          <li key={`${key}-${i}`} className={styles.reportItem}>
            <div className={styles.reportItemTop}>
              <span className={styles.reportTitle}>{displayLabelForDtrRightKey(key)}</span>
              <span className={`${styles.statusBadge} ${styles.statusPurchased}`}>購入済み</span>
            </div>
            <div className={styles.reportItemCta}>
              <Link href="/dtr" className={styles.ctaSecondaryLink}>
                レポート棚へ
              </Link>
            </div>
          </li>
        );
      })}
    </ul>
    </>
  );
}

function ProfileIntakeCard({ userId }: { userId: string }) {
  const [state, setState] = useState<ProfileState | null>(null);
  const [profile, setProfile] = useState<BirthProfile | null>(null);
  const [nick, setNick] = useState('');
  const [birth, setBirth] = useState('');
  const [birthTime, setBirthTime] = useState('');
  const [birthTimeUnknown, setBirthTimeUnknown] = useState(false);
  const [country, setCountry] = useState(DEFAULT_COUNTRY);
  const [birthplace, setBirthplace] = useState('');
  const birthRef = useRef<HTMLInputElement>(null);
  const editingRef = useRef(false);

  useEffect(() => {
    const syncFromRepo = () => {
      if (editingRef.current) return;
      const p = ProfileRepository.get(userId);
      if (p?.birthDate) {
        setProfile(p);
        setNick(p.nickname);
        setBirth(p.birthDate);
        setBirthTime(p.birthTime ?? '');
        setBirthTimeUnknown(Boolean(p.birthTimeUnknown));
        setCountry(p.country ?? DEFAULT_COUNTRY);
        setBirthplace(p.birthplace ?? '');
        setState('ready');
      } else {
        setState('no_profile');
      }
    };

    syncFromRepo();
    window.addEventListener('m55:profile_updated', syncFromRepo);
    return () => window.removeEventListener('m55:profile_updated', syncFromRepo);
  }, [userId]);

  const canSave = nick.trim().length > 0 && !!birth;

  const handleSave = () => {
    const trimmed = nick.trim();
    if (!trimmed || !birth || !canSave) return;
    const p = enrichBirthProfileForSave({
      nickname: trimmed,
      birthDate: birth,
      birthTime: birthTimeUnknown ? null : birthTime || null,
      birthTimeUnknown,
      country,
      birthplace: birthplace.trim() || null,
    });
    ProfileRepository.save(userId, p);
    setProfile(p);
    editingRef.current = false;
    setState('ready');
  };

  const handleEdit = () => {
    editingRef.current = true;
    if (profile) {
      setNick(profile.nickname);
      setBirth(profile.birthDate);
      setBirthTime(profile.birthTime ?? '');
      setBirthTimeUnknown(Boolean(profile.birthTimeUnknown));
      setCountry(profile.country ?? DEFAULT_COUNTRY);
      setBirthplace(profile.birthplace ?? '');
    }
    setState('editing');
  };

  const handleCancel = () => {
    editingRef.current = false;
    setState('ready');
  };

  const handleNickKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      birthRef.current?.focus();
    }
  };

  const handleBirthKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && canSave) handleSave();
  };

  if (state === null) {
    return (
      <section className={styles.card} aria-label="プロフィール" style={{ marginBottom: 12 }}>
        <p className={styles.muted}>読み込み中…</p>
      </section>
    );
  }

  if (state === 'no_profile' || state === 'editing') {
    return (
      <section
        className={styles.card}
        aria-label="プロフィール設定"
        style={{ marginBottom: 12 }}
        data-testid="m55-my-profile-intake"
      >
        <div className={styles.blockLabel}>プロフィール</div>
        <div className={styles.inputGroup}>
          <label className={styles.inputLabel} htmlFor="mp-nick">ニックネーム</label>
          <input
            id="mp-nick"
            type="text"
            value={nick}
            onChange={e => setNick(e.target.value)}
            onKeyDown={handleNickKeyDown}
            placeholder="例：ソラ"
            autoFocus={state === 'no_profile'}
            autoComplete="nickname"
            className={styles.inputField}
            maxLength={30}
          />
        </div>
        <div className={styles.inputGroup} style={{ marginTop: 10 }}>
          <label className={styles.inputLabel} htmlFor="mp-birth">生年月日</label>
          <input
            id="mp-birth"
            type="date"
            value={birth}
            onChange={e => setBirth(e.target.value)}
            onKeyDown={handleBirthKeyDown}
            ref={birthRef}
            className={styles.inputField}
            max={new Date().toISOString().slice(0, 10)}
          />
        </div>
        <div className={styles.inputGroup} style={{ marginTop: 10 }}>
          <label className={styles.inputLabel} htmlFor="mp-birth-time">出生時刻（任意）</label>
          <input
            id="mp-birth-time"
            type="time"
            value={birthTime}
            onChange={e => {
              setBirthTime(e.target.value);
              if (e.target.value) setBirthTimeUnknown(false);
            }}
            disabled={birthTimeUnknown}
            className={styles.inputField}
          />
        </div>
        <div className={styles.inputGroup} style={{ marginTop: 8 }}>
          <label className={styles.inputLabel} style={{ display: 'flex', gap: 8, alignItems: 'center', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={birthTimeUnknown}
              onChange={e => {
                setBirthTimeUnknown(e.target.checked);
                if (e.target.checked) setBirthTime('');
              }}
            />
            出生時刻は不明
          </label>
        </div>
        <div className={styles.inputGroup} style={{ marginTop: 10 }}>
          <label className={styles.inputLabel} htmlFor="mp-country">国（必須）</label>
          <select
            id="mp-country"
            value={country}
            onChange={e => setCountry(e.target.value)}
            className={styles.inputField}
          >
            {SUPPORTED_COUNTRIES.map(c => (
              <option key={c.code} value={c.code}>{c.label}</option>
            ))}
          </select>
        </div>
        <div className={styles.inputGroup} style={{ marginTop: 10 }}>
          <label className={styles.inputLabel} htmlFor="mp-birthplace">出生地（任意）</label>
          <input
            id="mp-birthplace"
            type="text"
            value={birthplace}
            onChange={e => setBirthplace(e.target.value)}
            placeholder="例：東京都"
            className={styles.inputField}
            maxLength={120}
          />
        </div>
        {!canSave && birth && (
          <p className={styles.muted} style={{ marginTop: 8, fontSize: 12 }}>
            ニックネームを入力してください。
          </p>
        )}
        <div style={{ marginTop: 14, display: 'flex', gap: 8, alignItems: 'center' }}>
          <button
            type="button"
            onClick={handleSave}
            disabled={!canSave}
            className={styles.saveBtn}
          >
            保存する
          </button>
          {state === 'editing' && (
            <button type="button" onClick={handleCancel} className={styles.cancelBtn}>
              キャンセル
            </button>
          )}
        </div>
      </section>
    );
  }

  // ready: compact summary
  const formattedBirth = profile?.birthDate
    ? profile.birthDate.replace(/^(\d{4})-(\d{2})-(\d{2})$/, '$1年$2月$3日')
    : '';
  const timeLine = profile?.birthTimeUnknown
    ? '出生時刻：不明'
    : profile?.birthTime
    ? `出生時刻：${profile.birthTime.slice(0, 5)}`
    : null;
  const countryLabel =
    SUPPORTED_COUNTRIES.find(c => c.code === (profile?.country ?? DEFAULT_COUNTRY))?.label ??
    profile?.country;
  return (
    <section className={styles.card} aria-label="プロフィール" style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className={styles.blockLabel} style={{ margin: 0 }}>プロフィール</div>
        <button type="button" onClick={handleEdit} className={styles.editBtn}>編集</button>
      </div>
      {profile && (
        <p className={styles.muted} style={{ marginTop: 4, fontSize: 11 }}>
          {profileFormatLabel(profile)}
        </p>
      )}
      <p className={styles.body} style={{ marginTop: 6 }}>{profile?.nickname}</p>
      {formattedBirth && <p className={styles.muted} style={{ marginTop: 2 }}>{formattedBirth}</p>}
      {timeLine && <p className={styles.muted} style={{ marginTop: 2 }}>{timeLine}</p>}
      {countryLabel && <p className={styles.muted} style={{ marginTop: 2 }}>国：{countryLabel}</p>}
      {profile?.birthplace && (
        <p className={styles.muted} style={{ marginTop: 2 }}>出生地：{profile.birthplace}</p>
      )}
      {profile?.timezone && (
        <p className={styles.muted} style={{ marginTop: 2, fontSize: 11 }}>タイムゾーン：{profile.timezone}</p>
      )}
      {profile && !profile.birthTime && (
        <p className={styles.muted} style={{ marginTop: 8, fontSize: 12 }}>
          出生時刻が未入力の場合は、時刻不明として扱います。
        </p>
      )}
    </section>
  );
}
