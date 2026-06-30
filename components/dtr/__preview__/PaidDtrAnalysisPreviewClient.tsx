'use client';

import { useEffect, useState } from 'react';
import PaidDtrAnalysisLoading from '../PaidDtrAnalysisLoading';

const PREVIEW_NICKNAME = 'AA';
const PREVIEW_BIRTH_DATE = '2026-06-17';

/** snapshot 準備完了を模すまでの遅延（演出確認用・API なし） */
const MOCK_READY_MS = 1500;

export default function PaidDtrAnalysisPreviewClient() {
  const [runId, setRunId] = useState(0);
  const [open, setOpen] = useState(true);
  const [processingComplete, setProcessingComplete] = useState(false);
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    setProcessingComplete(false);
    const t = window.setTimeout(() => setProcessingComplete(true), MOCK_READY_MS);
    return () => window.clearTimeout(t);
  }, [runId]);

  const replay = () => {
    setFinished(false);
    setRunId((n) => n + 1);
    setOpen(true);
  };

  return (
    <>
      <PaidDtrAnalysisLoading
        open={open}
        nickname={PREVIEW_NICKNAME}
        birthDate={PREVIEW_BIRTH_DATE}
        processingComplete={processingComplete}
        onComplete={() => {
          setOpen(false);
          setFinished(true);
        }}
      />

      {finished ? (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100003,
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
            padding: 24,
            pointerEvents: 'none',
          }}
        >
          <div
            style={{
              pointerEvents: 'auto',
              padding: '12px 16px',
              borderRadius: 12,
              background: 'rgba(12, 38, 46, 0.92)',
              border: '1px solid rgba(68, 168, 178, 0.28)',
              color: 'rgba(220, 236, 238, 0.92)',
              fontSize: 13,
              lineHeight: 1.5,
              textAlign: 'center',
              maxWidth: 360,
            }}
          >
            <p style={{ margin: '0 0 10px' }}>プレビュー完了（dev のみ）</p>
            <button
              type="button"
              onClick={replay}
              style={{
                padding: '8px 14px',
                borderRadius: 8,
                border: '1px solid rgba(68, 184, 192, 0.4)',
                background: 'rgba(68, 184, 192, 0.12)',
                color: 'inherit',
                cursor: 'pointer',
                font: 'inherit',
              }}
            >
              もう一度再生
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
