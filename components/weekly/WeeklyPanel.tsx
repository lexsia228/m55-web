'use client';

import Link from 'next/link';
import { useUser } from '@clerk/nextjs';
import { useEffect, useMemo, useState } from 'react';
import { ProfileRepository } from '../../lib/soul/profile';
import { runWeeklyEngine } from '../../lib/m55/weeklyEngine';
import styles from './WeeklyPanel.module.css';

function todayIsoLocal(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export default function WeeklyPanel() {
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

    const { payload } = runWeeklyEngine({
      birthDate: profile.birthDate,
      nickname: profile.nickname,
      locale: 'ja-JP',
      nowDate: todayIsoLocal(),
      contextScope: 'weekly',
    });

    return {
      kind: 'ready' as const,
      display: {
        heading: payload.heading,
        weeklyKey: payload.weeklyKey,
        lines: payload.lines,
        focusAreas: payload.focusAreas,
        nextBridge: payload.nextBridge,
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
        <p className={styles.muted}>生年月日とニックネームを入力すると、今週の観測を表示できます。</p>
      </div>
    );
  }

  const d = view.display;

  return (
    <div className={styles.wrap}>
      <header style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 12, color: '#6b667a' }}>週間</div>
        <h1 className={styles.h1}>{d.heading}</h1>
        <p className={styles.lead}>週次の整理</p>
      </header>

      <section className={styles.card} aria-label="今週の観測">
        <p className={styles.body}>{d.weeklyKey}</p>

        <div className={styles.blockLabel}>ライン</div>
        <ul className={styles.lines}>
          {d.lines.map((line, i) => (
            <li key={`${i}-${line.slice(0, 24)}`}>{line}</li>
          ))}
        </ul>

        <div className={styles.blockLabel}>焦点</div>
        <div className={styles.chips}>
          {d.focusAreas.map((f) => (
            <span key={f} className={styles.chip}>
              {f}
            </span>
          ))}
        </div>

        <div className={styles.blockLabel}>次の橋</div>
        <p className={styles.body}>{d.nextBridge}</p>

        <nav className={styles.bridges} aria-label="次のステップ">
          <Link href="/today">今日の見方へ</Link>
          <Link href="/dtr/lp">4章の保存版について</Link>
        </nav>
      </section>
    </div>
  );
}
