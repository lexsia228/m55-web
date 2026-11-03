import { CreatorDashboardClient } from './CreatorDashboardClient';
import styles from '../creator.module.css';

export default function CreatorDashboardPage() {
  return (
    <div className={styles.page}>
      <h1 className={styles.pageTitle}>Creatorダッシュボード</h1>
      <p className={styles.lead}>
        紹介の記録とコミッション状況を確認できます。支払いや出金は別途のご案内前は行われません。
      </p>
      <CreatorDashboardClient />
    </div>
  );
}
