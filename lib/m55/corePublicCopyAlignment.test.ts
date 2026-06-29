import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  STATIC_AI_EXPLAINER,
  STATIC_CTA,
  STATIC_M55_READ_STEPS,
} from '../../components/core/corePublicCopy';
import { TOP_FREE_ENTRY_PUBLIC_COPY } from './topFreeEntryPublicCopy';

const CORE_COPY_FILES = [
  'components/core/corePublicCopy.ts',
  'components/core/CoreHeroSection.tsx',
  'components/core/CoreHowM55ReadsSection.tsx',
  'components/core/CoreRadarSection.tsx',
  'components/core/CoreFreeSavedBoundarySection.tsx',
  'components/core/CoreEntryReportCTASection.tsx',
  'components/core/CoreAiChatExplainerSection.tsx',
  'lib/m55/topFreeEntryPublicCopy.ts',
  'lib/m55/coreFreePublicDisplay.ts',
] as const;

const LEGACY_CORE_TERMS = [
  'Blueprint of',
  'First Record',
  '特質性',
  'パーソナルアルゴリズム',
  '構造探求',
  '構造探求型',
  '要る形',
  '初回観測',
  '分析結果',
  '診断結果',
  '占います',
  '必ず当たる',
  '完全個別',
  '1000通り完全鑑定',
  'AIがすべてを書きます',
  '独自アルゴリズムで完全判定',
  'このタイプ',
  'タイプの人',
  '判定します',
] as const;

const testDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(testDir, '../..');

function readRepoFile(relativePath: string): string {
  const abs = join(repoRoot, relativePath);
  assert.ok(existsSync(abs), `missing file: ${relativePath}`);
  return readFileSync(abs, 'utf8');
}

function combinedCoreCopy(): string {
  return CORE_COPY_FILES.map(readRepoFile).join('\n');
}

describe('/core public copy alignment — CATEGORY-2-M55-CORE-PAGE-PAID-COPY-ALIGNMENT', () => {
  it('maps core copy sources to existing files', () => {
    for (const rel of CORE_COPY_FILES) {
      assert.ok(existsSync(join(repoRoot, rel)), rel);
    }
  });

  it('removes legacy English labels and hard classification terms from core surface', () => {
    const blob = combinedCoreCopy();
    for (const term of LEGACY_CORE_TERMS) {
      assert.equal(blob.includes(term), false, `legacy/forbidden term in /core copy: ${term}`);
    }
  });

  it('uses Japanese hero framing and birth-date label', () => {
    const hero = readRepoFile('components/core/CoreHeroSection.tsx');
    assert.match(hero, /本質の見取り図/);
    assert.match(hero, /生年月日/);
    assert.match(hero, /formatRecordDateLabelJa/);
    assert.doesNotMatch(hero, /Blueprint of/);
    assert.doesNotMatch(hero, /First Record/);
  });

  it('aligns free vs saved boundary with 4-chapter saved-report value', () => {
    const { coreBoundary } = TOP_FREE_ENTRY_PUBLIC_COPY;
    assert.match(coreBoundary.freeLeadJa, /輪郭/);
    assert.match(coreBoundary.savedLeadJa, /4章/);
    assert.match(coreBoundary.savedLeadJa, /力が出やすい場面/);
    assert.match(coreBoundary.savedLeadJa, /相談返書/);
    assert.doesNotMatch(coreBoundary.savedLeadJa, /正式4章で整理します。$/);
  });

  it('fixes consult explainer grammar and reduces 出方 density in static explainer', () => {
    const explainerBlob = [
      ...STATIC_AI_EXPLAINER.lead,
      ...STATIC_AI_EXPLAINER.items.map((item) => `${item.title}${item.body}`),
    ].join('\n');
    assert.match(explainerBlob, /必要な形に絞ります/);
    assert.equal(explainerBlob.includes('要る形'), false);
    assert.match(explainerBlob, /なんでも答えるAIではありません/);
    assert.equal(explainerBlob.match(/出方/g)?.length ?? 0, 0);
  });

  it('keeps read steps as free-entry bridge without paid deep-read leakage', () => {
    const stepsBlob = STATIC_M55_READ_STEPS.map((step) => `${step.title}\n${step.body}`).join('\n');
    assert.match(stepsBlob, /4章の保存版/);
    assert.match(stepsBlob, /読み直す土台/);
    assert.equal(stepsBlob.includes('本質の読み解き'), false);
    assert.equal(stepsBlob.match(/出方/g)?.length ?? 0, 0);
  });

  it('CTA copy clarifies saved-report depth and consult one-theme boundary', () => {
    assert.match(STATIC_CTA.intro, /まだ入口/);
    assert.match(STATIC_CTA.intro, /4章で読み返せる形に残します/);
    assert.match(STATIC_CTA.bundleNote, /いまの1テーマ/);
    assert.match(STATIC_CTA.bundleNote, /会話を続ける形式ではありません/);
    assert.match(TOP_FREE_ENTRY_PUBLIC_COPY.coreCta.introJa, /力が出やすい場面/);
  });
});
