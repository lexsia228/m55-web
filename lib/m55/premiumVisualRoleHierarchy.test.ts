import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

const ROOT = process.cwd();
const read = (rel: string) => readFileSync(join(ROOT, rel), 'utf8');

describe('premium visual role hierarchy', () => {
  it('declares shared visual-role primitives without a new palette', () => {
    const css = read('components/dtr/DtrFullReader.module.css');
    assert.match(css, /\.roleThesis/);
    assert.match(css, /\.rolePrimaryRecognition/);
    assert.match(css, /\.roleTakeaway/);
    assert.match(css, /\.roleAction/);
    assert.doesNotMatch(css, /rainbow|#ff00ff|gold\s*fortune/i);
  });

  it('makes chapter II 4-cell conditions primary and TraitInteraction secondary', () => {
    const src = read('components/dtr/DtrFullReader.tsx');
    assert.match(src, /role="primaryRecognition"/);
    assert.match(src, /ch2-stability-panel/);
    assert.match(src, /density="secondary"/);
    assert.match(src, /TraitInteractionModule/);
    assert.match(src, /c\.key === 'gd' \? 'action'/);
    assert.match(src, /c\.key === 'cl' \? 'risk'/);
  });

  it('makes chapter IV recovery the primary visual before today\'s action', () => {
    const src = read('components/dtr/DtrFullReader.tsx');
    const ch4 = src.slice(src.indexOf("case 'chapter-4'"));
    const recoveryAt = ch4.indexOf('lifeTopicRecovery');
    const actionAt = ch4.indexOf('lifeTopicGuidance');
    assert.ok(recoveryAt > 0 && actionAt > 0);
    assert.ok(recoveryAt < actionAt, 'recovery flow must precede practical action');
    assert.match(ch4, /role="primaryRecognition"/);
    assert.match(ch4, /role="action"/);
    assert.equal(ch4.includes('n={4}'), false);
  });

  it('keeps chapter III CommFlow and header-only friction cards', () => {
    const src = read('components/dtr/DtrFullReader.tsx');
    assert.match(src, /role="risk"/);
    assert.match(src, /FrictionWarningFigures/);
    assert.match(src, /role="recognition"/);
    assert.match(src, /CommFlowFigures/);
  });
});

describe('premium additional-reading hierarchy', () => {
  it('uses wizard progress as the single Step n / 3 authority', () => {
    const src = read('components/dtr/ConsultRoom.tsx');
    assert.equal((src.match(/Step \{step\.n\} \/ 3/g) ?? []).length, 1);
    assert.equal(src.includes('stepEyebrow'), false);
  });

  it('renders the report-mastery theme as a tertiary help option', () => {
    const src = read('components/dtr/ConsultRoom.tsx');
    assert.match(src, /themeId !== 'report'/);
    assert.match(src, /choiceMetaGroup/);
    assert.match(src, /themeId === 'report'/);
    const css = read('components/dtr/ConsultRoom.module.css');
    assert.match(css, /\.choiceCardMeta/);
  });
});

describe('premium pair continuation is night-family on the owned report', () => {
  it('passes night tone only on the paid reader page', () => {
    const page = read('app/dtr/core/page.tsx');
    assert.match(page, /<CorePairReadingCrossSell tone="night" \/>/);
    const free = read('components/core/CoreEssencePanel.tsx');
    assert.match(free, /<CorePairReadingCrossSell \/>/);
    assert.equal(free.includes('tone="night"'), false);
  });

  it('does not sell paid compatibility from the personal report continuation', () => {
    const component = read('components/core/CorePairReadingCrossSell.tsx');
    assert.match(component, /pairReadingHref/);
    assert.doesNotMatch(component, /purchase|checkout|¥|1,480/);
    const css = read('components/core/CoreExperience.module.css');
    assert.match(css, /\.pairCrossSellNight/);
    assert.match(css, /background-color:\s*#1a1628/);
    const nightBlock = css.slice(css.indexOf('.pairCrossSellNight {'));
    assert.match(nightBlock, /#1a1628/);
    assert.doesNotMatch(nightBlock.slice(0, 500), /rgba\(255,\s*255,\s*255,\s*0\.6\)/);
  });
});

describe('premium chrome label floor', () => {
  it('keeps commercial hero/drawer labels at 11px or above', () => {
    const css = read('components/dtr/DtrFullReader.module.css');
    const hub = read('components/dtr/PremiumDrawerHub.module.css');
    const prefix = css.slice(css.indexOf('.heroBlueprintPrefix {'), css.indexOf('.heroBlueprintPrefix {') + 280);
    const step = css.slice(css.indexOf('.premiumIntroPanelStep {'), css.indexOf('.premiumIntroPanelStep {') + 220);
    const overline = hub.slice(hub.indexOf('.drawerHubOverline {'), hub.indexOf('.drawerHubOverline {') + 420);
    assert.match(prefix, /max\(11px, var\(--dtr-label-floor\)\)/);
    assert.match(step, /max\(11px, var\(--dtr-label-floor\)\)/);
    assert.match(overline, /font-size: 11px/);
    assert.doesNotMatch(overline, /font-size: 9px/);
    assert.doesNotMatch(step, /0\.56rem/);
  });
});
