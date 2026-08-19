import Link from 'next/link';
import {
  M55_METHOD_CANONICAL_ROUTE,
  M55_METHOD_ROUTE_LINK_LABEL_JA,
} from '../../lib/m55/method/m55MethodAuthority';
import styles from './PublicFooter.module.css';

const UTILITY_GROUP = [
  {
    label: M55_METHOD_ROUTE_LINK_LABEL_JA,
    href: M55_METHOD_CANONICAL_ROUTE,
    testId: 'm55-method-footer-link',
  },
] as const;

const SUPPORT_LEGAL_GROUP = [
  { label: 'サポート', href: '/support', testId: undefined },
  { label: '返金', href: '/legal/refund', testId: undefined },
  { label: '利用規約', href: '/legal/terms', testId: undefined },
  { label: 'プライバシーポリシー', href: '/legal/privacy', testId: undefined },
  { label: '特定商取引法に基づく表記', href: '/legal/tokushoho', testId: undefined },
] as const;

/** Site-wide utility footer — support/legal only (primary nav lives in header). */
export function PublicFooter() {
  return (
    <footer className={styles.footer} data-testid="m55-public-footer">
      <div className={styles.row}>
        <nav className={styles.utilityNav} aria-label="サポート・法務">
          <div className={styles.linkRow}>
            {UTILITY_GROUP.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={styles.link}
                data-testid={item.testId}
              >
                {item.label}
              </Link>
            ))}
            {SUPPORT_LEGAL_GROUP.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={styles.link}
                data-testid={item.testId}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </nav>
        <p className={styles.copy}>© 2026 M55</p>
      </div>
    </footer>
  );
}
