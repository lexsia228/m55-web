import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  PAIR_SHARE_ENTRY_PATH,
  PAIR_SHARE_PAYLOAD_TEXT_JA,
  PAIR_SHARE_UI_COPY,
  buildPrivacySafePairSharePayload,
} from './privacySafePairShare';
import {
  compactExistingPhrase,
  PAIR_SIGNATURE_LABELS,
} from './pairResultSignatureCopy';
import {
  sharePayloadContainsSensitive,
} from '../freeResult/privacySafeShareCardV1';

const ROOT = join(import.meta.dirname, '../../..');
const read = (rel: string) => readFileSync(join(ROOT, rel), 'utf8');

describe('privacy-safe pair share', () => {
  it('shares only the canonical /synastry entry', () => {
    const payload = buildPrivacySafePairSharePayload('https://m-55.jp');
    assert.equal(payload.title, 'M55');
    assert.equal(payload.text, PAIR_SHARE_PAYLOAD_TEXT_JA);
    assert.equal(payload.url, 'https://m-55.jp/synastry');
    assert.equal(PAIR_SHARE_ENTRY_PATH, '/synastry');
    assert.equal(sharePayloadContainsSensitive(`${payload.title}\n${payload.text}\n${payload.url}`), false);
  });

  it('rejects query-bearing origins by constructing a clean path', () => {
    const payload = buildPrivacySafePairSharePayload('https://example.test');
    assert.equal(new URL(payload.url).pathname, '/synastry');
    assert.equal(new URL(payload.url).search, '');
    assert.equal(new URL(payload.url).hash, '');
  });

  it('copy never includes private result fields', () => {
    const blob = `${PAIR_SHARE_UI_COPY.titleJa}\n${PAIR_SHARE_UI_COPY.motivationJa}\n${PAIR_SHARE_UI_COPY.bodyJa}\n${PAIR_SHARE_PAYLOAD_TEXT_JA}`;
    assert.doesNotMatch(blob, /生年月日|1983|questionnaire|relationshipLoop|相手側は/);
    assert.match(blob, /二人読み解き/);
  });

  it('exposes a privacy-safe share motivation without pressure language', () => {
    assert.ok(PAIR_SHARE_UI_COPY.motivationJa.trim().length > 0);
    assert.match(PAIR_SHARE_UI_COPY.motivationJa, /一緒に見|話すきっかけ/);
    assert.doesNotMatch(
      PAIR_SHARE_UI_COPY.motivationJa,
      /今すぐ|相手に送|紹介|報酬|クリエイター|相性点数|%|運命/,
    );
  });
});

describe('pair signature copy compression', () => {
  it('keeps the first existing sentence and does not invent copy', () => {
    const source = '二人とも、意見が違うときも、まず受け取られたと分かると、話を続けやすいところが重なります。続きの文。';
    assert.equal(
      compactExistingPhrase(source),
      '二人とも、意見が違うときも、まず受け取られたと分かると、話を続けやすいところが重なります。',
    );
    assert.equal(PAIR_SIGNATURE_LABELS.you, 'あなた');
    assert.equal(PAIR_SIGNATURE_LABELS.partner, '相手');
  });
});

describe('pair free surface wiring', () => {
  it('mounts the signature and privacy-safe share on the guest result', () => {
    const guest = read('components/compatibility/CompatibilityGuestExperience.tsx');
    assert.match(guest, /PairResultSignature/);
    assert.match(guest, /PairFreeShareCTA/);
    const insightSpec = read('lib/m55/compatibility/pairFreeInsightSpecV2.ts');
    assert.doesNotMatch(insightSpec, /pairReadingFingerprint/);
    assert.match(guest, /result\.free\.overlap/);
    const manualAt = guest.indexOf('<PairManualBlock');
    const bridgeAt = guest.indexOf('この二人の続きとして読めること');
    const shareAt = guest.indexOf('<PairFreeShareCTA');
    assert.ok(manualAt > 0 && shareAt > manualAt, 'share must follow the manual block');
    assert.ok(shareAt > bridgeAt, 'narrative overlay places sanitized share after the paid teaser');
  });

  it('binds the normal publicSpec share branch to PAIR_SHARE_UI_COPY motivation', () => {
    const shareCta = read('components/compatibility/PairFreeShareCTA.tsx');
    const publicSpecBlock = shareCta.match(/if \(publicSpec\) \{([\s\S]*?)\n  \}\n\n  return/)?.[1] ?? '';
    assert.ok(publicSpecBlock.length > 0, 'publicSpec branch must exist');
    assert.match(publicSpecBlock, /copy\.titleJa/);
    assert.match(publicSpecBlock, /copy\.motivationJa/);
    assert.match(
      publicSpecBlock,
      /生年月日・回答・相手の身元は含まれません。公開前に内容を確認できます。/,
    );
    assert.doesNotMatch(publicSpecBlock, /二人の取扱説明書を共有する/);
    assert.match(publicSpecBlock, /NarrativeShareActions/);
    assert.match(publicSpecBlock, /PublicShareCardPreview/);
    assert.match(publicSpecBlock, /imageFirst/);
    assert.match(shareCta, /useState<ShareAspectRatio>\(previewAspectRatio \?\? '4:5'\)/);
    assert.match(shareCta, /showImageShapeOptions/);
    assert.match(shareCta, /copy\.imageShapeToggleJa/);
    assert.match(shareCta, /copy\.imageShapeLabelJa/);
    assert.match(shareCta, /labelKey: 'aspectSquareJa'/);
    assert.match(shareCta, /labelKey: 'aspectPortraitJa'/);
    assert.match(shareCta, /labelKey: 'aspectStoryJa'/);
    assert.match(shareCta, /badge: 'aspectPortraitRecommendedJa'/);
    assert.doesNotMatch(shareCta, /投稿サイズ/);
    assert.doesNotMatch(shareCta, /アスペクト比/);
    assert.match(shareCta, /m55-pair-share-aspect-\$\{option\.ratio\.replace\(':', '-'\)\}/);
  });

  it('uses image-first Pair share copy authority and action contract', () => {
    const share = read('lib/m55/compatibility/privacySafePairShare.ts');
    const actions = read('components/narrative/NarrativeShareActions.tsx');
    assert.match(share, /imageSharePrimaryJa: '画像で共有する'/);
    assert.match(share, /imageSaveJa: '画像を保存'/);
    assert.match(share, /linkShareJa: 'リンクで共有する'/);
    assert.match(share, /linkCopyJa: 'リンクをコピー'/);
    assert.match(share, /xLinkPostJa: 'Xにリンクで投稿'/);
    assert.match(share, /imageShapeToggleJa: '画像の形を変える'/);
    assert.match(share, /aspectSquareJa: '正方形'/);
    assert.match(share, /aspectPortraitJa: '縦長'/);
    assert.match(share, /aspectStoryJa: 'ストーリー向け'/);
    assert.match(actions, /imageFirst = false/);
    assert.match(actions, /probeImageFileShareAvailable/);
    assert.match(actions, /m55-share-image-primary/);
    assert.match(actions, /m55-share-link-native/);
    assert.match(actions, /pairCopy\.imageSharePrimaryJa/);
    assert.match(actions, /pairCopy\.xLinkPostJa/);
  });

  it('does not add scores, charts, or partner-mind claims', () => {
    const sig = read('components/compatibility/PairResultSignature.tsx');
    const share = read('lib/m55/compatibility/privacySafePairShare.ts');
    const blob = sig + share;
    assert.doesNotMatch(sig, /immediateAction|次に一度だけ試す/);
    assert.doesNotMatch(blob, /%|相性点数|zodiac|dashboard|node map|heart|ハート|運命/);
    assert.doesNotMatch(share, /personA|personB|overlap|difference|immediateAction/);
  });

  it('delegates Pair aspect hierarchy to the shared presentation authority', () => {
    const preview = read('components/narrative/PublicShareCardPreview.tsx');
    const exportRenderer = read('lib/m55/narrative/publicShareImageV1.tsx');
    assert.match(preview, /buildPairSharePresentationV1\(spec, aspectRatio\)/);
    assert.match(exportRenderer, /buildPairSharePresentationV1\(spec, aspect\)/);
    assert.match(preview, /m55-pair-share-header/);
    assert.match(preview, /m55-pair-share-relation/);
    assert.match(preview, /m55-pair-share-card-cta/);
  });
});

describe('pair trait hero continuity', () => {
  it('uses canonical pair trait resolver on guest result without local trait tables', () => {
    const guest = read('components/compatibility/CompatibilityGuestExperience.tsx');
    assert.match(guest, /resolvePairTraitIdentityV1/);
    assert.match(guest, /M55の資質の組み合わせ/);
    assert.match(guest, /data-testid="m55-pair-trait-hero"/);
    assert.match(guest, /data-testid="m55-pair-trait-label"/);
    assert.match(guest, /data-testid="m55-pair-trait-a"/);
    assert.match(guest, /data-testid="m55-pair-trait-b"/);
    assert.match(guest, /data-testid="m55-pair-edit-dob"/);
    assert.match(guest, /二人の生年月日を変更する/);
    assert.match(guest, /personA\.imagePath/);
    assert.doesNotMatch(guest, /traitNameMap|localTrait/);
  });

  it('passes canonical stem lanes into pair public share projection', () => {
    const guest = read('components/compatibility/CompatibilityGuestExperience.tsx');
    const shareCta = read('components/compatibility/PairFreeShareCTA.tsx');
    assert.match(guest, /personAStemLaneIndex=\{pairTraitIdentity\?\.personA\.stemLaneIndex\}/);
    assert.match(shareCta, /personAStemLaneIndex/);
    assert.match(shareCta, /projectPairPublicShareV1\(\{[\s\S]*personAStemLaneIndex/);
  });

  it('exposes SELF free-result DOB recovery through existing profile layer', () => {
    const core = read('components/core/CoreEssencePanel.tsx');
    assert.match(core, /data-testid="m55-free-result-edit-dob"/);
    assert.match(core, /handleRequestProfileEdit/);
    assert.match(core, /m55-core-profile-edit-layer/);
    assert.match(core, /生年月日を変更する/);
  });
});

describe('pair share trait preview', () => {
  it('renders dual canonical hero art and trait label in public share preview', () => {
    const preview = read('components/narrative/PublicShareCardPreview.tsx');
    const presentation = read('lib/m55/narrative/pairSharePresentationV1.ts');
    assert.match(presentation, /resolveTraitIdentity/);
    assert.match(presentation, /decodePublicShareToken/);
    assert.match(preview, /pairDualHeroBand/);
    assert.match(preview, /m55-pair-share-trait-label/);
    assert.match(preview, /pairPresentation\.heroPaths\[0\]/);
    assert.match(preview, /pairPresentation\.heroPaths\[1\]/);
  });
});
describe('pair premium ownership grammar', () => {
  it('applies night tone, visual roles, and A/B labels without commerce activation', () => {
    const reader = read('components/compatibility/PaidCompatibilityReportReader.tsx');
    const css = read('components/compatibility/PaidCompatibilityReportReader.module.css');
    assert.match(reader, /data-m55-pair-premium-tone="night"/);
    assert.match(reader, /data-visual-role="thesis"/);
    assert.match(reader, /data-visual-role="primaryRecognition"/);
    assert.match(reader, /data-visual-role="action"/);
    assert.match(reader, /data-visual-role="takeaway"/);
    assert.match(reader, /data-pair-side="you"/);
    assert.match(reader, /data-pair-side="partner"/);
    assert.match(reader, /aria-label="あなた側"/);
    assert.match(reader, /aria-label="相手側"/);
    assert.match(reader, /tone="night"/);
    assert.match(css, /#1a1628/);
    assert.match(css, /\.reader \[data-pair-side='partner'\][\s\S]*border-left: 2px dashed/);
    assert.doesNotMatch(reader, /M55_COMPATIBILITY_COMMERCE_ENABLED/);
    assert.doesNotMatch(reader, /checkout|webhook|stripe/i);
  });
});
