'use client';

import Link from 'next/link';
import { useUser } from '@clerk/nextjs';
import { useEffect, useMemo, useState } from 'react';
import { ProfileRepository } from '../../lib/soul/profile';
import { runDtrEngine, type DtrSection } from '../../lib/m55/dtrEngine';
import { TEN_STEM_DISPLAY } from '../../lib/m55/tenStemCatalog';
import { essenceStemLaneIndex } from '../../lib/m55/essenceEngine';
import ConsultRoom from './ConsultRoom';
import styles from './DtrFullReader.module.css';

type Props = {
  ownershipType: string;
  aiConsultIncluded: boolean;
  expiresAt: string | null;
};

function SectionBlock({ section }: { section: DtrSection }) {
  return (
    <section className={styles.section} aria-label={section.title}>
      <h2 className={styles.sectionTitle}>{section.title}</h2>
      <div className={styles.sectionBody}>
        {section.body.split('\n\n').map((para, i) => (
          <p key={i} className={styles.para}>{para}</p>
        ))}
      </div>
    </section>
  );
}

export default function DtrFullReader({ ownershipType, aiConsultIncluded, expiresAt }: Props) {
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

    const envelope = runDtrEngine({
      birthDate: profile.birthDate,
      nickname: profile.nickname,
      locale: 'ja-JP',
      contextScope: 'dtr',
    });

    const idx = essenceStemLaneIndex(profile.birthDate);
    const stem = TEN_STEM_DISPLAY[idx]!;

    return {
      kind: 'ready' as const,
      stem,
      payload: envelope.payload,
      birthDate: profile.birthDate,
      nickname: profile.nickname,
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, ownerId, profileEpoch]);

  if (view.kind === 'loading') {
    return (
      <div className={styles.wrap}>
        <p className={styles.stateMsg}>読み込み中…</p>
      </div>
    );
  }

  if (view.kind === 'need_profile') {
    return (
      <div className={styles.wrap}>
        <div className={styles.gateCard}>
          <p className={styles.gateMsg}>
            レポートを表示するには、プロフィール（ニックネームと生年月日）の設定が必要です。
          </p>
          <Link href="/my" className={styles.gateLink}>マイページで設定する</Link>
        </div>
      </div>
    );
  }

  const { stem, payload } = view;

  return (
    <div className={styles.wrap}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.brandRow}>
          <img
            src="/icons/m55-monomark.svg"
            alt=""
            width={20}
            height={20}
            className={styles.dtrBrandMark}
            decoding="async"
          />
          <span className={styles.dtrBrandWordmark}>M55</span>
        </div>
        <p className={styles.nav}>
          <Link href="/my">マイページへ</Link>
        </p>
        <div className={styles.hero}>
          <span className={styles.symbol} aria-hidden="true">{stem.symbol}</span>
          <h1 className={styles.title}>{payload.title}</h1>
          <p className={styles.subLine}>{stem.displayOneLine}</p>
        </div>

        {/* Ownership meta (safe subset) */}
        <dl className={styles.meta}>
          <div className={styles.metaRow}>
            <dt className={styles.metaDt}>種別</dt>
            <dd className={styles.metaDd}>{ownershipType === 'static' ? 'ワンタイム購入' : ownershipType}</dd>
          </div>
          <div className={styles.metaRow}>
            <dt className={styles.metaDt}>有効期限</dt>
            <dd className={styles.metaDd}>{expiresAt ?? 'なし（永久）'}</dd>
          </div>
          {aiConsultIncluded && (
            <div className={styles.metaRow}>
              <dt className={styles.metaDt}>相談</dt>
              <dd className={styles.metaDd}>付帯（purchaser-only）</dd>
            </div>
          )}
        </dl>
      </header>

      {/* Full sections — owned state only (gate is in server component) */}
      <div className={styles.sections}>
        {payload.fullSections.map((section) => (
          <SectionBlock key={section.id} section={section} />
        ))}
      </div>

      {/* Purchaser-only consult room (room-only, not public chat) */}
      {aiConsultIncluded && (
        <ConsultRoom birthDate={view.birthDate} nickname={view.nickname} />
      )}

      {/* Footer links */}
      <footer className={styles.footer}>
        <Link href="/my">マイページへ戻る</Link>
        {' · '}
        <Link href="/core">本質を確認する</Link>
        {' · '}
        <Link href="/support">サポート</Link>
      </footer>
    </div>
  );
}
