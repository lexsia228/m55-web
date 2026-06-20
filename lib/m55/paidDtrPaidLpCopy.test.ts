import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  PAID_DTR_CHAPTERS,
  PAID_DTR_LP,
  PAID_DTR_SAVED_REPORT_PRICING,
  collectPaidDtrLpCopyStrings,
} from './paidDtrProductCopy';
import { DTR_CORE_FULL_V1, DTR_CORE_LIGHT_V1 } from '../oneTimeCheckout';

const FORBIDDEN_LP_TERMS = [
  '¥500',
  '追加相談返書',
  'Entry Report',
  '購入者専用ルーム',
  '相談ルーム',
  'チャット',
  '無制限',
  '複数テーマ',
  '後から追加',
  '何度でも',
  'いつでも',
  '永久',
  '無期限',
  'おすすめ',
  '人気No.1',
  '最もお得',
  'お試し版',
  '簡易版',
  '入門版',
  'TODO',
  'FACT CHECK REQUIRED',
] as const;

const OLD_CHAPTER_TITLES = ['軸', '結節', '微差', '全体像の輪郭'];

const SAVED_REPORT_HEADLINE_JA = '自分の出方を、4章の流れで読み直す。';

const SAVED_REPORT_BODY_JA =
  '保存版は、購入時までに入力された情報をもとに、\n比較的変わりにくい自分の出方を4章で整理した\nデジタルレポートです。\n\n自分に出やすい傾向、\n考え方や動き方のつながり、\n無理の出方、\n日常で扱いやすくする方法を、\n一つの流れで読める形にします。\n\n後から読み返すための\n4章の保存版として残します。\n\n保存版の4章は、\nライトとFULLで共通です。';

const OWNED_STATE_STRINGS = [
  '保存版の閲覧・準備状況はこちらから進められます。',
  'レポートを開く',
  '購入済みです。保存版の準備状況を確認できます（再購入は不要です）。',
  '準備状況を確認する',
  'サポートに相談する',
  '本文の準備が完了すると閲覧できます。しばらくしてから再度お試しください。',
  'レポートの準備中',
  'このレポートへのアクセス有効期限が切れています。',
  'ご不明な点は',
  'サポート',
  'までご連絡ください。',
] as const;

const testDir = dirname(fileURLToPath(import.meta.url));
const lpPageSource = readFileSync(join(testDir, '../../app/dtr/lp/page.tsx'), 'utf8');

describe('paidDtrPaidLpCopy — M55_PAID_LP_FINAL_COPY_SSOT_v1', () => {
  it('exposes LP copy version', () => {
    assert.equal(PAID_DTR_LP.version, 'm55-paid-lp-final-copy-v1');
  });

  it('wires product keys to pricing SSOT', () => {
    assert.equal(PAID_DTR_LP.tiers.light.productKey, DTR_CORE_LIGHT_V1);
    assert.equal(PAID_DTR_LP.tiers.full.productKey, DTR_CORE_FULL_V1);
    assert.equal(PAID_DTR_LP.tiers.light.productKey, PAID_DTR_SAVED_REPORT_PRICING.light.productKey);
    assert.equal(PAID_DTR_LP.tiers.full.productKey, PAID_DTR_SAVED_REPORT_PRICING.full.productKey);
  });

  it('matches frozen savedReport headline and body copy', () => {
    assert.equal(PAID_DTR_LP.savedReport.headlineJa, SAVED_REPORT_HEADLINE_JA);
    assert.equal(PAID_DTR_LP.savedReport.bodyJa, SAVED_REPORT_BODY_JA);
  });

  it('centralizes owned-state public copy under PAID_DTR_LP.operational', () => {
    const os = PAID_DTR_LP.operational.ownedState;
    assert.equal(os.statusLeadJa, OWNED_STATE_STRINGS[0]);
    assert.equal(os.openReportCtaJa, OWNED_STATE_STRINGS[1]);
    assert.equal(os.recoveryLeadJa, OWNED_STATE_STRINGS[2]);
    assert.equal(os.recoveryCtaJa, OWNED_STATE_STRINGS[3]);
    assert.equal(os.supportCtaJa, OWNED_STATE_STRINGS[4]);
    assert.equal(os.pendingLeadJa, OWNED_STATE_STRINGS[5]);
    assert.equal(os.pendingCtaJa, OWNED_STATE_STRINGS[6]);
    assert.equal(os.expiredNoticeLeadJa, OWNED_STATE_STRINGS[7]);
  });

  it('does not hardcode owned-state copy in page.tsx', () => {
    for (const phrase of OWNED_STATE_STRINGS) {
      assert.equal(
        lpPageSource.includes(`"${phrase}"`) || lpPageSource.includes(`'${phrase}'`),
        false,
        `page.tsx hardcodes owned-state copy: ${phrase}`
      );
    }
  });

  it('includes Product Truth prices and reply counts', () => {
    const blob = collectPaidDtrLpCopyStrings().join('\n');
    assert.match(blob, /¥1,000/);
    assert.match(blob, /¥1,480/);
    assert.match(blob, /¥600/);
    assert.match(blob, /¥1,600/);
    assert.match(blob, /¥120/);
    assert.match(blob, /1件/);
    assert.match(blob, /合計5件/);
  });

  it('collectPaidDtrLpCopyStrings covers all public LP copy surfaces', () => {
    const collected = collectPaidDtrLpCopyStrings();
    assert.ok(collected.every((s) => typeof s === 'string' && s.length > 0));
    assert.ok(!collected.some((s) => s === undefined));

    const blob = collected.join('\n');
    assert.ok(blob.includes(SAVED_REPORT_HEADLINE_JA));
    assert.ok(blob.includes(SAVED_REPORT_BODY_JA));
    assert.ok(blob.includes(PAID_DTR_LP.hero.subheadlineJa));
    assert.ok(blob.includes(PAID_DTR_LP.hero.ctaLabelJa));
    assert.ok(blob.includes(PAID_DTR_LP.tiers.full.planNameJa));
    assert.ok(blob.includes(PAID_DTR_LP.tiers.full.priceLabelJa));
    assert.ok(blob.includes(PAID_DTR_LP.tiers.light.planNameJa));
    assert.ok(blob.includes(PAID_DTR_LP.tiers.light.priceLabelJa));
    assert.ok(blob.includes(PAID_DTR_LP.about.sectionTitleJa));
    assert.ok(blob.includes(PAID_DTR_LP.chapters.sectionTitleJa));
    assert.ok(blob.includes(PAID_DTR_LP.cta.finalCompareLabelJa));
    assert.ok(blob.includes('利用規約'));
    assert.ok(blob.includes('プライバシーポリシー'));
    assert.ok(blob.includes('特定商取引法に基づく表記'));
    assert.ok(blob.includes(PAID_DTR_LP.faq.items[0]!.questionJa));
    assert.ok(blob.includes(PAID_DTR_LP.faq.items[0]!.answerJa));
    assert.ok(blob.includes(PAID_DTR_LP.chapters.items[0]!.titleJa));
    assert.ok(blob.includes(PAID_DTR_LP.chapters.items[0]!.introJa));
    assert.ok(blob.includes(PAID_DTR_LP.operational.ownedState.statusLeadJa));
    assert.ok(blob.includes(PAID_DTR_LP.upgrade.sectionTitleJa));
    assert.ok(blob.includes(PAID_DTR_LP.purchaseNotes.sectionTitleJa));
  });

  it('uses formal 4 chapter titles aligned with PAID_DTR_CHAPTERS', () => {
    assert.equal(PAID_DTR_LP.chapters.items.length, 4);
    assert.deepEqual(
      PAID_DTR_LP.chapters.items.map((c) => c.titleJa),
      PAID_DTR_CHAPTERS.map((c) => c.title)
    );
  });

  it('orders tiers FULL before light in copy structure', () => {
    assert.match(PAID_DTR_LP.tiers.full.planNameJa, /FULL/);
    assert.match(PAID_DTR_LP.tiers.light.planNameJa, /ライト/);
    assert.equal(PAID_DTR_LP.tiers.full.consultReplyValueJa, '合計5件');
    assert.equal(PAID_DTR_LP.tiers.light.consultReplyValueJa, '1件');
  });

  it('has exactly 4 FAQ items', () => {
    assert.equal(PAID_DTR_LP.faq.items.length, 4);
  });

  it('defines hero compare anchor and CTA labels', () => {
    assert.equal(PAID_DTR_LP.hero.ctaLabelJa, 'FULLとライトを比べる');
    assert.equal(PAID_DTR_LP.hero.compareSectionId, 'dtr-lp-tiers');
    assert.equal(PAID_DTR_LP.tiers.full.ctaLabelJa, '保存版FULLを購入する');
    assert.equal(PAID_DTR_LP.tiers.light.ctaLabelJa, '保存版ライトを購入する');
    assert.equal(PAID_DTR_LP.cta.finalCompareLabelJa, 'プランをもう一度確認する');
  });

  it('does not expose forbidden legacy or optimization terms in LP copy', () => {
    const blob = collectPaidDtrLpCopyStrings().join('\n');
    for (const term of FORBIDDEN_LP_TERMS) {
      assert.equal(
        blob.includes(term),
        false,
        `forbidden term in LP copy: ${term}`
      );
    }
    for (const oldTitle of OLD_CHAPTER_TITLES) {
      assert.equal(blob.includes(oldTitle), false, `old chapter title: ${oldTitle}`);
    }
  });

  it('includes legal link targets for purchase notes', () => {
    const hrefs = PAID_DTR_LP.purchaseNotes.legalLinks.map((l) => l.href);
    assert.deepEqual(hrefs, [
      '/support',
      '/legal/refund',
      '/legal/tokushoho',
      '/legal/terms',
      '/legal/privacy',
    ]);
  });
});
