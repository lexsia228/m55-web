'use client';

import Link from 'next/link';
import { useUser } from '@clerk/nextjs';
import { useEffect, useMemo, useState } from 'react';
import { ProfileRepository } from '../../lib/soul/profile';
import { TEN_STEM_DISPLAY } from '../../lib/m55/tenStemCatalog';
import { essenceStemLaneIndex, runEssenceEngine } from '../../lib/m55/essenceEngine';
import styles from './CoreEssencePanel.module.css';

function todayIsoLocal(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export default function CoreEssencePanel() {
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

    const input = {
      birthDate: profile.birthDate,
      nickname: profile.nickname,
      locale: 'ja-JP',
      nowDate: todayIsoLocal(),
      contextScope: 'essence' as const,
    };

    const { payload } = runEssenceEngine(input);
    const lane = essenceStemLaneIndex(profile.birthDate);
    const stem = TEN_STEM_DISPLAY[lane]!;
    return {
      kind: 'ready' as const,
      stem,
      /** never render payload.rawTraits */
      display: {
        summaryShort: payload.summaryShort,
        keywords: payload.keywords,
        focusAreas: payload.focusAreas,
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
        <p className={styles.muted}>生年月日とニックネームを入力すると、本質の観測を表示できます。</p>
      </div>
    );
  }

  const { stem, display } = view;

  return (
    <div className={styles.wrap}>
      <header style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 12, color: '#6b667a' }}>本質</div>
        <h1 style={{ fontSize: 17, fontWeight: 600, margin: '4px 0 0' }}>観測の要約</h1>
      </header>

      <section className={styles.hero} aria-label="本質の観測">
        <div className={styles.stemRow}>
          <span className={styles.stemTitle}>{stem.publicTitle}</span>
          <span className={styles.stemSymbol}>（{stem.symbol}）</span>
        </div>
        <p className={styles.oneLine}>{stem.displayOneLine}</p>
        <p className={styles.summary}>{display.summaryShort}</p>

        <div className={styles.sectionLabel}>キーワード</div>
        <div className={styles.chips}>
          {display.keywords.map((k) => (
            <span key={k} className={styles.chip}>
              {k}
            </span>
          ))}
        </div>

        <div className={styles.sectionLabel}>焦点</div>
        <div className={styles.chips}>
          {display.focusAreas.map((k) => (
            <span key={k} className={styles.chip}>
              {k}
            </span>
          ))}
        </div>

        <nav className={styles.bridges} aria-label="次のステップ">
          <Link href="/dtr/lp">Entry Report について</Link>
          <Link href="/today">今日の見方へ</Link>
          <Link href="/weekly">今週の焦点へ</Link>
        </nav>
      </section>
    </div>
  );
}
