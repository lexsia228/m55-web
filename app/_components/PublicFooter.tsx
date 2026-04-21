import Link from "next/link";
import styles from "./PublicFooter.module.css";

export function PublicFooter() {
  return (
    <footer className={styles.footer}>
      <div className={styles.row}>
        <div className={styles.links}>
          <Link href="/dtr" className={styles.link}>
            レポート
          </Link>
          <span className={styles.sep}>·</span>
          <Link href="/support" className={styles.link}>
            サポート
          </Link>
          <span className={styles.sep}>·</span>
          <Link href="/legal/refund" className={styles.link}>
            返金
          </Link>
          <span className={styles.sep}>·</span>
          <Link href="/legal/tokushoho" className={styles.link}>
            特商法
          </Link>
          <span className={styles.sep}>·</span>
          <Link href="/legal/terms" className={styles.link}>
            利用規約
          </Link>
          <span className={styles.sep}>·</span>
          <Link href="/legal/privacy" className={styles.link}>
            プライバシー
          </Link>
        </div>
        <p className={styles.copy}>© 2026 M55</p>
      </div>
    </footer>
  );
}

