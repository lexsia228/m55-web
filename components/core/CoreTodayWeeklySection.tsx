'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import type { BirthProfile } from '../../lib/soul/profile';
import { runTodayEngine } from '../../lib/m55/todayEngine';
import { runWeeklyEngine } from '../../lib/m55/weeklyEngine';
import styles from './CoreExperience.module.css';

function todayIsoLocal(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export default function CoreTodayWeeklySection({ profile }: { profile: BirthProfile }) {
  const { todayLine, weeklyLine } = useMemo(() => {
    const today = todayIsoLocal();
    const base = {
      birthDate: profile.birthDate,
      nickname: profile.nickname,
      locale: 'ja-JP' as const,
      nowDate: today,
    };
    try {
      const t = runTodayEngine({ ...base, contextScope: 'today' });
      const w = runWeeklyEngine({ ...base, contextScope: 'weekly' });
      return {
        todayLine: t.payload.summaryShort,
        weeklyLine: `${w.payload.heading} — ${w.payload.weeklyKey}`,
      };
    } catch {
      return { todayLine: '読み取りに失敗しました。', weeklyLine: '読み取りに失敗しました。' };
    }
  }, [profile.birthDate, profile.nickname]);

  return (
    <section className={styles.section} aria-labelledby="core-tw-title">
      <p className={styles.sectionEyebrow}>時間の見方</p>
      <h2 id="core-tw-title" className={styles.sectionTitle}>
        今日と今週
      </h2>
      <p className={styles.sectionLead}>
        本質ラベルは固定です。日付に沿った切り口は、それぞれのページで読みます。
      </p>
      <div className={styles.teaserGrid}>
        <Link href="/today" className={styles.teaserCard}>
          <p className={styles.teaserLabel}>今日</p>
          <p className={styles.teaserTitle}>今日の見方</p>
          <p className={styles.teaserBody}>{todayLine}</p>
          <p className={styles.teaserGo}>開く →</p>
        </Link>
        <Link href="/weekly" className={styles.teaserCard}>
          <p className={styles.teaserLabel}>今週</p>
          <p className={styles.teaserTitle}>今週の焦点</p>
          <p className={styles.teaserBody}>{weeklyLine}</p>
          <p className={styles.teaserGo}>開く →</p>
        </Link>
      </div>
    </section>
  );
}
