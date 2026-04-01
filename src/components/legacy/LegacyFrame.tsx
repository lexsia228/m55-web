'use client';

import { LegacyBridge } from './LegacyBridge';
import { useSoulBridge } from '../../../hooks/useSoulBridge';
import styles from '../../../components/shell/ShellLayout.module.css';
import { SoulBirthGate } from '../soul/SoulBirthGate';

type LegacyFrameProps = {
  src: string;
  title: string;
  className?: string;
  sandbox?: string;
  referrerPolicy?: React.IframeHTMLAttributes<HTMLIFrameElement>['referrerPolicy'];
};

export default function LegacyFrame({
  src,
  title,
  className = styles.iframe,
  sandbox = 'allow-scripts allow-same-origin allow-forms',
  referrerPolicy = 'no-referrer',
}: LegacyFrameProps) {
  const iframeRef = useSoulBridge();

  return (
    <>
      <SoulBirthGate />
      <iframe
        ref={iframeRef}
        className={className}
        src={src}
        title={title}
        sandbox={sandbox}
        referrerPolicy={referrerPolicy}
      />
      <LegacyBridge iframeRef={iframeRef} />
    </>
  );
}
