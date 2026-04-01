'use client';

import { useEffect, useState } from 'react';
import ShellLayout from '../../components/shell/ShellLayout';

export default function DtrPage() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(true);
  }, []);

  if (!ready) return null;

  return (
    <ShellLayout
      iframeSrc="/legacy/page_history.html"
      iframeTitle="M55 DTR"
    />
  );
}
