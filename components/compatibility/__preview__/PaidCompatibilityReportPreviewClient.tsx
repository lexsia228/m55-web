'use client';

import { useMemo, useState } from 'react';
import {
  buildPaidCompatibilityReportV1,
  type PaidCompatibilityReportInput,
} from '../../../lib/m55/compatibility/buildPaidCompatibilityReportV1';
import PaidCompatibilityReportReader from '../PaidCompatibilityReportReader';

export const PAID_COMPATIBILITY_PREVIEW_SYNTHETIC_REPORTS: readonly {
  id: string;
  label: string;
  input: PaidCompatibilityReportInput;
}[] = [
  {
    id: 'stage-r1',
    label: 'R1 no prior contact',
    input: {
      pairAxisId: 'A2',
      paidTopicId: 'T4',
      relationStatusId: 'R1',
      temperatureId: 'E2',
      personAUsesFirstPerspective: true,
      currentContextV2: {
        expressionPace: 'words_soon',
        approachIntent: 'wait_for_signal',
        focus: 'next_step_focus',
      },
    },
  },
  {
    id: 'stage-r2',
    label: 'R2 early contact',
    input: {
      pairAxisId: 'A1',
      paidTopicId: 'T3',
      relationStatusId: 'R2',
      temperatureId: 'E2',
      personAUsesFirstPerspective: true,
      currentContextV2: {
        expressionPace: 'words_later',
        contactPace: 'light_contact',
        focus: 'conversation_focus',
      },
    },
  },
  {
    id: 'stage-r3',
    label: 'R3 established',
    input: {
      pairAxisId: 'A3',
      paidTopicId: 'T2',
      relationStatusId: 'R3',
      temperatureId: 'E1',
      personAUsesFirstPerspective: true,
      currentContextV2: {
        decisionPace: 'decide_later',
        disagreement: 'talk_now',
        expressionPace: 'words_soon',
        returnPattern: 'someone_reaches',
        focus: 'conversation_focus',
      },
    },
  },
  {
    id: 'stage-r4',
    label: 'R4 distance exists',
    input: {
      pairAxisId: 'A4',
      paidTopicId: 'T1',
      relationStatusId: 'R4',
      temperatureId: 'E4',
      personAUsesFirstPerspective: true,
      currentContextV2: {
        distance: 'go_quiet',
        expressionPace: 'words_later',
        focus: 'distance_focus',
      },
    },
  },
  {
    id: 'stage-r5',
    label: 'R5 reapproach',
    input: {
      pairAxisId: 'A4',
      paidTopicId: 'T1',
      relationStatusId: 'R5',
      temperatureId: 'E4',
      personAUsesFirstPerspective: true,
      currentContextV2: {
        reapproachReadiness: 'small_step_first',
        distance: 'go_quiet',
        expressionPace: 'words_soon',
        focus: 'return_focus',
      },
    },
  },
  {
    id: 'stage-r6',
    label: 'R6 long-term',
    input: {
      pairAxisId: 'A3',
      paidTopicId: 'T5',
      relationStatusId: 'R6',
      temperatureId: 'E5',
      personAUsesFirstPerspective: true,
      currentContextV2: {
        decisionPace: 'decide_later',
        disagreement: 'take_space',
        expressionPace: 'words_later',
        returnPattern: 'return_is_hard',
        focus: 'return_focus',
      },
    },
  },
] as const;

export default function PaidCompatibilityReportPreviewClient() {
  const [fixtureId, setFixtureId] = useState(PAID_COMPATIBILITY_PREVIEW_SYNTHETIC_REPORTS[0]!.id);
  const fixture = PAID_COMPATIBILITY_PREVIEW_SYNTHETIC_REPORTS.find(
    (candidate) => candidate.id === fixtureId,
  ) ?? PAID_COMPATIBILITY_PREVIEW_SYNTHETIC_REPORTS[0]!;
  const snapshot = useMemo(
    () => buildPaidCompatibilityReportV1(fixture.input),
    [fixture],
  );

  return (
    <>
      <div
        data-testid="paid-compatibility-preview-controls"
        style={{
          width: 'min(calc(100% - 36px), 960px)',
          margin: '20px auto 0',
          padding: 14,
          boxSizing: 'border-box',
          border: '1px solid rgba(55, 45, 70, 0.14)',
          borderRadius: 12,
          background: 'rgba(255, 255, 255, 0.86)',
        }}
      >
        <label style={{ display: 'grid', gap: 7, fontSize: 13, color: '#4b3b60' }}>
          Synthetic report
          <select
            value={fixtureId}
            onChange={(event) => setFixtureId(event.target.value)}
            style={{ minHeight: 44, padding: '8px 10px', font: 'inherit' }}
          >
            {PAID_COMPATIBILITY_PREVIEW_SYNTHETIC_REPORTS.map((candidate) => (
              <option key={candidate.id} value={candidate.id}>
                {candidate.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <PaidCompatibilityReportReader key={fixture.id} snapshot={snapshot} />
    </>
  );
}
