'use client';

import Link from 'next/link';
import { SignedIn, SignedOut, SignInButton, useUser } from '@clerk/nextjs';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ProfileRepository, BirthProfile } from '../../lib/soul/profile';
import {
  displayLabelForDtrRightKey,
  isEntryReportCoreRight,
  LABEL_ENTRY_REPORT,
} from '../../lib/m55/myEntitlementLabels';
import styles from './MyPanel.module.css';

type EntitlementsResponse = {
  tier?: string;
  retention_days?: number;
  dtr_rights?: string[];
};

type ProfileState = 'no_profile' | 'ready' | 'editing';

export default function MyPanel() {
  const { user, isLoaded } = useUser();
  const [ent, setEnt] = useState<EntitlementsResponse | null>(null);
  const [entError, setEntError] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/me/entitlements', { credentials: 'include', cache: 'no-store' });
      if (!res.ok) {
        setEntError(true);
        setEnt(null);
        return;
      }
      const data = (await res.json()) as EntitlementsResponse;
      setEnt(data);
      setEntError(false);
    } catch {
      setEntError(true);
      setEnt(null);
    }
  }, []);

  useEffect(() => {
    if (user) void load();
  }, [user, load]);

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
        <h1 className={styles.h1}>所有と再開</h1>
        <p className={styles.lead}>権利と利用の整理</p>
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
        {user && <ProfileIntakeCard userId={user.id} />}

        <section className={styles.card} aria-label="ライブラリ">
          {entError && (
            <p className={styles.muted}>利用状況を読み取れませんでした。時間をおいて再度お試しください。</p>
          )}

          {!entError && ent && (
            <>
              <div className={styles.blockLabel}>Report</div>
              {(!ent.dtr_rights || ent.dtr_rights.length === 0) && (
                <p className={styles.body}>
                  {LABEL_ENTRY_REPORT} はまだありません。商品ページから購入できます。
                </p>
              )}

              {ent.dtr_rights && ent.dtr_rights.length > 0 && (
                <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                  {ent.dtr_rights.map((key, i) => (
                    <li key={i} className={styles.row}>
                      <span>{displayLabelForDtrRightKey(key)}</span>
                      <span className={styles.badge}>利用可能</span>
                    </li>
                  ))}
                </ul>
              )}

              <div className={styles.blockLabel}>相談（Report 付帯）</div>
              <p className={styles.muted}>
                相談は購入済み Report に紐づく範囲です。汎用チャットではありません。
              </p>

              <div className={styles.blockLabel}>参考</div>
              <div className={styles.row}>
                <span>保存の目安（日）</span>
                <span>{ent.retention_days ?? 0}</span>
              </div>
            </>
          )}

          <nav className={styles.links} aria-label="次の操作">
            <Link href="/dtr/lp">{LABEL_ENTRY_REPORT} について</Link>
            {ent?.dtr_rights?.some((k) => isEntryReportCoreRight(k)) && (
              <Link href="/dtr/core">Report を開く</Link>
            )}
          </nav>
        </section>
      </SignedIn>
    </div>
  );
}

function ProfileIntakeCard({ userId }: { userId: string }) {
  const [state, setState] = useState<ProfileState | null>(null);
  const [profile, setProfile] = useState<BirthProfile | null>(null);
  const [nick, setNick] = useState('');
  const [birth, setBirth] = useState('');
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
        setState('ready');
      } else {
        setState('no_profile');
      }
    };

    syncFromRepo();
    window.addEventListener('m55:profile_updated', syncFromRepo);
    return () => window.removeEventListener('m55:profile_updated', syncFromRepo);
  }, [userId]);

  const handleSave = () => {
    const trimmed = nick.trim();
    if (!trimmed || !birth) return;
    const p: BirthProfile = { nickname: trimmed, birthDate: birth };
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
    if (e.key === 'Enter' && nick.trim() && birth) handleSave();
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
        <div style={{ marginTop: 14, display: 'flex', gap: 8, alignItems: 'center' }}>
          <button
            type="button"
            onClick={handleSave}
            disabled={!nick.trim() || !birth}
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

  return (
    <section className={styles.card} aria-label="プロフィール" style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className={styles.blockLabel} style={{ margin: 0 }}>プロフィール</div>
        <button type="button" onClick={handleEdit} className={styles.editBtn}>編集</button>
      </div>
      <p className={styles.body} style={{ marginTop: 6 }}>{profile?.nickname}</p>
      {formattedBirth && <p className={styles.muted} style={{ marginTop: 2 }}>{formattedBirth}</p>}
    </section>
  );
}
