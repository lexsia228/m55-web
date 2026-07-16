import Link from 'next/link';
import {
  M55_PUBLIC_COMMERCIAL_TRUTH,
} from '../../../lib/m55/analysisAuthorityReferenceModel';
import { isCompatibilityCommerceEnabled } from '../../../lib/m55/compatibility/compatibilityCommerceAuthority';
import {
  M55_PUBLIC_SUPPORT_EMAIL,
  M55_PUBLIC_SUPPORT_MAILTO,
} from '../../../lib/m55/accountDataControlPublicCopy';
import styles from '../how-it-works.module.css';

const truth = M55_PUBLIC_COMMERCIAL_TRUTH;

function oneTimePrice(label: string): string {
  return label.replace('（税込）', '（税込・買い切り）');
}

function List({ items }: { items: readonly string[] }) {
  return (
    <ul className={styles.truthList}>
      {items.map((item) => <li key={item}>{item}</li>)}
    </ul>
  );
}

export function PublicProductTruthSection() {
  const compatibilityCommerceAvailable = isCompatibilityCommerceEnabled();
  return (
    <section className={styles.truthSection} aria-labelledby="m55-public-truth-title">
      <p className={styles.sectionKicker}>M55の商品と解析</p>
      <h2 id="m55-public-truth-title" className={styles.sectionTitle}>
        無料で分かることと、詳しいレポートで読めること
      </h2>
      <p className={styles.sectionLead}>{truth.summaryJa}</p>

      <div className={styles.truthGrid}>
        <article>
          <h3>1. 入力するもの</h3>
          <p><strong>個人の無料解析：</strong></p>
          <List items={truth.inputs.personalJa} />
          <p><strong>二人の無料解析：</strong></p>
          <List items={truth.inputs.compatibilityJa} />
        </article>

        <article>
          <h3>2. 生年月日と今の状態を重ねる方法</h3>
          <p>{truth.processing.frameworkJa}</p>
          <p>{truth.processing.personalFreeJa}</p>
          <p>{truth.processing.compatibilityFreeJa}</p>
        </article>

        <article>
          <h3>3. 無料解析で分かること</h3>
          <p><strong>自分：</strong>{truth.outputs.personalFreeJa}</p>
          <p><strong>二人：</strong>{truth.outputs.compatibilityFreeJa}</p>
          <p>無料結果だけでも、最初の理解と次に確かめることまで確認できます。</p>
        </article>

        <article>
          <h3>4. 詳しいレポートで読めること</h3>
          <p><strong>自分：</strong>{truth.outputs.personalSavedJa}</p>
          <p><strong>二人：</strong>{truth.outputs.compatibilitySavedJa}</p>
          <p>{truth.commercial.ownershipJa}</p>
        </article>

        <article>
          <h3>5. 追加読み解き・生成AI</h3>
          <p>{truth.processing.personalSavedJa}</p>
          <p>{truth.processing.personalAdditionalJa}</p>
          <p>{truth.processing.compatibilitySavedJa}</p>
        </article>

        <article>
          <h3>6. 同じ入力を同じ手順で扱う部分</h3>
          <p>
            個人の無料解析と、二人の無料解析・相性解析レポートは、あらかじめ定めた手順で組み立てます。
            同じ生年月日と同じ回答には同じ組み立てを返します。
          </p>
          <p>
            個人解析レポートも検査済みの文章素材を土台にし、生成AIを使う場合は文章表現に限定して品質条件を適用します。
          </p>
        </article>

        <article>
          <h3>7. 行わないこと</h3>
          <List items={truth.limitationsJa} />
        </article>

        <article>
          <h3>8. 個人情報と保存</h3>
          <p>{truth.commercial.dataHandlingJa}</p>
          <p>
            二人の無料入力はブラウザのタブ内で扱い、購入した相性解析レポートだけを購入アカウントへ保存します。
            相手へ自動共有はしません。
          </p>
          <Link href={truth.commercial.privacyHref}>プライバシーポリシーを確認する</Link>
        </article>

        <article>
          <h3>9. 商品と支払い</h3>
          <p>
            個人解析レポートは4章です。
            個人解析ライトは
            {oneTimePrice(truth.commercial.personal.light.priceLabelJa)}・追加読み解き1件、
            個人解析FULLは
            {oneTimePrice(truth.commercial.personal.full.priceLabelJa)}・追加読み解き合計5件です。
          </p>
          {compatibilityCommerceAvailable ? (
            <p>
              二人の相性解析レポートは6章・
              {oneTimePrice(truth.commercial.compatibility.priceLabel)}です。
            </p>
          ) : (
            <p>二人の相性解析レポートは現在準備中です。無料の相性解析は利用できます。</p>
          )}
          <p>{truth.commercial.billingJa}</p>
          <p>{truth.commercial.deliveryJa}</p>
          <p>{truth.commercial.paymentProcessorJa}</p>
        </article>

        <article>
          <h3>10. 問い合わせ</h3>
          <p>
            購入、閲覧、請求、返金、入力データについては、サポート窓口へ直接メールで問い合わせできます。
            {' '}
            <a href={M55_PUBLIC_SUPPORT_MAILTO}>{M55_PUBLIC_SUPPORT_EMAIL}</a>
          </p>
          <nav className={styles.truthLinks} aria-label="商品と問い合わせに関するページ">
            <Link href={truth.commercial.supportHref}>サポート</Link>
            <Link href={truth.commercial.refundHref}>返金・キャンセル</Link>
            <Link href={truth.commercial.termsHref}>利用規約</Link>
            <Link href={truth.commercial.businessHref}>特定商取引法に基づく表記</Link>
          </nav>
        </article>
      </div>
    </section>
  );
}
