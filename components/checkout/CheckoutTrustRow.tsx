import {
  getCheckoutTrustBadgeIds,
  trustRowShowsWalletBadges,
  type CheckoutTrustBadgeId,
} from '../../lib/m55/checkoutTrustBadges';
import styles from './CheckoutTrustRow.module.css';

/** Optical position only (no scale / no fixed canvas). */
const MARK_NUDGE: Partial<Record<CheckoutTrustBadgeId, string>> = {
  jcb: styles.markNudgeJcb,
  apple_pay: styles.markNudgeApple,
  google_pay: styles.markNudgeGoogle,
  paypay: styles.markNudgePayPay,
};

function BadgeVisa() {
  return (
    <svg className={styles.iconSvg} viewBox="0 0 52 16" aria-hidden focusable="false">
      <text
        x="0"
        y="12.5"
        fill="#1434CB"
        fontSize="12.5"
        fontWeight="700"
        fontFamily="system-ui, -apple-system, sans-serif"
        letterSpacing="0.14em"
      >
        VISA
      </text>
    </svg>
  );
}

function BadgeMastercard() {
  return (
    <svg className={styles.iconSvgMc} viewBox="0 0 38 24" aria-hidden focusable="false">
      <circle cx="14" cy="12" r="8.5" fill="#EB001B" opacity="0.92" />
      <circle cx="24" cy="12" r="8.5" fill="#F79E1B" opacity="0.92" />
    </svg>
  );
}

function BadgeAmex() {
  return (
    <svg className={styles.iconSvg} viewBox="0 0 46 14" aria-hidden focusable="false">
      <text
        x="0"
        y="11"
        fill="#F8FBFF"
        fontSize="9.5"
        fontWeight="800"
        fontFamily="system-ui, -apple-system, sans-serif"
        letterSpacing="0.1em"
      >
        AMEX
      </text>
    </svg>
  );
}

function BadgeJcb() {
  return (
    <svg className={styles.iconSvg} viewBox="0 0 38 16" aria-hidden focusable="false">
      <rect x="0" y="2.5" width="10.5" height="11" rx="1.2" fill="#0E4C96" />
      <rect x="13.25" y="2.5" width="10.5" height="11" rx="1.2" fill="#CB2B29" />
      <rect x="26.5" y="2.5" width="10.5" height="11" rx="1.2" fill="#0A9138" />
    </svg>
  );
}

function BadgeApplePay() {
  return (
    <svg className={styles.iconSvg} viewBox="0 0 54 18" aria-hidden focusable="false">
      <path
        fill="currentColor"
        d="M7.1 3.4c.03.88-.58 1.55-1.18 1.88-.3.16-.82.28-1.15.24.07-.72.4-1.4.94-1.82.3-.26.88-.56 1.39-.3zm1.9 3.2c-1.28-.08-2.36.72-2.98.72-.63 0-1.46-.68-2.42-.66-1.25.04-2.4.72-3.05 1.88-1.32 2.28-.33 5.62.94 7.45.67.92 1.44 1.95 2.5 1.92 1-.04 1.38-.65 2.56-.63 1.2-.02 1.54.63 2.56.65 1.1.02 1.8-.98 2.46-1.9.78-1.14 1.1-2.23 1.12-2.28-.02-.04-2.12-.82-2.15-3.25-.02-2.05 1.65-3.02 1.72-3.07-.94-1.4-2.4-1.56-2.88-1.6z"
      />
      <text
        x="14.5"
        y="12.2"
        fill="currentColor"
        fontSize="9.25"
        fontWeight="600"
        fontFamily="system-ui, -apple-system, BlinkMacSystemFont, sans-serif"
      >
        Pay
      </text>
    </svg>
  );
}

function BadgeGooglePay() {
  return (
    <svg className={styles.iconSvg} viewBox="0 0 56 16" aria-hidden focusable="false">
      <circle cx="8.2" cy="8" r="6.2" fill="#fff" stroke="rgba(107, 95, 168, 0.12)" strokeWidth="0.85" />
      <text
        x="5.1"
        y="11.1"
        fontSize="9.75"
        fontWeight="700"
        fill="#1A73E8"
        fontFamily="system-ui, sans-serif"
      >
        G
      </text>
      <text x="18" y="11.1" fontSize="9.25" fontWeight="600" fill="#3C4043" fontFamily="system-ui, sans-serif">
        Pay
      </text>
    </svg>
  );
}

function BadgeShopPay() {
  return (
    <svg className={styles.iconSvg} viewBox="0 0 68 14" aria-hidden focusable="false">
      <text x="0" y="11" fill="#FAFAFF" fontSize="8.75" fontWeight="700" fontFamily="system-ui, sans-serif" letterSpacing="0.02em">
        shop
      </text>
      <text x="25" y="11" fill="#FAFAFF" fontSize="8.75" fontWeight="600" fontFamily="system-ui, sans-serif">
        Pay
      </text>
    </svg>
  );
}

function BadgePayPay() {
  return (
    <svg className={styles.iconSvg} viewBox="0 0 72 16" aria-hidden focusable="false">
      <rect x="0.5" y="2" width="11.5" height="11.5" rx="2.75" fill="#C45C5A" />
      <path
        fill="#FFFBFA"
        d="M4.8 5.1c.28 0 .52.1.7.28.18.18.27.42.27.72 0 .45-.25.78-.6.92l.75 1.75h-.75l-.68-1.58h-.35v1.58H3.5V5.1h1.3zm-.25 1.5h.18c.18 0 .32-.14.32-.34 0-.18-.14-.32-.32-.32h-.18v.66z"
      />
      <text
        x="14.75"
        y="11.5"
        fill="#8F4A48"
        fontSize="9.5"
        fontWeight="700"
        fontFamily="system-ui, -apple-system, sans-serif"
        letterSpacing="0.01em"
      >
        PayPay
      </text>
    </svg>
  );
}

const LABELS: Record<CheckoutTrustBadgeId, string> = {
  visa: 'Visa',
  mastercard: 'Mastercard',
  amex: 'American Express',
  jcb: 'JCB',
  apple_pay: 'Apple Pay',
  google_pay: 'Google Pay',
  shop_pay: 'Shop Pay',
  paypay: 'PayPay',
};

function renderBadge(id: CheckoutTrustBadgeId) {
  switch (id) {
    case 'visa':
      return <BadgeVisa />;
    case 'mastercard':
      return <BadgeMastercard />;
    case 'amex':
      return <BadgeAmex />;
    case 'jcb':
      return <BadgeJcb />;
    case 'apple_pay':
      return <BadgeApplePay />;
    case 'google_pay':
      return <BadgeGooglePay />;
    case 'shop_pay':
      return <BadgeShopPay />;
    case 'paypay':
      return <BadgePayPay />;
    default:
      return null;
  }
}

function badgeClassName(id: CheckoutTrustBadgeId): string {
  if (id === 'amex') return `${styles.badge} ${styles.badgeAmex}`;
  if (id === 'shop_pay') return `${styles.badge} ${styles.badgeShopPay}`;
  if (id === 'paypay') return `${styles.badge} ${styles.badgePayPay}`;
  return styles.badge;
}

function badgeInnerClassName(id: CheckoutTrustBadgeId): string | undefined {
  if (id === 'apple_pay') return styles.markDark;
  return undefined;
}

/**
 * Quiet payment-method trust row for M55 purchase surfaces (not inside Stripe-hosted checkout).
 */
export function CheckoutTrustRow() {
  const ids = getCheckoutTrustBadgeIds();
  if (ids.length === 0) return null;

  const showWalletHint = trustRowShowsWalletBadges(ids);

  return (
    <div className={styles.wrap} data-m55-print-hide data-testid="m55-checkout-trust-row">
      <p className={styles.srOnly}>
        Stripe Checkout で利用できる主な決済手段の表示です。実際に選べる手段は環境により異なります。
      </p>
      <ul
        className={styles.row}
        aria-label="決済ブランド（Checkout での選択肢は環境により異なります）"
      >
        {ids.map((id) => {
          const inner = renderBadge(id);
          if (!inner) return null;
          const innerClass = badgeInnerClassName(id);
          const mark = innerClass ? <span className={innerClass}>{inner}</span> : inner;
          const nudge = MARK_NUDGE[id];
          return (
            <li key={id} className={badgeClassName(id)} title={LABELS[id]}>
              <span className={[styles.badgeMark, nudge].filter(Boolean).join(' ')}>{mark}</span>
            </li>
          );
        })}
      </ul>
      {showWalletHint ? (
        <p className={styles.hint}>
          Apple Pay / Google Pay は、ご利用端末・ブラウザの環境により、Checkout
          画面で選択できる場合があります。
        </p>
      ) : null}
    </div>
  );
}
