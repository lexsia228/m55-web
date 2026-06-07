import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  ACCOUNT_DATA_MY_BODY_P1,
  ACCOUNT_DATA_MY_BODY_P2,
  ACCOUNT_DATA_MY_DEVICE_NOTE,
  ACCOUNT_DATA_MY_SECTION_TITLE,
  ACCOUNT_DATA_PRIVACY_DEVICE_P1,
  ACCOUNT_DATA_PRIVACY_DEVICE_P2,
  ACCOUNT_DATA_PRIVACY_INTRO,
  ACCOUNT_DATA_PRIVACY_REQUEST_LINK_LABEL,
  ACCOUNT_DATA_PRIVACY_SECTION_TITLE,
  ACCOUNT_DATA_REQUEST_CTA_LABEL,
  ACCOUNT_DATA_REQUEST_HREF,
  ACCOUNT_DATA_SUPPORT_AFTER_VERIFY,
  ACCOUNT_DATA_SUPPORT_INTRO,
  ACCOUNT_DATA_SUPPORT_REQUEST_INFO,
  ACCOUNT_DATA_SUPPORT_RETENTION_BOUNDARY,
  ACCOUNT_DATA_SUPPORT_SAVED_REPORT_BOUNDARY,
  ACCOUNT_DATA_SUPPORT_SECTION_ID,
  ACCOUNT_DATA_SUPPORT_SECTION_TITLE,
  ACCOUNT_DATA_SUPPORT_SECURITY_NOTE,
  ACCOUNT_DATA_SUPPORT_TARGET_EXAMPLES,
} from './accountDataControlPublicCopy';

const ROOT = join(import.meta.dirname, '..', '..');

function readRepo(rel: string): string {
  return readFileSync(join(ROOT, rel), 'utf8');
}

const FORBIDDEN_TERMS = [
  '完全に削除します',
  'すべて削除します',
  '即時削除',
  '永久削除',
  '完全消去を保証',
  'すべての記録が消えます',
  '決済記録も削除します',
  'Clerkを削除すればM55データも自動で消えます',
  'ワンクリックで退会できます',
  'データをダウンロードできます',
  'データexportできます',
  'ダウンロードできます',
] as const;

const MY_PANEL = readRepo('components/my/MyPanel.tsx');
const SUPPORT = readRepo('app/support/page.tsx');
const PRIVACY = readRepo('app/legal/privacy/page.tsx');
const COPY_MODULE = readRepo('lib/m55/accountDataControlPublicCopy.ts');
const COMBINED = [COPY_MODULE, MY_PANEL, SUPPORT, PRIVACY].join('\n');

describe('accountDataControlPublicCopy — My', () => {
  it('exports My section copy and CTA href', () => {
    assert.equal(ACCOUNT_DATA_MY_SECTION_TITLE, 'アカウント削除・データ消去');
    assert.match(ACCOUNT_DATA_MY_BODY_P1, /サポート窓口から申請/);
    assert.match(ACCOUNT_DATA_MY_BODY_P2, /法令・決済・不正防止/);
    assert.match(ACCOUNT_DATA_MY_DEVICE_NOTE, /端末/);
    assert.match(ACCOUNT_DATA_MY_DEVICE_NOTE, /サーバー上/);
    assert.equal(ACCOUNT_DATA_REQUEST_CTA_LABEL, '削除・データ消去を申請する');
    assert.equal(ACCOUNT_DATA_REQUEST_HREF, '/support#account-data-deletion');
  });

  it('wires MyPanel to SSOT constants', () => {
    assert.match(MY_PANEL, /ACCOUNT_DATA_MY_SECTION_TITLE/);
    assert.match(MY_PANEL, /ACCOUNT_DATA_REQUEST_CTA_LABEL/);
    assert.match(MY_PANEL, /ACCOUNT_DATA_REQUEST_HREF/);
    assert.match(MY_PANEL, /accountDataControlPublicCopy/);
  });
});

describe('accountDataControlPublicCopy — Support', () => {
  it('exports support anchor section copy', () => {
    assert.equal(ACCOUNT_DATA_SUPPORT_SECTION_ID, 'account-data-deletion');
    assert.equal(ACCOUNT_DATA_SUPPORT_SECTION_TITLE, 'アカウント削除・データ消去の申請');
    assert.match(ACCOUNT_DATA_SUPPORT_INTRO, /サポート窓口/);
    assert.match(ACCOUNT_DATA_SUPPORT_REQUEST_INFO, /登録に使用したメールアドレス/);
    assert.match(ACCOUNT_DATA_SUPPORT_REQUEST_INFO, /削除を希望する対象/);
    assert.deepEqual([...ACCOUNT_DATA_SUPPORT_TARGET_EXAMPLES], [
      'アカウント',
      'プロフィール',
      '保存版',
      '相談返書',
      'この端末に保存された情報',
    ]);
    assert.match(ACCOUNT_DATA_SUPPORT_AFTER_VERIFY, /本人確認後/);
    assert.match(ACCOUNT_DATA_SUPPORT_SECURITY_NOTE, /パスワードや決済カード情報/);
    assert.match(ACCOUNT_DATA_SUPPORT_SAVED_REPORT_BOUNDARY, /保存版削除/);
    assert.match(ACCOUNT_DATA_SUPPORT_RETENTION_BOUNDARY, /監査/);
  });

  it('renders support section id and retains 2–5 business day reply copy', () => {
    assert.match(SUPPORT, /id=\{ACCOUNT_DATA_SUPPORT_SECTION_ID\}/);
    assert.match(SUPPORT, /ACCOUNT_DATA_SUPPORT_SECTION_TITLE/);
    assert.match(SUPPORT, /2〜5営業日/);
    assert.match(SUPPORT, /accountDataControlPublicCopy/);
  });
});

describe('accountDataControlPublicCopy — Privacy', () => {
  it('exports privacy deletion section copy', () => {
    assert.equal(ACCOUNT_DATA_PRIVACY_SECTION_TITLE, 'アカウント・データの削除');
    assert.match(ACCOUNT_DATA_PRIVACY_INTRO, /サポート窓口/);
    assert.match(ACCOUNT_DATA_PRIVACY_DEVICE_P1, /端末内/);
    assert.match(ACCOUNT_DATA_PRIVACY_DEVICE_P2, /サーバー上/);
    assert.match(ACCOUNT_DATA_PRIVACY_DEVICE_P2, /別に管理/);
  });

  it('links privacy to support anchor', () => {
    assert.match(PRIVACY, /ACCOUNT_DATA_REQUEST_HREF/);
    assert.match(PRIVACY, /ACCOUNT_DATA_PRIVACY_SECTION_TITLE/);
    assert.match(PRIVACY, /accountDataControlPublicCopy/);
  });
});

describe('accountDataControlPublicCopy — forbidden promises', () => {
  it('does not include forbidden deletion or export promises', () => {
    for (const term of FORBIDDEN_TERMS) {
      assert.equal(COMBINED.includes(term), false, `forbidden: ${term}`);
    }
  });
});
