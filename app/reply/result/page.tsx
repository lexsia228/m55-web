import { Suspense } from "react";
import ReplyResultPageClient from "../../../components/reply/ReplyResultPageClient";

function Fallback() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/50">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <div className="h-7 w-48 bg-foreground/10 rounded-sm animate-pulse" />
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-6 py-10">
        <div className="h-64 bg-foreground/10 rounded-sm border border-border/30 animate-pulse" />
      </main>
    </div>
  );
}

export default function ReplyResultPage() {
  return (
    <Suspense fallback={<Fallback />}>
      <ReplyResultPageClient />
    </Suspense>
  );
}
