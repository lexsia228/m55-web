'use client';

import Link from 'next/link';
import { useUser } from '@clerk/nextjs';
import { useEffect, useMemo, useState } from 'react';
import { ProfileRepository } from '../../lib/soul/profile';
import { runTodayEngine } from '../../lib/m55/todayEngine';
import styles from './TodayPanel.module.css';

function todayIsoLocal(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export default function TodayPanel() {
  const { user, isLoaded } = useUser();
  const ownerId = user?.id ?? null;
  const [profileEpoch, setProfileEpoch] = useState(0);

  useEffect(() => {
    const bump = () => setProfileEpoch((n) => n + 1);
    window.addEventListener('m55:profile_updated', bump);
    return () => window.removeEventListener('m55:profile_updated', bump);
  }, []);

  const view = useMemo(() => {
    if (!isLoaded) return { kind: 'loading' as const };
    const profile = ProfileRepository.get(ownerId);
    if (!profile?.birthDate) return { kind: 'need_profile' as const };

    const { payload } = runTodayEngine({
      birthDate: profile.birthDate,
      nickname: profile.nickname,
      locale: 'ja-JP',
      nowDate: todayIsoLocal(),
      contextScope: 'today',
    });

    return {
      kind: 'ready' as const,
      display: {
        heading: payload.heading,
        summaryShort: payload.summaryShort,
        focus: payload.focus,
        step: payload.step,
        bridgeToTomorrow: payload.bridgeToTomorrow,
      },
    };
  }, [isLoaded, ownerId, profileEpoch]);

  if (view.kind === 'loading') {
    return (
      <div className={styles.wrap}>
        <p className={styles.muted}>読み込み中…</p>
      </div>
    );
  }

  if (view.kind === 'need_profile') {
    return (
      <div className={styles.wrap}>
        <p className={styles.muted}>生年月日とニックネームを入力すると、今日の観測を表示できます。</p>
      </div>
    );
  }

  const d = view.display;

  return (
    <div className={styles.wrap}>
      <header style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 12, color: '#6b667a' }}>今日</div>
        <h1 className={styles.h1}>{d.heading}</h1>
        <p className={styles.lead}>即読</p>
      </header>

      <section className={styles.card} aria-label="今日の観測">
        <p className={styles.body}>{d.summaryShort}</p>

        <div className={styles.blockLabel}>焦点</div>
        <p className={styles.body}>{d.focus}</p>

        <div className={styles.blockLabel}>一歩</div>
        <p className={styles.body}>{d.step}</p>

        <div className={styles.blockLabel}>明日への橋</div>
        <p className={styles.body}>{d.bridgeToTomorrow}</p>

        <nav className={styles.bridges} aria-label="次のステップ">
          <Link href="/weekly">今週の焦点へ</Link>
          <Link href="/dtr/lp">Entry Report について</Link>
        </nav>
      </section>
    </div>
  );
}
