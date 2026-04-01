\# M55\_HEADER\_VISUAL\_FREEZE\_v1



\## 0. Purpose

この文書は、M55 Header の視覚回帰を防ぐための freeze 文書である。

特に、ロゴ部分への青線被り再発を禁止する。



\---



\## 1. Main issue

過去に、Header の active underline / border / pseudo element がロゴまたはロゴ近傍に干渉し、見た目の破綻が再発した。



これは軽微な装飾問題ではなく、Home の第一印象を壊す重大回帰として扱う。



\---



\## 2. Freeze law

\### 絶対ルール

\- active 下線は文字ラベル領域のみに出す

\- ロゴアイコン本体には underline / border-bottom / after / active line を当てない

\- ロゴとナビラベルの責務を分離する

\- hover と active の責務を分離する

\- Header の高さ / padding / align-items を安定化させる



\---



\## 3. Visual rules

\- ロゴは独立オブジェクトとして扱う

\- active 視覚は nav label のみ対象とする

\- 下線の開始点と終了点はラベル幅に閉じる

\- ロゴとアクティブ線の重なりは禁止

\- ロゴの下端に視覚要素が触れないこと



\---



\## 4. Forbidden

\- ロゴを含む親要素全体へ active line を当てること

\- icon + label のラッパー全体に underline を引くこと

\- 擬似要素の位置ズレでロゴ下端に線を走らせること

\- Header の縦位置を曖昧にすること



\---



\## 5. Regression priority

Header の青線被りは minor bug ではなく、major regression として扱う。



\---



\## 6. Completion criteria

\- ロゴ周辺に不要な青線が存在しない

\- active 状態が文字ラベルにのみ明確に乗る

\- desktop / mobile で破綻しない

\- Header が静かで premium に見える

