import {
  getCheckoutTrustBadgeIds,
  trustRowShowsWalletBadges,
  type CheckoutTrustBadgeId,
} from '../../lib/m55/checkoutTrustBadges';
import styles from './CheckoutTrustRow.module.css';

function BadgeVisa() {
  return (
    <svg className={styles.innerSvg} viewBox="0 0 48 16" aria-hidden focusable="false">
      <text
        x="0"
        y="12"
        fill="#1a1f71"
        fontSize="13"
        fontWeight="700"
        fontFamily="system-ui, sans-serif"
        letterSpacing="0.12em"
      >
        VISA
      </text>
    </svg>
  );
}

function BadgeMastercard() {
  return (
    <svg className={styles.innerSvgTall} viewBox="0 0 40 22" aria-hidden focusable="false">
      <circle cx="15" cy="11" r="9" fill="#eb001b" />
      <circle cx="25" cy="11" r="9" fill="#f79e1b" />
    </svg>
  );
}

function BadgeAmex() {
  return (
    <svg className={styles.innerSvg} viewBox="0 0 44 14" aria-hidden focusable="false">
      <text
        x="0"
        y="11"
        fill="#fff"
        fontSize="10"
        fontWeight="800"
        fontFamily="system-ui, sans-serif"
        letterSpacing="0.06em"
      >
        AMEX
      </text>
    </svg>
  );
}

function BadgeJcb() {
  return (
    <svg className={styles.innerSvg} viewBox="0 0 36 16" aria-hidden focusable="false">
      <rect x="0" y="3" width="10" height="10" rx="1" fill="#0e4c96" />
      <rect x="12" y="3" width="10" height="10" rx="1" fill="#e60012" />
      <rect x="24" y="3" width="10" height="10" rx="1" fill="#00a650" />
    </svg>
  );
}

/** Stylized mark + Pay — trust-row scale only. */
function BadgeApplePay() {
  return (
    <svg className={styles.innerSvgTall} viewBox="0 0 50 18" aria-hidden focusable="false">
      <path
        fill="currentColor"
        d="M6.8 3.1c.04.95-.62 1.68-1.28 2.05-.33.17-.88.3-1.25.25.08-.78.45-1.52 1.02-1.98.33-.28.95-.6 1.5-.32zm2.1 3.45c-1.38-.08-2.55.78-3.22.78-.68 0-1.58-.74-2.62-.72-1.35.04-2.6.78-3.3 2.02-1.42 2.45-.36 6.05 1.02 8.02.72.98 1.56 2.1 2.7 2.06 1.08-.04 1.5-.7 2.78-.68 1.3-.02 1.68.68 2.78.7 1.18.02 1.94-1.05 2.66-2.05.84-1.22 1.18-2.4 1.2-2.46-.02-.04-2.3-.88-2.33-3.48-.02-2.2 1.78-3.25 1.86-3.3-1.02-1.5-2.6-1.68-3.12-1.72z"
      />
      <text
        x="13"
        y="12"
        fill="currentColor"
        fontSize="9.5"
        fontWeight="600"
        fontFamily="system-ui, -apple-system, sans-serif"
      >
        Pay
      </text>
    </svg>
  );
}

/** Compact G + Pay — not an official Google Pay lockup. */
function BadgeGooglePay() {
  return (
    <svg className={styles.innerSvgTall} viewBox="0 0 48 16" aria-hidden focusable="false">
      <circle cx="8" cy="8" r="6.5" fill="#fff" stroke="rgba(0,0,0,0.08)" strokeWidth="0.75" />
      <text x="4.8" y="11.2" fontSize="10" fontWeight="700" fill="#4285F4" fontFamily="system-ui, sans-serif">
        G
      </text>
      <text x="17" y="11.2" fontSize="9.5" fontWeight="600" fill="#5F6368" fontFamily="system-ui, sans-serif">
        Pay
      </text>
    </svg>
  );
}

function BadgeShopPay() {
  return (
    <svg className={styles.innerSvg} viewBox="0 0 64 14" aria-hidden focusable="false">
      <text x="0" y="11" fill="#fff" fontSize="9" fontWeight="700" fontFamily="system-ui, sans-serif">
        shop
      </text>
      <text x="26" y="11" fill="#fff" fontSize="9" fontWeight="600" fontFamily="system-ui, sans-serif">
        Pay
      </text>
    </svg>
  );
}

function BadgePayPay() {
  return (
    <svg className={styles.innerSvg} viewBox="0 0 52 16" aria-hidden focusable="false">
      <rect x="1" y="2" width="12" height="12" rx="2.5" fill="#e60012" />
      <path
        fill="#fff"
        d="M5.5 5.2c.3 0 .6.1.8.3.2.2.3.5.3.8 0 .5-.3.9-.7 1l.9 2.1h-.9l-.8-1.9h-.4v1.9H4V5.2h1.5zm-.3 1.8h.2c.2 0 .4-.2.4-.4s-.2-.4-.4-.4h-.2v.8z"
      />
      <text x="16" y="11.5" fill="#e60012" fontSize="10" fontWeight="800" fontFamily="system-ui, sans-serif">
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
  if (id === 'amex') return `${styles.badge} ${styles.badgeInvert}`;
  if (id === 'shop_pay') return `${styles.badge} ${styles.badgeShopPay}`;
  if (id === 'paypay') return `${styles.badge} ${styles.badgePayPay}`;
  return styles.badge;
}

/**
 * Quiet payment-method trust row for M55 purchase surfaces (not inside Stripe-hosted checkout).
 */
export function CheckoutTrustRow() {
  const ids = getCheckoutTrustBadgeIds();
  if (ids.length === 0) return null;

  const showWalletHint = trustRowShowsWalletBadges(ids);

  return (
    <div className={styles.wrap}>
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
          const isWalletText = id === 'apple_pay' || id === 'google_pay';
          return (
            <li key={id} className={badgeClassName(id)} title={LABELS[id]}>
              {isWalletText ? <span style={{ color: '#1a1a1a' }}>{inner}</span> : inner}
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
