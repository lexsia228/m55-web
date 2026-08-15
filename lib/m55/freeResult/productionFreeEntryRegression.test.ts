import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import { buildHumanizedConciseWhyJa } from './humanizeFreeResultWhyV1';
import { buildFreeDepthAnalysisV1 } from './buildFreeDepthAnalysisV1';
import {
  FREE_AXIS_QUESTION_IDS,
} from '../individualization/answerIdMapsV1';

const ROOT = join(import.meta.dirname, '../../..');

function read(rel: string): string {
  return readFileSync(join(ROOT, rel), 'utf8');
}

const SAMPLE_ANSWERS = {
  [FREE_AXIS_QUESTION_IDS.start]: 'free.start_style.map_first',
  [FREE_AXIS_QUESTION_IDS.decision]: 'free.decision_style.sort_first',
  [FREE_AXIS_QUESTION_IDS.recovery]: 'free.recovery_style.pause_short',
  [FREE_AXIS_QUESTION_IDS.distance]: 'free.distance_style.close_careful',
  [FREE_AXIS_QUESTION_IDS.change]: 'free.change_style.observe_first',
  'free.primary_theme': 'free.primary_theme.report_preview',
};

describe('production free entry regression guards', () => {
  it('CoreEssencePanel does not block guest intake on Clerk isLoaded', () => {
    const panel = read('components/core/CoreEssencePanel.tsx');
    assert.doesNotMatch(panel, /if \(!isLoaded \|\| !hydrated\)/);
    assert.match(panel, /if \(!hydrated\) return \{ kind: 'loading' \}/);
    assert.doesNotMatch(panel, /if \(!isLoaded\) return;\s*const snap = hydrateCoreEssenceFromStore/s);
  });

  it('Home poster CTA stays clickable before Clerk hydration for fresh guests', () => {
    const home = read('components/home/HomePanel.tsx');
    assert.match(home, /!hasProfile &&/);
    assert.doesNotMatch(home, /m55-home-hero-cta-loading/);
    assert.doesNotMatch(home, /isLoaded && !hasProfile/);
  });

  it('Home lower FreeCtaButton fail-opens to intake while Clerk is unknown', () => {
    const home = read('components/home/HomePanel.tsx');
    const freeCtaStart = home.indexOf('function FreeCtaButton');
    const freeCtaEnd = home.indexOf('\nexport default function HomePanel', freeCtaStart);
    const freeCta = home.slice(freeCtaStart, freeCtaEnd);
    assert.match(freeCta, /if \(!isLoaded\) \{[\s\S]*onClick=\{onOpenIntake\}/);
    assert.doesNotMatch(freeCta, /if \(!isLoaded\)[\s\S]*disabled/);
  });

  it('e2e fresh path exists without seeding RESULT for first assertion', () => {
    const e2e = read('e2e/self-funnel-runtime-state.spec.ts');
    assert.match(e2e, /A\. CLEAN NEW USER/);
    assert.match(e2e, /localStorage\.clear\(\)/);
    assert.match(e2e, /m55-home-open-birth-intake/);
    assert.match(e2e, /m55-birth-intake-start/);
    assert.match(e2e, /answerFiveQuestions/);
    assert.doesNotMatch(
      e2e.slice(e2e.indexOf('A. CLEAN NEW USER'), e2e.indexOf('B. DIRECT')),
      /committedFreeAnswers/,
    );
  });

  it('returning edit path confirms questionnaire becomes editable again', () => {
    const e2e = read('e2e/self-funnel-runtime-state.spec.ts');
    assert.match(e2e, /回答を変えて、もう一度見る/);
    assert.match(e2e, /m55-free-rerun-confirm/);
    assert.match(e2e, /m55-free-questionnaire/);
  });
});

describe('humanizeFreeResultWhyV1', () => {
  it('rewrites fused stack vocabulary into customer Japanese', () => {
    const [birth, answer] = buildHumanizedConciseWhyJa({
      birthBaseJa:
        '生年月日の土台では、全体を揃えてから動き、揃ったあとも比較が残りやすい基調です。',
      fusedStackJa:
        '土台の始め方も今回の答えも、全体を揃えてから動く側に重なっています。同じ方向に重なると、慎重に見えるほど、準備が終わっても決めきれていない時間が出やすい。',
      bodyJa: '始め方と決め方、距離の取り方が同じレイヤーでは動かない。',
    });
    assert.match(birth, /生年月日から見ると/);
    assert.doesNotMatch(birth, /土台では/);
    assert.match(answer, /今回の回答では/);
    assert.doesNotMatch(answer, /側に重なっています/);
  });

  it('depth analysis uses humanized concise why lines', () => {
    const built = buildFreeDepthAnalysisV1({
      birthDate: '1983-02-28',
      stemLaneIndex: 3,
      freeAnswerSet: SAMPLE_ANSWERS,
    });
    assert.equal(built.ok, true);
    if (!built.ok) return;
    const [why1, why2] = built.value.conciseWhyJa;
    assert.doesNotMatch(`${why1}\n${why2}`, /土台の始め方|側に重なっています|候補を比べてから閉じる側/);
    assert.match(why1, /生年月日から見ると/);
  });
});

describe('free hero commercial shape', () => {
  it('keeps hero headline to the strongest opening mechanism only', () => {
    const built = buildFreeDepthAnalysisV1({
      birthDate: '1983-02-28',
      stemLaneIndex: 3,
      freeAnswerSet: SAMPLE_ANSWERS,
    });
    assert.equal(built.ok, true);
    if (!built.ok) return;
    const sentences = built.value.headlineJa.split('。').filter((part) => part.trim().length > 0);
    assert.ok(sentences.length <= 3, `hero too long: ${built.value.headlineJa}`);
    assert.ok(
      built.value.secondarySceneJa.length > built.value.headlineJa.length / 2,
      'secondary scene should carry extra observations',
    );
  });
});
