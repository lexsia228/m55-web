import M55TenViews from '../../components/pages/M55TenViews';
import { PublicShell } from '../_components/PublicShell';

export const metadata = {
  title: '人生を再構築するための10通りの資質 | M55',
  description:
    'M55の10通りの資質は、自己観測のためのラベルです。役職や順位ではなく、輪郭を静かに読み解く入口です。',
};

export default function TenViewsPage() {
  return (
    <PublicShell>
      <div data-m55-experience-surface="PUBLIC_EDITORIAL">
        <M55TenViews />
      </div>
    </PublicShell>
  );
}
