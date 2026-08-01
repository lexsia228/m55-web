import Link from 'next/link';
import {
  M55_METHOD_CANONICAL_ROUTE,
  M55_METHOD_ROUTE_LINK_LABEL_JA,
} from '../../lib/m55/method/m55MethodAuthority';
import styles from './PublicFooter.module.css';

const PRODUCT_GROUP = [
  {
    label: M55_METHOD_ROUTE_LINK_LABEL_JA,
    href: M55_METHOD_CANONICAL_ROUTE,
    testId: 'm55-method-footer-link',
  },
  { label: '10の資質', href: '/ten-views', testId: undefined },
  { label: 'プレミアムレポート', href: '/dtr/lp', testId: undefined },
] as const;

const SUPPORT_LEGAL_GROUP = [
  { label: 'サポート', href: '/support', testId: undefined },
  { label: '返金', href: '/legal/refund', testId: undefined },
  { label: '利用規約', href: '/legal/terms', testId: undefined },
  { label: 'プライバシーポリシー', href: '/legal/privacy', testId: undefined },
  { label: '特定商取引法に基づく表記', href: '/legal/tokushoho', testId: undefined },
] as const;

function FooterLinkRow({
  items,
}: {
  items: readonly { label: string; href: string; testId?: string }[];
}) {
  return (
    <div className={styles.linkRow}>
      {items.map((item) => (
        <Link key={item.href} href={item.href} className={styles.link} data-testid={item.testId}>
          {item.label}
        </Link>
      ))}
    </div>
  );
}

/** Site-wide footer — product/understanding + support/legal groups. */
export function PublicFooter() {
  return (
    <footer className={styles.footer}>
      <div className={styles.row}>
        <div className={styles.groups}>
          <nav aria-label="製品・理解">
            <FooterLinkRow items={PRODUCT_GROUP} />
          </nav>
          <nav aria-label="サポート・法務">
            <FooterLinkRow items={SUPPORT_LEGAL_GROUP} />
          </nav>
        </div>
        <p className={styles.copy}>© 2026 M55</p>
      </div>
    </footer>
  );
}
