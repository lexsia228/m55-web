import MyPageClient from './MyPageClient';

export const metadata = {
  title: 'アカウントと購入履歴 | M55',
  description:
    '登録情報、購入・利用情報、保存版の履歴、データ管理、サポートを確認できます。',
  robots: { index: false, follow: false },
};

export default function MyPage() {
  return <MyPageClient />;
}
