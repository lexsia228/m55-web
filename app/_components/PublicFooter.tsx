import Link from "next/link";
import styles from "./PublicFooter.module.css";

/** Site-wide footer link SSOT — order must not change. */
export const FOOTER_LINKS = [
  { label: "レポート", href: "/dtr" },
  { label: "サポート", href: "/support" },
  { label: "返金", href: "/legal/refund" },
  { label: "特商法", href: "/legal/tokushoho" },
  { label: "利用規約", href: "/legal/terms" },
  { label: "プライバシー", href: "/legal/privacy" },
] as const;

export function PublicFooter() {
  return (
    <footer className={styles.footer}>
      <div className={styles.row}>
        <div className={styles.links}>
          {FOOTER_LINKS.map((item, index) => (
            <span key={item.href} className={styles.linkGroup}>
              {index > 0 ? <span className={styles.sep}>·</span> : null}
              <Link href={item.href} className={styles.link}>
                {item.label}
              </Link>
            </span>
          ))}
        </div>
        <p className={styles.copy}>© 2026 M55</p>
      </div>
    </footer>
  );
}
