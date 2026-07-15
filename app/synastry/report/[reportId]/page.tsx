import { auth } from '@clerk/nextjs/server';
import { notFound } from 'next/navigation';
import { PublicShell } from '../../../_components/PublicShell';
import PaidCompatibilityReportReader from '../../../../components/compatibility/PaidCompatibilityReportReader';
import { M55ExperienceShell } from '../../../../components/experience/M55ExperienceShell';
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
      <M55ExperienceShell kind="compatibility" depth="paid">
        <PaidCompatibilityReportReader snapshot={report.snapshot} owned />
      </M55ExperienceShell>
    </PublicShell>
  );
}
