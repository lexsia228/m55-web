import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const p = path.join(__dirname, '..', 'app', 'purchase', 'success', 'page.tsx');
let s = fs.readFileSync(p, 'utf8');

s = s.replace(
  "import { QuietPolling } from '../../../components/QuietPolling';",
  "import { PurchaseSuccessBridge } from './PurchaseSuccessBridge';",
);

const oldBlock = `        ) : (
          <>
            <p className={successStyles.rewardEyebrow}>Entry Report</p>
            <h1 className={successStyles.title} data-testid="m55-purchase-success-headline">
              お手続き、ありがとうございます
            </h1>
            <p className={successStyles.desc}>
              {entitlementReady
               ご購入いただいたレポートへのアクセスが有効です。本編はいつでも開けます。'
                : 'ご購入は完了しています。利用権限の反映を待っている間も、このままお待ちいただけます。'}
            </p>
            <a
              href={DTR_CORE_HREF}
              className={successStyles.ctaButton}
              data-testid="m55-purchase-success-primary-cta"
            >
              Entry Report を開く
            </a>
            {!entitlementReady && <QuietPolling />}`;

const newBlock = `        ) : (
          <>
            <PurchaseSuccessBridge entitlementInitiallyReady={!!entitlementReady} />
            <p className={successStyles.rewardEyebrow}>Entry Report</p>
            <h1 className={successStyles.title} data-testid="m55-purchase-success-headline">
              レポートを開いています
            </h1>
            <p className={successStyles.desc}>
              お手続きありがとうございます。無料で入力いただいた内容を引き継ぎ、まもなく Entry Report を表示します。
            </p>
            <p className={successStyles.desc} style={{ marginTop: 12, fontSize: 13, opacity: 0.88 }}>
              {entitlementReady
                ? '準備ができ次第、自動で進みます。'
                : '利用権限の反映を確認しています。しばらくお待ちください。'}
            </p>
            <a
              href={DTR_CORE_HREF}
              className={successStyles.ctaButton}
              data-testid="m55-purchase-success-primary-cta"
            >
              Entry Report を開く
            </a>`;

if (!s.includes(oldBlock)) {
  console.error('OLD BLOCK NOT FOUND');
  process.exit(1);
}
s = s.replace(oldBlock, newBlock);

s = s.replace(
  ' * 権限が既に active でも /dtr/core へ即 redirect せず、報酬感のある完了画面を表示する。',
  ' * 成功時は PurchaseSuccessBridge が端末上の無料入力を Clerk キーへ昇格し、権限確認後に /dtr/core へ接続する。',
);

fs.writeFileSync(p, s, 'utf8');
console.log('patched', p);
