'use client';

import { useEffect, useState } from 'react';
import ShellLayout from '../../components/shell/ShellLayout';

export default function AiChatPage() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(true);
  }, []);

  if (!ready) return null;

  return (
    <ShellLayout
      iframeSrc="/legacy/page_chat.html"
      iframeTitle="M55 AI Chat"
    />
  );
}
