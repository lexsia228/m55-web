import Link from 'next/link';
import { STATIC_CTA, withNickname } from './corePublicCopy';
import styles from './CoreExperience.module.css';

interface Props {
  nickname?: string;
}

export default function CoreEntryReportCTASection({ nickname }: Props) {
  // 渡ってきたnicknameを確実に取得（空なら空文字）
  const nick = nickname?.trim() ?? '';

  return (
    <section
      className={`${styles.ctaStrip} ${styles.ctaStripV0} ${styles.coreReveal}`}
      aria-labelledby="core-saved-report-cta"
      data-core-reveal
    >
      <h2 id="core-saved-report-cta" className={styles.ctaTitle}>
        {STATIC_CTA.title}
      </h2>
      
      <div className={styles.ctaLines}>
        {STATIC_CTA.lines.map((line, i) => (
          <p
            key={i}
            className={i === 0 ? styles.ctaBodyLead : styles.ctaBodySupplement}
          >
            {/* 修正ポイント：各行に対して必ず withNickname を通す */}
            {withNickname(line, nick)}
          </p>
        ))}
      </div>

      <Link href="/dtr/lp" className={styles.ctaPrimaryButton}>
        {STATIC_CTA.linkLabel ?? STATIC_CTA.title}
      </Link>
    </section>
  );
}