/**
 * Legal group layout.
 * Public shell (header + quiet footer) for all /legal/* pages.
 * Shell routes do NOT inherit this layout.
 */
import { PublicShell } from "../_components/PublicShell";

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <PublicShell>{children}</PublicShell>
  );
}
