/**
 * Support page layout.
 * Public shell (header + quiet footer) for /support.
 * Shell routes do NOT inherit this layout.
 */
import { PublicShell } from "../_components/PublicShell";

export default function SupportLayout({ children }: { children: React.ReactNode }) {
  return (
    <PublicShell>{children}</PublicShell>
  );
}
