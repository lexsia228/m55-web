'use client';

import { useEffect, useState } from 'react';
import ShellLayout from '../../components/shell/ShellLayout';

export default function TarotPage() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(true);
  }, []);

  if (!ready) return null;

  return (
    <ShellLayout
      iframeSrc="/legacy/page_tarot.html"
      iframeTitle="M55 Tarot"
    />
  );
}
