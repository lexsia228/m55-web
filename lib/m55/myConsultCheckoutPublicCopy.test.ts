import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import {
  LABEL_PRODUCT_EN,
  LABEL_PRODUCT_JP,
  LABEL_SAVED_REPORT_METADATA_JP,
  LABEL_SAVED_REPORT_MY_JP,
  MY_CONSULT_BODY_PRE_OWNED,
  MY_CONSULT_CTA_HREF,
  MY_CONSULT_CTA_LABEL,
  MY_CONSULT_SECTION_TITLE,
  MY_FIRST_TIME_CTA_HREF,
  MY_FIRST_TIME_CTA_LABEL,
  MY_FIRST_TIME_GUIDE_TITLE,
  MY_HELP_SECTION_TITLE,
  MY_PAGE_HERO_BODY,
  MY_PAGE_TITLE,
  MY_PROFILE_EDIT_CTA_LABEL,
  MY_SAVED_REPORT_CTA_OPEN_HREF,
  MY_SAVED_REPORT_CTA_OPEN_LABEL,
  MY_SAVED_REPORT_CTA_PLAN_HREF,
  MY_SAVED_REPORT_CTA_PLAN_LABEL,
  MY_SAVED_REPORT_EMPTY_NO_PROFILE,
  MY_SAVED_REPORT_EMPTY_READY,
  MY_SAVED_REPORT_INTRO_COMMON,
  MY_SAVED_REPORT_INTRO_OWNED,
  MY_SAVED_REPORT_LOADING,
  MY_SAVED_REPORT_SECTION_TITLE,
  MY_SERVICES_SECTION_TITLE,
  MY_SIGNED_OUT_HUB_BODY,
} from './dtrProductLabels';
import { displayLabelForDtrRightKey } from './myEntitlementLabels';
import { DTR_PRODUCT_CATALOG } from './dtrProductCatalog';
import {
  PAID_DTR_MY_PAGE_CONSULT,
  PAID_DTR_CONSULT_USAGE_DISPLAY,
} from './paidDtrProductCopy';

const ROOT = join(import.meta.dirname, '..', '..');

function readRepo(rel: string): string {
  return readFileSync(join(ROOT, rel), 'utf8');
}

function extractMyPanelFunctionBlock(source: string, fnName: string): string {
  const start = source.indexOf(`function ${fnName}`);
  if (start < 0) return '';
  const rest = source.slice(start);
  const nextFn = rest.slice('function '.length).search(/\nfunction /);
  return nextFn < 0 ? rest : rest.slice(0, nextFn + 'function '.length);
}

function extractProfileBranch(profileBlock: string): string {
  const marker = "if (mode === 'editing')";
  const start = profileBlock.indexOf(marker);
  if (start < 0) return '';
  return profileBlock.slice(start);
}

const SHELL_LAYOUT_SOURCE = readRepo('components/shell/ShellLayout.tsx');
const MY_PANEL_SOURCE = readRepo('components/my/MyPanel.tsx');
const POST_PURCHASE_SOURCE = readRepo('lib/m55/postPurchaseRetentionHub.ts');
const DTR_CATALOG_SOURCE = readRepo('components/dtr/DtrCatalogStrip.tsx');
const FIRST_TIME_BLOCK = extractMyPanelFunctionBlock(MY_PANEL_SOURCE, 'FirstTimeGuideSection');
const PROFILE_SECTION_BLOCK = extractMyPanelFunctionBlock(MY_PANEL_SOURCE, 'ProfileSection');
const EDITING_PROFILE_BRANCH = extractProfileBranch(PROFILE_SECTION_BLOCK);
const SIGNED_IN_BLOCK = MY_PANEL_SOURCE.slice(
  MY_PANEL_SOURCE.indexOf('<SignedIn>'),
  MY_PANEL_SOURCE.indexOf('</SignedIn>')
);

const CONSULT_ENTRY_SURFACES = [
  'components/dtr/ConsultRoom.tsx',
  'components/dtr/ConsultReplyCard.tsx',
  'components/reply/consultation-ticket-wallet.tsx',
].map(readRepo).join('\n');

function publicCatalogCopyBlob(): string {
  return DTR_PRODUCT_CATALOG.flatMap((slot) => [slot.title, slot.subtitle]).join('\n');
}

describe('myConsultCheckoutPublicCopy — LOCAL wave regression', () => {
  it('My public copy uses saved-report terms (not 本質の読み解き / Entry Report)', () => {
    assert.equal(displayLabelForDtrRightKey('m55_p:core_origin'), LABEL_SAVED_REPORT_MY_JP);
    assert.equal(DTR_PRODUCT_CATALOG[0]?.title, LABEL_SAVED_REPORT_MY_JP);
    assert.equal(PAID_DTR_MY_PAGE_CONSULT.capSummaryJa.includes('合計5'), false);
    assert.equal(PAID_DTR_MY_PAGE_CONSULT.capSummaryJa.includes('付属1'), false);
    assert.equal(MY_PANEL_SOURCE.includes(LABEL_PRODUCT_JP), false);
    assert.equal(MY_PANEL_SOURCE.includes(LABEL_PRODUCT_EN), false);
    assert.equal(MY_PANEL_SOURCE.includes('マイハブ'), false);
  });

  it('shows Light or FULL only through the actual purchased tier model', () => {
    assert.match(POST_PURCHASE_SOURCE, /plan === 'full' \? 'M55 プレミアムレポート フル'/);
    assert.match(POST_PURCHASE_SOURCE, /plan === 'light' \? 'M55 プレミアムレポート ライト'/);
    assert.match(MY_PANEL_SOURCE, /purchasedHub\.planLabel/);
    assert.equal(CONSULT_ENTRY_SURFACES.includes('M55 プレミアムレポート ライト'), false);
    assert.equal(CONSULT_ENTRY_SURFACES.includes('M55 プレミアムレポート フル'), false);
  });

  it('processing eyebrow and core metadata use 4章のプレミアムレポート', () => {
    assert.equal(LABEL_SAVED_REPORT_METADATA_JP, '4章のプレミアムレポート');
    const processing = readRepo('app/dtr/processing/page.tsx');
    const corePage = readRepo('app/dtr/core/page.tsx');
    assert.match(processing, /LABEL_SAVED_REPORT_METADATA_JP/);
    assert.equal(processing.includes('LABEL_PRODUCT_JP'), false);
    assert.match(corePage, /LABEL_SAVED_REPORT_METADATA_JP/);
  });

  it('removes legacy ¥500 sales UI from consult entry surfaces', () => {
    for (const term of ['500円', '追加読み解き 1件 500円', 'additionalPriceLabelJa']) {
      assert.equal(CONSULT_ENTRY_SURFACES.includes(term), false, `forbidden: ${term}`);
    }
  });

  it('removes additional_reply_ticket active checkout from consult entry surfaces', () => {
    assert.equal(CONSULT_ENTRY_SURFACES.includes('/api/reply-tickets/checkout'), false);
    assert.equal(CONSULT_ENTRY_SURFACES.includes("productKey: 'additional_reply_ticket'"), false);
    assert.equal(CONSULT_ENTRY_SURFACES.includes('additional_reply_ticket'), false);
    assert.equal(CONSULT_ENTRY_SURFACES.includes('handlePurchase'), false);
    assert.equal(CONSULT_ENTRY_SURFACES.includes('onPurchase'), false);
  });

  it('removes fixed legacy cap model copy from consult UI', () => {
    for (const term of ['合計5件', '付属1件', '追加最大4', 'あと購入できる']) {
      assert.equal(CONSULT_ENTRY_SURFACES.includes(term), false, `forbidden cap copy: ${term}`);
    }
    assert.equal(PAID_DTR_CONSULT_USAGE_DISPLAY.usedCountTemplateJa.includes('/'), false);
  });

  it('does not modify Paid LP or PurchaseButton', () => {
    const lp = readRepo('app/dtr/lp/page.tsx');
    const purchaseBtn = readRepo('components/PurchaseButton.tsx');
    assert.match(lp, /LpPricingTiers|DTR_CORE_FULL_V1/);
    assert.match(purchaseBtn, /api\/purchase\/checkout/);
  });
});

describe('myConsultCheckoutPublicCopy — My public catalog (PATCH-1)', () => {
  it('includes プレミアムレポート and keeps 相性レポート without add-on consult slot', () => {
    const catalog = publicCatalogCopyBlob();
    assert.match(catalog, /プレミアムレポート/);
    assert.equal(DTR_PRODUCT_CATALOG.some((slot) => slot.id === 'entry_report'), true);
    assert.equal(DTR_PRODUCT_CATALOG.some((slot) => slot.id === 'compatibility_report'), true);
    assert.equal(DTR_PRODUCT_CATALOG.length, 2);
  });

  it('omits add-on consult product labels from public catalog copy', () => {
    const catalog = publicCatalogCopyBlob();
    assert.equal(catalog.includes('追加相談枠'), false);
    assert.equal(catalog.includes('追加読み解き 1件 500円'), false);
    assert.equal(catalog.includes('レポートに沿った深掘り相談'), false);
  });

  it('omits legacy price and checkout keys from public catalog copy', () => {
    const catalog = publicCatalogCopyBlob();
    assert.equal(catalog.includes('500円'), false);
    assert.equal(catalog.includes('¥500'), false);
    assert.equal(catalog.includes('additional_reply_ticket'), false);
  });
});

describe('myConsultCheckoutPublicCopy — My first-time guide (PATCH-2)', () => {
  it('shows /home guide for no_profile without intake form fields', () => {
    assert.match(MY_PANEL_SOURCE, /MY_FIRST_TIME_GUIDE_TITLE/);
    assert.match(MY_PANEL_SOURCE, /MY_FIRST_TIME_CTA_LABEL/);
    assert.match(FIRST_TIME_BLOCK, /MY_FIRST_TIME_GUIDE_TITLE/);
    assert.match(FIRST_TIME_BLOCK, /MY_FIRST_TIME_CTA_LABEL/);
    assert.match(FIRST_TIME_BLOCK, /MY_FIRST_TIME_CTA_HREF/);
    assert.equal(FIRST_TIME_BLOCK.includes('mp-nick'), false);
    assert.equal(FIRST_TIME_BLOCK.includes('mp-birth'), false);
    assert.equal(FIRST_TIME_BLOCK.includes('mp-birth-time'), false);
    assert.equal(FIRST_TIME_BLOCK.includes('出生時刻は不明'), false);
    assert.equal(FIRST_TIME_BLOCK.includes('mp-country'), false);
    assert.equal(FIRST_TIME_BLOCK.includes('mp-birthplace'), false);
    assert.equal(FIRST_TIME_BLOCK.includes('保存する'), false);
    assert.equal(FIRST_TIME_BLOCK.includes('data-testid="m55-my-profile-intake"'), false);
  });

  it('keeps profile edit form only in editing branch', () => {
    assert.match(EDITING_PROFILE_BRANCH, /mp-nick/);
    assert.match(EDITING_PROFILE_BRANCH, /mp-birth/);
    assert.match(EDITING_PROFILE_BRANCH, /保存する/);
    assert.equal(EDITING_PROFILE_BRANCH.includes('はじめて使う方へ'), false);
    assert.equal(EDITING_PROFILE_BRANCH.includes('mp-birth-time'), false);
    assert.equal(EDITING_PROFILE_BRANCH.includes('mp-country'), false);
    assert.equal(EDITING_PROFILE_BRANCH.includes('mp-birthplace'), false);
    assert.equal(EDITING_PROFILE_BRANCH.includes('出生時刻は不明'), false);
  });

  it('uses formal /home href from dtrProductLabels', () => {
    assert.equal(MY_FIRST_TIME_CTA_HREF, '/home');
    assert.match(FIRST_TIME_BLOCK, /href=\{MY_FIRST_TIME_CTA_HREF\}/);
  });

  it('does not reintroduce add-on consult catalog or legacy sales copy on My', () => {
    assert.equal(SIGNED_IN_BLOCK.includes('追加相談枠'), false);
    assert.equal(SIGNED_IN_BLOCK.includes('追加相談返書'), false);
    assert.equal(SIGNED_IN_BLOCK.includes('500円'), false);
    assert.equal(SIGNED_IN_BLOCK.includes('¥500'), false);
    assert.match(SIGNED_IN_BLOCK, /DtrCatalogStrip/);
    assert.match(SIGNED_IN_BLOCK, /ConsultSection/);
    assert.match(extractMyPanelFunctionBlock(MY_PANEL_SOURCE, 'ConsultSection'), /MY_CONSULT_SECTION_TITLE/);
  });
});

describe('myConsultCheckoutPublicCopy — ShellLayout SoulBirthGate boundary (PATCH-3)', () => {
  it('excludes /my from SoulBirthGate mount while keeping /home and /core guards', () => {
    assert.match(SHELL_LAYOUT_SOURCE, /shouldRenderSoulBirthGate/);
    assert.match(
      SHELL_LAYOUT_SOURCE,
      /pathname\s*!==\s*['"]\/home['"][\s\S]*pathname\s*!==\s*['"]\/my['"][\s\S]*!isCoreRoute/,
    );
    assert.match(SHELL_LAYOUT_SOURCE, /\{shouldRenderSoulBirthGate\s*&&\s*<SoulBirthGate\s*\/>\}/);
    assert.equal(
      SHELL_LAYOUT_SOURCE.includes("pathname !== '/home' && !isCoreRoute && <SoulBirthGate />"),
      false,
      'legacy inline condition must not remain',
    );
    assert.match(SHELL_LAYOUT_SOURCE, /import \{ SoulBirthGate \}/);
  });

  it('keeps MyPanel no_profile guide and ready/editing branches after ShellLayout boundary', () => {
    assert.match(MY_PANEL_SOURCE, /MY_FIRST_TIME_GUIDE_TITLE/);
    assert.match(MY_PANEL_SOURCE, /MY_FIRST_TIME_CTA_LABEL/);
    assert.match(FIRST_TIME_BLOCK, /MY_FIRST_TIME_CTA_HREF/);
    assert.equal(MY_FIRST_TIME_CTA_HREF, '/home');
    assert.match(EDITING_PROFILE_BRANCH, /mp-nick/);
    assert.match(EDITING_PROFILE_BRANCH, /mp-birth/);
    assert.match(EDITING_PROFILE_BRANCH, /保存する/);
    assert.match(PROFILE_SECTION_BLOCK, /ProfileRepository\.saveMyProfileBasics/);
    assert.equal(PROFILE_SECTION_BLOCK.includes('mp-birth-time'), false);
    assert.equal(PROFILE_SECTION_BLOCK.includes('mp-country'), false);
    assert.equal(PROFILE_SECTION_BLOCK.includes('mp-birthplace'), false);
  });
});

describe('myConsultCheckoutPublicCopy — My IA SSOT (Revision-4)', () => {
  it('uses formal page title and hero copy', () => {
    assert.equal(MY_PAGE_TITLE, 'マイページ');
    assert.match(MY_PANEL_SOURCE, /MY_PAGE_TITLE/);
    assert.match(MY_PANEL_SOURCE, /MY_PAGE_HERO_BODY/);
    assert.equal(MY_PAGE_HERO_BODY.includes('登録済みのプロフィール'), true);
    assert.equal(MY_PANEL_SOURCE.includes('レポートを再開し、次の一歩を選べます'), false);
    assert.equal(MY_PANEL_SOURCE.includes('quickNav'), false);
  });

  it('uses SignedOut body and shared help section', () => {
    assert.equal(MY_SIGNED_OUT_HUB_BODY.includes('プレミアムレポートや利用状況'), true);
    assert.match(MY_PANEL_SOURCE, /MY_SIGNED_OUT_HUB_BODY/);
    assert.match(MY_PANEL_SOURCE, /MY_HELP_SECTION_TITLE/);
    assert.equal(MY_PANEL_SOURCE.includes('購入の明細・領収'), false);
    assert.equal(MY_PANEL_SOURCE.includes('保存の目安'), false);
    assert.equal(SIGNED_IN_BLOCK.includes('retention_days'), false);
  });

  it('uses formal section titles and saved-report copy constants', () => {
    assert.equal(MY_SAVED_REPORT_SECTION_TITLE, 'あなたのプレミアムレポート');
    assert.equal(MY_SERVICES_SECTION_TITLE, 'サービス一覧');
    assert.equal(MY_CONSULT_SECTION_TITLE, '追加読み解き');
    assert.match(MY_PANEL_SOURCE, /MY_SAVED_REPORT_SECTION_TITLE/);
    assert.match(MY_PANEL_SOURCE, /MY_SERVICES_SECTION_TITLE/);
    assert.match(MY_PANEL_SOURCE, /MY_SAVED_REPORT_INTRO_COMMON/);
    assert.match(MY_PANEL_SOURCE, /MY_SAVED_REPORT_LOADING/);
    assert.equal(MY_PANEL_SOURCE.includes('あなたのレポート'), false);
    assert.equal(MY_PANEL_SOURCE.includes('レポートとサービス'), false);
  });

  it('gates services and consult sections on entReady', () => {
    assert.match(SIGNED_IN_BLOCK, /\{entReady &&/);
    assert.match(SIGNED_IN_BLOCK, /ConsultSection ownedReady/);
    assert.match(SIGNED_IN_BLOCK, /profileState === 'no_profile' && entReady/);
    assert.match(SIGNED_IN_BLOCK, /profileState === 'ready' \|\| hasEditableMyProfile\(user\.id\)/);
  });

  it('limits primary CTAs by state in SavedReportSection and ConsultSection', () => {
    const savedBlock = extractMyPanelFunctionBlock(MY_PANEL_SOURCE, 'SavedReportSection');
    const consultBlock = extractMyPanelFunctionBlock(MY_PANEL_SOURCE, 'ConsultSection');
    assert.match(savedBlock, /MY_SAVED_REPORT_CTA_PLAN_HREF/);
    assert.match(savedBlock, /MY_SAVED_REPORT_CTA_OPEN_HREF/);
    assert.match(consultBlock, /ownedReady \?/);
    assert.match(consultBlock, /MY_CONSULT_CTA_HREF/);
    assert.equal(MY_SAVED_REPORT_CTA_PLAN_HREF, '/dtr/lp');
    assert.equal(MY_SAVED_REPORT_CTA_OPEN_HREF, '/dtr/core');
    assert.equal(MY_SAVED_REPORT_CTA_PLAN_LABEL, 'プレミアムレポートのプランを見る');
    assert.equal(MY_SAVED_REPORT_CTA_OPEN_LABEL, 'プレミアムレポートを読み返す');
    assert.equal(MY_CONSULT_CTA_LABEL, '追加読み解きを始める');
    assert.equal(MY_CONSULT_CTA_HREF, '/dtr/core#consultation-room');
  });

  it('shows owned intro and notes only in owned_ready branch', () => {
    const savedBlock = extractMyPanelFunctionBlock(MY_PANEL_SOURCE, 'SavedReportSection');
    assert.match(savedBlock, /state === 'owned_ready'/);
    assert.match(savedBlock, /MY_SAVED_REPORT_INTRO_OWNED/);
    assert.match(savedBlock, /MY_SAVED_REPORT_OWNED_NOTE_P1/);
    assert.equal(MY_SAVED_REPORT_INTRO_OWNED.includes('ここから開けます'), true);
    assert.equal(MY_SAVED_REPORT_INTRO_COMMON, 'プレミアムレポートの状態をここで確認できます。');
  });

  it('uses 2-state consult copy without legacy paragraphs', () => {
    assert.match(MY_PANEL_SOURCE, /MY_CONSULT_BODY_PRE_OWNED/);
    assert.match(MY_PANEL_SOURCE, /MY_CONSULT_BODY_OWNED_P1/);
    assert.match(MY_PANEL_SOURCE, /MY_CONSULT_BODY_OWNED_P2/);
    assert.equal(MY_PANEL_SOURCE.includes('PAID_DTR_TRUST_BOUNDARIES'), false);
    assert.equal(MY_PANEL_SOURCE.includes('walletFactNoteJa'), false);
    assert.equal(MY_PANEL_SOURCE.includes('remainingNoteJa'), false);
    assert.equal(MY_PANEL_SOURCE.includes('reopenNoteJa'), false);
    assert.equal(MY_CONSULT_BODY_PRE_OWNED.includes('プレミアムレポートに紐づく'), true);
  });

  it('removes P0 forbidden UI from SignedIn block', () => {
    assert.equal(SIGNED_IN_BLOCK.includes('マイハブ'), false);
    assert.equal(SIGNED_IN_BLOCK.includes('quickNav'), false);
    assert.equal(SIGNED_IN_BLOCK.includes('レポート一覧'), false);
    assert.equal(SIGNED_IN_BLOCK.includes('商品の説明'), false);
    assert.equal(SIGNED_IN_BLOCK.includes('保存の目安'), false);
    assert.equal(SIGNED_IN_BLOCK.includes('追加相談返書'), false);
    assert.equal(SIGNED_IN_BLOCK.includes('プレミアムレポートを開いて、続きから確認する'), false);
    assert.equal(SIGNED_IN_BLOCK.includes('プレミアムレポートの説明を確認'), false);
  });

  it('My catalog variant removes active CTAs', () => {
    assert.match(DTR_CATALOG_SOURCE, /const subtitle = isMy \? LABEL_SAVED_REPORT_METADATA_JP/);
    const myOnlyBlock = DTR_CATALOG_SOURCE.slice(
      DTR_CATALOG_SOURCE.indexOf('if (isMy) {'),
      DTR_CATALOG_SOURCE.indexOf('if (owned && canOpen) {')
    );
    assert.equal(myOnlyBlock.includes('ctaBuy'), false);
    assert.equal(myOnlyBlock.includes('ctaOpen'), false);
    assert.equal(myOnlyBlock.includes('rowFooter'), false);
    assert.match(myOnlyBlock, /LABEL_STATE_OWNED/);
    assert.match(myOnlyBlock, /MY_BADGE_NOT_PURCHASED/);
  });

  it('uses state-specific empty copy constants', () => {
    assert.equal(MY_SAVED_REPORT_EMPTY_NO_PROFILE.includes('無料の見取り図'), true);
    assert.equal(MY_SAVED_REPORT_EMPTY_READY.includes('商品ページ'), true);
    assert.match(MY_PANEL_SOURCE, /MY_SAVED_REPORT_EMPTY_NO_PROFILE/);
    assert.match(MY_PANEL_SOURCE, /MY_SAVED_REPORT_EMPTY_READY/);
    assert.match(MY_PANEL_SOURCE, /MY_SAVED_REPORT_PROCESSING/);
  });

  it('uses profile edit CTA label from SSOT', () => {
    assert.equal(MY_PROFILE_EDIT_CTA_LABEL, 'プロフィールを編集する');
    assert.match(PROFILE_SECTION_BLOCK, /MY_PROFILE_EDIT_CTA_LABEL/);
  });

  it('applies Visual SSOT tokens in MyPanel CSS', () => {
    const css = readRepo('components/my/MyPanel.module.css');
    assert.match(css, /max-width:\s*min\(760px, calc\(100vw - 24px\)\)/);
    assert.match(css, /clamp\(16px, 4vw, 32px\)/);
    assert.match(css, /rgba\(255, 255, 255, 0\.55\)/);
    assert.match(css, /rgba\(107, 95, 168, 0\.13\)/);
    assert.match(css, /0 18px 60px rgba\(29, 24, 61, 0\.045\)/);
    assert.match(css, /min-height:\s*44px/);
    assert.match(css, /outline:\s*2px solid rgba\(104, 84, 182, 0\.9\)/);
  });
});
