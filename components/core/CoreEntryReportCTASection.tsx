import Link from 'next/link';
import { STATIC_CTA, withNickname } from './corePublicCopy';
import styles from './CoreExperience.module.css';

interface Props {
  nickname?: string;
}

function CheckIcon(props: { className?: string }) {
  return (
    <svg
      className={props.className}
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M20 6L9 17l-5-5"
        stroke="currentColor"
        strokeWidth="2.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function CoreEntryReportCTASection({ nickname }: Props) {
  const nick = nickname?.trim() ?? '';
  const renderLine = (line: string) => {
    if (!nick) {
      return line.replace(/\btさん\b/g, '').replace(/\bt\b/g, '');
    }
    return withNickname(line, nick);
  };

  return (
    <section
      className={`${styles.ctaStrip} ${styles.ctaStripV0} ${styles.ctaStripPurchase} ${styles.tierASurface} ${styles.coreReveal}`}
      aria-labelledby="core-saved-report-cta"
      data-core-reveal
    >
      <span className={styles.tierAOverline}>保存版レポート</span>
      <h2 id="core-saved-report-cta" className={styles.ctaTitle}>
        {STATIC_CTA.title}
      </h2>

      <p className={styles.ctaPurchaseIntro}>{renderLine(STATIC_CTA.intro)}</p>

      <h3 className={styles.ctaBenefitsHeading}>{STATIC_CTA.benefitsHeading}</h3>

      <ul className={styles.ctaBenefitCard}>
        {STATIC_CTA.benefits.map((line, i) => (
          <li key={i} className={styles.ctaBenefitRow}>
            <CheckIcon className={styles.ctaBenefitIcon} />
            <span className={styles.ctaBenefitText}>{renderLine(line)}</span>
          </li>
        ))}
      </ul>

      <div className={styles.ctaPriceBlock}>
        <p className={styles.ctaBundleNote}>{STATIC_CTA.bundleNote}</p>
        <p className={styles.ctaPriceStrong} aria-label={STATIC_CTA.priceLabel}>
          <span className={styles.ctaPriceKind}>買い切り</span>{' '}
          <span className={styles.ctaPriceAmount}>1000円</span>
        </p>
      </div>

      <div className={styles.ctaPaymentRow} aria-label="対応支払い方法">
        <span className={styles.ctaPaymentLabel}>クレジットカード / Apple Pay / PayPay 対応</span>
        <div className={styles.ctaPaymentBadges}>
          <span className={styles.ctaPayBadge}>Visa</span>
          <span className={styles.ctaPayBadge}>Mastercard</span>
          <span className={styles.ctaPayBadge}>JCB</span>
          <span className={styles.ctaPayBadge}>AMEX</span>
          <span className={`${styles.ctaPayBadge} ${styles.ctaPayBadgeApple}`}>Apple Pay</span>
          <span className={`${styles.ctaPayBadge} ${styles.ctaPayBadgePayPay}`}>PayPay</span>
        </div>
      </div>

      <Link href="/dtr/lp" className={styles.ctaPrimaryButton}>
        {STATIC_CTA.ctaLabel}
      </Link>
    </section>
  );
}
