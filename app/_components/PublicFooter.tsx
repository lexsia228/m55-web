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

const groupLabelStyle = {
  display: 'block',
  margin: '0 0 10px',
  fontSize: '11px',
  fontWeight: 700,
  letterSpacing: '0.06em',
  color: 'rgba(60, 60, 60, 0.72)',
} as const;

const groupWrapStyle = {
  display: 'flex',
  flexDirection: 'column' as const,
  gap: '20px',
  textAlign: 'left' as const,
};

const groupLinksStyle = {
  display: 'flex',
  flexWrap: 'wrap' as const,
  gap: '8px 14px',
  justifyContent: 'flex-start' as const,
};

function FooterLinkGroup({
  label,
  items,
}: {
  label: string;
  items: readonly { label: string; href: string }[];
}) {
  return (
    <div>
      <p style={groupLabelStyle}>{label}</p>
      <div style={groupLinksStyle}>
        {items.map((item) => (
          <Link key={item.href} href={item.href} className={styles.link} style={{ minHeight: 44, display: 'inline-flex', alignItems: 'center' }}>
            {item.label}
          </Link>
        ))}
      </div>
    </div>
  );
}

/** Site-wide footer — product/understanding + support/legal groups. */
export function PublicFooter() {
  return (
    <footer className={styles.footer}>
      <div className={styles.row}>
        <div style={groupWrapStyle}>
          <FooterLinkGroup label="製品・理解" items={PRODUCT_GROUP} />
          <FooterLinkGroup label="サポート・法務" items={SUPPORT_LEGAL_GROUP} />
        </div>
        <p className={styles.copy}>© 2026 M55</p>
      </div>
    </footer>
  );
}
