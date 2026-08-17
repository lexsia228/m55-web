import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  PAID_DTR_CHAPTERS,
  PAID_DTR_CONSULT_ENTRY_LAYOUT,
  PAID_DTR_CONSULT_GROUNDING_COPY,
  PAID_DTR_CONSULT_REPLY,
  PAID_DTR_CONSULT_ROOM_UI,
  PAID_DTR_CONSULT_USAGE_DISPLAY,
  PAID_DTR_DRAWER_HUB,
  PAID_DTR_DRAWER_THEME_ENTRIES,
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
    assert.match(PAID_DTR_CONSULT_REPLY.upgradeToFullPriceLabelJa, /フルに切り替え ¥600/);
    assert.match(PAID_DTR_SAVED_REPORT_PRICING.light.audienceJa, /プレミアムレポートを読/);
    assert.match(PAID_DTR_SAVED_REPORT_PRICING.full.audienceJa, /追加読み解きで複数回/);
    assert.equal(PAID_DTR_SAVED_REPORT_PRICING.light.planNameJa, 'M55 プレミアムレポート ライト');
    assert.equal(PAID_DTR_SAVED_REPORT_PRICING.full.planNameJa, 'M55 プレミアムレポート フル');
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
    assert.equal(PAID_DTR_PRODUCT_IDENTITY.primaryNameJa, 'プレミアムレポート');
    assert.equal(PAID_DTR_PRODUCT_IDENTITY.formatLabel, 'プレミアムレポート');
    assert.equal(PAID_DTR_PRODUCT_IDENTITY.consultPrimaryTermJa, '追加読み解き');
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
    assert.match(boundary, /プレミアムレポートに紐づく読み解き/);
    assert.match(boundary, /無制限/);
  });

  it('consult entry intro uses living language without generic-chat wording', () => {
    const intro = [
      PAID_DTR_CONSULT_GROUNDING_COPY.titleLine2Ja,
      ...PAID_DTR_CONSULT_ENTRY_LAYOUT.essentialNotesJa,
    ].join('\n');
    assert.match(intro, /1テーマだけ整理します/);
    assert.match(intro, /送信するまで追加読み解きは使いません/);
    assert.equal(intro.includes('汎用チャット'), false);
    assert.equal(intro.includes('参照されます'), false);
  });

  it('drawer consult CTA uses bridge sublabel not legacy bound phrase', () => {
    assert.equal(
      PAID_DTR_DRAWER_HUB.consultSublabelJa,
      'プレミアムレポートをもとに、いま気になっていることを1テーマだけ整理する',
    );
    assert.equal(PAID_DTR_DRAWER_HUB.consultSublabelJa.includes('プレミアムレポートに紐づく'), false);
  });

  it('consult theme chips align with drawer chapter labels', () => {
    assert.deepEqual(PAID_DTR_CONSULT_REPLY.themeExamplesJa, [
      '仕事・これからの進め方',
      'これからの動き方',
      '恋人・近い人との向き合い方',
      'お金・生活・疲れの整え方',
      '疲れたときの戻り方',
    ]);
    assert.equal(PAID_DTR_CONSULT_REPLY.themeExamplesJa.includes('仕事・スキルの伸ばし方'), false);
    assert.equal(PAID_DTR_CONSULT_REPLY.themeExamplesJa.includes('お金・生活の整え方'), false);
    const work = PAID_DTR_DRAWER_THEME_ENTRIES.find((e) => e.labelJa === '仕事・これからの進め方');
    assert.match(work!.sublabelJa, /何から始めるか/);
    assert.equal(work!.sublabelJa.includes('優先順位'), false);
    const forward = PAID_DTR_DRAWER_THEME_ENTRIES.find((e) => e.labelJa === 'これからの動き方');
    assert.match(forward!.sublabelJa, /今どこから動くか/);
  });

  it('consult history collapse copy uses count template and avoids forbidden labels', () => {
    const history = [
      PAID_DTR_CONSULT_ROOM_UI.historyCountTemplateJa,
      PAID_DTR_CONSULT_ROOM_UI.historyShowAllJa,
      PAID_DTR_CONSULT_ROOM_UI.historyShowMoreTemplateJa,
      PAID_DTR_CONSULT_ROOM_UI.openToReadJa,
      PAID_DTR_CONSULT_ROOM_UI.latestReplyBadgeJa,
    ].join('\n');
    assert.match(history, /\{count\}件の追加読み解きがあります/);
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
    assert.match(consultUi, /追加読み解きの入口/);
  });

  it('consult usage display copy prioritizes add-on over giant remaining-zero hero', () => {
    assert.equal(
      formatConsultPurchaseAddOnLine(4),
      'プレミアムレポートに紐づく追加読み解きを、あと4件まで追加できます。'
    );
    assert.equal(formatConsultUsedCountLine(1, 5), '使用済み：1 / 5件');
    const usage = Object.values(PAID_DTR_CONSULT_USAGE_DISPLAY).join('\n');
    assert.match(usage, /このプレミアムレポートで追加読み解きを使えます/);
    assert.equal(usage.includes('追加読み解きを1件使えます'), false);
    assert.match(usage, /今は残り0件です/);
    assert.equal(usage.includes('追加読み解きルーム'), false);
    assert.equal(usage.includes('返書ルーム'), false);
  });

  it('shelf consult meta is tier-neutral and avoids fixed one-ticket copy', () => {
    assert.equal(PAID_DTR_SHELF_CONSULT_META.labelJa, '追加読み解き');
    assert.equal(PAID_DTR_SHELF_CONSULT_META.valueJa, '追加読み解きの利用枠あり');
    const shelfMeta = Object.values(PAID_DTR_SHELF_CONSULT_META).join('\n');
    assert.equal(shelfMeta.includes('1件付帯'), false);
    assert.equal(shelfMeta.includes('初回付与'), false);
    assert.equal(shelfMeta.includes('残り1件'), false);
  });

  it('consult wallet display formatters use wallet-granted total not hardcoded cap', () => {
    assert.equal(formatConsultAvailableWithGrantedLine(5, 5), '現在使える追加読み解き：5 / 5件');
    assert.equal(formatConsultAvailableWithGrantedLine(1, 1), '現在使える追加読み解き：1 / 1件');
    assert.equal(formatConsultAvailableCountLine(3), '現在使える追加読み解き：3件');
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
    assert.match(tierCopy, /追加読み解き/);
  });

  it('public copy corpus omits legacy consult product terms', () => {
    const corpus = collectPaidDtrPublicCopyStrings().join('\n');
    const forbidden = [
      '相談返書',
      '相談内容',
      '相談回数',
      'サポートに相談',
      '次に相談',
    ] as const;
    for (const term of forbidden) {
      assert.equal(corpus.includes(term), false, `corpus must not include: ${term}`);
    }
    assert.equal(PAID_DTR_PRODUCT_IDENTITY.consultPrimaryTermJa, '追加読み解き');
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
