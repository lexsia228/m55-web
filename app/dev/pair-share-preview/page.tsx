'use client';

import { notFound } from 'next/navigation';
import { useMemo, useState } from 'react';
import PairFreeShareCTA from '../../../components/compatibility/PairFreeShareCTA';
import type { ShareAspectRatio } from '../../../components/narrative/PublicShareCardPreview';
import { buildPairFreeInsightSpecV2 } from '../../../lib/m55/compatibility/pairFreeInsightSpecV2';

const ASPECT_RATIOS = ['1:1', '4:5', '9:16'] as const satisfies readonly ShareAspectRatio[];

const SYNTHETIC_INSIGHT = buildPairFreeInsightSpecV2({
  answersV2: {
    expressionPace: 'words_later',
    decisionPace: 'decide_later',
    disagreement: 'talk_now',
    returnPattern: 'someone_reaches',
    focus: 'conversation_focus',
  },
  pairAxisId: 'A2',
  personABirthDate: '1990-01-15',
  personBBirthDate: '1992-08-20',
  personAUsesFirstPerspective: true,
  focusLabel: '会話の進め方',
  relationStatusId: 'R3',
});

function isPreviewBlockedInProduction(): boolean {
  if (process.env.NODE_ENV === 'production') return true;
  if (process.env.VERCEL_ENV === 'production') return true;
  return false;
}

/** Dev-only fixture owner for Pair share aspect-ratio evidence. */
export default function PairSharePreviewPage() {
  const [aspectRatio, setAspectRatio] = useState<ShareAspectRatio>('4:5');
  const insight = useMemo(() => SYNTHETIC_INSIGHT, []);

  if (isPreviewBlockedInProduction()) {
    notFound();
  }

  return (
    <main
      data-m55-dev-preview="pair-share"
      data-m55-visual-subsystem="pair"
      data-m55-share-presentation="free"
      data-testid="m55-dev-pair-share-preview"
      style={{
        width: 'min(calc(100% - 32px), 760px)',
        margin: '24px auto 40px',
        display: 'grid',
        gap: 16,
      }}
    >
      <div
        role="group"
        aria-label="投稿サイズの見え方"
        style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}
      >
        {ASPECT_RATIOS.map((ratio) => (
          <button
            key={ratio}
            type="button"
            data-testid={`m55-pair-share-preview-aspect-${ratio.replace(':', '-')}`}
            data-selected={aspectRatio === ratio ? 'true' : 'false'}
            onClick={() => setAspectRatio(ratio)}
            style={{
              minHeight: 44,
              padding: '8px 14px',
              borderRadius: 999,
              border: '1px solid rgba(107, 95, 168, 0.28)',
              background: aspectRatio === ratio ? 'rgba(238, 232, 246, 0.95)' : '#fffaf1',
              font: 'inherit',
              cursor: 'pointer',
            }}
          >
            {ratio}
          </button>
        ))}
      </div>
      <PairFreeShareCTA insight={insight} previewAspectRatio={aspectRatio} />
    </main>
  );
}
