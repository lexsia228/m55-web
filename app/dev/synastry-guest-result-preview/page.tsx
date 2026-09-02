import { notFound } from 'next/navigation';
import PairGuestResultPreviewClient, {
  type BuiltPairGuestPreviewFixture,
} from '../../../components/compatibility/__preview__/PairGuestResultPreviewClient';
import { isPaidCompatibilityPreviewBlocked } from '../../../lib/m55/compatibility/paidCompatibilityPreviewGuard';
import { buildCompatibilityPublicResult } from '../../../lib/m55/compatibility/pairReadingGuestResult';

export const metadata = {
  title: 'Pair Guest Result Preview (dev)',
  robots: { index: false, follow: false },
};

const FIXTURE_SEEDS = [
  {
    id: 'established-r3',
    label: 'R3 established · conversation focus',
    input: { personA: '1990-01-15', personB: '1992-08-20' },
    relationStatusId: 'R3' as const,
    partnerLabel: 'Y',
    answers: {
      expressionPace: 'words_later',
      decisionPace: 'decide_later',
      disagreement: 'talk_now',
      returnPattern: 'someone_reaches',
      focus: 'conversation_focus',
    },
  },
  {
    id: 'distance-r4',
    label: 'R4 distance · return focus',
    input: { personA: '1988-03-12', personB: '1995-11-02' },
    relationStatusId: 'R4' as const,
    partnerLabel: 'K',
    answers: {
      distance: 'go_quiet',
      expressionPace: 'words_later',
      focus: 'return_focus',
    },
  },
  {
    id: 'early-r2',
    label: 'R2 early contact · next step',
    input: { personA: '1993-07-21', personB: '1994-04-09' },
    relationStatusId: 'R2' as const,
    partnerLabel: 'M',
    answers: {
      expressionPace: 'words_soon',
      approachIntent: 'wait_for_signal',
      focus: 'next_step_focus',
    },
  },
] as const;

function buildFixtures(): BuiltPairGuestPreviewFixture[] {
  return FIXTURE_SEEDS.map((seed) => {
    const outcome = buildCompatibilityPublicResult(
      seed.input,
      seed.relationStatusId,
      seed.answers,
    );
    if (!outcome.ok) {
      throw new Error(`STOP_FIXTURE_SCOPE: pair guest preview fixture invalid (${outcome.message})`);
    }
    return {
      id: seed.id,
      label: seed.label,
      input: seed.input,
      relationStatusId: seed.relationStatusId,
      partnerLabel: seed.partnerLabel,
      answers: seed.answers,
      result: outcome.value,
    };
  });
}

/** Dev-only fixture owner for pair free personalized result evidence. */
export default function PairGuestResultPreviewPage() {
  if (isPaidCompatibilityPreviewBlocked({
    nodeEnv: process.env.NODE_ENV,
    vercelEnv: process.env.VERCEL_ENV,
  })) {
    notFound();
  }

  return (
    <main
      data-m55-dev-preview="pair-guest-result"
      data-m55-visual-subsystem="pair"
      data-testid="m55-dev-pair-guest-result-preview"
    >
      <PairGuestResultPreviewClient fixtures={buildFixtures()} />
    </main>
  );
}
