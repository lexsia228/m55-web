import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  PAID_DTR_CHAPTERS,
  PAID_DTR_CONSULT_GROUNDING_COPY,
  PAID_DTR_CONSULT_REPLY,
  PAID_DTR_CONSULT_ROOM_UI,
  PAID_DTR_CONSULT_USAGE_DISPLAY,
  PAID_DTR_LEGACY_ADDITIONAL_REPLY_TICKET,
  PAID_DTR_SAVED_REPORT_PRICING,
  PAID_DTR_SHELF_CONSULT_META,
  formatConsultPurchaseAddOnLine,
  formatConsultAvailableCountLine,
  formatConsultAvailableWithGrantedLine,
  formatConsultUsedCountLine,
  PAID_DTR_MY_PAGE_CONSULT,
  PAID_DTR_PRODUCT_IDENTITY,
  PAID_DTR_VALUE_PROPOSITION,
  collectPaidDtrPublicCopyStrings,
} from './paidDtrProductCopy';
import {
  hasValidConsultWalletDenominator,
  isConsultWalletDisplaySnapshotUsable,
} from './reply/consultWalletDisplaySnapshot';

describe('paidDtrProductCopy SSOT', () => {
  it('uses 4 chapters as current product truth', () => {
    assert.equal(PAID_DTR_CHAPTERS.length, 4);
    assert.deepEqual(
      PAID_DTR_CHAPTERS.map((c) => c.title),
      ['輪郭を見る', '構造を読む', '無理を知る', '楽に扱う']
    );
  });

  it('uses reply cap 5 and FULL wallet model (1+4)', () => {
    assert.equal(PAID_DTR_CONSULT_REPLY.includedCount, 1);
    assert.equal(PAID_DTR_CONSULT_REPLY.additionalMaxPurchased, 4);
    assert.equal(PAID_DTR_CONSULT_REPLY.totalCapPerReport, 5);
    assert.equal(PAID_DTR_SAVED_REPORT_PRICING.full.initialIncludedCount, 1);
    assert.equal(PAID_DTR_SAVED_REPORT_PRICING.full.initialPurchasedGrant, 4);
  });

  it('defines light / FULL / upgrade pricing tiers (primary SSOT)', () => {
    assert.equal(PAID_DTR_SAVED_REPORT_PRICING.light.priceYen, 1000);
    assert.equal(PAID_DTR_SAVED_REPORT_PRICING.full.priceYen, 1480);
    assert.equal(PAID_DTR_SAVED_REPORT_PRICING.full.recommended, true);
    assert.equal(PAID_DTR_SAVED_REPORT_PRICING.lightToFullUpgrade.priceYen, 600);
    assert.equal(PAID_DTR_CONSULT_REPLY.upgradeToFullPriceYen, 600);
    assert.match(PAID_DTR_CONSULT_REPLY.upgradeToFullPriceLabelJa, /後からFULL化/);
    assert.match(PAID_DTR_SAVED_REPORT_PRICING.light.audienceJa, /保存版を読/);
    assert.match(PAID_DTR_SAVED_REPORT_PRICING.full.audienceJa, /返書で複数回/);
    assert.equal(PAID_DTR_SAVED_REPORT_PRICING.light.includedReplyCount, 1);
    assert.equal(PAID_DTR_SAVED_REPORT_PRICING.full.totalReplyCap, 5);
    assert.match(
      PAID_DTR_SAVED_REPORT_PRICING.lightToFullUpgrade.descriptionJa,
      /追加1件売りではありません/
    );
  });

  it('keeps legacy ¥500 additional ticket constants for in-flight webhook safety', () => {
    assert.equal(PAID_DTR_LEGACY_ADDITIONAL_REPLY_TICKET.priceYen, 500);
    assert.equal(PAID_DTR_LEGACY_ADDITIONAL_REPLY_TICKET.newSalesStopped, true);
    assert.equal(PAID_DTR_LEGACY_ADDITIONAL_REPLY_TICKET.productKey, 'additional_reply_ticket');
    assert.equal(PAID_DTR_CONSULT_REPLY.legacyAdditionalPriceYen, 500);
    assert.equal(PAID_DTR_CONSULT_REPLY.additionalPriceYen, 500);
    assert.match(PAID_DTR_CONSULT_REPLY.legacyAdditionalPriceLabelJa, /500円/);
  });

  it('primary upgrade SSOT is ¥600 not ¥500', () => {
    assert.notEqual(PAID_DTR_CONSULT_REPLY.upgradeToFullPriceYen, 500);
    assert.equal(PAID_DTR_CONSULT_REPLY.upgradeToFullPriceYen, 600);
  });

  it('uses Japanese primary product identity', () => {
    assert.equal(PAID_DTR_PRODUCT_IDENTITY.primaryNameJa, '保存版');
    assert.equal(PAID_DTR_PRODUCT_IDENTITY.formatLabel, '保存版');
    assert.equal(PAID_DTR_PRODUCT_IDENTITY.consultPrimaryTermJa, '相談返書');
  });

  it('primary value proposition avoids obsolete product truth and notification promises', () => {
    const primary = [
      PAID_DTR_VALUE_PROPOSITION.oneSentenceJa,
      PAID_DTR_VALUE_PROPOSITION.leadParagraphJa,
      PAID_DTR_PRODUCT_IDENTITY.primaryNameJa,
      PAID_DTR_PRODUCT_IDENTITY.shortNameJa,
    ].join('\n');

    const forbiddenInPrimary = [
      '8章',
      '８章',
      'max3',
      'max 3',
      '700円',
      '¥700',
      'Premium',
      'Blueprint',
      '準備完了メール',
      '返書完了メール',
    ] as const;

    for (const term of forbiddenInPrimary) {
      assert.equal(
        primary.includes(term),
        false,
        `primary copy must not include obsolete/forbidden term: ${term}`
      );
    }

    assert.equal(primary.includes('Entry Report'), false);
  });

  it('public copy corpus omits M55 email notification promises', () => {
    const corpus = collectPaidDtrPublicCopyStrings().join('\n');
    assert.equal(corpus.includes('準備完了メール'), false);
    assert.equal(corpus.includes('返書完了メール'), false);
    assert.equal(corpus.includes('プッシュ通知'), false);
  });

  it('consult room and My copy state saved-report-linked boundary', () => {
    const boundary = [
      PAID_DTR_CONSULT_REPLY.savedReportLinkedShortJa,
      PAID_DTR_CONSULT_ROOM_UI.roomLeadJa,
      PAID_DTR_MY_PAGE_CONSULT.linkedScopeJa,
    ].join('\n');
    assert.match(boundary, /保存版に紐づく相談/);
    assert.match(boundary, /汎用チャットではなく/);
    assert.match(boundary, /無制限/);
  });

  it('consult theme chips align with drawer chapter labels and Chapter I base note', () => {
    assert.deepEqual(PAID_DTR_CONSULT_REPLY.themeExamplesJa, [
      '仕事・これからの進め方',
      'これからの動き方',
      '恋人・近い人との向き合い方',
      'お金・生活・疲れの整え方',
      '疲れたときの戻り方',
    ]);
    assert.match(PAID_DTR_CONSULT_ROOM_UI.step1ChapterBaseLensNoteJa, /Ⅰ「自分の形を知る」/);
    assert.equal(PAID_DTR_CONSULT_REPLY.themeExamplesJa.includes('仕事・スキルの伸ばし方'), false);
    assert.equal(PAID_DTR_CONSULT_REPLY.themeExamplesJa.includes('お金・生活の整え方'), false);
  });

  it('consult history collapse copy uses count template and avoids forbidden labels', () => {
    const history = [
      PAID_DTR_CONSULT_ROOM_UI.historyCountTemplateJa,
      PAID_DTR_CONSULT_ROOM_UI.historyShowAllJa,
      PAID_DTR_CONSULT_ROOM_UI.historyShowMoreTemplateJa,
      PAID_DTR_CONSULT_ROOM_UI.openToReadJa,
      PAID_DTR_CONSULT_ROOM_UI.latestReplyBadgeJa,
    ].join('\n');
    assert.match(history, /\{count\}件の相談返書があります/);
    assert.match(history, /すべて見る/);
    assert.match(history, /開いて読む/);
    assert.equal(history.includes('ルーム'), false);
    assert.equal(history.includes('チャット'), false);
    assert.equal(history.includes('やりとり'), false);
    assert.equal(history.includes('会話履歴'), false);
  });

  it('consult UI copy avoids room wording in user-facing strings', () => {
    const consultUi = [
      PAID_DTR_CONSULT_ROOM_UI.roomTitleJa,
      PAID_DTR_CONSULT_ROOM_UI.ariaLabelJa,
      PAID_DTR_CONSULT_GROUNDING_COPY.titleLine2Ja,
      PAID_DTR_MY_PAGE_CONSULT.openRoomLinkJa,
      ...Object.values(PAID_DTR_CONSULT_ROOM_UI),
    ].join('\n');
    assert.equal(consultUi.includes('相談返書ルーム'), false);
    assert.equal(consultUi.includes('返書ルーム'), false);
    assert.match(consultUi, /相談返書の入口/);
  });

  it('consult usage display copy prioritizes add-on over giant remaining-zero hero', () => {
    assert.equal(
      formatConsultPurchaseAddOnLine(4),
      '保存版に紐づく相談返書を、あと4件まで追加できます。'
    );
    assert.equal(formatConsultUsedCountLine(1, 5), '使用済み：1 / 5件');
    const usage = Object.values(PAID_DTR_CONSULT_USAGE_DISPLAY).join('\n');
    assert.match(usage, /相談返書を使って、1テーマだけ整理できます/);
    assert.equal(usage.includes('相談返書を1件使えます'), false);
    assert.match(usage, /今は残り0件です/);
    assert.equal(usage.includes('相談返書ルーム'), false);
    assert.equal(usage.includes('返書ルーム'), false);
  });

  it('shelf consult meta is tier-neutral and avoids fixed one-ticket copy', () => {
    assert.equal(PAID_DTR_SHELF_CONSULT_META.labelJa, '相談返書');
    assert.equal(PAID_DTR_SHELF_CONSULT_META.valueJa, '相談返書の利用枠あり');
    const shelfMeta = Object.values(PAID_DTR_SHELF_CONSULT_META).join('\n');
    assert.equal(shelfMeta.includes('1件付帯'), false);
    assert.equal(shelfMeta.includes('初回付与'), false);
    assert.equal(shelfMeta.includes('残り1件'), false);
  });

  it('consult wallet display formatters use wallet-granted total not hardcoded cap', () => {
    assert.equal(formatConsultAvailableWithGrantedLine(5, 5), '現在使える相談返書：5 / 5件');
    assert.equal(formatConsultAvailableWithGrantedLine(1, 1), '現在使える相談返書：1 / 1件');
    assert.equal(formatConsultAvailableCountLine(3), '現在使える相談返書：3件');
    assert.equal(formatConsultUsedCountLine(0), '使用済み：0件');
  });

  it('consult wallet snapshot helpers validate denominator from wallet fields', () => {
    const full = {
      availableCount: 5,
      consumedCount: 0,
      totalGrantedCount: 5,
      status: 'active',
    };
    const light = {
      availableCount: 1,
      consumedCount: 0,
      totalGrantedCount: 1,
      status: 'active',
    };
    assert.equal(isConsultWalletDisplaySnapshotUsable(full), true);
    assert.equal(isConsultWalletDisplaySnapshotUsable(light), true);
    assert.equal(hasValidConsultWalletDenominator(full), true);
    assert.equal(hasValidConsultWalletDenominator(light), true);
    assert.equal(
      hasValidConsultWalletDenominator({ ...full, totalGrantedCount: 0 }),
      false,
    );
    assert.equal(isConsultWalletDisplaySnapshotUsable({ ...full, status: 'closed' }), false);
  });

  it('consult copy states one-theme and cap product truth', () => {
    const consult = [
      PAID_DTR_CONSULT_REPLY.oneThemeJa,
      PAID_DTR_CONSULT_REPLY.capSummaryJa,
      PAID_DTR_CONSULT_REPLY.upgradeToFullPriceLabelJa,
      PAID_DTR_CONSULT_ROOM_UI.composeThemeHintJa,
    ].join('\n');
    assert.match(consult, /1テーマ/);
    assert.match(consult, /付属1/);
    assert.match(consult, /追加.*4/);
    assert.match(consult, /合計5/);
    assert.match(consult, /600/);
    assert.equal(consult.includes('500円'), false);
    assert.equal(consult.includes('max3'), false);
    assert.equal(consult.includes('700円'), false);
    assert.equal(consult.includes('返書チケット'), false);
  });

  it('new pricing tier copy avoids chat and unlimited consult wording', () => {
    const tierCopy = [
      PAID_DTR_SAVED_REPORT_PRICING.light.headlineJa,
      PAID_DTR_SAVED_REPORT_PRICING.full.headlineJa,
      PAID_DTR_SAVED_REPORT_PRICING.lightToFullUpgrade.headlineJa,
      PAID_DTR_SAVED_REPORT_PRICING.lightToFullUpgrade.descriptionJa,
      PAID_DTR_CONSULT_REPLY.upgradeToFullDescriptionJa,
    ].join('\n');
    const forbidden = [
      'AIと喋れる',
      '無制限相談',
      '無制限の相談',
      'チャット',
    ] as const;
    for (const term of forbidden) {
      assert.equal(tierCopy.includes(term), false, `tier copy must not include: ${term}`);
    }
    assert.match(tierCopy, /相談返書/);
  });

  it('consult copy avoids unsafe external and selector wording in user-facing strings', () => {
    const corpus = collectPaidDtrPublicCopyStrings().join('\n');
    const forbidden = [
      '心理的防衛を無効化',
      '本当の理由が必ず',
      '3分で人生',
      '男性脳',
      '女性脳',
      'UI selector',
      'praise-hacking',
      '褒め殺し',
    ] as const;
    for (const term of forbidden) {
      assert.equal(corpus.includes(term), false, `corpus must not include: ${term}`);
    }
  });
});
