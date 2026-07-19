import Link from 'next/link';
import styles from './PublicFooter.module.css';

const PRODUCT_GROUP = [
  { label: 'M55の仕組み', href: '/how-m55-works' },
  { label: '10の資質', href: '/ten-views' },
  { label: 'プレミアムレポート', href: '/dtr/lp' },
] as const;

const SUPPORT_LEGAL_GROUP = [
  { label: 'サポート', href: '/support' },
  { label: '返金', href: '/legal/refund' },
  { label: '利用規約', href: '/legal/terms' },
  { label: 'プライバシーポリシー', href: '/legal/privacy' },
  { label: '特定商取引法に基づく表記', href: '/legal/tokushoho' },
] as const;

function FooterLinkRow({
  items,
}: {
  items: readonly { label: string; href: string }[];
}) {
  return (
    <div className={styles.linkRow}>
      {items.map((item) => (
        <Link key={item.href} href={item.href} className={styles.link}>
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
