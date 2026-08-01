'use client';

import Link from 'next/link';
import { useUser } from '@clerk/nextjs';
import { useEffect, useMemo, useState } from 'react';
import { TOP_FREE_ENTRY_PUBLIC_COPY } from '../../lib/m55/topFreeEntryPublicCopy';
import { ProfileRepository } from '../../lib/soul/profile';
import styles from './M55HowItWorks.module.css';

const storefrontCopy = TOP_FREE_ENTRY_PUBLIC_COPY.storefront;
const ctaCopy = TOP_FREE_ENTRY_PUBLIC_COPY.cta;

const FREE_ITEMS = [
  {
    label: '本質の見取り図',
    desc: '10通りの資質の語彙で、本質を短く要約します。無料面は輪郭の確認に使います。',
  },
  {
    label: '今日と今週',
    desc: '当日の観測と、週の流れのキーワード。同じ土台のまま日々更新されます。',
  },
  {
    label: '5つの解析軸',
    desc: 'C / E / S / D / L の5軸でバランスを視覚化します。内省と輪郭整理のための分析用見取りです。',
  },
] as const;

const CHAPTER_PREVIEWS = [
  '輪郭を見る',
  '構造を読む',
  '無理を知る',
  '楽に扱う',
] as const;

export default function M55HowItWorks() {
  const { user, isLoaded } = useUser();
  const [profileEpoch, setProfileEpoch] = useState(0);

  useEffect(() => {
    const bump = () => setProfileEpoch((n) => n + 1);
    window.addEventListener('m55:profile_updated', bump);
    return () => window.removeEventListener('m55:profile_updated', bump);
  }, []);

  const profileReady = useMemo(() => {
    if (!isLoaded) return false;
    const p = ProfileRepository.get(user?.id ?? null);
    return !!(p?.birthDate && p.nickname?.trim());
  }, [isLoaded, user?.id, profileEpoch]);

  return (
    <main className={styles.page}>

      {/* ── Fold 1: Hero（A） ── */}
      <section className={styles.fold1}>
        <p className={styles.eyebrow}>M55</p>
        <h1 className={styles.heroTitle}>M55 の使い方</h1>
        <p className={styles.heroLead}>
          生年月日を手がかりに、10通りの資質と5つの解析軸から、今の輪郭を整理します。
        </p>
        <p className={styles.heroSupport}>
          同じ入力を同じルールで読み解く、自己観測のための整理ツールです。
        </p>
        <p style={{ marginTop: 16, fontSize: 12, color: '#8a8499' }}>
          <Link href="/ten-views" style={{ color: '#7c6fd6', textDecoration: 'underline' }}>
            10通りの資質を見る
          </Link>
        </p>
      </section>

      {/* ── Fold 2: 無料で見えるもの（B） ── */}
      <section className={styles.fold2}>
        <div className={styles.sectionLabel}>無料で見えるもの</div>
        <div className={styles.freeGrid}>
          {FREE_ITEMS.map((item) => (
            <div key={item.label} className={styles.freeCard}>
              <div className={styles.freeCardLabel}>{item.label}</div>
              <p className={styles.freeCardDesc}>{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Fold 3: プレミアムレポート（C） ── */}
      <section className={styles.fold3}>
        <div className={styles.reportCard}>
          <div className={styles.reportEyebrow}>プレミアムレポート</div>
          <h2 className={styles.reportTitle}>同じ輪郭を、章立てで深く整理する</h2>
          <p className={styles.reportDesc}>
            無料の見取り図と同じ土台のまま、10通りの資質の重なりと読み取りを文章として読み返せる形に整理します。
            ウェブ上で閲覧するデジタルレポートです（物理配送はありません）。
          </p>
          <div className={styles.chapterList}>
            {CHAPTER_PREVIEWS.map((ch) => (
              <div key={ch} className={styles.chapterRow}>
                <span className={styles.chapterText}>{ch}</span>
              </div>
            ))}
          </div>
          <div className={styles.reportFooter}>
            <span className={styles.reportPrice}>¥1,000</span>
            <Link href="/dtr/lp" className={styles.reportCta}>
              {ctaCopy.viewSavedPlansJa}
            </Link>
          </div>
        </div>
      </section>

      {/* ── Fold 4: 追加読み解き（D） ── */}
      <section className={styles.fold4}>
        <div className={styles.roomCard}>
          <div className={styles.roomEyebrow}>追加読み解き</div>
          <h2 className={styles.roomTitle}>追加読み解きとは</h2>
          <p className={styles.roomDesc}>
            保存版を購入した方だけが使える、保存版に紐づく一つの読み解きテーマを整理する追加読み解きです。
            公開チャットではなく、購入した保存版の章に沿って、いまの1テーマを整理するためのものです。
          </p>
        </div>
      </section>

      {/* ── Fold 5: 設計の考え方（E） ── */}
      <section className={styles.fold5}>
        <div className={styles.sectionLabel}>読み取りの安定</div>
        <p className={styles.philosophyBody}>
          同じ入力を、同じルールで読む限り、骨組みはぶれにくい設計にしています。
          体験の中心は、いつでも10通りの資質と5つの解析軸です。
        </p>
        <p className={styles.philosophyDisclaimer}>
          より細かい観測項目や時期のルールは、内部の整理に使われますが、ここでの説明の主役ではありません。
        </p>
        <p className={styles.philosophyDisclaimer} style={{ marginTop: 10 }}>
          本サービスは医療・法律・投資等の専門的判断に代わるものではありません。自己観測の素材としてご利用ください。
        </p>
      </section>

      {/* ── Fold 6: CTA → /home（プロフィール未設定時のみ） ── */}
      <section className={styles.fold6}>
        {isLoaded && !profileReady && (
          <>
            <h2 className={styles.ctaTitle}>はじめる</h2>
            <p className={styles.ctaDesc}>
              ホームでプロフィールを保存すると、無料の読み取りが開きます。
            </p>
            <Link href="/home" className={styles.primaryCta}>
              無料で読み取りを始める
            </Link>
          </>
        )}
        <nav className={styles.legalLinks} aria-label="法的情報">
          <Link href="/support">サポート</Link>
          <Link href="/legal/refund">返金・キャンセル</Link>
          <Link href="/legal/terms">利用規約</Link>
          <Link href="/legal/privacy">プライバシー</Link>
        </nav>
      </section>

    </main>
  );
}
