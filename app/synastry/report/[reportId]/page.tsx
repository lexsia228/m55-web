import { auth } from '@clerk/nextjs/server';
import { notFound } from 'next/navigation';
import { PublicShell } from '../../../_components/PublicShell';
import PaidCompatibilityReportReader from '../../../../components/compatibility/PaidCompatibilityReportReader';
import { getOwnedCompatibilityReport } from '../../../../lib/m55/compatibility/compatibilityCommerceDb';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function OwnedCompatibilityReportPage({
  params,
}: {
  params: Promise<{ reportId: string }>;
}) {
  const { userId } = await auth();
  if (!userId) notFound();
  const { reportId } = await params;
  const report = await getOwnedCompatibilityReport(userId, reportId);
  if (!report) notFound();

  return (
    <PublicShell>
      <PaidCompatibilityReportReader snapshot={report.snapshot} owned />
    </PublicShell>
  );
}
