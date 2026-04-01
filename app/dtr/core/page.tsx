import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { resolveEntryReportOwnership } from "../../../lib/m55/dtrOwnershipGate";
import DtrFullReader from "../../../components/dtr/DtrFullReader";
import styles from "./core.module.css";

export const metadata = { title: "Entry Report | M55" };

export default async function DtrCorePage() {
  const { userId } = await auth();

  // Anonymous → LP (fail-closed)
  if (!userId) redirect("/dtr/lp");

  // Layer1 ownership check (M55_ENTITLEMENT_KEY_NORMALIZATION + BINDING_ROLLOUT Step 5)
  const ownership = await resolveEntryReportOwnership(userId);

  // locked or expired → fail-closed to LP
  if (ownership.unlockState === "locked") redirect("/dtr/lp");
  if (ownership.unlockState === "expired") redirect("/dtr/lp?state=expired");

  // owned → render full reader shell (fullSections via client component)
  return (
    <main className={styles.page}>
      <DtrFullReader
        ownershipType={ownership.ownershipType}
        aiConsultIncluded={ownership.aiConsultIncluded}
        expiresAt={ownership.expiresAt}
      />
    </main>
  );
}
